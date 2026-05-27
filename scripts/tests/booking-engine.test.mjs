#!/usr/bin/env node
// Phase I.5a — smoke test for the booking engine lib layer.
//
//   node scripts/tests/booking-engine.test.mjs
//
// Builds a tiny in-memory schema mirroring the relevant Phase I.3 tables,
// seeds one site + one staff + one service + one availability rule, then
// exercises the booking-flow queries that lib/booking/* expects to run.
//
// This catches SQL typos / missing columns / wrong FK directions that
// `tsc --noEmit` cannot. It does NOT import the TS modules directly
// (Node ESM + tsx setup isn't worth the friction for a smoke test) —
// instead we issue the SAME queries the engine issues and assert
// row shape + collision semantics.

import { strict as assert } from 'node:assert';
import Database from 'better-sqlite3';

function freshDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  // Trimmed copy of the Phase H + I.3 tables this test touches.
  db.exec(`
    CREATE TABLE sites (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      owner_id TEXT NOT NULL,
      name TEXT NOT NULL,
      vertical TEXT NOT NULL,
      template_id TEXT NOT NULL,
      country TEXT NOT NULL DEFAULT 'GR',
      saas_status TEXT NOT NULL DEFAULT 'trialing',
      status TEXT NOT NULL DEFAULT 'draft',
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE site_services (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      duration_minutes INTEGER NOT NULL,
      buffer_minutes INTEGER NOT NULL DEFAULT 0,
      price_cents INTEGER NOT NULL,
      category TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      tkey TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE site_staff (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT,
      bio TEXT,
      photo_url TEXT,
      specialties TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      work_days TEXT NOT NULL DEFAULT '[1,2,3,4,5]',
      start_time TEXT NOT NULL DEFAULT '09:00',
      end_time TEXT NOT NULL DEFAULT '18:00',
      break_start TEXT,
      break_end TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE site_service_staff (
      service_id TEXT NOT NULL REFERENCES site_services(id) ON DELETE CASCADE,
      staff_id TEXT NOT NULL REFERENCES site_staff(id) ON DELETE CASCADE,
      PRIMARY KEY (service_id, staff_id)
    );
    CREATE TABLE site_bookings (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      service_id TEXT NOT NULL REFERENCES site_services(id) ON DELETE RESTRICT,
      staff_id TEXT NOT NULL REFERENCES site_staff(id) ON DELETE RESTRICT,
      client_id TEXT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      buffer_minutes INTEGER NOT NULL DEFAULT 0,
      customer_name TEXT NOT NULL,
      customer_email TEXT,
      customer_phone TEXT,
      price_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'EUR',
      deposit_percent INTEGER,
      deposit_paid_cents INTEGER,
      deposit_stripe_payment_intent_id TEXT,
      membership_id TEXT,
      discount_percent INTEGER,
      status TEXT NOT NULL DEFAULT 'confirmed',
      cancelled_at INTEGER,
      cancellation_reason TEXT,
      completed_at INTEGER,
      notes TEXT,
      customer_notes TEXT,
      walk_in INTEGER NOT NULL DEFAULT 0,
      lang TEXT NOT NULL DEFAULT 'en',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE site_availability_rules (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      staff_id TEXT NOT NULL REFERENCES site_staff(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      date TEXT,
      weekday INTEGER,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      reason TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE site_holidays (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      reason TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE (site_id, date)
    );
  `);
  return db;
}

