// Bare-bones SQL migration runner. Reads every file in db/migrations/*.sql in
// lexical order and runs the ones that haven't been applied yet. Each migration
// runs in a transaction. Records applied filenames in `_migrations`.
//
// We don't use drizzle-kit's migrator because we mix hand-written SQL (FTS5 +
// virtual tables + triggers) with the schema migration; drizzle-kit's generated
// migrations can be added later and slotted in alphabetically.

import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';

// Load .env.local first (Next's convention), then fall back to .env.
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

// eslint-disable-next-line import/first
import { getRawSqlite } from './client';

function ensureMigrationsTable(db: ReturnType<typeof getRawSqlite>) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);
}

function applied(db: ReturnType<typeof getRawSqlite>): Set<string> {
  const rows = db.prepare('SELECT name FROM _migrations').all() as { name: string }[];
  return new Set(rows.map((r) => r.name));
}

function main() {
  const db = getRawSqlite();
  ensureMigrationsTable(db);
  const done = applied(db);

  const dir = path.resolve(__dirname, 'migrations');
  if (!fs.existsSync(dir)) {
    console.error(`No migrations directory at ${dir}`);
    process.exit(1);
  }
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  for (const f of files) {
    if (done.has(f)) {
      console.log(`= ${f} (already applied)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    console.log(`+ ${f}`);
    db.exec('BEGIN');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(f);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      console.error(`Failed: ${f}`);
      throw err;
    }
  }

  console.log('Migrations complete.');
}

main();
