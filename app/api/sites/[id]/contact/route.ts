// POST /api/sites/[id]/contact — visitor-submitted reservation / contact form.
// Mirror of /api/venues/[id]/contact for the SaaS side. CSRF + per-IP rate-limit.

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { requireSameOrigin } from '@/lib/csrf';
import { rateLimit429, ipKey } from '@/lib/rate-limit';
import { db } from '@/db';
import { sendEmail } from '@/lib/email';

const dbh = () => db.$client;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const limited = rateLimit429(`site-contact:${ipKey(req)}`, { max: 8, windowMs: 15 * 60_000 });
  if (limited) return limited;

  const { id } = await params;
  let raw: Record<string, unknown>;
  try { raw = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const site = dbh().prepare(`
    SELECT id, name, reservation_email, contact_email
      FROM sites
     WHERE id = ? AND status = 'published'
  `).get(id) as { id: string; name: string; reservation_email: string | null; contact_email: string | null } | undefined;
  if (!site) return new NextResponse('Not found', { status: 404 });

  const kind = raw.kind === 'contact' ? 'contact' : 'reservation';
  const name = String(raw.name ?? '').trim();
  if (!name || name.length > 80) return NextResponse.json({ ok: false, error: 'invalid_name' }, { status: 400 });

  const email = strOrNull(raw.email, 200);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 });
  }
  const phone = strOrNull(raw.phone, 30);
  if (!email && !phone) return NextResponse.json({ ok: false, error: 'contact_required' }, { status: 400 });

  let partySize: number | null = null;
  if (raw.partySize != null) {
    const n = Number(raw.partySize);
    if (Number.isFinite(n) && n >= 1 && n <= 200) partySize = Math.floor(n);
  }
  let desiredAtUnix: number | null = null;
  if (typeof raw.desiredAt === 'string' && raw.desiredAt) {
    const d = new Date(raw.desiredAt);
    if (!isNaN(d.getTime())) desiredAtUnix = Math.floor(d.getTime() / 1000);
  }
  const body = strOrNull(raw.body, 1000);

  const forwardTo = site.reservation_email ?? site.contact_email;
  let forwardedAt: number | null = null;
  if (forwardTo) {
    forwardedAt = await tryForward(site.name, forwardTo, kind, { name, email, phone, partySize, desiredAtUnix, body });
  }

  const messageId = randomUUID();
  dbh().prepare(`
    INSERT INTO site_messages
      (id, site_id, kind, from_name, from_email, from_phone, party_size, desired_at, body, forwarded_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
  `).run(messageId, id, kind, name, email, phone, partySize, desiredAtUnix, body, forwardedAt);

  return NextResponse.json({ ok: true, id: messageId });
}

async function tryForward(
  siteName: string, to: string, kind: 'reservation' | 'contact',
  data: { name: string; email: string | null; phone: string | null; partySize: number | null; desiredAtUnix: number | null; body: string | null },
): Promise<number | null> {
  const subject = kind === 'reservation' ? `Reservation request — ${siteName}` : `Message via your site — ${siteName}`;
  const lines = [
    `${kind === 'reservation' ? 'Reservation request' : 'Contact message'} from your site:`,
    '',
    `Name:  ${data.name}`,
    `Email: ${data.email ?? '—'}`,
    `Phone: ${data.phone ?? '—'}`,
    data.partySize ? `Party: ${data.partySize}` : '',
    data.desiredAtUnix ? `When:  ${new Date(data.desiredAtUnix * 1000).toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}` : '',
    data.body ? `\nMessage:\n${data.body}` : '',
    '',
    'Reply directly to this email.',
  ].filter(Boolean).join('\n');
  try {
    await sendEmail({
      to, subject, text: lines,
      html: `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap">${escapeHtml(lines)}</pre>`,
    });
    return Math.floor(Date.now() / 1000);
  } catch {
    return null;
  }
}

function escapeHtml(s: string) { return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!)); }

function strOrNull(v: unknown, max: number): string | null {
  if (v == null || v === '') return null;
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  if (t.length > max) return null;
  return t;
}
