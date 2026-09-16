// Article repository — reads + inserts for editorial city guides.
//
// citynight articles are pure editorial long-form ("Nightlife in Loutraki —
// the honest guide"). The body lives in `intro` / `outro` markdown columns;
// FAQs are extracted at render time from `## Question?` blocks or
// `> **Q?**` blockquotes inside `intro`.
//
// We used to support a listicle format with ranked venue picks. That was
// dropped — see [[project-guides-only]] in memory and migration 0043. No
// per-venue picks, no ItemList schema, no "Top N" pages.

import 'server-only';
import { db } from '@/db';

export type Article = {
  id: string;
  cityId: string;
  categoryId: string | null;
  vertical: 'nightlife' | 'food' | 'stay';
  locale: string;
  slug: string;
  title: string;
  subtitle: string | null;
  intro: string | null;
  outro: string | null;
  coverUrl: string | null;
  coverAttribution: string | null;
  source: 'ai' | 'editor';
  status: 'draft' | 'published' | 'archived';
  generatedAt: number | null;
  publishedAt: number | null;
  viewCount: number;
  // Structured magazine-guide fields (migration 0044). See seed script for
  // the locked taxonomy. Same shape on every guide for layout consistency.
  tagline: string | null;
  knownFor: string[];                            // parsed from JSON; [] when null
  bestMonths: number[];                          // parsed from JSON; [] when null
  typicalVisitLength: 'day_trip' | 'weekend' | 'week' | 'multi_day' | null;
  createdAt: number;
  updatedAt: number;
};

function parseJsonArray<T>(raw: unknown): T[] {
  if (raw == null) return [];
  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch { return []; }
}

const dbh = () => db.$client;

const SELECT_ARTICLE = `
  SELECT id, city_id, category_id, vertical, locale, slug,
         title, subtitle, intro, outro, cover_url, cover_attribution,
         source, status, generated_at, published_at, view_count,
         tagline, known_for, best_months, typical_visit_length,
         created_at, updated_at
    FROM articles
`;

function articleRow(r: Record<string, unknown>): Article {
  return {
    id: String(r.id),
    cityId: String(r.city_id),
    categoryId: (r.category_id as string | null) ?? null,
    vertical: r.vertical as Article['vertical'],
    locale: String(r.locale),
    slug: String(r.slug),
    title: String(r.title),
    subtitle: (r.subtitle as string | null) ?? null,
    intro: (r.intro as string | null) ?? null,
    outro: (r.outro as string | null) ?? null,
    coverUrl: (r.cover_url as string | null) ?? null,
    coverAttribution: (r.cover_attribution as string | null) ?? null,
    source: r.source as Article['source'],
    status: r.status as Article['status'],
    generatedAt: r.generated_at !== null ? Number(r.generated_at) : null,
    publishedAt: r.published_at !== null ? Number(r.published_at) : null,
    viewCount: Number(r.view_count),
    tagline: (r.tagline as string | null) ?? null,
    knownFor: parseJsonArray<string>(r.known_for),
    bestMonths: parseJsonArray<number>(r.best_months),
    typicalVisitLength: (r.typical_visit_length as Article['typicalVisitLength']) ?? null,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  };
}

// ─── reads ────────────────────────────────────────────────────────────

export function getArticleBySlug(locale: string, slug: string): Article | null {
  const r = dbh().prepare(`${SELECT_ARTICLE} WHERE locale = ? AND slug = ? LIMIT 1`)
    .get(locale, slug) as Record<string, unknown> | undefined;
  return r ? articleRow(r) : null;
}

export function getArticle(id: string): Article | null {
  const r = dbh().prepare(`${SELECT_ARTICLE} WHERE id = ? LIMIT 1`)
    .get(id) as Record<string, unknown> | undefined;
  return r ? articleRow(r) : null;
}

