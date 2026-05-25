#!/usr/bin/env node
// §6 RULE 3 enforcement test for the seed-pipeline gate stage. Imports the
// real `runGates` from scripts/seed/lib/gates.js and runs it against an
// in-memory SQLite mirror so a regression in the gate logic breaks fast.
//
//   node scripts/tests/gates.test.mjs
//
// Asserts the three documented transitions:
//   1. CLOSED_PERMANENTLY (or is_permanently_closed=1) → status='closed'.
//   2. Slugified-name collision inside (city, category) within ~60 m →
//      higher review_count wins, the other is 'rejected'.
//   3. Confidence: review_count ≥ 5 AND description length > 30 → 'published'
//      with a unique slug + publishedAt. Otherwise → 'pending'.

import { strict as assert } from 'node:assert';
import Database from 'better-sqlite3';
import { runGates } from '../seed/lib/gates.js';

function freshDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE venues (
      id TEXT PRIMARY KEY,
      slug TEXT,
      city_id TEXT NOT NULL,
      category_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      lat REAL, lng REAL,
      review_count INTEGER,
      business_status TEXT,
      is_permanently_closed INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft',
      published_at INTEGER
    );
  `);
  return db;
}

function insert(db, row) {
  const cols = Object.keys(row);
  const placeholders = cols.map(() => '?').join(',');
  db.prepare(`INSERT INTO venues (${cols.join(',')}) VALUES (${placeholders})`).run(...cols.map((c) => row[c]));
}

function status(db, id) {
  return db.prepare('SELECT status, slug, published_at AS publishedAt FROM venues WHERE id = ?').get(id);
}

const LONG_DESC = 'A multi-level club hidden behind an unmarked door — the kind of place locals refuse to point tourists to.';

// ── Gate 1: closed-permanently flips → closed ────────────────────────────
{
  const db = freshDb();
  insert(db, { id: 'v_closed_a', city_id: 'c1', name: 'Old Joint', is_permanently_closed: 1, review_count: 200, description: LONG_DESC });
  insert(db, { id: 'v_closed_b', city_id: 'c1', name: 'Other Joint', business_status: 'CLOSED_PERMANENTLY', review_count: 200, description: LONG_DESC });
  insert(db, { id: 'v_alive',    city_id: 'c1', name: 'Alive Joint', review_count: 50, description: LONG_DESC });
  const counts = runGates(db);
  assert.equal(status(db, 'v_closed_a').status, 'closed');
  assert.equal(status(db, 'v_closed_b').status, 'closed');
  assert.equal(status(db, 'v_alive').status, 'published');
  assert.ok(counts.closed >= 2, `expected at least 2 closed, got ${counts.closed}`);
  console.log('PASS  CLOSED_PERMANENTLY → closed.');
}

// ── Gate 2: dedupe inside (city, category) by slugified name ≤60 m ───────
{
  const db = freshDb();
  // Two venues, same slugified name, same city + category, 30 m apart.
  insert(db, { id: 'v_dup_winner', city_id: 'c1', category_id: 'k1', name: 'Six DOGS', lat: 37.97600, lng: 23.72600, review_count: 1200, description: LONG_DESC });
  insert(db, { id: 'v_dup_loser',  city_id: 'c1', category_id: 'k1', name: 'six dogs', lat: 37.97625, lng: 23.72600, review_count:   50, description: LONG_DESC });
  // Far-apart same-name venue — must NOT be deduped (different building).
  insert(db, { id: 'v_far_a', city_id: 'c1', category_id: 'k1', name: 'Mama', lat: 37.97, lng: 23.72, review_count: 100, description: LONG_DESC });
  insert(db, { id: 'v_far_b', city_id: 'c1', category_id: 'k1', name: 'Mama', lat: 38.05, lng: 23.80, review_count: 100, description: LONG_DESC });

  runGates(db);
  assert.equal(status(db, 'v_dup_winner').status, 'published', 'higher review_count must win the dedupe');
  assert.equal(status(db, 'v_dup_loser').status,  'rejected',  'lower review_count must lose the dedupe');
  assert.notEqual(status(db, 'v_far_a').status, 'rejected', 'far-apart same-name venue must NOT be deduped');
  assert.notEqual(status(db, 'v_far_b').status, 'rejected', 'far-apart same-name venue must NOT be deduped');
  console.log('PASS  dedupe by slug within 60 m, by review_count.');
}

// ── Gate 3a: confidence — promote when review_count≥5 AND description>30 ─
{
  const db = freshDb();
  insert(db, { id: 'v_pub', city_id: 'c1', name: 'Great Bar', review_count: 25, description: LONG_DESC });
  runGates(db);
  const r = status(db, 'v_pub');
  assert.equal(r.status, 'published');
  assert.ok(r.slug, 'published venue must have a slug');
  assert.ok(r.publishedAt, 'published venue must have publishedAt');
  console.log('PASS  confidence promote: review_count≥5 + description>30 → published.');
}

// ── Gate 3b: confidence — hold when review_count too low ────────────────
{
  const db = freshDb();
  insert(db, { id: 'v_low', city_id: 'c1', name: 'Quiet New Spot', review_count: 2, description: LONG_DESC });
  runGates(db);
  const r = status(db, 'v_low');
  assert.equal(r.status, 'pending');
  assert.equal(r.slug, null, 'pending venue must not get a public slug yet');
  console.log('PASS  confidence hold: review_count<5 → pending.');
}

// ── Gate 3c: confidence — hold when description missing or too short ────
{
  const db = freshDb();
  insert(db, { id: 'v_nodesc',  city_id: 'c1', name: 'Bar Nodesc', review_count: 50, description: null });
  insert(db, { id: 'v_tinydesc', city_id: 'c1', name: 'Bar Tiny',  review_count: 50, description: 'short.' });
  runGates(db);
  assert.equal(status(db, 'v_nodesc').status,  'pending', 'no description → pending');
  assert.equal(status(db, 'v_tinydesc').status, 'pending', 'description ≤30 chars → pending');
  console.log('PASS  confidence hold: missing/short description → pending.');
}

// ── Gate 3d: unique slug — second venue with same name gets -2 suffix ───
{
  const db = freshDb();
  insert(db, { id: 'v_dup_slug_a', city_id: 'c1', name: 'Rooftop',                     review_count: 50, description: LONG_DESC, lat: 37.90, lng: 23.70 });
  insert(db, { id: 'v_dup_slug_b', city_id: 'c1', name: 'Rooftop',                     review_count: 50, description: LONG_DESC, lat: 38.10, lng: 23.90 });
  // Both pass confidence, no dedupe (far apart). Slugs must differ.
  runGates(db);
  const a = status(db, 'v_dup_slug_a');
  const b = status(db, 'v_dup_slug_b');
  assert.equal(a.status, 'published');
  assert.equal(b.status, 'published');
  assert.notEqual(a.slug, b.slug, 'two same-name venues in one city must get different slugs');
  console.log(`PASS  unique slug: ${a.slug} / ${b.slug}.`);
}

// ── Idempotency: re-running gates on already-published venues is a no-op ─
{
  const db = freshDb();
  insert(db, { id: 'v_idem', city_id: 'c1', name: 'Idem Bar', review_count: 50, description: LONG_DESC });
  runGates(db);
  const first = status(db, 'v_idem');
  runGates(db);
  const second = status(db, 'v_idem');
  assert.equal(first.status, second.status);
  assert.equal(first.slug, second.slug);
  assert.equal(first.publishedAt, second.publishedAt, 'publishedAt must not change on re-run');
  console.log('PASS  re-running gates is idempotent on already-published rows.');
}

console.log('\nAll gates tests passed.');
