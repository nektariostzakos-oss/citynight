#!/usr/bin/env node
// CLI: node run.js <setup|ingest|enrich|photos|gate|all> [--city=slug] [--dry-run]

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { setup } from './stages/setup.js';
import { ingest } from './stages/ingest.js';
import { enrich } from './stages/enrich.js';
import { photos } from './stages/photos.js';
import { gate } from './stages/gate.js';
import { cityPhotos } from './stages/city-photos.js';
import { demoVenuePhotos } from './stages/demo-venue-photos.js';
import { design } from './stages/design.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (const a of argv) {
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      flags[k] = v ?? true;
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const stage = positional[0] ?? 'all';
  const citySlug = flags.city ?? null;
  const dryRun = !!flags['dry-run'];

  const force = !!flags.force;
  const ctx = { cfg, citySlug, dryRun, force };
  console.log(`citynight-seed: stage=${stage} city=${citySlug ?? '*'} dryRun=${dryRun}`);

  if (stage === 'setup' || stage === 'all') await setup(ctx);
  if (stage === 'city-photos') await cityPhotos(ctx);
  if (stage === 'demo-venue-photos') await demoVenuePhotos(ctx);
  if (stage === 'demo-photos') { await cityPhotos(ctx); await demoVenuePhotos(ctx); }
  if (stage === 'ingest' || stage === 'all') await ingest(ctx);
  if (stage === 'enrich' || stage === 'all') await enrich(ctx);
  if (stage === 'photos' || stage === 'all') await photos(ctx);
  if (stage === 'gate'   || stage === 'all') await gate(ctx);
  // design runs after gate so we only generate design_params for published venues.
  if (stage === 'design' || stage === 'all') await design(ctx);
}

main().catch((e) => { console.error(e); process.exit(1); });