export function listArticlesByCity(
  cityId: string,
  opts: { locale?: string; vertical?: Article['vertical']; status?: Article['status']; limit?: number } = {},
): Article[] {
  const filters: string[] = ['city_id = ?'];
  const args: unknown[] = [cityId];
  if (opts.locale) { filters.push('locale = ?'); args.push(opts.locale); }
  if (opts.vertical) { filters.push('vertical = ?'); args.push(opts.vertical); }
  if (opts.status) { filters.push('status = ?'); args.push(opts.status); }
  const limit = Math.min(500, Math.max(1, Math.floor(opts.limit ?? 100)));
  return (dbh().prepare(`${SELECT_ARTICLE}
     WHERE ${filters.join(' AND ')}
     ORDER BY COALESCE(published_at, created_at) DESC
     LIMIT ?
  `).all(...args, limit) as Record<string, unknown>[]).map(articleRow);
}

export function listPublishedArticles(
  locale: string,
  opts: { limit?: number; vertical?: Article['vertical'] } = {},
): Article[] {
  const filters: string[] = [`locale = ?`, `status = 'published'`];
  const args: unknown[] = [locale];
  if (opts.vertical) { filters.push('vertical = ?'); args.push(opts.vertical); }
  const limit = Math.min(500, Math.max(1, Math.floor(opts.limit ?? 100)));
  return (dbh().prepare(`${SELECT_ARTICLE}
     WHERE ${filters.join(' AND ')}
     ORDER BY published_at DESC
     LIMIT ?
  `).all(...args, limit) as Record<string, unknown>[]).map(articleRow);
}

// ─── guide_businesses ─────────────────────────────────────────────────
//
// Verified business cards displayed on the guide page. See
// [[project-guide-businesses-verified]]. The verifier lives in
// lib/fb-verify.ts and is called BEFORE inserting a row — anything that
// lands here is at least once-verified, so reads can trust the URL.

export type GuideBusiness = {
  id: string;
  articleId: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  googleMapsUrl: string;
  /** Places-API canonical place id (when verified via Places). The card
   *  uses this to build a `destination_place_id` deep link — the most
   *  precise way to open Google Maps Directions to the actual business. */
  googlePlaceId: string | null;
  placesVerifiedAt: number | null;
  fbUrl: string;
  fbVerifiedStatus: 'pending' | 'verified' | 'not_found' | 'blocked' | 'error';
  fbVerifiedAt: number | null;
  fbPageTitle: string | null;
  /** Places-fetched hero photo (highest-rank photo for the business). */
  coverPhotoUrl: string | null;
  coverPhotoAttribution: string | null;
  rating: number | null;
  reviewCount: number | null;
  /** Editorial bucket — the page render maps (locale, kind) → H2 slug so
   *  the card lands inside the right section of the article body. */
  sectionKind: 'seafront' | 'casino' | 'beach' | 'spa' | 'seafood' | 'taverna' | 'modern' | 'other' | 'tail';
  /** Mobile-useful fields, all from Places. */
  phone: string | null;
  priceLevel: number | null;              // 0..4
  openingHours: { periods?: OpeningPeriod[] } | null;
  extraPhotos: { url: string; attribution: string | null }[];
  blurb: string;
  sortOrder: number;
};

/** Places "openingHours.periods" shape we use for the open-now chip.
 *  open + close are { day: 0..6, hour, minute } in the venue's local TZ
 *  (Europe/Athens for our market). A 24h-open period omits `close`. */
export type OpeningPeriod = {
  open: { day: number; hour: number; minute: number };
  close?: { day: number; hour: number; minute: number };
};

/** Verified business cards for an article, sorted by editor order.
 *  Verification anchor is Places: any row with places_verified_at set
 *  is renderable (the seed pipeline only inserts after Places confirms
 *  location, photos and recent reviews). The FB check is best-effort
 *  context — `fb_verified_status` records whether the FB page itself
 *  was reachable, but a 'pending' value (FB rate-limited or no slug
 *  match) does NOT block the card. See run-city.mjs insert() — that's
 *  where the Places-anchored contract is enforced. */
