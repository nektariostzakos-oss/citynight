// stage: ingest — Google Places API (New) → SQLite `venues` (status='draft').
// NO AI here (§9 stage 1). Facts only; AI fields untouched.

import { db, uuid } from '../lib/db.js';
import { searchText } from '../lib/places.js';

const PRICE_LEVEL_MAP = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

function matchesKeywords(place, keywords) {
  if (!keywords?.length) return true;
  const hay = [
    place.displayName?.text,
    place.formattedAddress,
    ...(place.types ?? []),
    place.primaryType,
  ].filter(Boolean).join(' ').toLowerCase();
  return keywords.some((k) => hay.includes(k.toLowerCase()));
}

function classifyCategory(place, cats) {
  // Prefer primaryType match against an includedType; else first matching keyword set.
  if (place.primaryType) {
    const byPrimary = cats.find((c) => c.includedType === place.primaryType);
    if (byPrimary) return byPrimary;
  }
  if (Array.isArray(place.types)) {
    const byTypes = cats.find((c) => c.includedType && place.types.includes(c.includedType));
    if (byTypes) return byTypes;
  }
  // Bouzoukia / beach_club may not have an includedType — fall back to keyword match.
  for (const c of cats) {
    if (c.keywords && matchesKeywords(place, c.keywords)) return c;
  }
  return null;
}

export async function ingest({ cfg, citySlug, dryRun }) {
  const handle = db();
  const cities = citySlug ? cfg.cities.filter((c) => c.slug === citySlug) : cfg.cities;
  if (!cities.length) throw new Error(`No matching city for slug=${citySlug}`);

  const insertVenue = handle.prepare(`
    INSERT INTO venues (
      id, city_id, category_id, google_place_id, name, address, lat, lng,
      phone, opening_hours, price_level, website,
      field_sources, status, rating, review_count, business_status,
      is_permanently_closed, seed_photo_refs, last_synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, unixepoch())
    ON CONFLICT(google_place_id) DO UPDATE SET
      name = excluded.name,
      address = excluded.address,
      lat = excluded.lat,
      lng = excluded.lng,
      phone = excluded.phone,
      opening_hours = excluded.opening_hours,
      price_level = excluded.price_level,
      website = excluded.website,
      rating = excluded.rating,
      review_count = excluded.review_count,
      business_status = excluded.business_status,
      is_permanently_closed = excluded.is_permanently_closed,
      seed_photo_refs = excluded.seed_photo_refs,
      last_synced_at = unixepoch()
    WHERE venues.status IN ('draft','published','pending','closed')   -- never overwrite rejected venues
  `);

  const counts = { fetched: 0, upserted: 0, skipped_uncat: 0 };

  for (const city of cities) {
    console.log(`\n[ingest] city=${city.slug} (radius ${city.radiusM}m)`);
    for (const cat of cfg.categories) {
      const textQuery = cat.textQuery ?? `${cat.slug.replace(/-/g, ' ')} in ${city.slug}`;
      const places = await searchText({
        textQuery,
        includedType: cat.includedType ?? undefined,
        location: { circle: { center: { latitude: city.lat, longitude: city.lng }, radius: city.radiusM } },
        maxPageTokens: cfg.maxPageTokens,
      });
      counts.fetched += places.length;
      console.log(`  ${cat.slug.padEnd(12)} → ${places.length} places`);

      if (dryRun) continue;

      for (const p of places) {
        const cls = classifyCategory(p, cfg.categories);
        if (!cls) { counts.skipped_uncat++; continue; }
        const placeId = p.id;
        if (!placeId) continue;

        const photoRefs = Array.isArray(p.photos)
          ? p.photos.slice(0, 6).map((ph) => ({
              name: ph.name,
              widthPx: ph.widthPx,
              heightPx: ph.heightPx,
              attributions: ph.authorAttributions ?? [],
            }))
          : null;

        const fieldSources = {
          name: 'google_places',
          address: 'google_places',
          phone: 'google_places',
          opening_hours: 'google_places',
          price_level: 'google_places',
          website: 'google_places',
        };

        insertVenue.run(
          uuid(),
          city.id,
          cls.id,
          placeId,
          p.displayName?.text ?? '(unknown)',
          p.formattedAddress ?? null,
          p.location?.latitude ?? null,
          p.location?.longitude ?? null,
          p.nationalPhoneNumber ?? null,
          p.regularOpeningHours ? JSON.stringify(p.regularOpeningHours) : null,
          PRICE_LEVEL_MAP[p.priceLevel] ?? null,
          p.websiteUri ?? null,
          JSON.stringify(fieldSources),
          p.rating ?? null,
          p.userRatingCount ?? null,
          p.businessStatus ?? null,
          p.businessStatus === 'CLOSED_PERMANENTLY' ? 1 : 0,
          photoRefs ? JSON.stringify(photoRefs) : null,
        );
        counts.upserted++;
      }
    }
  }

  console.log(`\n[ingest] fetched=${counts.fetched} upserted=${counts.upserted} skipped_uncategorized=${counts.skipped_uncat}`);
}
