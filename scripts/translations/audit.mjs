#!/usr/bin/env node
// Translation coverage audit. Walks every entity that needs localized
// content (cities, areas, categories, venues) × every supported locale
// (en/el/de/fr/it) × every translatable field and reports:
//
//   1. Per-locale completion %
//   2. Worst-covered entity types
//   3. Missing tuples in CSV form on stdout (optional --csv flag)
//
// No writes. Read-only against $DATABASE_PATH. Run:
//   node scripts/translations/audit.mjs                # summary only
//   node scripts/translations/audit.mjs --csv > gaps.csv  # full per-row dump

import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

// Load .env.local first (Next's convention), then .env, mirroring db/migrate.ts.
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const LOCALES = ['en', 'el', 'de', 'fr', 'it'];
// (entity, field) tuples we expect to be translated. Add new tuples here
// when new translatable surfaces ship.
const TARGETS = [
  { entity: 'city',     field: 'name' },
  { entity: 'city',     field: 'intro' },        // editorial intros live in MDX too, but tracked here for parity
  { entity: 'area',     field: 'name' },
  { entity: 'category', field: 'name' },
  { entity: 'venue',    field: 'description' },
];

const args = new Set(process.argv.slice(2));
const wantCsv = args.has('--csv');

function dbHandle() {
  const p = process.env.DATABASE_PATH;
  if (!p) throw new Error('DATABASE_PATH required');
  const dir = path.dirname(path.resolve(p));
  if (!fs.existsSync(dir)) throw new Error(`DB dir missing: ${dir}`);
  return new Database(p, { readonly: true });
}

function loadEntityIds(db) {
  return {
    city:     db.prepare(`SELECT id, slug FROM cities WHERE is_published = 1`).all(),
    area:     db.prepare(`SELECT a.id, a.slug, c.slug AS citySlug FROM areas a JOIN cities c ON c.id = a.city_id WHERE c.is_published = 1`).all(),
    category: db.prepare(`SELECT id, slug FROM categories`).all(),
    venue:    db.prepare(`SELECT id, slug FROM venues WHERE status = 'published' AND slug IS NOT NULL`).all(),
  };
}

function loadCovered(db) {
  // entityType|entityId|field|locale → 1
  const rows = db.prepare(`SELECT entity_type, entity_id, field, locale FROM translations`).all();
  const set = new Set();
  for (const r of rows) set.add(`${r.entity_type}|${r.entity_id}|${r.field}|${r.locale}`);
  return set;
}

const db = dbHandle();
const entities = loadEntityIds(db);
const covered = loadCovered(db);

// Build per-locale tally + collect gaps.
const totals = Object.fromEntries(LOCALES.map((l) => [l, { needed: 0, have: 0 }]));
const gaps = []; // [{entity, entityId, slug, field, locale}]
const perEntity = Object.fromEntries(TARGETS.map((t) => [`${t.entity}.${t.field}`, { needed: 0, have: 0 }]));

for (const t of TARGETS) {
  const rows = entities[t.entity];
  if (!rows?.length) continue;
  for (const e of rows) {
    for (const locale of LOCALES) {
      // English is the canonical column on the row itself — don't audit EN
      // translations rows; presence of the base column = covered.
      const slot = `${t.entity}.${t.field}`;
      perEntity[slot].needed++;
      totals[locale].needed++;

      // For locale='en' we accept the base column (cities.name, venues.description).
      if (locale === 'en') {
        // Treat the base column as the EN copy. Assume present unless the
        // row lacks it; we don't actually re-check every base column here
        // (auditing emptiness is a separate concern).
        perEntity[slot].have++;
        totals.en.have++;
        continue;
      }
      const key = `${t.entity}|${e.id}|${t.field}|${locale}`;
      if (covered.has(key)) {
        perEntity[slot].have++;
        totals[locale].have++;
      } else {
        gaps.push({ entity: t.entity, entityId: e.id, slug: e.slug, field: t.field, locale });
      }
    }
  }
}

function pct(have, needed) {
  if (!needed) return '—';
  return `${Math.round((have / needed) * 100)}%`;
}

if (wantCsv) {
  process.stdout.write('entity,entityId,slug,field,locale\n');
  for (const g of gaps) process.stdout.write(`${g.entity},${g.entityId},${g.slug},${g.field},${g.locale}\n`);
  process.exit(0);
}

console.log('Translation coverage audit\n');
console.log('Per-locale (excluding EN base):');
console.log('Locale  Have / Needed   %');
console.log('───────────────────────────────');
for (const l of LOCALES) {
  if (l === 'en') continue;
  const { have, needed } = totals[l];
  console.log(`${l.padEnd(7)} ${String(have).padStart(5)} / ${String(needed).padStart(5)}   ${pct(have, needed).padStart(4)}`);
}

console.log('\nPer (entity, field) — across all non-EN locales:');
console.log('Slot                       Have / Needed   %');
console.log('────────────────────────────────────────────');
for (const t of TARGETS) {
  const slot = `${t.entity}.${t.field}`;
  // perEntity has been incremented across all locales including EN; subtract
  // the EN portion so the % reflects the translation work, not the base.
  const enRows = (entities[t.entity]?.length ?? 0);
  const have = perEntity[slot].have - enRows;
  const needed = perEntity[slot].needed - enRows;
  console.log(`${slot.padEnd(26)} ${String(have).padStart(5)} / ${String(needed).padStart(5)}   ${pct(have, needed).padStart(4)}`);
}

console.log(`\nTotal gaps: ${gaps.length}`);
console.log(`Run again with --csv to dump every gap row.`);
