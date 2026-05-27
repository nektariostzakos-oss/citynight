// Visitor-submitted contact / reservation messages. Distinct from
// lib/owner-*.ts — this is the public surface where unauthenticated
// visitors send reservation requests / questions to the venue.
//
// Writes go to venue_messages (created in 0028_venue_minisite.sql). If the
// venue has reservation_email set we forward via lib/email.ts on insert,
// and stamp forwarded_at so the dashboard can show delivery state. We
// never write fact columns, never read photos, never touch design — same
// §6 integrity rules as everywhere else.

import 'server-only';
import { randomUUID } from 'node:crypto';
import { db } from '@/db';
import { sendEmail } from '@/lib/email';

const dbh = () => db.$client;

export type ContactInput = {
  kind: 'reservation' | 'contact';
  name: string;
  email?: string | null;
  phone?: string | null;
  partySize?: number | null;
  /** ISO datetime string; we convert to unix seconds for storage. */
  desiredAt?: string | null;
  body?: string | null;
};

const NAME_MAX = 80;
const BODY_MAX = 1000;

export async function submitContactMessage(venueId: string, input: ContactInput): Promise<{ id: string }> {
  const v = dbh().prepare(`
    SELECT v.id, v.name, v.reservation_email, c.slug AS citySlug,
           COALESCE(a.slug, cat.slug) AS bucketSlug, v.slug AS venueSlug
      FROM venues v
      JOIN cities c ON c.id = v.city_id
      LEFT JOIN areas a ON a.id = v.area_id
      LEFT JOIN categories cat ON cat.id = v.category_id
     WHERE v.id = ? AND v.status = 'published'
  `).get(venueId) as {
    id: string; name: string; reservation_email: string | null;
    citySlug: string; bucketSlug: string | null; venueSlug: string | null;
  } | undefined;
  if (!v) throw new Response('Not found', { status: 404 });

  const clean = normalise(input);
  const id = randomUUID();
  const desiredAtUnix = clean.desiredAt ? Math.floor(new Date(clean.desiredAt).getTime() / 1000) : null;

  // Insert + (optional) forward in one transaction. The forwarded_at stamp
  // is only set if the email succeeds — owners can see "pending forward"
  // rows in the dashboard and retry from there in a future iteration.
  const forwardedAt = v.reservation_email
    ? await tryForward(v, clean, desiredAtUnix)
    : null;

  dbh().prepare(`
    INSERT INTO venue_messages
      (id, venue_id, kind, from_name, from_email, from_phone,
       party_size, desired_at, body, forwarded_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
  `).run(
    id, venueId, clean.kind,
    clean.name, clean.email, clean.phone,
    clean.partySize, desiredAtUnix, clean.body,
    forwardedAt,
  );

  return { id };
}

async function tryForward(
  v: { name: string; reservation_email: string | null; citySlug: string; bucketSlug: string | null; venueSlug: string | null; },
  clean: ReturnType<typeof normalise>,
  desiredAtUnix: number | null,
): Promise<number | null> {
  if (!v.reservation_email) return null;
  const subject = clean.kind === 'reservation'
    ? `Reservation request — ${v.name}`
    : `New message via citynight — ${v.name}`;
  const dateLine = desiredAtUnix
    ? `When:   ${new Date(desiredAtUnix * 1000).toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}\n`
    : '';
  const partyLine = clean.partySize ? `Party:  ${clean.partySize}\n` : '';
  const text =
    `${clean.kind === 'reservation' ? 'Reservation request' : 'Contact message'} via citynight.gr\n\n` +
    `Venue:  ${v.name}\n` +
    `From:   ${clean.name}${clean.email ? ` <${clean.email}>` : ''}${clean.phone ? ` · ${clean.phone}` : ''}\n` +
    dateLine + partyLine +
    (clean.body ? `\nMessage:\n${clean.body}\n` : '') +
    `\nReply directly to this email to reach the visitor.`;
  try {
    await sendEmail({
      to: v.reservation_email,
      subject,
      text,
      html: `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap;padding:16px;background:#0d0d14;color:#f4f4f6;border-radius:8px">${escapeHtml(text)}</pre>`,
    });
    return Math.floor(Date.now() / 1000);
  } catch {
    // Don't crash the submit if email is misconfigured — the row is still
    // saved and the owner can retrieve it from the dashboard.
    return null;
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

function normalise(input: ContactInput) {
  if (!input || typeof input !== 'object') throw new Response('Invalid payload', { status: 400 });
  if (input.kind !== 'reservation' && input.kind !== 'contact') {
    throw new Response('Invalid kind', { status: 400 });
  }
  const name = String(input.name ?? '').trim();
  if (!name || name.length > NAME_MAX) throw new Response('Invalid name', { status: 400 });

  const email = strOrNull(input.email, 200, 'email');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Response('Invalid email', { status: 400 });
  }
  const phone = strOrNull(input.phone, 30, 'phone');
  // At least one contact channel — refusing the submit otherwise prevents
  // anonymous spam piling up.
  if (!email && !phone) throw new Response('Provide email or phone', { status: 400 });

  let partySize: number | null = null;
  if (input.partySize != null) {
    const n = Number(input.partySize);
    if (!Number.isFinite(n) || n < 1 || n > 200) throw new Response('Invalid party size', { status: 400 });
    partySize = Math.floor(n);
  }

  let desiredAt: string | null = null;
  if (input.desiredAt) {
    const d = new Date(input.desiredAt);
    if (isNaN(d.getTime())) throw new Response('Invalid date', { status: 400 });
    desiredAt = d.toISOString();
  }

  const body = strOrNull(input.body, BODY_MAX, 'body');

  return { kind: input.kind, name, email, phone, partySize, desiredAt, body };
}

function strOrNull(v: unknown, max: number, label: string): string | null {
  if (v == null || v === '') return null;
  if (typeof v !== 'string') throw new Response(`Invalid ${label}`, { status: 400 });
  const t = v.trim();
  if (!t) return null;
  if (t.length > max) throw new Response(`${label} too long`, { status: 400 });
  return t;
}
