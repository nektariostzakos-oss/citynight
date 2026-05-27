// Server-only query helpers. Phase 3 reads everything from these so the data
// access surface is centralized and easy to audit for the integrity rules.

import 'server-only';
import { db } from '@/db';
import type { Locale } from './i18n';

export type City = {
  id: string;
  slug: string;
  name: string;
  region: string | null;
  lat: number | null;
  lng: number | null;
};

export type Category = { id: string; slug: string; name: string };

export type VenueListItem = {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  rating: number | null;
  reviewCount: number | null;
  priceLevel: number | null;
  tier: 'free' | 'featured';
  cityId: string;
  citySlug: string;
  cityName: string;
  areaId: string | null;
  areaSlug: string | null;
  areaName: string | null;
  categoryId: string | null;
  categorySlug: string | null;
  categoryName: string | null;
  photoUrl: string | null;
  photoAttribution: string | null;
};

const sqlite = () => db.$client; // expose raw driver for queries that beat the ORM

function descriptionFor(locale: Locale, defaultDescription: string | null, translation: string | null): string | null {
  if (locale === 'en') return defaultDescription;
  return translation ?? defaultDescription;
}

// Returns a SQL expression that resolves to the locale-translated name when one
// exists, otherwise falls back to the entity's default `name`. Used by every
// query that surfaces a city/area/category/venue name to the UI.
//
// `tableAlias` is the alias used for the entity table inside the parent query
// (e.g. 'c' for cities, 'a' for areas). Returns just the expression; consumers
// add their own alias (` AS cityName`).
function localizedName(
  entityType: 'city' | 'area' | 'category' | 'venue',
  tableAlias: string,
  locale: Locale,
): string {
  if (locale === 'en') return `${tableAlias}.name`;
  // Locale is one of 5 hard-coded values, safe to inline. Wrapping in a
  // correlated subquery keeps existing JOINs untouched.
  return `COALESCE(
    (SELECT value FROM translations
       WHERE entity_type='${entityType}' AND entity_id=${tableAlias}.id
         AND field='name' AND locale='${locale}'),
    ${tableAlias}.name
  )`;
}

export function listPublishedCities(locale: Locale = 'en'): City[] {
  return sqlite().prepare(`
    SELECT c.id, c.slug, ${localizedName('city', 'c', locale)} AS name, c.region, c.lat, c.lng
      FROM cities c
     WHERE c.is_published = 1
     ORDER BY name
  `).all() as City[];
}

export type CityCardItem = City & { heroPhotoUrl: string | null; articleCount: number };

const VERTICAL_PARENT_ID: Record<'nightlife' | 'food' | 'stay', string> = {
  nightlife: 'parent_nightlife',
  food: 'parent_food',
  stay: 'parent_stay',
};

export function listCitiesWithHero(
  vertical?: 'nightlife' | 'food' | 'stay' | null,
  locale: Locale = 'en',
): CityCardItem[] {
  const nameExpr = localizedName('city', 'c', locale);
  // articleCount is the published-article count for this city in the
  // current locale. The optional vertical narrows the count to articles
  // whose category sits under that vertical's parent_id (parent_nightlife
  // / parent_food / parent_stay). The legacy venue-count was misleading
  // after the article-led pivot (most cities still report 0 venues).
  if (vertical) {
    return sqlite().prepare(`
      SELECT c.id, c.slug, ${nameExpr} AS name, c.region, c.lat, c.lng,
             (SELECT url FROM photos p WHERE p.city_id = c.id AND p.subject_type = 'location'
                ORDER BY p.is_primary DESC, p.sort_order ASC LIMIT 1) AS heroPhotoUrl,
             (SELECT COUNT(*) FROM articles ar
                JOIN categories cat ON cat.id = ar.category_id
                WHERE ar.city_id = c.id AND ar.status = 'published'
                  AND ar.locale = ?
                  AND cat.parent_id = ?) AS articleCount
        FROM cities c
       WHERE c.is_published = 1
       ORDER BY (articleCount > 0) DESC, name
    `).all(locale, VERTICAL_PARENT_ID[vertical]) as CityCardItem[];
  }
  return sqlite().prepare(`
    SELECT c.id, c.slug, ${nameExpr} AS name, c.region, c.lat, c.lng,
           (SELECT url FROM photos p WHERE p.city_id = c.id AND p.subject_type = 'location'
              ORDER BY p.is_primary DESC, p.sort_order ASC LIMIT 1) AS heroPhotoUrl,
           (SELECT COUNT(*) FROM articles ar
              WHERE ar.city_id = c.id AND ar.status = 'published'
                AND ar.locale = ?) AS articleCount
      FROM cities c
     WHERE c.is_published = 1
     ORDER BY (articleCount > 0) DESC, name
  `).all(locale) as CityCardItem[];
}

