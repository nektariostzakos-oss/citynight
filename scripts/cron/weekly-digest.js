#!/usr/bin/env node
// Sunday weekly digest. For every owner with at least one Featured venue
// that received traffic in the last 7 days, send a one-page summary email:
// per-venue totals (view/directions/phone/link) + WoW delta vs the prior 7d.
//
// Idempotency: weekly_digest_sent tracks (user_id, week_iso) so re-running
// in the same week is a no-op.
//
// Hostinger crontab line (every Sunday at 09:00 local):
//   0 9 * * 0  cd ~/domains/citynight.gr/public_html && node scripts/cron/weekly-digest.js >> ~/logs/weekly-digest.log 2>&1

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

function isoWeek(d = new Date()) {
  // ISO week: Thursday-anchored week-of-year per ISO 8601.
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function sendEmail({ to, subject, html, text }) {
  const key = process.env.EMAIL_API_KEY;
  if (!key) {
    console.log(`[weekly-digest] (dev) TO: ${to}\n  SUBJECT: ${subject}\n  ${text.split('\n')[0]}…`);
    return;
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
}

function fmtDelta(thisWeek, prevWeek) {
  const delta = thisWeek - prevWeek;
  if (prevWeek === 0) return thisWeek > 0 ? '+100%' : '·';
  const pct = Math.round(((thisWeek - prevWeek) / prevWeek) * 100);
  if (delta === 0) return '·';
  return (delta > 0 ? '+' : '') + pct + '%';
}

function renderRow(name, locale, citySlug, bucketSlug, venueSlug, totals) {
  const link = `${SITE_URL}/${locale}/dashboard/`;
  const venueLink = `${SITE_URL}/${locale}/greece/${citySlug}/${bucketSlug}/${venueSlug}`;
  return `
    <tr style="border-top:1px solid #1c1c29">
      <td style="padding:14px 6px;vertical-align:top">
        <div style="font-weight:600;color:#f4f4f6">${escapeHtml(name)}</div>
        <div style="font-size:11px"><a href="${venueLink}" style="color:#00e5ff;text-decoration:none">view page →</a></div>
      </td>
      <td style="padding:14px 6px;text-align:right;color:#f4f4f6">${totals.view.thisWeek} <span style="color:#9a9aa6;font-size:11px">${fmtDelta(totals.view.thisWeek, totals.view.prevWeek)}</span></td>
      <td style="padding:14px 6px;text-align:right;color:#f4f4f6">${totals.directions.thisWeek} <span style="color:#9a9aa6;font-size:11px">${fmtDelta(totals.directions.thisWeek, totals.directions.prevWeek)}</span></td>
      <td style="padding:14px 6px;text-align:right;color:#f4f4f6">${totals.phone.thisWeek} <span style="color:#9a9aa6;font-size:11px">${fmtDelta(totals.phone.thisWeek, totals.phone.prevWeek)}</span></td>
      <td style="padding:14px 6px;text-align:right;color:#f4f4f6">${totals.link.thisWeek} <span style="color:#9a9aa6;font-size:11px">${fmtDelta(totals.link.thisWeek, totals.link.prevWeek)}</span></td>
    </tr>`;
}

function buildEmail(ownerEmail, locale, rowsHtml, week) {
  const subject = `citynight digest — week ${week}`;
  const text =
    `Weekly digest for citynight.gr (${week}).\n\n` +
    `Open the dashboard for sparklines + per-day detail:\n${SITE_URL}/${locale}/dashboard\n\n` +
    `Reply to this email if anything looks off.`;
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;background:#07070b;color:#f4f4f6;padding:32px 16px;margin:0">
    <div style="max-width:600px;margin:0 auto;background:#0d0d14;padding:24px;border-radius:12px;border:1px solid #1c1c29">
      <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#9a9aa6">
        <span style="color:#f4f4f6">city</span><span style="color:#ff2d95">night</span>
        <span style="color:#9a9aa6"> · weekly digest · ${escapeHtml(week)}</span>
      </p>
      <h1 style="margin:0 0 16px;font-size:18px;color:#f4f4f6">How your venues did this week</h1>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="text-align:left;color:#9a9aa6;font-size:10px;text-transform:uppercase;letter-spacing:0.18em">
            <th style="padding:8px 6px">venue</th>
            <th style="padding:8px 6px;text-align:right">views</th>
            <th style="padding:8px 6px;text-align:right">dir.</th>
            <th style="padding:8px 6px;text-align:right">phone</th>
            <th style="padding:8px 6px;text-align:right">link</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <p style="margin:20px 0 0;font-size:12px;color:#6b6b78">
        Numbers are absolute counts for the last 7 days; the small grey % is the change vs the previous 7.
      </p>
      <p style="margin:16px 0 0">
        <a href="${SITE_URL}/${locale}/dashboard" style="color:#00e5ff;text-decoration:none;font-size:13px">Open the dashboard →</a>
      </p>
    </div></body></html>`;
  return { to: ownerEmail, subject, html, text };
}

async function main() {
  const d = db();
  const week = isoWeek(new Date());

  // Owners with at least one Featured venue.
  const owners = d.prepare(`
    SELECT DISTINCT u.id AS userId, u.email AS email, COALESCE(u.locale, 'en') AS locale
      FROM users u
      JOIN venues v ON v.owner_id = u.id
     WHERE v.tier = 'featured'
       AND u.email IS NOT NULL
  `).all();

  if (owners.length === 0) { console.log('[weekly-digest] no Featured owners.'); return; }

  const recordSent = d.prepare(
    `INSERT OR IGNORE INTO weekly_digest_sent (id, user_id, week_iso) VALUES (?, ?, ?)`,
  );
  const alreadySent = d.prepare(
    `SELECT 1 FROM weekly_digest_sent WHERE user_id = ? AND week_iso = ?`,
  );

  let sent = 0, skipped = 0, failed = 0;
  for (const o of owners) {
    if (alreadySent.get(o.userId, week)) { skipped++; continue; }

    const venues = d.prepare(`
      SELECT v.id, v.name, v.slug AS venueSlug,
             c.slug AS citySlug,
             COALESCE(a.slug, cat.slug) AS bucketSlug
        FROM venues v
        JOIN cities c ON c.id = v.city_id
        LEFT JOIN areas a ON a.id = v.area_id
        LEFT JOIN categories cat ON cat.id = v.category_id
       WHERE v.owner_id = ? AND v.tier = 'featured' AND v.slug IS NOT NULL
    `).all(o.userId);

    if (venues.length === 0) { skipped++; continue; }

    // Pull 14d totals for these venues in one query.
    const venueIds = venues.map((v) => v.id);
    const placeholders = venueIds.map(() => '?').join(',');
    const rows = d.prepare(`
      SELECT venue_id AS venueId, day, type, count FROM events_daily
       WHERE venue_id IN (${placeholders})
         AND day >= date('now', '-14 day')
    `).all(...venueIds);

    // Helper: this/prev week sums per (venue, type).
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const ymd = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    const last7 = new Set(Array.from({ length: 7 }, (_, i) => { const x = new Date(today); x.setUTCDate(today.getUTCDate() - i); return ymd(x); }));
    const prev7 = new Set(Array.from({ length: 7 }, (_, i) => { const x = new Date(today); x.setUTCDate(today.getUTCDate() - (7 + i)); return ymd(x); }));

    const totalsByVenue = new Map();
    for (const v of venues) totalsByVenue.set(v.id, {
      view:       { thisWeek: 0, prevWeek: 0 },
      directions: { thisWeek: 0, prevWeek: 0 },
      phone:      { thisWeek: 0, prevWeek: 0 },
      link:       { thisWeek: 0, prevWeek: 0 },
    });
    for (const r of rows) {
      const bucket = totalsByVenue.get(r.venueId);
      if (!bucket || !bucket[r.type]) continue;
      if (last7.has(r.day))      bucket[r.type].thisWeek += r.count;
      else if (prev7.has(r.day)) bucket[r.type].prevWeek += r.count;
    }

    // Skip the owner if everything is zero — no point emailing a "0 0 0 0" digest.
    const anySignal = venues.some((v) => {
      const t = totalsByVenue.get(v.id);
      return t && (t.view.thisWeek + t.directions.thisWeek + t.phone.thisWeek + t.link.thisWeek) > 0;
    });
    if (!anySignal) { skipped++; continue; }

    const rowsHtml = venues.map((v) =>
      renderRow(v.name, o.locale, v.citySlug, v.bucketSlug, v.venueSlug, totalsByVenue.get(v.id)),
    ).join('');
    const email = buildEmail(o.email, o.locale, rowsHtml, week);

    try {
      await sendEmail(email);
      recordSent.run(crypto.randomUUID(), o.userId, week);
      sent++;
    } catch (err) {
      failed++;
      console.error(`[weekly-digest] failed for ${o.email}:`, err.message);
    }
  }

  console.log(`[weekly-digest] week=${week} sent=${sent} skipped=${skipped} failed=${failed} owners=${owners.length}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
