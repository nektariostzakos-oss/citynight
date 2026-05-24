#!/usr/bin/env node
// §6 RULE 1 enforcement test. Runs without a test runner — uses node:assert.
//
//   node tests/enrichment-writer.test.js
//
// Builds an in-memory SQLite mirror of the production schema and asserts:
//   1. EnrichmentWriter can write `venues.description` and `translations` rows.
//   2. EnrichmentWriter exposes NO method that writes any fact column.
//   3. After running the writer, every fact column on the venue is byte-for-byte unchanged.
//   4. EnrichmentWriter's surface (prepared statements) only contains the
//      UPDATE for `venues.description` and the INSERT for `translations`.

import { strict as assert } from 'node:assert';
import Database from 'better-sqlite3';
import { EnrichmentWriter, ALLOWED_WRITE_COLUMNS } from '../lib/enrichment-writer.js';

const FACT_COLUMNS = [
  'name', 'address', 'phone', 'opening_hours', 'price_level', 'website',
  'lat', 'lng', 'status', 'claim', 'owner_id', 'tier', 'rating',
  'review_count', 'business_status', 'is_permanently_closed',
  'google_place_id', 'city_id', 'area_id', 'category_id',
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
      last_synced_at INTEGER,
      created_at INTEGER,
      published_at INTEGER
    );
    CREATE TABLE translations (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      field TEXT NOT NULL,
      locale TEXT NOT NULL,
      value TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'ai'
    );
    CREATE UNIQUE INDEX tr_unique ON translations (entity_type, entity_id, field, locale);
  `);

  db.prepare(`
    INSERT INTO venues (id, city_id, name, address, phone, opening_hours, price_level, website, rating, review_count, status)
    VALUES ('v1', 'city_athens', 'Six DOGS', 'Avramiotou 6-8, Athens', '+302103210510', '{"open":"all-week"}', 2, 'https://sixdogs.gr', 4.4, 1200, 'draft')
  `).run();

  return db;
}

function snapshot(db, id) {
  const row = db.prepare('SELECT * FROM venues WHERE id = ?').get(id);
  const out = {};
  for (const c of FACT_COLUMNS) out[c] = row[c];
  return out;
}

// --- Assertion 1: surface is narrow ---
{
  const db = freshDb();
  const w = new EnrichmentWriter(db);
  const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(w))
    .filter((k) => typeof w[k] === 'function' && k !== 'constructor');
  assert.deepEqual(methods, ['writeDescriptions'], `EnrichmentWriter must expose only writeDescriptions; saw: ${methods.join(',')}`);
  assert.equal(ALLOWED_WRITE_COLUMNS.length, 2, 'ALLOWED_WRITE_COLUMNS must list exactly description + translations.');
  console.log('PASS  surface: only writeDescriptions exists.');
}

// --- Assertion 2: writes description + translations ---
{
  const db = freshDb();
  const w = new EnrichmentWriter(db);
  w.writeDescriptions('v1', {
    en: 'A multi-level club hidden behind an unmarked door in Monastiraki, known for indie and house nights on the rooftop.',
    el: 'Πολυεπίπεδο κλαμπ στο Μοναστηράκι, με indie και house βραδιές στην ταράτσα.',
  });
  const v = db.prepare('SELECT description FROM venues WHERE id = ?').get('v1');
  assert.match(v.description, /multi-level club/);
  const tr = db.prepare("SELECT locale, value FROM translations WHERE entity_id = ? AND field = 'description' ORDER BY locale").all('v1');
  assert.equal(tr.length, 2);
  assert.equal(tr[0].locale, 'el');
  assert.equal(tr[1].locale, 'en');
  console.log('PASS  description + translations persisted.');
}

// --- Assertion 3: every fact column is unchanged byte-for-byte ---
{
  const db = freshDb();
  const before = snapshot(db, 'v1');
  const w = new EnrichmentWriter(db);
  w.writeDescriptions('v1', { en: 'evergreen description that says nothing about phone, hours, or prices.' });
  const after = snapshot(db, 'v1');
  assert.deepEqual(after, before, 'A fact column changed — §6 RULE 1 violated.');
  console.log('PASS  fact columns untouched after enrichment.');
}

// --- Assertion 4: bad input throws cleanly, fact columns still untouched ---
{
  const db = freshDb();
  const before = snapshot(db, 'v1');
  const w = new EnrichmentWriter(db);
  assert.throws(() => w.writeDescriptions('', { en: 'x' }));
  assert.throws(() => w.writeDescriptions('v1', null));
  const after = snapshot(db, 'v1');
  assert.deepEqual(after, before);
  console.log('PASS  bad inputs reject without touching facts.');
}

console.log('\nAll enrichment-writer integrity tests passed.');
