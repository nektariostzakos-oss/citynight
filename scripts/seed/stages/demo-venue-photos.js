// demo-venue-photos — refresh every demo venue's photo with a clean, category-
// themed Unsplash image. Replaces the picsum placeholders.
//
// Keeps source='placeholder' on the photos row (§6 rule 2 forbids 'licensed_stock'
// on venue-subject rows). 'placeholder' is the truthful semantic: these are not
// real photos of the named venue — they're stand-ins until Google Places ingest
// brings in the real images.
//
// CLI:
//   node run.js demo-venue-photos                  # refresh all
//   node run.js demo-venue-photos --force          # also re-fetch even if already updated
//
// Requires UNSPLASH_ACCESS_KEY in env.

import { db } from '../lib/db.js';

const UNSPLASH_API = 'https://api.unsplash.com';
const UTM = 'utm_source=citynight.gr&utm_medium=referral';

// Per-category Unsplash search queries. Tuned to return clean editorial photos
// without watermarks or logos.
const CATEGORY_QUERIES = {
  cat_night_club:     'nightclub interior dark',
  cat_bar:            'cocktail bar interior dim light',
  cat_rooftop_bar:    'rooftop bar city skyline night',
  cat_live_music:     'live music concert venue',
  cat_bouzoukia:      'live music intimate stage',
  cat_beach_club:     'beach club summer sunset',
  cat_restaurant:     'modern restaurant interior',
  cat_taverna:        'mediterranean taverna outdoor dining',
  cat_fine_dining:    'fine dining restaurant elegant table',
  cat_hotel:          'luxury hotel lobby',
  cat_boutique_hotel: 'boutique hotel bedroom design',
  cat_resort:         'mediterranean resort pool sea',
};

function unsplashKey() {
  const k = process.env.UNSPLASH_ACCESS_KEY;
  if (!k) {
    throw new Error('UNSPLASH_ACCESS_KEY required. Get one (free, 50 req/h) at https://unsplash.com/developers');
  }
  return k;
}

async function searchPhotos(query, perPage = 15) {
  const url = `${UNSPLASH_API}/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape&content_filter=high`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${unsplashKey()}`, 'Accept-Version': 'v1' },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Unsplash search ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  return json.results ?? [];
}

async function triggerDownload(photoId) {
  // Required by Unsplash API guidelines — fire and forget.
  try {
    await fetch(`${UNSPLASH_API}/photos/${photoId}/download`, {
      headers: { Authorization: `Client-ID ${unsplashKey()}` },
    });
  } catch { /* noop */ }
}

function buildImageUrl(photo, width = 1600) {
  const u = new URL(photo.urls.regular);
  u.searchParams.set('w', String(width));
  u.searchParams.set('q', '80');
  u.searchParams.set('auto', 'format');
  u.searchParams.set('fit', 'crop');
  return u.toString();
}

export async function demoVenuePhotos({ force = false } = {}) {
  const handle = db();

  const rows = handle.prepare(`
    SELECT v.id AS venue_id, v.category_id, v.slug,
           (SELECT id FROM photos p WHERE p.venue_id = v.id AND p.is_primary = 1) AS photo_id,
           (SELECT url FROM photos p WHERE p.venue_id = v.id AND p.is_primary = 1) AS current_url
      FROM venues v
     WHERE v.id LIKE 'venue_demo_%'
  `).all();

  if (!rows.length) {
    console.log('[demo-venue-photos] no demo venues found.');
    return;
  }

  // Group by category so we make one Unsplash query per category, not per venue.
  const byCategory = new Map();
  for (const r of rows) {
    const cat = r.category_id ?? 'cat_bar';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(r);
  }

  const update = handle.prepare(`
    UPDATE photos SET url = ?, attribution_text = ?, attribution_url = ?, license = 'Unsplash'
    WHERE id = ?
  `);

  let updated = 0, skipped = 0;

  for (const [catId, venues] of byCategory.entries()) {
    const query = CATEGORY_QUERIES[catId] ?? 'restaurant interior';
    console.log(`[demo-venue-photos] ${catId} (${venues.length} venues) ← "${query}"`);

    const photos = await searchPhotos(query, Math.max(15, venues.length));
    if (!photos.length) {
      console.warn(`  no photos for query: ${query}`);
      continue;
    }

    for (let i = 0; i < venues.length; i++) {
      const v = venues[i];
      if (!v.photo_id) { skipped++; continue; }
      // Skip if already on Unsplash and not forcing.
      if (!force && typeof v.current_url === 'string' && v.current_url.includes('images.unsplash.com')) {
        skipped++; continue;
      }
      const photo = photos[i % photos.length];
      await triggerDownload(photo.id);

      const url = buildImageUrl(photo, 1600);
      const attText = `${photo.user.name} / Unsplash`;
      const attUrl = `${photo.user.links.html}?${UTM}`;

      update.run(url, attText, attUrl, v.photo_id);
      updated++;
    }
  }

  console.log(`[demo-venue-photos] updated=${updated} skipped=${skipped}`);
}
