import type { MetadataRoute } from 'next';
import { LOCALES, HREFLANG } from '@/lib/i18n';
import { db } from '@/db';
import { SITE_URL } from '@/lib/seo';

// Sitemap with per-locale entries + hreflang alternates (§10). Published
// content only — /dashboard, /claim, /auth, /api are excluded by never being
// added.
//
// Segmentation: if estimated URL count exceeds SEGMENT_THRESHOLD, the file
// emits one sub-sitemap per city via generateSitemaps(). Google's per-file
// limit is 50,000 URLs so we cut over comfortably below that.
//
// lastModified comes from DB columns (cities.created_at, venues.published_at).

const SEGMENT_THRESHOLD = 40_000;

type CityRow = { id: string; slug: string; createdAt: number | null };
type AreaRow = { citySlug: string; areaSlug: string };
type CategoryRow = { slug: string };
type VenueRow = { vslug: string; cslug: string; bucket: string | null; publishedAt: number | null };

function loadCities(): CityRow[] {
  return db.$client.prepare(
    `SELECT id, slug, created_at AS createdAt FROM cities WHERE is_published = 1`,
  ).all() as CityRow[];
}
function loadAreas(): AreaRow[] {
  return db.$client.prepare(
    `SELECT c.slug AS citySlug, a.slug AS areaSlug
       FROM areas a JOIN cities c ON c.id = a.city_id
      WHERE c.is_published = 1`,
  ).all() as AreaRow[];
}
function loadCategories(): CategoryRow[] {
  return db.$client.prepare(`SELECT slug FROM categories`).all() as CategoryRow[];
}
function loadVenues(): VenueRow[] {
  return db.$client.prepare(
    `SELECT v.slug AS vslug, c.slug AS cslug,
            COALESCE(a.slug, cat.slug) AS bucket,
            v.published_at AS publishedAt
       FROM venues v
       JOIN cities c ON c.id = v.city_id
       LEFT JOIN areas a ON a.id = v.area_id
       LEFT JOIN categories cat ON cat.id = v.category_id
      WHERE v.status = 'published' AND v.slug IS NOT NULL`,
  ).all() as VenueRow[];
}
function loadVenuesForCity(citySlug: string): VenueRow[] {
  return db.$client.prepare(
    `SELECT v.slug AS vslug, c.slug AS cslug,
            COALESCE(a.slug, cat.slug) AS bucket,
            v.published_at AS publishedAt
       FROM venues v
       JOIN cities c ON c.id = v.city_id
       LEFT JOIN areas a ON a.id = v.area_id
       LEFT JOIN categories cat ON cat.id = v.category_id
      WHERE v.status = 'published' AND v.slug IS NOT NULL AND c.slug = ?`,
  ).all(citySlug) as VenueRow[];
}

function alternatesAt(pathSuffix: string) {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[HREFLANG[l]] = `${SITE_URL}/${l}${pathSuffix}`;
  return languages;
}

function tsToDate(ts: number | null): Date {
  if (!ts || !Number.isFinite(ts)) return new Date();
  // SQLite unixepoch() yields seconds; tolerate ms timestamps too.
  return new Date(ts < 1e12 ? ts * 1000 : ts);
}

function estimateUrlCount(): number {
  const cities = loadCities();
  const cats = loadCategories();
  const areas = loadAreas();
  const venueCount = (db.$client.prepare(
    `SELECT COUNT(*) AS n FROM venues WHERE status = 'published' AND slug IS NOT NULL`,
  ).get() as { n: number }).n;
  // per locale: root + /greece + cities + cities×cats + areas + venues
  const perLocale = 2 + cities.length + cities.length * cats.length + areas.length + venueCount;
  return perLocale * LOCALES.length;
}

function coreEntries(): MetadataRoute.Sitemap {
  const cities = loadCities();
  const cats = loadCategories();
  const areas = loadAreas();
  const entries: MetadataRoute.Sitemap = [];

  for (const l of LOCALES) {
    entries.push({
      url: `${SITE_URL}/${l}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
      alternates: { languages: alternatesAt('') },
    });
    entries.push({
      url: `${SITE_URL}/${l}/greece`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
      alternates: { languages: alternatesAt('/greece') },
    });
    for (const c of cities) {
      entries.push({
        url: `${SITE_URL}/${l}/greece/${c.slug}`,
        lastModified: tsToDate(c.createdAt),
        changeFrequency: 'weekly',
        priority: 0.8,
        alternates: { languages: alternatesAt(`/greece/${c.slug}`) },
      });
      for (const k of cats) {
        entries.push({
          url: `${SITE_URL}/${l}/greece/${c.slug}/${k.slug}`,
          lastModified: tsToDate(c.createdAt),
          changeFrequency: 'weekly',
          priority: 0.6,
          alternates: { languages: alternatesAt(`/greece/${c.slug}/${k.slug}`) },
        });
      }
    }
    for (const a of areas) {
      const suffix = `/greece/${a.citySlug}/${a.areaSlug}`;
      entries.push({
        url: `${SITE_URL}/${l}${suffix}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.6,
        alternates: { languages: alternatesAt(suffix) },
      });
    }
  }
  return entries;
}

