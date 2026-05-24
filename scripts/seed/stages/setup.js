// stage: setup — ensure the persistent SQLite file exists with the schema applied.
// Re-uses the SQL migrations from /db/migrations. Idempotent.

import path from 'node:path';
import fs from 'node:fs';
import { db } from '../lib/db.js';

export async function setup({ dryRun }) {
  const handle = db();
  // The setup stage assumes `pnpm db:migrate` has been run in the app project. If
  // the schema isn't present, surface a clear error.
  try {
    handle.prepare('SELECT 1 FROM cities LIMIT 1').get();
  } catch (e) {
    throw new Error(`Schema not initialised. Run \`pnpm db:migrate\` from the app root first. (${e.message})`);
  }
  const c = handle.prepare('SELECT COUNT(*) AS n FROM cities').get().n;
  const k = handle.prepare('SELECT COUNT(*) AS n FROM categories').get().n;
  console.log(`Setup OK: cities=${c}, categories=${k}${dryRun ? ' (dry-run, no writes)' : ''}.`);
}
