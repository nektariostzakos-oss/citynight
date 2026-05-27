#!/usr/bin/env node
// Demo seeder for the SaaS site renderer — creates a fully populated
// example site so /sites/{slug} renders something real. Local only;
// idempotent (deletes existing menu first, re-inserts).
//
//   node scripts/demo/seed-site-demo.mjs

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });
import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';

const dbPath = process.env.DATABASE_PATH;
if (!dbPath) { console.error('DATABASE_PATH not set.'); process.exit(1); }
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

const SLUG = 'lemoni-naxos-demo';
const SITE_ID = 'site_demo_lemoni';

// Ensure a demo owner user exists — sites.owner_id has FK to users.
let owner = db.prepare(`SELECT id FROM users WHERE email = ?`).get('demo@lemoni-taverna.gr');
if (!owner) {
  const id = randomUUID();
  db.prepare(`INSERT INTO users (id, email, name, locale, role, email_verified) VALUES (?, ?, ?, 'el', 'owner', 1)`)
    .run(id, 'demo@lemoni-taverna.gr', 'Lemoni Demo');
  owner = { id };
}

// Idempotent: clear existing demo + recreate.
db.prepare(`DELETE FROM sites WHERE id = ?`).run(SITE_ID);

db.prepare(`
  INSERT INTO sites (
    id, slug, owner_id, name, vertical, template_id,
    city, country, address, phone, contact_email, hours,
    about_text, reservation_email, reservation_phone, reservation_notes,
    wordmark, tagline,
    saas_status, status, published_at, created_at
  ) VALUES (
    ?, ?, ?, 'Lemoni Taverna', 'restaurant', 'restaurant',
    'Naxos Town', 'GR', 'Plateia Mantos 4, Naxos Town', '+30 22850 24160', 'hello@lemoni-taverna.gr',
    ?, ?, 'hello@lemoni-taverna.gr', '+30 22850 24160',
    'Walk-ins welcome any night a table is free. Friday and Saturday after 21:00 — reservations strongly recommended.',
    'LEMONI', 'Taverna · Naxos',
    'active', 'published', unixepoch(), unixepoch()
  )
`).run(
  SITE_ID, SLUG, owner.id,
  JSON.stringify([
    { day: 'mon', open: '00:00', close: '00:00', closed: true },
    { day: 'tue', open: '18:30', close: '23:30', closed: false },
    { day: 'wed', open: '18:30', close: '23:30', closed: false },
    { day: 'thu', open: '18:30', close: '23:30', closed: false },
    { day: 'fri', open: '13:00', close: '16:00', closed: false, open2: '18:30', close2: '00:30' },
    { day: 'sat', open: '13:00', close: '16:00', closed: false, open2: '18:30', close2: '00:30' },
    { day: 'sun', open: '13:00', close: '23:30', closed: false },
  ]),
  `Lemoni opened in the summer of 1978 with three tables, a wood-fired oven, and a recipe book that lived in Yiayia Mantos' head. The street was quieter then; the lemon tree in the courtyard was barely taller than the front door.

Today the lemon tree is taller than the building. Eleni, second generation, runs the kitchen with the same recipes plus a few she brought back from a decade cooking in Athens. Her brother Giannis runs the front. The wood-fired oven from 1978 still does the bread every morning.

Our cooking is Cycladic — fish from the morning's catch, lamb from a Filoti shepherd, vegetables from the gardens up the road. Slow heat, sea salt, time. We don't move fast and we don't ask you to either.`,
);

// Photos — external Unsplash for demo. Customer admin will replace.
const photoUrls = [
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1400&q=70',
  'https://images.unsplash.com/photo-1432139509613-5c4255815697?w=900&q=70',
  'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=900&q=70',
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=900&q=70',
  'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=900&q=70',
  'https://images.unsplash.com/photo-1502301103665-0b95cc738daf?w=900&q=70',
  'https://images.unsplash.com/photo-1559847844-5315695dadae?w=900&q=70',
  'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=900&q=70',
];
db.prepare(`DELETE FROM site_photos WHERE site_id = ?`).run(SITE_ID);
const insertPhoto = db.prepare(`
  INSERT INTO site_photos (id, site_id, url, attribution_text, is_primary, sort_order)
  VALUES (?, ?, ?, 'Unsplash (demo)', ?, ?)
`);
photoUrls.forEach((u, i) => insertPhoto.run(randomUUID(), SITE_ID, u, i === 0 ? 1 : 0, i));

