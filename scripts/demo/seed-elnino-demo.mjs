#!/usr/bin/env node
// Demo seeder — fully populates the local el-nino venue so the citynight
// page renders with a real menu / about / reservation / gallery / design
// override. This is a one-shot script for *local* exploration only; it
// does not run on Hostinger and isn't part of any deployment path.
//
//   node scripts/demo/seed-elnino-demo.mjs
//
// Idempotent: re-running clears the seeded menu sections first so a fresh
// run never duplicates items. Tier flips to 'featured' and a coherent
// design_params is locked in so the look stays stable across renders.

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });
import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';

const dbPath = process.env.DATABASE_PATH;
if (!dbPath) {
  console.error('DATABASE_PATH not set. Aborting.');
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const venue = db.prepare(`SELECT id, name FROM venues WHERE slug = 'el-nino' LIMIT 1`).get();
if (!venue) {
  console.error('No venue with slug=el-nino found in this DB. Seed a published venue first.');
  process.exit(1);
}
const venueId = venue.id;
console.log(`Seeding demo content for venue: ${venue.name} (${venueId})`);

// 1. Tier + design overrides — coherent warm bar-rooftop look. Pinning a
//    palette + type pair + hero so the demo doesn't drift between renders.
const designParams = {
  v: 1,
  palette: 'ember-coral',
  typePair: 'editorial',
  heroLayout: 'editorial',
  density: 'airy',
  motion: 'subtle',
  sectionOrder: ['overview', 'events', 'hours', 'location', 'related', 'faq'],
};

db.prepare(`
  UPDATE venues
     SET tier = 'featured',
         design_params = ?,
         design_params_locked = 1,
         about_text = ?,
         reservation_url = ?,
         reservation_email = ?,
         reservation_phone = ?,
         reservation_notes = ?
   WHERE id = ?
`).run(
  JSON.stringify(designParams),
  // about_text — long-form owner-authored. Plain text; paragraph breaks
  // render via whitespace-pre-line on the /about page.
  `El Niño opened on the corner of Plateia Mantos in 2003, the first café in Loutraki to stay open past midnight. We started with eight tables, a battered Faema espresso machine, and a Sunday-night habit of letting the regulars choose the playlist.

Twenty-two years later the espresso machine is the same one. Everything else has moved. We added a kitchen in 2011, a cocktail programme in 2017, and a small rooftop in 2019 that fits twenty people on a good night.

The room runs on three principles. Music first — we treat the playlist like the menu. Real glassware and real ice — no plastic, no slush. And no rush — if you stay until 02:00 we'll make you another negroni, not present the bill.

Come for the cortado in the afternoon, stay for the rooftop at sunset, end the night at the back booth.`,
  null, // no external reservation URL — encourage form submissions
  'reservations@elnino.gr',
  '+30 27440 22130',
  `Walk-ins welcome any night a table is free. Friday and Saturday after 21:00 — reservations strongly recommended. The rooftop opens nightly at 19:00, weather permitting (we'll text you a confirmation by 18:00 with a backup table indoors).`,
  venueId,
);

// 2. Menu — clear it first to keep the seeder idempotent, then insert
//    fresh sections + items.
db.prepare(`DELETE FROM venue_menu_sections WHERE venue_id = ?`).run(venueId);

const sections = [
  {
    name: 'Signature cocktails',
    description: 'Built around what is in season, refreshed every four weeks.',
    items: [
      {
        name: 'Loutraki Spritz',
        description: 'Greek bitters, Roditis frizzante, grapefruit oil, salt.',
        price: '€11',
        flags: { popular: true, vegetarian: true, vegan: true, glutenFree: true },
      },
      {
        name: 'Negroni · barrel-aged',
        description: 'Six weeks in an ex-Mavrodaphne cask. Heavier finish.',
        price: '€12',
        flags: { popular: true, vegetarian: true, vegan: true, glutenFree: true },
      },
      {
        name: 'Mastiha Sour',
        description: 'Mastiha, lemon, aquafaba, three drops of orange-blossom water.',
        price: '€11',
        flags: { popular: false, vegetarian: true, vegan: true, glutenFree: true },
      },
      {
        name: 'Cortado after dark',
        description: 'Single espresso, scalded milk, cocoa rim. The dessert.',
        price: '€6',
        flags: { popular: false, vegetarian: true, vegan: false, glutenFree: true },
      },
      {
        name: 'Garden Gimlet',
        description: 'Cucumber-infused gin, lime cordial, fennel pollen.',
        price: '€10',
        flags: { popular: false, vegetarian: true, vegan: true, glutenFree: true },
      },
    ],
  },
  {
    name: 'Small plates',
    description: 'For sharing, served until 23:30.',
    items: [
      {
        name: 'Whipped feta',
        description: 'Whipped Naxian feta, blistered cherry tomatoes, oregano oil, sourdough.',
        price: '€8',
        flags: { popular: true, vegetarian: true, vegan: false, glutenFree: false },
      },
      {
        name: 'Charred octopus',
        description: 'Slow-braised, finished over coals. Lemon, capers, fava.',
        price: '€14',
        flags: { popular: true, vegetarian: false, vegan: false, glutenFree: true },
      },
      {
        name: 'Lamb keftedakia',
        description: 'Filoti lamb, wild thyme, smoked yoghurt.',
        price: '€11',
        flags: { popular: false, vegetarian: false, vegan: false, glutenFree: false },
      },
      {
        name: 'Patates "café"',
        description: 'Twice-fried Naxian potatoes, malt, brown butter, parsley.',
        price: '€7',
        flags: { popular: false, vegetarian: true, vegan: false, glutenFree: true },
      },
      {
        name: 'Beet & walnut tarama',
        description: 'No fish. Beet, walnut, sourdough, lemon. House vegan default.',
        price: '€8',
        flags: { popular: false, vegetarian: true, vegan: true, glutenFree: false },
      },
    ],
  },
  {
    name: 'Wine by the glass',
    description: 'A short Greek-only list. Ask the bar for the night\'s special.',
    items: [
      { name: 'Assyrtiko · Santorini',     description: 'Mineral, citrus, sea-salt finish.',          price: '€7',  flags: { popular: true,  vegetarian: true, vegan: true, glutenFree: true } },
      { name: 'Malagouzia · Macedonia',    description: 'Stone-fruit, soft acidity, summer wine.',    price: '€7',  flags: { popular: false, vegetarian: true, vegan: true, glutenFree: true } },
      { name: 'Mantilaria · Naxos',        description: 'Full-bodied red, plum, wild herb.',           price: '€8',  flags: { popular: true,  vegetarian: true, vegan: true, glutenFree: true } },
      { name: 'Xinomavro · Naoussa',       description: 'Greek Nebbiolo. Tomato leaf, dried rose.',    price: '€9',  flags: { popular: false, vegetarian: true, vegan: true, glutenFree: true } },
      { name: 'Moschofilero rosé',         description: 'Pale, dry, grapefruit, summer favourite.',    price: '€7',  flags: { popular: false, vegetarian: true, vegan: true, glutenFree: true } },
    ],
  },
  {
    name: 'Coffee & low-ABV',
    description: 'For the start of the night or the end.',
    items: [
      { name: 'Cortado',           description: 'Espresso, scalded whole milk.',                                 price: '€3.50', flags: { popular: false, vegetarian: true, vegan: false, glutenFree: true } },
      { name: 'Freddo espresso',   description: 'Shaken hard, no sugar.',                                         price: '€3.50', flags: { popular: false, vegetarian: true, vegan: true, glutenFree: true } },
      { name: 'House aperitivo',   description: 'Vermouth, soda, orange.  Low alcohol, sundown-friendly.',         price: '€7',     flags: { popular: false, vegetarian: true, vegan: true, glutenFree: true } },
      { name: 'Mountain tea soda', description: 'Greek mountain tea, sparkling water, lemon. Zero proof.',         price: '€5',     flags: { popular: false, vegetarian: true, vegan: true, glutenFree: true } },
    ],
  },
];

const insertSection = db.prepare(`
  INSERT INTO venue_menu_sections (id, venue_id, name, description, sort_order)
  VALUES (?, ?, ?, ?, ?)
`);
const insertItem = db.prepare(`
  INSERT INTO venue_menu_items
    (id, section_id, name, description, price,
     is_popular, is_vegetarian, is_vegan, is_gluten_free, sort_order)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const tx = db.transaction(() => {
  sections.forEach((s, si) => {
    const sectionId = randomUUID();
    insertSection.run(sectionId, venueId, s.name, s.description, si);
    s.items.forEach((it, ii) => {
      insertItem.run(
        randomUUID(), sectionId,
        it.name, it.description, it.price,
        it.flags.popular ? 1 : 0,
        it.flags.vegetarian ? 1 : 0,
        it.flags.vegan ? 1 : 0,
        it.flags.glutenFree ? 1 : 0,
        ii,
      );
    });
  });
});
tx();

console.log(`✓ Tier flipped to 'featured'.`);
console.log(`✓ Design pinned (${designParams.palette} / ${designParams.typePair} / hero=${designParams.heroLayout}).`);
console.log(`✓ About + reservation populated.`);
console.log(`✓ Menu seeded — ${sections.length} sections, ${sections.reduce((n, s) => n + s.items.length, 0)} items.`);
console.log('');
console.log('Visit the populated venue at:');
console.log('  http://localhost:3004/el/greece/loutraki/bar/el-nino');
console.log('  http://localhost:3004/el/greece/loutraki/bar/el-nino/menu');
console.log('  http://localhost:3004/el/greece/loutraki/bar/el-nino/about');
console.log('  http://localhost:3004/el/greece/loutraki/bar/el-nino/book');
console.log('  http://localhost:3004/el/greece/loutraki/bar/el-nino/gallery');