function venueEntries(venues: VenueRow[]): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  for (const l of LOCALES) {
    for (const v of venues) {
      if (!v.bucket) continue;
      const suffix = `/greece/${v.cslug}/${v.bucket}/${v.vslug}`;
      entries.push({
        url: `${SITE_URL}/${l}${suffix}`,
        lastModified: tsToDate(v.publishedAt),
        changeFrequency: 'weekly',
        priority: 0.5,
        alternates: { languages: alternatesAt(suffix) },
      });
    }
  }
  return entries;
}

// Single /sitemap.xml at current scale. When estimateUrlCount() crosses
// SEGMENT_THRESHOLD, uncomment generateSitemaps below — Next 15 will then
// emit /sitemap/{id}.xml plus an auto-generated /sitemap.xml index.
//
// export async function generateSitemaps(): Promise<{ id: string }[]> {
//   const cities = loadCities();
//   return [{ id: 'core' }, ...cities.map((c) => ({ id: `city-${c.slug}` }))];
// }

// Minimal fallback used when the SQLite file isn't available — e.g. the very
// first build on a fresh host before migrations run, or a misconfigured
// DATABASE_PATH. Returns only the static surfaces (root + /greece for every
// locale) so the build can still produce a valid sitemap.xml; the real data
// is picked up on the next revalidation.
// Phase J.2 — article URLs. /{locale}/{city} + /{locale}/{city}/{slug}.
// Only published articles. Each article only emits for its own locale
// (per-locale articles aren't hreflang-aliased yet — that comes when we
// generate parallel translations).
type ArticleRow = { citySlug: string; locale: string; slug: string; publishedAt: number | null };

function loadArticleRows(): ArticleRow[] {
  return db.$client.prepare(`
    SELECT c.slug AS citySlug, a.locale, a.slug, a.published_at AS publishedAt
      FROM articles a
      JOIN cities c ON c.id = a.city_id
     WHERE a.status = 'published'
       AND c.is_published = 1
  `).all() as ArticleRow[];
}

function articleEntries(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  const cities = loadCities();
  // City article-index pages, one per locale.
  for (const l of LOCALES) {
    for (const c of cities) {
      entries.push({
        url: `${SITE_URL}/${l}/${c.slug}`,
        lastModified: tsToDate(c.createdAt),
        changeFrequency: 'daily',
        priority: 0.8,
        alternates: { languages: alternatesAt(`/${c.slug}`) },
      });
    }
  }
  // Article detail pages — single locale per row.
  for (const a of loadArticleRows()) {
    entries.push({
      url: `${SITE_URL}/${a.locale}/${a.citySlug}/${a.slug}`,
      lastModified: tsToDate(a.publishedAt),
      changeFrequency: 'weekly',
      priority: 0.7,
    });
  }
  return entries;
}

function fallbackSitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  for (const l of LOCALES) {
    entries.push({
      url: `${SITE_URL}/${l}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
      alternates: { languages: alternatesAt('') },
    });
    entries.push({
      url: `${SITE_URL}/${l}/greece`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
      alternates: { languages: alternatesAt('/greece') },
    });
  }
  return entries;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    if (estimateUrlCount() > SEGMENT_THRESHOLD) {
      // Safety log — flip the file to the generateSitemaps shape above if this hits.
      console.warn(
        `[sitemap] URL count ${estimateUrlCount()} exceeds ${SEGMENT_THRESHOLD}; ` +
          'consider enabling generateSitemaps() segmentation.',
      );
    }
    return [...coreEntries(), ...articleEntries(), ...venueEntries(loadVenues())];
  } catch (err) {
    // Don't break the build if the DB isn't ready yet — fall back to the
    // static surfaces. Real data appears on the next revalidation once
    // migrations have run and cities/venues exist.
    console.warn('[sitemap] DB unavailable, returning fallback sitemap:', err instanceof Error ? err.message : err);
    return fallbackSitemap();
  }
}

// Exported so tests / future segmentation can re-use without re-querying.
export { loadCities, loadVenuesForCity, coreEntries, venueEntries };
