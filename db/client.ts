// SQLite client. Hostinger LAW §4: the .sqlite file lives OUTSIDE the deploy path
// (env DATABASE_PATH). Deploys must NEVER overwrite it — that file is the source of
// truth for paid subscriptions and venue claims.
//
// Primary driver: better-sqlite3 (synchronous, fast, single-process — fits a Hostinger
// CloudLinux Node app). If the prebuilt binary isn't available on the deployed Node
// version, fall back to Node 22's built-in node:sqlite (also synchronous, similar API).
//
// We enable WAL mode + sane pragmas on first open. WAL is critical: it lets the ISR
// reader path and any write paths (claims, owner edits, Stripe webhooks) coexist
// without blocking each other.

import path from 'node:path';
import fs from 'node:fs';

export type SqliteDb = {
  prepare: (sql: string) => { all: (...p: unknown[]) => unknown[]; get: (...p: unknown[]) => unknown; run: (...p: unknown[]) => unknown };
  exec: (sql: string) => void;
  close: () => void;
  pragma?: (q: string) => unknown;
};

let _raw: unknown | null = null;

function dbPath(): string {
  const p = process.env.DATABASE_PATH;
  if (!p) throw new Error('DATABASE_PATH is required (see .env.example).');
  // Ensure parent dir exists in dev; on Hostinger the persistent dir must be pre-provisioned.
  const dir = path.dirname(path.resolve(p));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return p;
}

function applyPragmas(db: { exec: (s: string) => void }) {
  // WAL + reasonable concurrency knobs.
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA temp_store = MEMORY;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    PRAGMA cache_size = -20000;
  `);
}

export function getRawSqlite(): SqliteDb {
  if (_raw) return _raw as SqliteDb;

  // Lazy require so Next can tree-shake the driver out of the client bundle.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Better = require('better-sqlite3') as new (file: string) => SqliteDb;
    const db = new Better(dbPath());
    applyPragmas(db);
    _raw = db;
    return db;
  } catch (err) {
    // Fall back to node:sqlite (Node 22+). Surfaces a clearer error if neither works.
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { DatabaseSync } = require('node:sqlite') as { DatabaseSync: new (file: string) => SqliteDb };
      const db = new DatabaseSync(dbPath());
      applyPragmas(db);
      _raw = db;
      return db;
    } catch (fallbackErr) {
      const msg = err instanceof Error ? err.message : String(err);
      const fmsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      throw new Error(
        `Could not open SQLite: better-sqlite3 failed (${msg}) and node:sqlite fallback failed (${fmsg}). Requires Node 22+ for the fallback.`,
      );
    }
  }
}

// Drizzle wrapper is added in Phase 1 alongside db/schema.ts.
