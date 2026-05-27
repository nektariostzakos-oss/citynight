#!/usr/bin/env node
// Phase I.10 — booking reminder cron.
//
// Scans for site_bookings whose date+time falls in the next 7h55m–8h05m
// window (in the site's local timezone), are not cancelled/no_show, have
// a customer email on file, and haven't been reminded yet. Emails each
// one a "see you tomorrow" reminder via Resend (or logs in dev). Sets
// reminded_at after a successful send so subsequent cron passes skip.
//
// Schedule: every 5 minutes. The ±5min window guarantees each booking
// catches exactly one cron pass even if one is missed.

import 'dotenv/config';
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const DEFAULT_TZ = 'Europe/Athens';

function db() {
  const p = process.env.DATABASE_PATH;
  if (!p) throw new Error('DATABASE_PATH required');
  const dir = path.dirname(path.resolve(p));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const d = new Database(p);
  d.pragma('journal_mode = WAL');
  return d;
}

// Pure-Node port of lib/booking/tz.ts wallClockInTzToUtc — kept inline so
// this script has zero TS/ESM compile step.
function wallClockInTzToUtc(dateIso, time, tz = DEFAULT_TZ) {
  const [y, m, d] = dateIso.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  if (![y, m, d, hh, mm].every(Number.isFinite)) return NaN;
  const guessUtc = Date.UTC(y, m - 1, d, hh, mm);
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
    const parts = {};
    for (const p of fmt.formatToParts(new Date(guessUtc))) {
      if (p.type !== 'literal') parts[p.type] = p.value;
    }
    const seenH = parseInt(parts.hour, 10) === 24 ? 0 : parseInt(parts.hour, 10);
    const seen = Date.UTC(
      parseInt(parts.year, 10), parseInt(parts.month, 10) - 1,
      parseInt(parts.day, 10), seenH, parseInt(parts.minute, 10),
    );
    return guessUtc - (seen - guessUtc);
  } catch { return guessUtc; }
}

async function sendEmail(to, subject, text, html) {
  const key = process.env.EMAIL_API_KEY;
  const from = process.env.EMAIL_FROM ?? 'citynight.gr <noreply@citynight.gr>';
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('EMAIL_API_KEY required in production');
    }
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

function buildBody(site, booking) {
  const text =
`Hi ${booking.customer_name},

Reminder: you're booked at ${site.name} tomorrow at ${booking.time} for ${booking.service_name}.

If you can't make it, reply to this email or call ${site.phone ?? 'the shop'}.

— ${site.name}`;
  const html = `<p>Hi ${booking.customer_name},</p>
<p>Reminder: you're booked at <strong>${site.name}</strong> tomorrow at <strong>${booking.time}</strong> for <strong>${booking.service_name}</strong>.</p>
<p>If you can't make it, reply to this email${site.phone ? ` or call ${site.phone}` : ''}.</p>
<p>— ${site.name}</p>`;
  return { text, html };
}

async function main() {
  const conn = db();
  const now = Date.now();
  const fromMs = now + (8 * 60 - 5) * 60_000;   // 7h55m
  const toMs   = now + (8 * 60 + 5) * 60_000;   // 8h05m

  const rows = conn.prepare(`
    SELECT b.id, b.date, b.time, b.customer_name, b.customer_email,
           s.name AS site_name, s.country, s.phone AS site_phone,
           svc.name AS service_name
      FROM site_bookings b
      JOIN sites s ON s.id = b.site_id
      JOIN site_services svc ON svc.id = b.service_id
     WHERE b.status NOT IN ('cancelled','no_show','completed')
       AND b.reminded_at IS NULL
       AND b.customer_email IS NOT NULL
       AND b.date >= date('now', '-1 day')
       AND b.date <= date('now', '+2 days')
  `).all();

  const markReminded = conn.prepare(`UPDATE site_bookings SET reminded_at = unixepoch() WHERE id = ?`);
  let sent = 0; let skipped = 0; let failed = 0;

  for (const row of rows) {
    const tz = DEFAULT_TZ; // future: read sites.timezone column
    const slotUtc = wallClockInTzToUtc(row.date, row.time, tz);
    if (!Number.isFinite(slotUtc) || slotUtc < fromMs || slotUtc > toMs) {
      skipped++; continue;
    }
    try {
      const { text, html } = buildBody(
        { name: row.site_name, phone: row.site_phone },
        row,
      );
      await sendEmail(row.customer_email, `Reminder: ${row.site_name} tomorrow at ${row.time}`, text, html);
      markReminded.run(row.id);
      sent++;
    } catch (err) {
      failed++;
      console.error(`booking ${row.id}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`booking-reminders: candidates=${rows.length} sent=${sent} skipped=${skipped} failed=${failed}`);
  conn.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error(err); process.exit(2); });