export function listTopVenuesAcrossCountry(locale: Locale, limit = 9): VenueListItem[] {
  const rows = sqlite().prepare(`
    SELECT v.id, v.slug, v.name, v.description, v.rating, v.review_count AS reviewCount,
           v.price_level AS priceLevel, v.tier,
           v.city_id AS cityId, c.slug AS citySlug, ${localizedName('city', 'c', locale)} AS cityName,
           v.area_id AS areaId, a.slug AS areaSlug, ${localizedName('area', 'a', locale)} AS areaName,
           v.category_id AS categoryId, cat.slug AS categorySlug, ${localizedName('category', 'cat', locale)} AS categoryName,
           p.url AS photoUrl, p.attribution_text AS photoAttribution,
           t.value AS translatedDescription
      FROM venues v
      JOIN cities c ON c.id = v.city_id
      LEFT JOIN areas a ON a.id = v.area_id
      LEFT JOIN categories cat ON cat.id = v.category_id
      LEFT JOIN photos p ON p.venue_id = v.id AND p.is_primary = 1
      LEFT JOIN translations t
             ON t.entity_type = 'venue'
            AND t.entity_id = v.id
            AND t.field = 'description'
            AND t.locale = ?
     WHERE v.status = 'published'
     ORDER BY (v.tier = 'featured') DESC, v.review_count DESC NULLS LAST
     LIMIT ?
  `).all(locale, limit) as (Omit<VenueListItem, 'description'> & { description: string | null; translatedDescription: string | null })[];
  return rows.map((r) => ({ ...r, description: descriptionFor(locale, r.description, r.translatedDescription) }));
}

export function getCityIdBySlug(slug: string): string | null {
  const r = sqlite().prepare(`SELECT id FROM cities WHERE slug = ?`).get(slug) as { id: string } | undefined;
  return r?.id ?? null;
}

export function getCategoryIdBySlug(slug: string | null): string | null {
  if (!slug) return null;
  const r = sqlite().prepare(`SELECT id FROM categories WHERE slug = ?`).get(slug) as { id: string } | undefined;
  return r?.id ?? null;
}

export function getCityBySlug(slug: string, locale: Locale = 'en'): City | null {
  const row = sqlite().prepare(`
    SELECT c.id, c.slug, ${localizedName('city', 'c', locale)} AS name, c.region, c.lat, c.lng
      FROM cities c WHERE c.slug = ? AND c.is_published = 1
  `).get(slug) as City | undefined;
  return row ?? null;
}

// Single city's hero photo URL. Used only by the city-page micro cover —
// every other surface (homepage tiles, near-you grid, doorway) renders
// cities as text-only "app buttons" so the city page is the only place
// where a city photo appears.
export function getCityHeroPhotoUrl(cityId: string): string | null {
  const row = sqlite().prepare(`
    SELECT url FROM photos
     WHERE city_id = ? AND subject_type = 'location'
     ORDER BY is_primary DESC, sort_order ASC
     LIMIT 1
  `).get(cityId) as { url: string } | undefined;
  return row?.url ?? null;
}

export function listCategories(locale: Locale = 'en'): Category[] {
  return sqlite().prepare(
    `SELECT cat.id, cat.slug, ${localizedName('category', 'cat', locale)} AS name FROM categories cat ORDER BY name`
  ).all() as Category[];
}

export function getCategoryBySlug(slug: string, locale: Locale = 'en'): Category | null {
  const row = sqlite().prepare(
    `SELECT cat.id, cat.slug, ${localizedName('category', 'cat', locale)} AS name FROM categories cat WHERE cat.slug = ?`
  ).get(slug) as Category | undefined;
  return row ?? null;
}

export type LocationPhoto = {
  url: string;
  attributionText: string | null;
  attributionUrl: string | null;
  license: string | null;
  isPrimary: boolean;
};

export function listCityLocationPhotos(cityId: string): LocationPhoto[] {
  return sqlite().prepare(`
    SELECT url, attribution_text AS attributionText, attribution_url AS attributionUrl,
           license, is_primary AS isPrimary
      FROM photos
     WHERE city_id = ? AND subject_type = 'location'
     ORDER BY is_primary DESC, sort_order ASC
  `).all(cityId) as LocationPhoto[];
}

