#!/usr/bin/env node
// Hourly cron: collapse `events` rows into per-venue daily buckets and clear the
// raw rows once they've been counted. Keeps the events table small enough to
// stay fast in the request hot path.

import 'dotenv/config';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const p = process.env.DATABASE_PATH;
if (!p) throw new Error('DATABASE_PATH required');
const dir = path.dirname(path.resolve(p));
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(p);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Roll up rows older than 1 hour (give in-flight writers headroom).
const cutoff = Math.floor(Date.now() / 1000) - 3600;

const rollup = db.prepare(`
  SELECT venue_id AS venueId, type, strftime('%Y-%m-%d', at, 'unixepoch') AS day, COUNT(*) AS cnt
    FROM events
   WHERE at < ?
   GROUP BY venueId, type, day
`).all(cutoff);

const tx = db.transaction((rows) => {
  const upsert = db.prepare(`
    INSERT INTO events_daily (venue_id, day, type, count)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(venue_id, day, type) DO UPDATE SET count = count + excluded.count
  `);
  for (const r of rows) upsert.run(r.venueId, r.day, r.type, r.cnt);
  db.prepare('DELETE FROM events WHERE at < ?').run(cutoff);
});

tx(rollup);
console.log(`rolled up ${rollup.length} (venue,type,day) tuples; deleted raw events older than ${new Date(cutoff * 1000).toISOString()}`);
