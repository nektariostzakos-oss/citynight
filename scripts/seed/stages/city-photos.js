// City-photos stage: fetches licensed stock heroes for each city guide and stores
// them as `subject_type='location'`, `source='licensed_stock'` — allowed under the
// photos CHECK constraint (§6 rule 2 only blocks stock on venues/products).
//
// CLI:
//   node run.js city-photos                # all curated cities
//   node run.js city-photos --city=mykonos # one city
//
// Re-runnable: if a city already has a primary 'licensed_stock' photo, skip it
// unless --force is passed.

import { db, uuid } from '../lib/db.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.resolve(__dirname, '../../../content/cities');

const UNSPLASH_API = 'https://api.unsplash.com';
const UTM = 'utm_source=citynight.gr&utm_medium=referral';

function unsplashKey() {
  const k = process.env.UNSPLASH_ACCESS_KEY;
  if (!k) throw new Error('UNSPLASH_ACCESS_KEY required for city-photos stage.');
  return k;
}

async function searchPhotos(query, perPage = 5) {
  const url = `${UNSPLASH_API}/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape&content_filter=high`;
  const res = await fetch(url, { headers: { Authorization: `Client-ID ${unsplashKey()}` } });
  if (!res.ok) throw new Error(`Unsplash ${res.status}: ${await res.text().catch(() => '')}`);
  const json = await res.json();
  return json.results ?? [];
}

async function triggerDownload(photoId) {
  try {
    await fetch(`${UNSPLASH_API}/photos/${photoId}/download`, {
      headers: { Authorization: `Client-ID ${unsplashKey()}` },
    });
  } catch { /* noop */ }
}

function imageUrl(photo, width = 1600) {
  const u = new URL(photo.urls.regular);
  u.searchParams.set('w', String(width));
  u.searchParams.set('q', '80');
  u.searchParams.set('auto', 'format');
  u.searchParams.set('fit', 'crop');
  return u.toString();
}

function loadCityGuides(slugFilter) {
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json'));
  const cities = files.map((f) => JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, f), 'utf8')));
  return slugFilter ? cities.filter((c) => c.slug === slugFilter) : cities;
}

export async function cityPhotos({ citySlug, force = false }) {
  const handle = db();
  const cities = loadCityGuides(citySlug);
  if (!cities.length) {
    console.log(`[city-photos] no cities match ${citySlug ?? '*'}`);
    return;
  }

  const insert = handle.prepare(`
    INSERT INTO photos (
      id, city_id, subject_type, source, url,
      attribution_text, attribution_url, license,
      cached_until, is_primary, sort_order
    ) VALUES (?, ?, 'location', 'licensed_stock', ?, ?, ?, 'Unsplash', NULL, ?, ?)
  `);
  const existsStmt = handle.prepare(`
    SELECT 1 FROM photos WHERE city_id = ? AND source = 'licensed_stock' AND is_primary = 1 LIMIT 1
  `);
  const clear = handle.prepare(`DELETE FROM photos WHERE city_id = ? AND source = 'licensed_stock'`);

  let added = 0, skipped = 0;
  for (const city of cities) {
    const has = existsStmt.get(city.dbId);
    if (has && !force) { console.log(`= ${city.slug} (already has hero)`); skipped++; continue; }
    if (has && force) clear.run(city.dbId);

    console.log(`+ ${city.slug} ← Unsplash "${city.unsplashQuery}"`);
    const photos = await searchPhotos(city.unsplashQuery, 5);
    if (!photos.length) { console.warn(`  no results for ${city.slug}`); continue; }

    for (let i = 0; i < Math.min(photos.length, 4); i++) {
      const p = photos[i];
      await triggerDownload(p.id);
      insert.run(
        uuid(),
        city.dbId,
        imageUrl(p, 1800),
        `${p.user.name} / Unsplash`,
        `${p.user.links.html}?${UTM}`,
        i === 0 ? 1 : 0,
        i,
      );
      added++;
    }
  }

  console.log(`[city-photos] added=${added} skipped=${skipped}`);
}