export function listAreasInCity(cityId: string, locale: Locale = 'en'): { id: string; slug: string; name: string }[] {
  return sqlite().prepare(
    `SELECT a.id, a.slug, ${localizedName('area', 'a', locale)} AS name FROM areas a WHERE a.city_id = ? ORDER BY name`,
  ).all(cityId) as { id: string; slug: string; name: string }[];
}

export function listVenuesForCity(
  cityId: string,
  locale: Locale,
  { categoryId, limit = 60 }: { categoryId?: string; limit?: number } = {},
): VenueListItem[] {
  const params: unknown[] = [locale, cityId];
  let catFilter = '';
  if (categoryId) {
    params.push(categoryId);
    catFilter = 'AND v.category_id = ?';
  }
  params.push(limit);

  const rows = sqlite().prepare(`
    SELECT v.id, v.slug, v.name, v.description, v.rating, v.review_count AS reviewCount,
           v.price_level AS priceLevel, v.tier,
           v.city_id AS cityId, c.slug AS citySlug, ${localizedName('city', 'c', locale)} AS cityName,
           v.area_id AS areaId, a.slug AS areaSlug, ${localizedName('area', 'a', locale)} AS areaName,
           v.category_id AS categoryId, cat.slug AS categorySlug, ${localizedName('category', 'cat', locale)} AS categoryName,
           p.url AS photoUrl, p.attribution_text AS photoAttribution,
           t.value AS translatedDescription
      FROM venues v
      JOIN cities c ON c.id = v.city_id
      LEFT JOIN areas a ON a.id = v.area_id
      LEFT JOIN categories cat ON cat.id = v.category_id
      LEFT JOIN photos p ON p.venue_id = v.id AND p.is_primary = 1
      LEFT JOIN translations t
             ON t.entity_type = 'venue'
            AND t.entity_id = v.id
            AND t.field = 'description'
            AND t.locale = ?
     WHERE v.status = 'published'
       AND v.city_id = ?
       ${catFilter}
     ORDER BY (v.tier = 'featured') DESC, v.review_count DESC NULLS LAST
     LIMIT ?
  `).all(...params) as (Omit<VenueListItem, 'description'> & { description: string | null; translatedDescription: string | null })[];

  return rows.map((r) => ({
    ...r,
    description: descriptionFor(locale, r.description, r.translatedDescription),
  }));
}

export function getVenueByCityArea(citySlug: string, areaOrCategorySlug: string, venueSlug: string, locale: Locale) {
  // Routes are /{locale}/greece/{city}/{area}/{venue}. The "area" segment may
  // also be a category slug (we resolve by area first, then category).
  const sqliteDb = sqlite();
  const row = sqliteDb.prepare(`
    SELECT v.id, v.slug, v.name, v.description, v.address, v.phone, v.website,
           v.opening_hours AS openingHours, v.price_level AS priceLevel,
           v.lat, v.lng, v.rating, v.review_count AS reviewCount, v.tier,
           v.claim, v.status, v.design_params AS designParams,
           c.slug AS citySlug, ${localizedName('city', 'c', locale)} AS cityName,
           a.slug AS areaSlug, ${localizedName('area', 'a', locale)} AS areaName,
           cat.slug AS categorySlug, ${localizedName('category', 'cat', locale)} AS categoryName,
           t.value AS translatedDescription
      FROM venues v
      JOIN cities c ON c.id = v.city_id AND c.slug = ?
      LEFT JOIN areas a ON a.id = v.area_id
      LEFT JOIN categories cat ON cat.id = v.category_id
      LEFT JOIN translations t
             ON t.entity_type = 'venue'
            AND t.entity_id = v.id
            AND t.field = 'description'
            AND t.locale = ?
     WHERE v.status = 'published'
       AND v.slug = ?
       AND (
         a.slug = ? OR cat.slug = ?
       )
     LIMIT 1
  `).get(citySlug, locale, venueSlug, areaOrCategorySlug, areaOrCategorySlug) as
    | {
        id: string;
        slug: string | null;
        name: string;
        description: string | null;
        address: string | null;
        phone: string | null;
        website: string | null;
        openingHours: string | null;
        priceLevel: number | null;
        lat: number | null;
        lng: number | null;
        rating: number | null;
        reviewCount: number | null;
        tier: 'free' | 'featured';
        claim: 'unclaimed' | 'pending' | 'verified';
        status: 'draft' | 'pending' | 'published' | 'closed' | 'rejected';
        designParams: string | null;
        citySlug: string;
        cityName: string;
        areaSlug: string | null;
        areaName: string | null;
        categorySlug: string | null;
        categoryName: string | null;
        translatedDescription: string | null;
      }
    | undefined;

  if (!row) return null;

  const photos = sqliteDb.prepare(
    `SELECT id, url, attribution_text AS attribution, sort_order
       FROM photos WHERE venue_id = ? AND subject_type = 'venue'
       ORDER BY is_primary DESC, sort_order ASC`,
  ).all(row.id) as { id: string; url: string; attribution: string | null; sort_order: number }[];

  return {
    ...row,
    description: descriptionFor(locale, row.description, row.translatedDescription),
    photos,
  };
}

