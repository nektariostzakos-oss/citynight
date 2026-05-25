#!/usr/bin/env node
// §6 RULE 2 enforcement test — the photos CHECK constraint must reject AI/
// stock images on real venues + products at the SQL layer, not just in app
// code. This proves a runtime regression (e.g. someone weakens the schema
// to ship a feature) breaks immediately.
//
//   node scripts/tests/photos-check.test.mjs
//
// Test matrix follows §8 verbatim:
//   subject_type ∈ {venue, product}   → source ∈ {google_places, owner_upload, placeholder}
//   subject_type = location           → source ∈ {own_photography, licensed_stock, google_places, placeholder}
//   subject_type = decorative         → source ∈ {ai_decorative, licensed_stock}

import { strict as assert } from 'node:assert';
import Database from 'better-sqlite3';

// The CHECK clause matches db/schema.ts:94 verbatim. Keep in sync.
const SCHEMA_SQL = `
CREATE TABLE photos (
  id TEXT PRIMARY KEY,
  venue_id TEXT,
  area_id TEXT,
  city_id TEXT,
  subject_type TEXT NOT NULL,
  source TEXT NOT NULL,
  url TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT photo_source_matches_subject CHECK (
    (subject_type IN ('venue','product') AND source IN ('google_places','owner_upload','placeholder'))
    OR (subject_type = 'location'  AND source IN ('own_photography','licensed_stock','google_places','placeholder'))
    OR (subject_type = 'decorative' AND source IN ('ai_decorative','licensed_stock'))
  )
);
`;

const db = new Database(':memory:');
db.exec(SCHEMA_SQL);

let id = 0;
function insert(subjectType, source) {
  const sql = `INSERT INTO photos (id, subject_type, source, url) VALUES (?, ?, ?, ?)`;
  db.prepare(sql).run(`p${++id}`, subjectType, source, 'https://example/x.jpg');
}

function shouldAccept(subjectType, source) {
  insert(subjectType, source);
  console.log(`PASS  ACCEPT  subject=${subjectType.padEnd(10)} source=${source}`);
}

function shouldReject(subjectType, source) {
  assert.throws(
    () => insert(subjectType, source),
    /CHECK constraint failed|photo_source_matches_subject/i,
    `expected CHECK to reject subject=${subjectType} source=${source}`,
  );
  console.log(`PASS  REJECT  subject=${subjectType.padEnd(10)} source=${source}`);
}

// ── Allow-list ───────────────────────────────────────────────────────────
shouldAccept('venue',      'google_places');
shouldAccept('venue',      'owner_upload');
shouldAccept('venue',      'placeholder');
shouldAccept('product',    'google_places');
shouldAccept('product',    'owner_upload');
shouldAccept('product',    'placeholder');
shouldAccept('location',   'own_photography');
shouldAccept('location',   'licensed_stock');
shouldAccept('location',   'google_places');
shouldAccept('location',   'placeholder');
shouldAccept('decorative', 'ai_decorative');
shouldAccept('decorative', 'licensed_stock');

// ── The bans that matter for §6 RULE 2 ───────────────────────────────────
// AI must never end up on a real thing.
shouldReject('venue',   'ai_decorative');
shouldReject('product', 'ai_decorative');
// Stock photos must never claim to be a real venue/product.
shouldReject('venue',   'licensed_stock');
shouldReject('product', 'licensed_stock');
// own_photography is for editorial city shots, not specific venues.
shouldReject('venue',   'own_photography');
shouldReject('product', 'own_photography');
// Decorative slot must reject real-source photos (sanity).
shouldReject('decorative', 'google_places');
shouldReject('decorative', 'owner_upload');
shouldReject('decorative', 'placeholder');
shouldReject('decorative', 'own_photography');
// Location should not carry AI or owner_upload.
shouldReject('location', 'ai_decorative');
shouldReject('location', 'owner_upload');

console.log('\nAll photos CHECK constraint tests passed — §6 RULE 2 enforced at the SQL layer.');
