#!/usr/bin/env node
// Mirror el-nino's directory data into a SaaS `sites` row so you can compare
// the two surfaces side-by-side:
//   /en/greece/loutraki/bar/el-nino   (directory / "old version")
//   /sites/el-nino                    (SaaS / "new version" — Atelier-styled)
//
// Idempotent: re-running clears + recreates the SaaS row + its menu.

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });
import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';

const dbPath = process.env.DATABASE_PATH;
if (!dbPath) { console.error('DATABASE_PATH not set.'); process.exit(1); }
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

const venue = db.prepare(`
  SELECT v.id, v.name, v.address, v.phone, v.website,
         v.opening_hours, v.about_text,
         v.reservation_url, v.reservation_email, v.reservation_phone, v.reservation_notes,
         c.name AS city_name, v.owner_id
    FROM venues v
    JOIN cities c ON c.id = v.city_id
   WHERE v.slug = 'el-nino'
`).get();
if (!venue) { console.error('venue el-nino not found.'); process.exit(1); }

// Ensure there's an owner for the site (sites.owner_id has FK to users).
// If the venue is unclaimed (owner_id NULL) attach a demo user.
let ownerId = venue.owner_id;
if (!ownerId) {
  let demo = db.prepare(`SELECT id FROM users WHERE email = 'demo@elnino.gr'`).get();
  if (!demo) {
    demo = { id: randomUUID() };
    db.prepare(`INSERT INTO users (id, email, name, locale, role, email_verified) VALUES (?, ?, ?, 'el', 'owner', 1)`)
      .run(demo.id, 'demo@elnino.gr', 'El Niño Demo');
  }
  ownerId = demo.id;
}

const SITE_ID = 'site_demo_elnino';
const SITE_SLUG = 'el-nino';

db.prepare(`DELETE FROM sites WHERE id = ?`).run(SITE_ID);

db.prepare(`
  INSERT INTO sites (
    id, slug, owner_id, name, vertical, template_id,
    city, country, address, phone, contact_email, hours,
    about_text, reservation_email, reservation_phone, reservation_notes,
    wordmark, tagline,
    saas_status, status, published_at, created_at
  ) VALUES (
    ?, ?, ?, ?, 'bar', 'bar',
    ?, 'GR', ?, ?, ?, ?,
    ?, ?, ?, ?,
    'EL NIÑO', 'Café · Bar · Loutraki',
    'active', 'published', unixepoch(), unixepoch()
  )
`).run(
  SITE_ID, SITE_SLUG, ownerId,
  venue.name,
  venue.city_name,
  venue.address,
  venue.phone,
  'hello@elnino.gr',
  venue.opening_hours ?? null,
  venue.about_text,
  venue.reservation_email ?? 'reservations@elnino.gr',
  venue.reservation_phone ?? venue.phone,
  venue.reservation_notes,
);

// Copy menu from venue_menu_* to site_menu_*
const sections = db.prepare(`SELECT id, name, description, sort_order FROM venue_menu_sections WHERE venue_id = ? ORDER BY sort_order`).all(venue.id);
db.prepare(`DELETE FROM site_menu_sections WHERE site_id = ?`).run(SITE_ID);
const insertSec = db.prepare(`INSERT INTO site_menu_sections (id, site_id, name, description, sort_order) VALUES (?, ?, ?, ?, ?)`);
const insertItem = db.prepare(`
  INSERT INTO site_menu_items (id, section_id, name, description, price,
    is_popular, is_vegetarian, is_vegan, is_gluten_free, sort_order)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const tx = db.transaction(() => {
  for (const s of sections) {
    const newSecId = randomUUID();
    insertSec.run(newSecId, SITE_ID, s.name, s.description, s.sort_order);
    const items = db.prepare(`
      SELECT name, description, price, is_popular, is_vegetarian, is_vegan, is_gluten_free, sort_order
        FROM venue_menu_items WHERE section_id = ? ORDER BY sort_order
    `).all(s.id);
    for (const it of items) {
      insertItem.run(
        randomUUID(), newSecId, it.name, it.description, it.price,
        it.is_popular, it.is_vegetarian, it.is_vegan, it.is_gluten_free,
        it.sort_order,
      );
    }
  }
});
tx();

// Copy photos from venue.photos to site_photos
const photos = db.prepare(`
  SELECT url, attribution_text, is_primary, sort_order
    FROM photos WHERE venue_id = ? AND subject_type = 'venue'
    ORDER BY is_primary DESC, sort_order ASC
`).all(venue.id);
db.prepare(`DELETE FROM site_photos WHERE site_id = ?`).run(SITE_ID);
const insertPhoto = db.prepare(`
  INSERT INTO site_photos (id, site_id, url, attribution_text, is_primary, sort_order)
  VALUES (?, ?, ?, ?, ?, ?)
`);
photos.forEach((p, i) => {
  insertPhoto.run(
    randomUUID(), SITE_ID, p.url, p.attribution_text,
    i === 0 ? 1 : 0,
    p.sort_order ?? i,
  );
});

console.log('✓ El Niño mirrored into the SaaS sites table.');
console.log('');
console.log('Compare the two surfaces:');
console.log('');
console.log('  Directory  (old):  http://localhost:3004/en/greece/loutraki/bar/el-nino');
console.log('  SaaS site  (new):  http://localhost:3004/sites/el-nino');
console.log('');
console.log(`  Menu sections copied: ${sections.length}`);
console.log(`  Photos copied:        ${photos.length}`);