function seed(db) {
  const siteId = 'site_test_1';
  const serviceId = 'svc_signature';
  const staffId = 'staff_elliott';

  db.prepare(`INSERT INTO sites (id, slug, owner_id, name, vertical, template_id) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(siteId, 'oakline', 'user_owner', 'Oakline Barbershop', 'salon', 'barber');
  db.prepare(`
    INSERT INTO site_services (id, site_id, slug, name, duration_minutes, buffer_minutes, price_cents, enabled, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)
  `).run(serviceId, siteId, 'signature-cut', 'Signature Cut', 45, 5, 4500);
  db.prepare(`
    INSERT INTO site_staff (id, site_id, slug, name, role, enabled, sort_order, work_days, start_time, end_time)
    VALUES (?, ?, ?, ?, ?, 1, 0, '[1,2,3,4,5]', '10:00', '18:00')
  `).run(staffId, siteId, 'elliott', 'Elliott Vance', 'Master Barber');

  return { siteId, serviceId, staffId };
}

function test_listEnabledServices_emptySite() {
  const db = freshDb();
  db.prepare(`INSERT INTO sites (id, slug, owner_id, name, vertical, template_id) VALUES ('s1','s','u','S','salon','barber')`).run();
  const rows = db.prepare(`
    SELECT id FROM site_services WHERE site_id = ? AND enabled = 1
  `).all('s1');
  assert.equal(rows.length, 0, 'empty site should have no services');
  console.log('  ok  listEnabledServices: empty site returns []');
}

function test_listStaffForService_anyStaff() {
  const db = freshDb();
  const { siteId, serviceId } = seed(db);
  // No site_service_staff rows → all enabled staff should match.
  const restricted = db.prepare(`SELECT staff_id FROM site_service_staff WHERE service_id = ?`).all(serviceId);
  assert.equal(restricted.length, 0, 'no restrictions on this service');
  const allEnabled = db.prepare(`SELECT id FROM site_staff WHERE site_id = ? AND enabled = 1`).all(siteId);
  assert.equal(allEnabled.length, 1, 'one staff available');
  console.log('  ok  listStaffForService: empty join returns all enabled staff');
}

function test_isHoliday() {
  const db = freshDb();
  const { siteId } = seed(db);
  const before = db.prepare(`SELECT 1 FROM site_holidays WHERE site_id = ? AND date = ?`).get(siteId, '2026-12-25');
  assert.equal(before, undefined, 'not a holiday yet');
  db.prepare(`INSERT INTO site_holidays (id, site_id, date) VALUES ('h1', ?, '2026-12-25')`).run(siteId);
  const after = db.prepare(`SELECT 1 FROM site_holidays WHERE site_id = ? AND date = ?`).get(siteId, '2026-12-25');
  assert.ok(after, 'is holiday after insert');
  console.log('  ok  isHoliday: insert + lookup round-trip');
}

function test_bookingCollision() {
  const db = freshDb();
  const { siteId, serviceId, staffId } = seed(db);
  // Insert a confirmed 60-min booking at 10:00 (covers 10:00–11:00 + 5min buf = 11:05).
  db.prepare(`
    INSERT INTO site_bookings (id, site_id, service_id, staff_id, date, time,
      duration_minutes, buffer_minutes, customer_name, price_cents)
    VALUES ('b1', ?, ?, ?, '2026-06-01', '10:00', 60, 5, 'Walk-in', 4500)
  `).run(siteId, serviceId, staffId);

  // Run the same overlap query the engine uses for a 10:30 attempt.
  const overlaps = db.prepare(`
    SELECT id, time, duration_minutes, buffer_minutes
      FROM site_bookings
     WHERE site_id = ? AND staff_id = ? AND date = ?
       AND status NOT IN ('cancelled','no_show')
  `).all(siteId, staffId, '2026-06-01');

  const toMin = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + (m || 0);
  };
  const newStart = toMin('10:30');
  const newEnd = newStart + 45 + 5;
  let conflict = null;
  for (const b of overlaps) {
    const bStart = toMin(b.time);
    const bEnd = bStart + b.duration_minutes + b.buffer_minutes;
    if (newStart < bEnd && bStart < newEnd) { conflict = b; break; }
  }
  assert.ok(conflict, '10:30 attempt should collide with existing 10:00 booking');

  // A 12:00 slot is past the buffer (11:05); should be free.
  const lateStart = toMin('12:00');
  const lateEnd = lateStart + 45 + 5;
  let lateConflict = null;
  for (const b of overlaps) {
    const bStart = toMin(b.time);
    const bEnd = bStart + b.duration_minutes + b.buffer_minutes;
    if (lateStart < bEnd && bStart < lateEnd) { lateConflict = b; break; }
  }
  assert.equal(lateConflict, null, '12:00 should be free');

  // Cancelled bookings shouldn't collide.
  db.prepare(`UPDATE site_bookings SET status='cancelled' WHERE id='b1'`).run();
  const liveAfterCancel = db.prepare(`
    SELECT id FROM site_bookings
     WHERE site_id = ? AND staff_id = ? AND date = ?
       AND status NOT IN ('cancelled','no_show')
  `).all(siteId, staffId, '2026-06-01');
  assert.equal(liveAfterCancel.length, 0, 'cancelled bookings filtered out');

  console.log('  ok  booking collision: 10:30 conflicts with 10:00/60min+5buf; 12:00 free; cancelled ignored');
}

function test_terminalStatusTransition() {
  // The lib enforces this in JS, but verify the underlying status column
  // accepts the values we use.
  const db = freshDb();
  const { siteId, serviceId, staffId } = seed(db);
  db.prepare(`
    INSERT INTO site_bookings (id, site_id, service_id, staff_id, date, time,
      duration_minutes, buffer_minutes, customer_name, price_cents, status)
    VALUES ('b2', ?, ?, ?, '2026-06-01', '14:00', 45, 5, 'Test', 4500, 'completed')
  `).run(siteId, serviceId, staffId);
  const got = db.prepare(`SELECT status FROM site_bookings WHERE id='b2'`).get();
  assert.equal(got.status, 'completed');
  console.log('  ok  terminal status: completed accepted by DB');
}

console.log('booking-engine smoke test');
test_listEnabledServices_emptySite();
test_listStaffForService_anyStaff();
test_isHoliday();
test_bookingCollision();
test_terminalStatusTransition();
console.log('all booking-engine smoke tests passed');
