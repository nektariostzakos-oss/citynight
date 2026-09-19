// Export a city's guides so a deploy can carry them.
//
// The problem this solves: the SQLite file lives outside the deploy path, so a
// push ships code and never content. The guides for a city are written once,
// verified once (Places, Facebook, recent reviews) and then only edited by
// hand, so they behave like source, not like user data. This writes them to
// content/city-guides/{slug}.json, which is tracked in git, and db/seed-city-
// guides.ts installs them on the next build.
//
//   node scripts/content/export-city-guides.mjs loutraki
//   node scripts/content/export-city-guides.mjs --all
//
// What it does NOT export: view_count (the live site owns it), ids (the
// importer keeps whatever the target database already has), created_at and
// updated_at (the importer stamps its own).
//
// Photos are referenced by URL, exactly as the seeder stored them. A business
// cover points at that business's own website, which is stable. An article
// cover points at Pexels. Nothing is copied into the repo.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { config as loadEnv } from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');
loadEnv({ path: path.join(repo, '.env.local') });
loadEnv({ path: path.join(repo, '.env') });

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const dbPath = process.env.DATABASE_PATH ?? './citynight.local.sqlite';
const db = new Database(path.resolve(repo, dbPath), { readonly: true });

const ARTICLE_FIELDS = [
  'vertical', 'locale', 'slug', 'title', 'subtitle', 'intro', 'outro',
  'cover_url', 'cover_attribution', 'source', 'status', 'generated_at',
  'published_at', 'prompt_meta', 'tagline', 'known_for', 'best_months',
  'typical_visit_length',
];

const BUSINESS_FIELDS = [
  'name', 'address', 'lat', 'lng', 'google_maps_url', 'fb_url',
  'fb_verified_status', 'fb_verified_at', 'fb_page_title', 'blurb',
  'sort_order', 'google_place_id', 'places_verified_at', 'cover_photo_url',
  'cover_photo_attribution', 'rating', 'review_count', 'section_kind',
  'phone', 'price_level', 'opening_hours', 'extra_photos',
];

function exportCity(slug) {
  const city = db.prepare('SELECT id, slug, name FROM cities WHERE slug = ?').get(slug);
  if (!city) {
    console.error(`no city with slug "${slug}"`);
    return null;
  }

  const articles = db
    .prepare(`SELECT id, ${ARTICLE_FIELDS.join(', ')} FROM articles WHERE city_id = ? ORDER BY locale, slug`)
    .all(city.id);

  if (articles.length === 0) {
    console.error(`  ${slug}: no articles, skipped`);
    return null;
  }

  const out = articles.map((a) => {
    const { id, ...fields } = a;
    const businesses = db
      .prepare(`SELECT ${BUSINESS_FIELDS.join(', ')} FROM guide_businesses WHERE article_id = ? ORDER BY sort_order, name`)
      .all(id);
    return { ...fields, businesses };
  });

  const file = {
    // Bump when the content changes and the next deploy should install it.
    // The importer records what it applied, so an unchanged version is a
    // no-op and a database somebody edited by hand is left alone.
    version: new Date().toISOString().slice(0, 10),
    city: { slug: city.slug, name: city.name },
    articles: out,
  };

  const dest = path.join(repo, 'content', 'city-guides', `${slug}.json`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(file, null, 2) + '\n', 'utf-8');

  const businesses = out.reduce((n, a) => n + a.businesses.length, 0);
  console.log(`  ${slug}: ${out.length} article(s), ${businesses} business(es) -> content/city-guides/${slug}.json`);
  return dest;
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('usage: node scripts/content/export-city-guides.mjs <city-slug> | --all');
  process.exit(1);
}

const slugs = args.includes('--all')
  ? db.prepare('SELECT DISTINCT c.slug FROM cities c JOIN articles a ON a.city_id = c.id ORDER BY c.slug').all().map((r) => r.slug)
  : args;

console.log(`exporting from ${dbPath}`);
let written = 0;
for (const slug of slugs) if (exportCity(slug)) written += 1;
console.log(`${written} file(s) written`);
