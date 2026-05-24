// SQLite connection shared by all seed stages.
// Reads DATABASE_PATH the same as the app; opens in WAL mode for concurrent safety.

import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

let _db = null;

export function db() {
  if (_db) return _db;
  const p = process.env.DATABASE_PATH;
  if (!p) throw new Error('DATABASE_PATH is required for the seed pipeline.');
  const dir = path.dirname(path.resolve(p));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  _db = new Database(p);
  _db.pragma('journal_mode = WAL');
  _db.pragma('synchronous = NORMAL');
  _db.pragma('foreign_keys = ON');
  _db.pragma('busy_timeout = 5000');
  return _db;
}

export function uuid() {
  // Node 19+ exposes crypto.randomUUID globally.
  return crypto.randomUUID();
}

// Helper: convert a name to a city-scoped slug. Pure; no I/O.
export function slugify(s) {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