export function siteStats(): { cities: number; articles: number; neighborhoods: number; locales: number } {
  const s = sqlite();
  return {
    cities: (s.prepare(`SELECT COUNT(*) c FROM cities WHERE is_published = 1`).get() as { c: number }).c,
    // Post-article-pivot: the public stat is published articles, not
    // venues. Venues still live in the DB as the candidate pool the AI
    // picks from, but they're not a user-facing unit anymore.
    articles: (s.prepare(`SELECT COUNT(*) c FROM articles WHERE status = 'published'`).get() as { c: number }).c,
    neighborhoods: (s.prepare(`SELECT COUNT(*) c FROM areas`).get() as { c: number }).c,
    locales: 5,
  };
}

export function listRelatedVenues(args: { cityId: string; excludeVenueId: string; categoryId: string | null; locale: Locale; limit?: number }): VenueListItem[] {
  const { cityId, excludeVenueId, categoryId, locale } = args;
  const limit = args.limit ?? 6;
  const params: unknown[] = [locale, cityId, excludeVenueId];
  let catBoost = '';
  if (categoryId) { params.push(categoryId); catBoost = '(v.category_id = ?) DESC,'; }
  params.push(limit);

  const rows = sqlite().prepare(`
    SELECT v.id, v.slug, v.name, v.description, v.rating, v.review_count AS reviewCount,
           v.price_level AS priceLevel, v.tier,
           v.city_id AS cityId, c.slug AS citySlug, ${localizedName('city', 'c', locale)} AS cityName,
           v.area_id AS areaId, a.slug AS areaSlug, ${localizedName('area', 'a', locale)} AS areaName,
           v.category_id AS categoryId, cat.slug AS categorySlug, ${localizedName('category', 'cat', locale)} AS categoryName,
           p.url AS photoUrl, p.attribution_text AS photoAttribution,
           t.value AS translatedDescription
      FROM venues v
      JOIN cities c ON c.id = v.city_id
      LEFT JOIN areas a ON a.id = v.area_id
      LEFT JOIN categories cat ON cat.id = v.category_id
      LEFT JOIN photos p ON p.venue_id = v.id AND p.is_primary = 1
      LEFT JOIN translations t
             ON t.entity_type = 'venue'
            AND t.entity_id = v.id
            AND t.field = 'description'
            AND t.locale = ?
     WHERE v.status = 'published' AND v.city_id = ? AND v.id != ?
     ORDER BY ${catBoost} (v.tier = 'featured') DESC, v.review_count DESC NULLS LAST
     LIMIT ?
  `).all(...params) as (Omit<VenueListItem, 'description'> & { description: string | null; translatedDescription: string | null })[];
  return rows.map((r) => ({ ...r, description: descriptionFor(locale, r.description, r.translatedDescription) }));
}

export type SearchHit = {
  venueId: string;
  cityId: string;
  name: string;
  snippet: string;
  citySlug: string;
  areaSlug: string | null;
  slug: string | null;
};

export type CitySearchHit = { id: string; slug: string; name: string; region: string | null };
export type CategorySearchHit = { id: string; slug: string; name: string; parentId: string | null };

export function searchCities(query: string, limit = 5): CitySearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  // Cities table is small (~10–60 rows even at full scope) — a simple LIKE scan
  // is faster than maintaining a separate FTS index, and matches both EN and
  // Greek-character names natively.
  return sqlite().prepare(`
    SELECT id, slug, name, region
      FROM cities
     WHERE is_published = 1
       AND (LOWER(name) LIKE ? OR LOWER(slug) LIKE ?)
     ORDER BY
       CASE WHEN LOWER(name) = ? THEN 0
            WHEN LOWER(name) LIKE ? THEN 1
            ELSE 2 END,
       name
     LIMIT ?
  `).all(`%${q}%`, `%${q}%`, q, `${q}%`, limit) as CitySearchHit[];
}