// Menu — 4 sections × ~5 items
const sections = [
  {
    name: 'Mezedes', description: 'For the table to share.',
    items: [
      { name: 'Whipped feta', description: 'Naxian feta, blistered tomatoes, oregano oil, sourdough.', price: '€8', flags: { popular: true, vegetarian: true } },
      { name: 'Charred octopus', description: 'Slow-braised, finished over coals. Lemon, capers, fava.', price: '€14', flags: { popular: true } },
      { name: 'Lamb keftedakia', description: 'Filoti lamb, wild thyme, smoked yoghurt.', price: '€11', flags: {} },
      { name: 'Beet & walnut tarama', description: 'No fish. Beet, walnut, sourdough, lemon.', price: '€8', flags: { vegetarian: true, vegan: true } },
      { name: 'Patates "café"', description: 'Twice-fried Naxian potatoes, malt, brown butter, parsley.', price: '€7', flags: { vegetarian: true, glutenFree: true } },
    ],
  },
  {
    name: 'From the wood-fired oven', description: 'Always slow, always whole-ingredient.',
    items: [
      { name: 'Lemon-roast lamb shoulder', description: 'Four hours covered, fifteen minutes uncovered. With lemon, garlic, oregano.', price: '€26', flags: { popular: true } },
      { name: 'Whole sea bream', description: 'Brushed with the lemon-leaf oil from the courtyard tree.', price: '€32', flags: { popular: true, glutenFree: true } },
      { name: 'Octopus in vine leaves', description: 'Wrapped, roasted, finished with fava and capers.', price: '€24', flags: { glutenFree: true } },
      { name: 'Roasted seasonal vegetables', description: 'Whatever came from the gardens up the road this week.', price: '€14', flags: { vegetarian: true, vegan: true } },
    ],
  },
  {
    name: 'Wine by the glass', description: 'A short Naxos-focused list.',
    items: [
      { name: 'Naxos Mantilaria · 2022', description: 'Indigenous Cycladic red, plum and wild herb.', price: '€8', flags: { popular: true } },
      { name: 'Cyclades Assyrtiko · 2023', description: 'Mineral, citrus, sea-salt finish.', price: '€7', flags: { popular: true } },
      { name: 'Naoussa Xinomavro', description: 'Greek Nebbiolo — tomato leaf, dried rose.', price: '€9', flags: {} },
      { name: 'Moschofilero rosé', description: 'Pale, dry, summer favourite.', price: '€7', flags: {} },
    ],
  },
  {
    name: 'Desserts & after-dinner', description: 'House-made daily.',
    items: [
      { name: 'Honey-and-walnut tart', description: 'Despoina\'s spring-menu fixture. Thyme honey, kourabies crumb.', price: '€8', flags: { popular: true, vegetarian: true } },
      { name: 'Loukoumades', description: 'Honey, cinnamon, sesame.', price: '€7', flags: { vegetarian: true } },
      { name: 'Kitron of Naxos', description: 'Dry, served cold. The local way to end a meal.', price: '€6', flags: { glutenFree: true } },
    ],
  },
];

db.prepare(`DELETE FROM site_menu_sections WHERE site_id = ?`).run(SITE_ID);
const insertSec = db.prepare(`
  INSERT INTO site_menu_sections (id, site_id, name, description, sort_order)
  VALUES (?, ?, ?, ?, ?)
`);
const insertItem = db.prepare(`
  INSERT INTO site_menu_items
    (id, section_id, name, description, price,
     is_popular, is_vegetarian, is_vegan, is_gluten_free, sort_order)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
db.transaction(() => {
  sections.forEach((s, si) => {
    const secId = randomUUID();
    insertSec.run(secId, SITE_ID, s.name, s.description, si);
    s.items.forEach((it, ii) => insertItem.run(
      randomUUID(), secId, it.name, it.description, it.price ?? null,
      it.flags.popular ? 1 : 0, it.flags.vegetarian ? 1 : 0,
      it.flags.vegan ? 1 : 0, it.flags.glutenFree ? 1 : 0,
      ii,
    ));
  });
})();

console.log('✓ Demo site seeded.');
console.log('');
console.log('Visit:');
console.log('  http://localhost:3004/sites/lemoni-naxos-demo');
console.log('  http://localhost:3004/sites/lemoni-naxos-demo/menu');
console.log('  http://localhost:3004/sites/lemoni-naxos-demo/about');
console.log('  http://localhost:3004/sites/lemoni-naxos-demo/book');
console.log('  http://localhost:3004/sites/lemoni-naxos-demo/gallery');
console.log('  http://localhost:3004/sites/lemoni-naxos-demo/contact');
