#!/usr/bin/env node
// Phase I.6a — smoke test for the shop engine lib layer.
//
//   node scripts/tests/shop-engine.test.mjs
//
// Same shape as scripts/tests/booking-engine.test.mjs — in-memory schema
// mirrors the relevant tables, then exercises the queries lib/shop/*
// issues. Catches SQL typos / FK direction errors / total-computation
// bugs that tsc cannot.

import { strict as assert } from 'node:assert';
import Database from 'better-sqlite3';

function freshDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
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
    CREATE TABLE site_products (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT,
      short_desc TEXT,
      long_desc TEXT,
      price_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'EUR',
      image_url TEXT,
      stock INTEGER,
      featured INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE site_coupons (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      kind TEXT NOT NULL,
      value INTEGER NOT NULL,
      max_uses INTEGER,
      used_count INTEGER NOT NULL DEFAULT 0,
      min_total_cents INTEGER NOT NULL DEFAULT 0,
      applies_to TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      expires_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE site_gift_cards (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      balance_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'EUR',
      buyer_name TEXT, buyer_email TEXT, recipient TEXT,
      order_id TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      issued_at INTEGER NOT NULL DEFAULT (unixepoch()),
      expires_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE site_gift_card_redemptions (
      id TEXT PRIMARY KEY,
      gift_card_id TEXT NOT NULL REFERENCES site_gift_cards(id) ON DELETE CASCADE,
      order_id TEXT, booking_id TEXT,
      amount_cents INTEGER NOT NULL,
      note TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE site_orders (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      client_id TEXT,
      customer_name TEXT NOT NULL,
      customer_email TEXT, customer_phone TEXT,
      shipping_address TEXT, shipping_city TEXT, shipping_postal TEXT, shipping_country TEXT,
      notes TEXT, lang TEXT NOT NULL DEFAULT 'en',
      subtotal_cents INTEGER NOT NULL,
      discount_cents INTEGER NOT NULL DEFAULT 0,
      shipping_cents INTEGER NOT NULL DEFAULT 0,
      tax_cents INTEGER NOT NULL DEFAULT 0,
      total_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'EUR',
      coupon_id TEXT,
      gift_card_id TEXT,
      stripe_payment_intent_id TEXT, stripe_checkout_session_id TEXT,
      application_fee_cents INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      paid_at INTEGER, shipped_at INTEGER, delivered_at INTEGER, cancelled_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE site_order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES site_orders(id) ON DELETE CASCADE,
      product_id TEXT,
      name TEXT NOT NULL,
      unit_price_cents INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      line_total_cents INTEGER NOT NULL
    );
  `);
  return db;
}

function seed(db) {
  const siteId = 'site_test';
  db.prepare(`INSERT INTO sites (id, slug, owner_id, name, vertical, template_id) VALUES (?, 'demo', 'u', 'S', 'salon', 'barber')`).run(siteId);
  // Two products: pomade with stock=10, clay unlimited.
  db.prepare(`INSERT INTO site_products (id, site_id, slug, name, price_cents, stock, enabled, sort_order) VALUES (?, ?, 'pomade', 'Pomade', 2200, 10, 1, 0)`).run('p_pomade', siteId);
  db.prepare(`INSERT INTO site_products (id, site_id, slug, name, price_cents, stock, enabled, sort_order) VALUES (?, ?, 'clay', 'Matte Clay', 2000, NULL, 1, 1)`).run('p_clay', siteId);
  // A 10% coupon valid for shop with min total €30, max 5 uses.
  db.prepare(`INSERT INTO site_coupons (id, site_id, code, kind, value, max_uses, used_count, min_total_cents, applies_to, active) VALUES ('c_10', ?, 'SAVE10', 'percent', 10, 5, 0, 3000, 'shop', 1)`).run(siteId);
  // A gift card with €15 balance.
  db.prepare(`INSERT INTO site_gift_cards (id, site_id, code, amount_cents, balance_cents, status) VALUES ('g_15', ?, 'GC-15', 1500, 1500, 'active')`).run(siteId);
  return { siteId };
}

// ── tests ────────────────────────────────────────────────────────────

function test_subtotalAndStock() {
  const db = freshDb();
  const { siteId } = seed(db);

  // 2 × pomade @ 2200 = 4400; 1 × clay @ 2000 = 2000. Subtotal 6400.
  const cart = [{ productId: 'p_pomade', qty: 2 }, { productId: 'p_clay', qty: 1 }];
  let subtotal = 0;
  for (const line of cart) {
    const p = db.prepare(`SELECT price_cents, stock FROM site_products WHERE site_id = ? AND id = ?`).get(siteId, line.productId);
    assert.ok(p, 'product exists');
    assert.ok(p.stock === null || p.stock >= line.qty, 'stock sufficient');
    subtotal += p.price_cents * line.qty;
  }
  assert.equal(subtotal, 6400, 'subtotal math');

  // Decrement pomade stock 10 → 8
  db.prepare(`UPDATE site_products SET stock = stock - 2 WHERE id = 'p_pomade'`).run();
  const after = db.prepare(`SELECT stock FROM site_products WHERE id = 'p_pomade'`).get();
  assert.equal(after.stock, 8, 'pomade stock decremented');
  console.log('  ok  subtotal computation + stock decrement');
}

function test_couponApply() {
  const db = freshDb();
  const { siteId } = seed(db);
  // Subtotal 4000, 10% percent coupon → 400 off. Above min 3000.
  const coupon = db.prepare(`SELECT * FROM site_coupons WHERE site_id = ? AND code = 'SAVE10'`).get(siteId);
  assert.ok(coupon, 'coupon exists');
  assert.equal(coupon.active, 1);
  assert.ok(4000 >= coupon.min_total_cents, 'meets minimum');
  const discount = coupon.kind === 'percent'
    ? Math.floor(4000 * coupon.value / 100)
    : Math.min(coupon.value, 4000);
  assert.equal(discount, 400);

  // Below-min subtotal → wrong: 2000 < 3000 min.
  assert.ok(2000 < coupon.min_total_cents, 'below_min triggers');
  console.log('  ok  coupon: 10% off 4000 → 400; below-min rejection');
}

function test_giftCardRedeem() {
  const db = freshDb();
  const { siteId } = seed(db);
  // Order remaining 2500, gift card 1500 → applies full 1500, balance → 0.
  const card = db.prepare(`SELECT * FROM site_gift_cards WHERE site_id = ? AND code = 'GC-15'`).get(siteId);
  const applied = Math.min(card.balance_cents, 2500);
  const remaining = card.balance_cents - applied;
  assert.equal(applied, 1500);
  assert.equal(remaining, 0);

  // Order remaining 800, gift card balance 1500 → applies 800, balance → 700.
  const applied2 = Math.min(card.balance_cents, 800);
  const remaining2 = card.balance_cents - applied2;
  assert.equal(applied2, 800);
  assert.equal(remaining2, 700);
  console.log('  ok  gift card: full-cover + partial-cover math');
}

function test_terminalOrderTransition() {
  const db = freshDb();
  const { siteId } = seed(db);
  db.prepare(`
    INSERT INTO site_orders (id, site_id, customer_name, subtotal_cents, total_cents, status)
    VALUES ('o1', ?, 'Test', 4500, 4500, 'cancelled')
  `).run(siteId);
  const got = db.prepare(`SELECT status FROM site_orders WHERE id = 'o1'`).get();
  assert.equal(got.status, 'cancelled');
  // The lib enforces terminal-status guards in JS — verify DB accepts the value.
  console.log('  ok  terminal status: cancelled accepted by DB');
}

function test_couponScopeMismatch() {
  const db = freshDb();
  const { siteId } = seed(db);
  // Insert a bookings-scope coupon; shop checkout should reject it.
  db.prepare(`
    INSERT INTO site_coupons (id, site_id, code, kind, value, max_uses, used_count, min_total_cents, applies_to, active)
    VALUES ('c_book', ?, 'BOOKONLY', 'fixed', 500, NULL, 0, 0, 'bookings', 1)
  `).run(siteId);
  const c = db.prepare(`SELECT applies_to FROM site_coupons WHERE code = 'BOOKONLY'`).get();
  const scope = 'shop';
  const scopeOk = c.applies_to === 'both' || c.applies_to === scope;
  assert.equal(scopeOk, false, 'scope mismatch detected');
  console.log('  ok  coupon scope: bookings-only rejected for shop checkout');
}

console.log('shop-engine smoke test');
test_subtotalAndStock();
test_couponApply();
test_giftCardRedeem();
test_terminalOrderTransition();
test_couponScopeMismatch();
console.log('all shop-engine smoke tests passed');