export function searchCategories(query: string, limit = 5): CategorySearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  // Categories table is ~15 rows — same logic as searchCities.
  return sqlite().prepare(`
    SELECT id, slug, name, parent_id AS parentId
      FROM categories
     WHERE parent_id IS NOT NULL
       AND (LOWER(name) LIKE ? OR LOWER(slug) LIKE ?)
     ORDER BY
       CASE WHEN LOWER(name) = ? THEN 0
            WHEN LOWER(name) LIKE ? THEN 1
            ELSE 2 END,
       name
     LIMIT ?
  `).all(`%${q}%`, `%${q}%`, q, `${q}%`, limit) as CategorySearchHit[];
}

export function searchVenues(query: string, opts: { cityId?: string; locale: Locale; limit?: number }): SearchHit[] {
  if (!query.trim()) return [];
  const limit = opts.limit ?? 10;

  // FTS5 query — escape double-quotes, add prefix wildcard for typeahead.
  const safe = query.replace(/"/g, '""');
  const terms = safe.split(/\s+/).filter(Boolean).map((t) => `"${t}"*`).join(' AND ');
  if (!terms) return [];

  const params: unknown[] = [terms];
  let cityFilter = '';
  if (opts.cityId) { params.push(opts.cityId); cityFilter = 'AND f.city_id = ?'; }
  params.push(limit);

  return sqlite().prepare(`
    SELECT f.venue_id AS venueId,
           f.city_id AS cityId,
           f.name,
           snippet(venues_fts, 1, '<mark>', '</mark>', '…', 12) AS snippet,
           c.slug AS citySlug, a.slug AS areaSlug, v.slug AS slug
      FROM venues_fts f
      JOIN venues v ON v.id = f.venue_id
      JOIN cities c ON c.id = v.city_id
      LEFT JOIN areas a ON a.id = v.area_id
     WHERE venues_fts MATCH ?
       AND f.status = 'published'
       ${cityFilter}
     ORDER BY rank
     LIMIT ?
  `).all(...params) as SearchHit[];
}

// ── Venue events (Featured-tier owner posts; A5) ────────────────────────
// Public-side query — upcoming published events only, ordered by start time
// ascending. Used by the venue page to render a "Tonight" block above the
// description when the venue has scheduled events.
export type UpcomingEvent = {
  id: string;
  title: string;
  description: string | null;
  startsAt: number; // unix seconds
  endsAt: number | null;
  url: string | null;
};

export function listUpcomingVenueEvents(venueId: string, limit = 6): UpcomingEvent[] {
  return sqlite().prepare(`
    SELECT id, title, description, starts_at AS startsAt, ends_at AS endsAt, url
      FROM venue_events
     WHERE venue_id = ?
       AND status = 'published'
       AND COALESCE(ends_at, starts_at) >= unixepoch() - 3600
     ORDER BY starts_at ASC
     LIMIT ?
  `).all(venueId, limit) as UpcomingEvent[];
}

// ── Nearby cities (content-layer #1) ────────────────────────────────────
// Returns the N closest other published cities by great-circle distance.
// Used in the city-page footer block as an internal-link cluster — improves
// crawl depth + bounces visitors who picked the wrong island.
export type NearbyCity = {
  id: string;
  slug: string;
  name: string;
  region: string | null;
  distanceKm: number;
};

export function listNearbyCities(cityId: string, locale: Locale, limit = 6): NearbyCity[] {
  // Pull the source city's coords.
  const src = sqlite().prepare(
    `SELECT id, lat, lng FROM cities WHERE id = ? AND is_published = 1`,
  ).get(cityId) as { id: string; lat: number | null; lng: number | null } | undefined;
  if (!src || src.lat == null || src.lng == null) return [];

  // Haversine in SQL — sqlite has the math functions enabled in better-sqlite3.
  // 6371 = Earth radius in km. We compute against all other published cities
  // with valid coords and sort by distance ascending.
  const rows = sqlite().prepare(`
    SELECT c.id,
           c.slug,
           ${localizedName('city', 'c', locale)} AS name,
           c.region,
           (
             6371 * 2 * ASIN(MIN(1, SQRT(
               POWER(SIN(((c.lat - ?) * 3.141592653589793 / 180) / 2), 2) +
               COS(? * 3.141592653589793 / 180) * COS(c.lat * 3.141592653589793 / 180) *
               POWER(SIN(((c.lng - ?) * 3.141592653589793 / 180) / 2), 2)
             )))
           ) AS distanceKm
      FROM cities c
     WHERE c.id != ?
       AND c.is_published = 1
       AND c.lat IS NOT NULL AND c.lng IS NOT NULL
     ORDER BY distanceKm ASC
     LIMIT ?
  `).all(src.lat, src.lat, src.lng, cityId, limit) as NearbyCity[];

  return rows;
}
