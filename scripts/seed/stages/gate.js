import { db } from '../lib/db.js';
import { runGates } from '../lib/gates.js';

export async function gate({ dryRun }) {
  if (dryRun) {
    console.log('[gate] dry-run: gates not applied.');
    return;
  }
  const counts = runGates(db());
  console.log('[gate]', counts);
}
