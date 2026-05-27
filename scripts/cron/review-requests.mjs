#!/usr/bin/env node
// Phase I.10 — post-visit review-request cron.
//
// Scans for site_bookings completed between 2h and 24h ago that have a
// customer email and haven't yet been emailed a review link. Sends each
// one a one-tap link /<locale>/review/<siteId>/<token> where the token
// is a timing-safe HMAC over (siteId, bookingId, REVIEW_TOKEN_SECRET) —
// matches lib/crm/reviews.ts:signReviewToken.
//
// Schedule: hourly. The 2–24h window gives every completed booking
// ~22 cron passes to be picked up (sufficient redundancy).

import 'dotenv/config';
import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

function db() {
  const p = process.env.DATABASE_PATH;
  if (!p) throw new Error('DATABASE_PATH required');
  const dir = path.dirname(path.resolve(p));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const d = new Database(p);
  d.pragma('journal_mode = WAL');
  return d;
}

function tokenSecret() {
  const s = process.env.REVIEW_TOKEN_SECRET;
  if (!s || s.length < 32) {
    throw new Error('REVIEW_TOKEN_SECRET missing or too short (>=32 chars required)');
  }
  return s;
}

function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function signReviewToken(siteId, bookingId) {
  const mac = crypto.createHmac('sha256', tokenSecret()).update(`${siteId}:${bookingId}`).digest();
  return `${b64url(Buffer.from(bookingId, 'utf8'))}.${b64url(mac)}`;
}

async function sendEmail(to, subject, text, html) {
  const key = process.env.EMAIL_API_KEY;
  const from = process.env.EMAIL_FROM ?? 'citynight.gr <noreply@citynight.gr>';
  if (!key) {
    if (process.env.NODE_ENV === 'production') throw new Error('EMAIL_API_KEY required in production');
    console.log(`— DEV EMAIL ——\nTo: ${to}\nSubject: ${subject}\n\n${text}\n———————`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ from, to, subject, html, text }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${body.slice(0, 200)}`);
  }
}

async function main() {
  const conn = db();
  const now = Math.floor(Date.now() / 1000);
  const minAgo = now - 24 * 60 * 60;
  const maxAgo = now - 2 * 60 * 60;
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://citynight.gr').replace(/\/$/, '');

  const rows = conn.prepare(`
    SELECT b.id, b.site_id, b.customer_name, b.customer_email, b.lang,
           s.name AS site_name
      FROM site_bookings b
      JOIN sites s ON s.id = b.site_id
     WHERE b.status = 'completed'
       AND b.review_requested_at IS NULL
       AND b.customer_email IS NOT NULL
       AND b.completed_at IS NOT NULL
       AND b.completed_at BETWEEN ? AND ?
  `).all(minAgo, maxAgo);

  const markRequested = conn.prepare(
    `UPDATE site_bookings SET review_requested_at = unixepoch() WHERE id = ?`,
  );
  let sent = 0; let failed = 0;

  for (const row of rows) {
    const token = signReviewToken(row.site_id, row.id);
    const locale = row.lang || 'en';
    const link = `${baseUrl}/${locale}/review/${row.site_id}/${token}`;
    const subject = `How was your visit to ${row.site_name}?`;
    const text =
`Hi ${row.customer_name},

Thanks for visiting ${row.site_name}. If you have 30 seconds, we'd love a quick review:

${link}

The link is private and works only once.

— ${row.site_name}`;
    const html = `<p>Hi ${row.customer_name},</p>
<p>Thanks for visiting <strong>${row.site_name}</strong>. If you have 30 seconds, we'd love a quick review:</p>
<p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;text-decoration:none;border-radius:6px">Leave a review</a></p>
<p style="font-size:13px;color:#666">The link is private and works only once.</p>`;

    try {
      await sendEmail(row.customer_email, subject, text, html);
      markRequested.run(row.id);
      sent++;
    } catch (err) {
      failed++;
      console.error(`booking ${row.id}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`review-requests: candidates=${rows.length} sent=${sent} failed=${failed}`);
  conn.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error(err); process.exit(2); });
