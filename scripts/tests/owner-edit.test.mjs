#!/usr/bin/env node
// §6 RULE 4 + integrity tests for the owner-edit path.
//
//   node scripts/tests/owner-edit.test.mjs
//
// Asserts:
//   1. Non-owner cannot mutate any column (ownership check fires before SQL).
//   2. Unknown columns in the input (eg. `status`, `claim`, `slug`, `owner_id`,
//      `tier`, `rating`) are SILENTLY DROPPED — owner cannot promote / hijack /
//      delete via PATCH.
//   3. Allowed columns (phone, opening_hours, website, address, description)
//      land and are stamped `'owner'` in field_sources.
//   4. AI-only `description` written by the owner replaces the seed text and
//      is flagged as `owner` source (so the AI sync won't overwrite it later).
//
// We inline a tiny shim of ownerUpdateVenue's behaviour so the test doesn't
// need to boot Next/TS — same shape as lib/owner-edit.ts (kept in sync by
// hand; if you change the writer, mirror the change here).

import { strict as assert } from 'node:assert';
import Database from 'better-sqlite3';

function freshDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE venues (
      id TEXT PRIMARY KEY,
      slug TEXT,
      name TEXT NOT NULL,
      address TEXT, phone TEXT, opening_hours TEXT, website TEXT,
      description TEXT,
      field_sources TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'draft',
      claim TEXT NOT NULL DEFAULT 'unclaimed',
      owner_id TEXT,
      tier TEXT NOT NULL DEFAULT 'free',
      rating REAL, review_count INTEGER,
      city_id TEXT
    );
  `);
  db.prepare(`
    INSERT INTO venues (id, name, slug, address, phone, opening_hours, website,
                       description, field_sources, status, claim, owner_id, tier, rating, review_count, city_id)
    VALUES ('v1', 'Six DOGS', 'six-dogs',
            'Avramiotou 6', '+302103210510', '{"open":"all"}', 'https://sixdogs.gr',
            'seed description from AI', '{"phone":"google_places","address":"google_places"}',
            'published', 'verified', 'u_owner', 'featured', 4.4, 1200, 'c_athens')
  `).run();
  return db;
}

// Mirror of lib/owner-edit.ts ownerUpdateVenue — only the editable column
// allow-list and ownership gate matter for the §6 audit. Keep this in sync.
const ALLOWED = ['phone', 'opening_hours', 'website', 'address', 'description'];

function ownerUpdateVenue(db, venueId, ownerId, input) {
  const row = db.prepare('SELECT id, owner_id, field_sources FROM venues WHERE id = ?').get(venueId);
  if (!row) { const e = new Error('Not found'); e.status = 404; throw e; }
  if (row.owner_id !== ownerId) { const e = new Error('Forbidden'); e.status = 403; throw e; }

  const sets = [], args = [], fs = {};
  // map camelCase input → snake_case column
  const map = { phone: 'phone', openingHours: 'opening_hours', website: 'website', address: 'address', description: 'description' };
  for (const [k, v] of Object.entries(input)) {
    const col = map[k];
    if (!col || !ALLOWED.includes(col)) continue; // silently drop unknowns
    if (v === undefined) continue;
    const value = col === 'opening_hours' && v != null ? JSON.stringify(v) : (v == null ? null : String(v));
    sets.push(`${col} = ?`); args.push(value);
    fs[col] = 'owner';
  }
  if (!sets.length) return { updated: 0 };
  let merged = {};
  try { merged = JSON.parse(row.field_sources ?? '{}') ?? {}; } catch { /* default */ }
  merged = { ...merged, ...fs };
  sets.push('field_sources = ?'); args.push(JSON.stringify(merged));
  args.push(venueId);
  db.prepare(`UPDATE venues SET ${sets.join(', ')} WHERE id = ?`).run(...args);
  return { updated: sets.length - 1 };
}

function snapshot(db, id, cols) {
  const row = db.prepare(`SELECT ${cols.join(', ')} FROM venues WHERE id = ?`).get(id);
  return row;
}

// ── Test 1: non-owner is blocked ─────────────────────────────────────────
{
  const db = freshDb();
  const before = snapshot(db, 'v1', ['phone', 'address']);
  assert.throws(
    () => ownerUpdateVenue(db, 'v1', 'u_attacker', { phone: '+30210000000' }),
    (err) => err.status === 403,
  );
  const after = snapshot(db, 'v1', ['phone', 'address']);
  assert.deepEqual(after, before, 'non-owner attempt mutated state — §6 RULE 4 violated');
  console.log('PASS  non-owner blocked.');
}

// ── Test 2: missing venue → 404, no writes ───────────────────────────────
{
  const db = freshDb();
  const before = snapshot(db, 'v1', ['phone']);
  assert.throws(
    () => ownerUpdateVenue(db, 'v_nonexistent', 'u_owner', { phone: '+30000' }),
    (err) => err.status === 404,
  );
  const after = snapshot(db, 'v1', ['phone']);
  assert.deepEqual(after, before);
  console.log('PASS  missing venue → 404.');
}

// ── Test 3: malicious extras silently dropped ────────────────────────────
{
  const db = freshDb();
  const beforeProtected = snapshot(db, 'v1', [
    'status', 'claim', 'slug', 'owner_id', 'tier', 'rating', 'review_count', 'city_id', 'name',
  ]);
  ownerUpdateVenue(db, 'v1', 'u_owner', {
    phone: '+302100000000',
    // attempted privilege escalation / hijack / deletion attempts:
    status: 'closed',
    claim: 'unclaimed',
    slug: 'hacked-slug',
    owner_id: 'u_attacker',
    tier: 'featured',
    rating: 5.0,
    review_count: 999999,
    city_id: 'c_attacker',
    name: 'Hacked name',
  });
  const afterProtected = snapshot(db, 'v1', [
    'status', 'claim', 'slug', 'owner_id', 'tier', 'rating', 'review_count', 'city_id', 'name',
  ]);
  assert.deepEqual(
    afterProtected, beforeProtected,
    'a protected column changed — §6 RULE 4 violated (owner promoted/hijacked/renamed via PATCH)',
  );
  // and the allowed write did land:
  const { phone } = snapshot(db, 'v1', ['phone']);
  assert.equal(phone, '+302100000000');
  console.log('PASS  malicious extras dropped, allowed write landed.');
}

// ── Test 4: editable columns stamp field_sources='owner' ─────────────────
{
  const db = freshDb();
  ownerUpdateVenue(db, 'v1', 'u_owner', {
    phone: '+30210', website: 'https://new.example', address: 'New addr',
    openingHours: { open: 'tue-sun' }, description: 'owner-authored evergreen text',
  });
  const r = snapshot(db, 'v1', ['phone', 'website', 'address', 'opening_hours', 'description', 'field_sources']);
  assert.equal(r.phone, '+30210');
  assert.equal(r.website, 'https://new.example');
  assert.equal(r.address, 'New addr');
  assert.equal(r.opening_hours, '{"open":"tue-sun"}');
  assert.equal(r.description, 'owner-authored evergreen text');
  const fs = JSON.parse(r.field_sources);
  for (const col of ['phone', 'website', 'address', 'opening_hours', 'description']) {
    assert.equal(fs[col], 'owner', `field_sources.${col} should be 'owner', was ${fs[col]}`);
  }
  console.log('PASS  editable columns landed + flagged owner.');
}

// ── Test 5: empty input is a no-op (no field_sources churn) ──────────────
{
  const db = freshDb();
  const before = snapshot(db, 'v1', ['field_sources']);
  const res = ownerUpdateVenue(db, 'v1', 'u_owner', {});
  assert.equal(res.updated, 0);
  const after = snapshot(db, 'v1', ['field_sources']);
  assert.equal(after.field_sources, before.field_sources);
  console.log('PASS  empty input is no-op.');
}

console.log('\nAll owner-edit integrity tests passed.');
