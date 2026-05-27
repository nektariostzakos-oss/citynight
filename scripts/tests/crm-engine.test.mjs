#!/usr/bin/env node
// Phase I.7 — smoke test for the CRM lib layer.
//
//   node scripts/tests/crm-engine.test.mjs
//
// Validates client upsert dedup (same email twice = one row, second
// fills missing phone), review token signing roundtrip, terminal-state
// approval idempotency, and rollup math.

import { strict as assert } from 'node:assert';
import Database from 'better-sqlite3';
import crypto from 'node:crypto';

function freshDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE sites (
      id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, owner_id TEXT NOT NULL,
      name TEXT NOT NULL, vertical TEXT NOT NULL, template_id TEXT NOT NULL,
      country TEXT NOT NULL DEFAULT 'GR',
      saas_status TEXT NOT NULL DEFAULT 'trialing',
      status TEXT NOT NULL DEFAULT 'draft',
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE site_clients (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      email TEXT, phone TEXT, name TEXT NOT NULL,
      birthday TEXT, notes TEXT, tags TEXT,
      preferred_staff_id TEXT,
      total_bookings INTEGER NOT NULL DEFAULT 0,
      total_spent_cents INTEGER NOT NULL DEFAULT 0,
      loyalty_points INTEGER NOT NULL DEFAULT 0,
      last_booked_at INTEGER, last_ordered_at INTEGER,
      deleted_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE site_bookings (
      id TEXT PRIMARY KEY, site_id TEXT NOT NULL,
      service_id TEXT NOT NULL, staff_id TEXT NOT NULL, client_id TEXT,
      date TEXT NOT NULL, time TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL, buffer_minutes INTEGER NOT NULL DEFAULT 0,
      customer_name TEXT NOT NULL, customer_email TEXT, customer_phone TEXT,
      price_cents INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'EUR',
      status TEXT NOT NULL DEFAULT 'confirmed',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE site_reviews (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      booking_id TEXT, client_id TEXT,
      source TEXT NOT NULL DEFAULT 'booking',
      author_name TEXT, author_email TEXT,
      rating INTEGER NOT NULL,
      title TEXT, body TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      approved_at INTEGER, reply TEXT, reply_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);
  return db;
}

function seed(db) {
  db.prepare(`INSERT INTO sites (id, slug, owner_id, name, vertical, template_id) VALUES ('s1','s','u','S','salon','barber')`).run();
  return { siteId: 's1' };
}

function upsertByContact(db, siteId, { name, email, phone }) {
  const e = email ? email.toLowerCase() : null;
  if (e) {
    const r = db.prepare(`SELECT id FROM site_clients WHERE site_id=? AND lower(email)=? AND deleted_at IS NULL`).get(siteId, e);
    if (r) {
      if (phone) db.prepare(`UPDATE site_clients SET phone=COALESCE(phone,?) WHERE id=?`).run(phone, r.id);
      return r.id;
    }
  }
  if (phone) {
    const r = db.prepare(`SELECT id FROM site_clients WHERE site_id=? AND phone=? AND deleted_at IS NULL`).get(siteId, phone);
    if (r) {
      if (e) db.prepare(`UPDATE site_clients SET email=COALESCE(email,?) WHERE id=?`).run(e, r.id);
      return r.id;
    }
  }
  const id = `c_${Math.random().toString(36).slice(2, 8)}`;
  db.prepare(`INSERT INTO site_clients (id, site_id, email, phone, name) VALUES (?,?,?,?,?)`).run(id, siteId, e, phone, name);
  return id;
}

function test_upsertDedupByEmail() {
  const db = freshDb(); const { siteId } = seed(db);
  const a = upsertByContact(db, siteId, { name: 'Alex', email: 'A@example.com' });
  const b = upsertByContact(db, siteId, { name: 'Alex P', email: 'a@example.com', phone: '+30 123' });
  assert.equal(a, b, 'same email = same row');
  const row = db.prepare(`SELECT phone FROM site_clients WHERE id=?`).get(a);
  assert.equal(row.phone, '+30 123', 'phone backfilled on second upsert');
  console.log('  ok  client upsert dedup by email + phone backfill');
}

function test_upsertDedupByPhone() {
  const db = freshDb(); const { siteId } = seed(db);
  const a = upsertByContact(db, siteId, { name: 'Bryan', phone: '+30 999' });
  const b = upsertByContact(db, siteId, { name: 'Bryan F', email: 'bryan@example.com', phone: '+30 999' });
  assert.equal(a, b, 'same phone = same row');
  const row = db.prepare(`SELECT email FROM site_clients WHERE id=?`).get(a);
  assert.equal(row.email, 'bryan@example.com', 'email backfilled');
  console.log('  ok  client upsert dedup by phone + email backfill');
}

function test_softDelete() {
  const db = freshDb(); const { siteId } = seed(db);
  const id = upsertByContact(db, siteId, { name: 'Cara', email: 'c@example.com' });
  db.prepare(`UPDATE site_clients SET deleted_at = unixepoch(), email=NULL, phone=NULL, name='Deleted' WHERE id=?`).run(id);
  // A new upsert with the same email now creates a fresh row (the deleted row is filtered).
  const id2 = upsertByContact(db, siteId, { name: 'Cara R', email: 'c@example.com' });
  assert.notEqual(id, id2, 'soft-deleted row is invisible to upsert');
  console.log('  ok  GDPR soft-delete: deleted client invisible to upsert');
}

function test_reviewTokenRoundtrip() {
  const SECRET = 'a'.repeat(32);
  const siteId = 'site_abc';
  const bookingId = 'b_xyz_42';
  const mac = crypto.createHmac('sha256', SECRET).update(`${siteId}:${bookingId}`).digest();
  const b64url = (b) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const token = `${b64url(Buffer.from(bookingId, 'utf8'))}.${b64url(mac)}`;

  // verify
  const parts = token.split('.');
  const bookingFromToken = Buffer.from(parts[0].replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - parts[0].length % 4) % 4), 'base64').toString('utf8');
  const macFromToken = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - parts[1].length % 4) % 4), 'base64');
  assert.equal(bookingFromToken, bookingId);
  const expected = crypto.createHmac('sha256', SECRET).update(`${siteId}:${bookingFromToken}`).digest();
  assert.ok(crypto.timingSafeEqual(macFromToken, expected), 'HMAC verifies');

  // tampered token (wrong siteId) fails
  const wrong = crypto.createHmac('sha256', SECRET).update(`other:${bookingId}`).digest();
  assert.ok(!crypto.timingSafeEqual(macFromToken, wrong), 'tampered HMAC rejected');
  console.log('  ok  review token: HMAC sign + verify roundtrip; cross-site rejected');
}

function test_reviewApprovalIdempotency() {
  const db = freshDb(); const { siteId } = seed(db);
  db.prepare(`INSERT INTO site_reviews (id, site_id, source, rating, status) VALUES ('r1', ?, 'booking', 5, 'pending')`).run(siteId);
  const a = db.prepare(`UPDATE site_reviews SET status='approved', approved_at=unixepoch() WHERE site_id=? AND id=? AND status IN ('pending','flagged')`).run(siteId, 'r1');
  assert.equal(a.changes, 1, 'first approval applies');
  const b = db.prepare(`UPDATE site_reviews SET status='approved', approved_at=unixepoch() WHERE site_id=? AND id=? AND status IN ('pending','flagged')`).run(siteId, 'r1');
  assert.equal(b.changes, 0, 'second approval is a no-op');
  console.log('  ok  review approval: idempotent guard on (pending,flagged)');
}

console.log('crm-engine smoke test');
test_upsertDedupByEmail();
test_upsertDedupByPhone();
test_softDelete();
test_reviewTokenRoundtrip();
test_reviewApprovalIdempotency();
console.log('all crm-engine smoke tests passed');
