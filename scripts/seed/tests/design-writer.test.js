#!/usr/bin/env node
// §6 RULE 1 enforcement test (Phase C). Runs without a test runner — uses node:assert.
//
//   node scripts/seed/tests/design-writer.test.js
//
// Asserts:
//   1. DesignWriter exposes a single mutation method (writeDesignParams).
//   2. ALLOWED_WRITE_COLUMNS lists exactly one column: venues.design_params.
//   3. Writing a valid DesignParams sets venues.design_params and leaves
//      every fact column + description byte-for-byte unchanged.
//   4. Writing an invalid blob is rejected; no DB mutation.
//   5. Writing to a row with design_params_locked=1 is refused with reason='locked'.
//   6. The JS schema mirror (scripts/seed/lib/design-schema.js) matches the
//      TypeScript enums in lib/design-system.ts — no drift.

import { strict as assert } from 'node:assert';
import Database from 'better-sqlite3';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { DesignWriter, ALLOWED_WRITE_COLUMNS } from '../lib/design-writer.js';
import {
  PALETTE_IDS, TYPE_PAIR_IDS, HERO_LAYOUTS, DENSITIES, MOTIONS, SECTIONS,
} from '../lib/design-schema.js';

const FACT_COLUMNS_INCL_DESCRIPTION = [
  'name', 'address', 'phone', 'opening_hours', 'price_level', 'website',
  'lat', 'lng', 'status', 'claim', 'owner_id', 'tier', 'rating',
  'review_count', 'business_status', 'is_permanently_closed',
  'google_place_id', 'city_id', 'area_id', 'category_id', 'description',
];

function freshDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE venues (
      id TEXT PRIMARY KEY,
      slug TEXT,
      city_id TEXT NOT NULL,
      area_id TEXT,
      category_id TEXT,
      google_place_id TEXT,
      name TEXT NOT NULL,
      address TEXT,
      lat REAL,
      lng REAL,
      phone TEXT,
      opening_hours TEXT,
      price_level INTEGER,
      website TEXT,
      description TEXT,
      field_sources TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'draft',
      claim TEXT NOT NULL DEFAULT 'unclaimed',
      owner_id TEXT,
      tier TEXT NOT NULL DEFAULT 'free',
      rating REAL,
      review_count INTEGER,
      business_status TEXT,
      is_permanently_closed INTEGER NOT NULL DEFAULT 0,
      seed_photo_refs TEXT,
      design_params TEXT,
      design_params_locked INTEGER NOT NULL DEFAULT 0,
      last_synced_at INTEGER,
      created_at INTEGER,
      published_at INTEGER
    );
  `);
  db.prepare(`
    INSERT INTO venues (id, city_id, name, address, phone, opening_hours, price_level, website, rating, review_count, status, description)
    VALUES ('v1', 'city_athens', 'Six DOGS', 'Avramiotou 6-8, Athens', '+302103210510', '{"open":"all-week"}', 2, 'https://sixdogs.gr', 4.4, 1200, 'published', 'A garden bar in a converted house.')
  `).run();
  db.prepare(`
    INSERT INTO venues (id, city_id, name, status, description, design_params_locked)
    VALUES ('v_locked', 'city_athens', 'Locked Lounge', 'published', 'Owner-overridden.', 1)
  `).run();
  return db;
}

function snapshot(db, id) {
  const row = db.prepare('SELECT * FROM venues WHERE id = ?').get(id);
  const out = {};
  for (const c of FACT_COLUMNS_INCL_DESCRIPTION) out[c] = row[c];
  return out;
}

const VALID_PARAMS = {
  v: 1,
  palette: 'electric-violet',
  typePair: 'industrial',
  heroLayout: 'layered',
  density: 'default',
  motion: 'dynamic',
  sectionOrder: ['overview', 'events', 'hours', 'location', 'faq', 'related'],
};

// --- Assertion 1: surface is narrow -------------------------------------
{
  const db = freshDb();
  const w = new DesignWriter(db);
  const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(w))
    .filter((k) => typeof w[k] === 'function' && k !== 'constructor');
  assert.deepEqual(methods, ['writeDesignParams'],
    `DesignWriter must expose only writeDesignParams; saw: ${methods.join(',')}`);
  assert.deepEqual([...ALLOWED_WRITE_COLUMNS], ['venues.design_params'],
    'ALLOWED_WRITE_COLUMNS must list exactly venues.design_params.');
  console.log('PASS  surface: only writeDesignParams exists.');
}

// --- Assertion 2: valid write persists, fact columns untouched ----------
{
  const db = freshDb();
  const before = snapshot(db, 'v1');
  const w = new DesignWriter(db);
  const res = w.writeDesignParams('v1', VALID_PARAMS);
  assert.equal(res.written, true);
  const row = db.prepare('SELECT design_params FROM venues WHERE id = ?').get('v1');
  const stored = JSON.parse(row.design_params);
  assert.equal(stored.palette, 'electric-violet');
  assert.equal(stored.heroLayout, 'layered');
  assert.deepEqual(stored.sectionOrder, VALID_PARAMS.sectionOrder);
  const after = snapshot(db, 'v1');
  assert.deepEqual(after, before, 'A fact column or description changed — §6 RULE 1 violated.');
  console.log('PASS  valid write: design_params set, every fact column + description unchanged.');
}

// --- Assertion 3: invalid blobs rejected, no mutation -------------------
{
  const db = freshDb();
  const before = snapshot(db, 'v1');
  const w = new DesignWriter(db);

  const cases = [
    null, undefined, {}, { v: 1 },
    { ...VALID_PARAMS, palette: 'banana' },
    { ...VALID_PARAMS, typePair: 'gothic' },
    { ...VALID_PARAMS, heroLayout: 'splitscreen' },
    { ...VALID_PARAMS, density: 'crowded' },
    { ...VALID_PARAMS, motion: 'wild' },
    { ...VALID_PARAMS, v: 0 },
    { ...VALID_PARAMS, v: 99 },
  ];
  for (const bad of cases) {
    const r = w.writeDesignParams('v1', bad);
    assert.equal(r.written, false, `expected rejection for ${JSON.stringify(bad)}`);
    assert.equal(r.reason, 'invalid');
  }
  const row = db.prepare('SELECT design_params FROM venues WHERE id = ?').get('v1');
  assert.equal(row.design_params, null, 'design_params must remain unchanged after rejected writes.');
  const after = snapshot(db, 'v1');
  assert.deepEqual(after, before);
  console.log('PASS  invalid blobs rejected; no rows mutated.');
}

// --- Assertion 4: bad inputs throw cleanly ------------------------------
{
  const db = freshDb();
  const w = new DesignWriter(db);
  assert.throws(() => w.writeDesignParams('', VALID_PARAMS));
  assert.throws(() => w.writeDesignParams(null, VALID_PARAMS));
  console.log('PASS  bad inputs throw without touching DB.');
}

// --- Assertion 5: locked rows refuse writes -----------------------------
{
  const db = freshDb();
  const before = snapshot(db, 'v_locked');
  const w = new DesignWriter(db);
  const res = w.writeDesignParams('v_locked', VALID_PARAMS);
  assert.equal(res.written, false);
  assert.equal(res.reason, 'locked');
  const row = db.prepare('SELECT design_params FROM venues WHERE id = ?').get('v_locked');
  assert.equal(row.design_params, null, 'Locked venue must not receive design_params.');
  const after = snapshot(db, 'v_locked');
  assert.deepEqual(after, before);
  console.log('PASS  design_params_locked=1 → write refused, row unchanged.');
}

// --- Assertion 6: missing venue surfaces as not_found -------------------
{
  const db = freshDb();
  const w = new DesignWriter(db);
  const res = w.writeDesignParams('ghost', VALID_PARAMS);
  assert.equal(res.written, false);
  assert.equal(res.reason, 'not_found');
  console.log('PASS  unknown venue id → reason=not_found.');
}

// --- Assertion 7: JS schema mirror matches TS source --------------------
// Reads lib/design-system.ts as text and extracts each enum's `as const`
// array literal, then deep-equals against the JS mirror. Avoids needing a
// TS loader at runtime — pure source-level check, drift fails CI either way.
{
  const fs = await import('node:fs');
  const tsPath = path.resolve(process.cwd(), 'lib/design-system.ts');
  const src = fs.readFileSync(tsPath, 'utf8');

  function literalArray(name) {
    // Match either:   export const NAME = [ ... ] as const
    // or             const NAME = [ ... ] as const satisfies ...
    const re = new RegExp(
      `export\\s+const\\s+${name}\\s*=\\s*\\[(?<body>[\\s\\S]*?)\\]\\s*as\\s+const`,
    );
    const m = src.match(re);
    if (!m || !m.groups) throw new Error(`could not locate ${name} in design-system.ts`);
    const items = [...m.groups.body.matchAll(/'([^']+)'/g)].map((x) => x[1]);
    if (!items.length) throw new Error(`${name} parsed to empty list`);
    return items;
  }

  // PALETTES is an array of objects; we want the `id:` values only.
  const palettesBlock = src.match(/export\s+const\s+PALETTES\s*=\s*\[(?<body>[\s\S]*?)\]\s*as\s+const/);
  if (!palettesBlock?.groups) throw new Error('could not locate PALETTES in design-system.ts');
  const palettesFromTs = [...palettesBlock.groups.body.matchAll(/id:\s*'([^']+)'/g)].map((x) => x[1]);

  // TYPE_PAIRS — same shape.
  const typePairsBlock = src.match(/export\s+const\s+TYPE_PAIRS\s*=\s*\[(?<body>[\s\S]*?)\]\s*as\s+const/);
  if (!typePairsBlock?.groups) throw new Error('could not locate TYPE_PAIRS in design-system.ts');
  const typePairsFromTs = [...typePairsBlock.groups.body.matchAll(/id:\s*'([^']+)'/g)].map((x) => x[1]);

  assert.deepEqual([...PALETTE_IDS],   palettesFromTs,    'PALETTE_IDS drift between JS mirror and TS source.');
  assert.deepEqual([...TYPE_PAIR_IDS], typePairsFromTs,   'TYPE_PAIR_IDS drift between JS mirror and TS source.');
  assert.deepEqual([...HERO_LAYOUTS],  literalArray('HERO_LAYOUTS'), 'HERO_LAYOUTS drift.');
  assert.deepEqual([...DENSITIES],     literalArray('DENSITIES'),    'DENSITIES drift.');
  assert.deepEqual([...MOTIONS],       literalArray('MOTIONS'),      'MOTIONS drift.');
  assert.deepEqual([...SECTIONS],      literalArray('SECTIONS'),     'SECTIONS drift.');
  console.log('PASS  JS schema mirror matches lib/design-system.ts (source-level check).');
}

console.log('\nAll design-writer integrity tests passed.');
