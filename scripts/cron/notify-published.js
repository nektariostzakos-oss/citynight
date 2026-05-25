#!/usr/bin/env node
// Notify owners whose claimed venues flipped to status='published' since the
// last cron tick. Picks rows with:
//   - status = 'published'
//   - owner_id IS NOT NULL
//   - published_notification_sent_at IS NULL
//
// Sends the venuePublishedEmail template via Resend (or logs to stdout if
// no EMAIL_API_KEY — same dev-fallback shape as lib/email.ts).
//
// Stamps published_notification_sent_at on success so we never double-send.
// Per-row failures are logged but don't abort the batch.
//
// Hostinger crontab line (every 15 minutes):
//   */15 * * * *  cd ~/domains/citynight.gr/public_html && node scripts/cron/notify-published.js >> ~/logs/notify-published.log 2>&1

import 'dotenv/config';
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const RESEND_URL = 'https://api.resend.com/emails';
const FROM = process.env.EMAIL_FROM ?? 'citynight.gr <noreply@citynight.gr>';
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://citynight.gr').replace(/\/$/, '');

function db() {
  const p = process.env.DATABASE_PATH;
  if (!p) throw new Error('DATABASE_PATH required');
  const dir = path.dirname(path.resolve(p));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const d = new Database(p);
  d.pragma('journal_mode = WAL');
  d.pragma('foreign_keys = ON');
  return d;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function template(venueName, publicUrl) {
  const subject = `${venueName} is live on citynight.gr`;
  const text =
    `${venueName} is now publicly listed: ${publicUrl}\n\n` +
    `Share the link with customers — Open Graph + structured data are wired ` +
    `so previews render with your hero photo and name.`;
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;background:#07070b;color:#f4f4f6;padding:40px 20px;margin:0">
    <div style="max-width:520px;margin:0 auto;background:#0d0d14;padding:32px;border-radius:12px;border:1px solid #1c1c29">
      <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#9a9aa6">
        <span style="color:#f4f4f6">city</span><span style="color:#ff2d95">night</span>
      </p>
      <h1 style="margin:0 0 16px;font-size:20px">${escapeHtml(venueName)} is live</h1>
      <p style="color:#cfcfd6;margin:0 0 16px">
        Your venue passed validation and is publicly listed on citynight.gr.
      </p>
      <p><a href="${publicUrl}" style="display:inline-block;background:#ff2d95;color:#07070b;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:600">See the live page →</a></p>
    </div></body></html>`;
  return { subject, html, text };
}

async function sendEmail({ to, subject, html, text }) {
  const key = process.env.EMAIL_API_KEY;
  if (!key) {
    console.log(`[notify-published] (dev) TO: ${to}\n  SUBJECT: ${subject}\n  ${text.split('\n')[0]}…`);
    return { ok: true };
  }
  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ from: FROM, to, subject, html, text }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${body.slice(0, 200)}`);
  }
  return { ok: true };
}

async function main() {
  const d = db();
  const rows = d.prepare(`
    SELECT v.id, v.name,
           u.email AS ownerEmail, u.locale AS ownerLocale,
           c.slug AS citySlug,
           COALESCE(a.slug, cat.slug) AS bucketSlug,
           v.slug AS venueSlug
      FROM venues v
      JOIN users u ON u.id = v.owner_id
      JOIN cities c ON c.id = v.city_id
      LEFT JOIN areas a ON a.id = v.area_id
      LEFT JOIN categories cat ON cat.id = v.category_id
     WHERE v.status = 'published'
       AND v.owner_id IS NOT NULL
       AND v.published_notification_sent_at IS NULL
       AND v.slug IS NOT NULL
       AND u.email IS NOT NULL
     LIMIT 200
  `).all();

  if (rows.length === 0) {
    console.log('[notify-published] nothing to send.');
    return;
  }

  const stamp = d.prepare(`UPDATE venues SET published_notification_sent_at = unixepoch() WHERE id = ?`);
  let sent = 0, failed = 0;
  for (const r of rows) {
    try {
      const locale = r.ownerLocale ?? 'en';
      const publicUrl = `${SITE_URL}/${locale}/greece/${r.citySlug}/${r.bucketSlug}/${r.venueSlug}`;
      const tmpl = template(r.name, publicUrl);
      await sendEmail({ to: r.ownerEmail, subject: tmpl.subject, html: tmpl.html, text: tmpl.text });
      stamp.run(r.id);
      sent++;
    } catch (err) {
      failed++;
      console.error(`[notify-published] failed for ${r.id} (${r.ownerEmail}):`, err.message);
    }
  }
  console.log(`[notify-published] sent=${sent} failed=${failed} total=${rows.length}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
