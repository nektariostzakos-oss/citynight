#!/usr/bin/env node
// Phase H1 — copy every published `venues` row into a corresponding `sites`
// row. Result: each business has a free SaaS website. Visitor URLs shift
// from /greece/{city}/{bucket}/{venue} to /sites/{slug}; H2 redirects the
// old paths.
//
// Idempotent: re-running re-syncs venue → site for any unmigrated venues.
// Already-migrated rows (sites.legacy_venue_id set) are SKIPPED.
//
//   node scripts/migrate/venues-to-sites.mjs [--dry-run]

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });
import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';

const dbPath = process.env.DATABASE_PATH;
if (!dbPath) { console.error('DATABASE_PATH not set.'); process.exit(1); }
const dryRun = process.argv.includes('--dry-run');

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// 1. Ensure a system user exists. Unclaimed migrated venues attach to this
//    user; the existing claim flow transfers ownership when a real owner
//    verifies their email.
let systemUser = db.prepare(`SELECT id FROM users WHERE email = ?`).get('system@citynight.gr');
if (!systemUser) {
  const id = randomUUID();
  db.prepare(`INSERT INTO users (id, email, name, locale, role, email_verified) VALUES (?, ?, 'citynight system', 'el', 'admin', 1)`)
    .run(id, 'system@citynight.gr');
  systemUser = { id };
  console.log(`+ Created system user ${id}`);
}

// 2. Pull every published venue with the data we need to copy.
const venues = db.prepare(`
  SELECT v.id, v.slug, v.name, v.owner_id, v.address, v.phone, v.website,
         v.opening_hours, v.about_text,
         v.reservation_url, v.reservation_email, v.reservation_phone, v.reservation_notes,
         v.design_params, v.custom_domain,
         c.name AS city_name, c.slug AS city_slug,
         cat.slug AS category_slug
    FROM venues v
    JOIN cities c ON c.id = v.city_id
    LEFT JOIN categories cat ON cat.id = v.category_id
   WHERE v.status = 'published'
     AND v.slug IS NOT NULL
`).all();

console.log(`Candidates: ${venues.length}`);

// Map citynight category slugs → site verticals (the renderer picks the
// template by vertical). Anything we don't have a mapping for falls back
// to 'other'.
const CATEGORY_TO_VERTICAL = {
  'night-club':  'nightclub',
  'bar':         'bar',
  'rooftop-bar': 'rooftop',
  'live-music':  'bar',
  'bouzoukia':   'nightclub',
  'beach-club':  'beach_club',
  'restaurant':  'restaurant',
  'cafe':        'cafe',
  'hotel':       'hotel',
};
const VERTICAL_TO_TEMPLATE = {
  restaurant: 'restaurant',
  cafe:       'restaurant',
  bar:        'bar',
  rooftop:    'bar',
  nightclub:  'bar',
  beach_club: 'bar',
  hotel:      'other',
  salon:      'other',
  other:      'other',
};

// 3. Slug uniqueness: try venue.slug first, fall back to {city}-{slug}, then
//    {city}-{slug}-{n}. Sites.slug is globally unique.
const slugExists = db.prepare(`SELECT 1 FROM sites WHERE slug = ? LIMIT 1`);
function findUniqueSlug(base, city) {
  if (!slugExists.get(base)) return base;
  const withCity = `${city}-${base}`;
  if (!slugExists.get(withCity)) return withCity;
  for (let i = 2; i < 100; i++) {
    const candidate = `${withCity}-${i}`;
    if (!slugExists.get(candidate)) return candidate;
  }
  return `${withCity}-${Math.random().toString(36).slice(2, 6)}`;
}

const alreadyMigrated = db.prepare(`SELECT legacy_venue_id FROM sites WHERE legacy_venue_id IS NOT NULL`).all()
  .reduce((acc, r) => acc.add(r.legacy_venue_id), new Set());

const insertSite = db.prepare(`
  INSERT INTO sites (
    id, slug, owner_id, name, vertical, template_id,
    city, country, address, phone, contact_email, hours,
    about_text, reservation_url, reservation_email, reservation_phone, reservation_notes,
    design_params, custom_domain,
    saas_status, status, published_at, created_at,
    legacy_venue_id
  ) VALUES (
    ?, ?, ?, ?, ?, ?,
    ?, 'GR', ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?,
    'active', 'published', unixepoch(), unixepoch(),
    ?
  )
`);
const insertSection = db.prepare(`
  INSERT INTO site_menu_sections (id, site_id, name, description, sort_order)
  VALUES (?, ?, ?, ?, ?)
`);
const insertItem = db.prepare(`
  INSERT INTO site_menu_items
    (id, section_id, name, description, price,
     is_popular, is_vegetarian, is_vegan, is_gluten_free, sort_order)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertPhoto = db.prepare(`
  INSERT INTO site_photos (id, site_id, url, attribution_text, is_primary, sort_order)
  VALUES (?, ?, ?, ?, ?, ?)
`);

let migrated = 0, skipped = 0, errors = 0;

const tx = db.transaction(() => {
  for (const v of venues) {
    if (alreadyMigrated.has(v.id)) { skipped++; continue; }

    try {
      const vertical = CATEGORY_TO_VERTICAL[v.category_slug ?? ''] ?? 'other';
      const templateId = VERTICAL_TO_TEMPLATE[vertical] ?? 'other';
      const slug = findUniqueSlug(v.slug, v.city_slug);
      const siteId = `site_${v.id}`;
      const ownerId = v.owner_id ?? systemUser.id;

      insertSite.run(
        siteId, slug, ownerId, v.name, vertical, templateId,
        v.city_name, v.address, v.phone, v.reservation_email ?? null, v.opening_hours,
        v.about_text, v.reservation_url, v.reservation_email, v.reservation_phone, v.reservation_notes,
        v.design_params, v.custom_domain,
        v.id,
      );

      // Menu
      const sections = db.prepare(`
        SELECT id, name, description, sort_order
          FROM venue_menu_sections WHERE venue_id = ? ORDER BY sort_order
      `).all(v.id);
      for (const s of sections) {
        const newSecId = randomUUID();
        insertSection.run(newSecId, siteId, s.name, s.description, s.sort_order);
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

      // Photos
      const photos = db.prepare(`
        SELECT url, attribution_text, is_primary, sort_order
          FROM photos WHERE venue_id = ? AND subject_type = 'venue'
          ORDER BY is_primary DESC, sort_order ASC
      `).all(v.id);
      photos.forEach((p, idx) => insertPhoto.run(
        randomUUID(), siteId, p.url, p.attribution_text,
        idx === 0 ? 1 : 0, p.sort_order ?? idx,
      ));

      migrated++;
    } catch (err) {
      errors++;
      console.error(`! venue=${v.id} (${v.name}): ${err.message}`);
    }
  }
  if (dryRun) {
    console.log('Dry-run — rolling back.');
    throw new Error('__rollback__');
  }
});

try { tx(); } catch (err) {
  if (err.message !== '__rollback__') throw err;
}

console.log('');
console.log(`Migrated:        ${migrated}`);
console.log(`Skipped (done):  ${skipped}`);
console.log(`Errors:          ${errors}`);
console.log(dryRun ? '(dry-run — nothing persisted)' : 'Done.');