export function listGuideBusinesses(articleId: string): GuideBusiness[] {
  const rows = dbh().prepare(`
    SELECT id, article_id AS articleId, name, address, lat, lng,
           google_maps_url AS googleMapsUrl,
           google_place_id AS googlePlaceId,
           places_verified_at AS placesVerifiedAt,
           fb_url AS fbUrl,
           fb_verified_status AS fbVerifiedStatus,
           fb_verified_at AS fbVerifiedAt,
           fb_page_title AS fbPageTitle,
           cover_photo_url AS coverPhotoUrl,
           cover_photo_attribution AS coverPhotoAttribution,
           rating, review_count AS reviewCount,
           section_kind AS sectionKind,
           phone, price_level AS priceLevel,
           opening_hours AS openingHoursRaw,
           extra_photos AS extraPhotosRaw,
           blurb,
           sort_order AS sortOrder
      FROM guide_businesses
     WHERE article_id = ?
       AND places_verified_at IS NOT NULL
     ORDER BY sort_order ASC, name ASC
  `).all(articleId) as Array<Omit<GuideBusiness, 'openingHours' | 'extraPhotos'> & {
    openingHoursRaw: string | null; extraPhotosRaw: string | null;
  }>;
  // Parse JSON columns into typed shapes; bad/missing JSON → null/[]
  // so a malformed row never crashes the render path.
  return rows.map((r) => {
    let openingHours: GuideBusiness['openingHours'] = null;
    if (r.openingHoursRaw) {
      try { openingHours = JSON.parse(r.openingHoursRaw); } catch { /* keep null */ }
    }
    let extraPhotos: GuideBusiness['extraPhotos'] = [];
    if (r.extraPhotosRaw) {
      try {
        const parsed = JSON.parse(r.extraPhotosRaw);
        if (Array.isArray(parsed)) extraPhotos = parsed;
      } catch { /* keep [] */ }
    }
    const { openingHoursRaw: _o, extraPhotosRaw: _e, ...rest } = r;
    return { ...rest, openingHours, extraPhotos };
  });
}

// ─── writes ───────────────────────────────────────────────────────────

export type ArticleInput = {
  cityId: string;
  categoryId?: string | null;
  vertical: Article['vertical'];
  locale: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  intro?: string | null;
  outro?: string | null;
  coverUrl?: string | null;
  coverAttribution?: string | null;
  source?: Article['source'];
  status?: Article['status'];
  promptMeta?: Record<string, unknown> | null;
};

/** Insert a guide article. Throws `article_conflict` if (locale, slug)
 *  already exists — caller can DELETE first to overwrite. */
export function createArticle(input: ArticleInput): Article {
  const id = crypto.randomUUID();
  const status = input.status ?? 'draft';
  const generatedAt = input.source === 'ai' ? Math.floor(Date.now() / 1000) : null;
  const publishedAt = status === 'published' ? Math.floor(Date.now() / 1000) : null;
  try {
    dbh().prepare(`
      INSERT INTO articles (
        id, city_id, category_id, vertical, locale, slug,
        title, subtitle, intro, outro,
        cover_url, cover_attribution,
        source, status, generated_at, published_at, prompt_meta
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.cityId, input.categoryId ?? null,
      input.vertical, input.locale, input.slug,
      input.title, input.subtitle ?? null,
      input.intro ?? null, input.outro ?? null,
      input.coverUrl ?? null, input.coverAttribution ?? null,
      input.source ?? 'editor', status, generatedAt, publishedAt,
      input.promptMeta ? JSON.stringify(input.promptMeta) : null,
    );
  } catch (err) {
    if (err instanceof Error && /UNIQUE/.test(err.message)) throw new Error('article_conflict');
    throw err;
  }
  return getArticle(id)!;
}
