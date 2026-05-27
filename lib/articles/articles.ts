// Article repository — reads + transactional inserts.
//
// `articles` rows are the listicles ("Top 10 Rooftop Bars in Athens").
// `article_venues` rows pin which directory venues appear at which rank
// inside an article, with an AI-written blurb per venue. A JOIN at read
// time gives each card its facts from `venues`.
//
// §6 integrity rule still holds: nothing in this module writes venue
// columns. AI prose lives in blurb/headline; venue facts come from the
// venues row joined in.

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
  createdAt: number;
  updatedAt: number;
};

export type ArticleVenuePick = {
  id: string;
  articleId: string;
  venueId: string;
  rank: number;
  headline: string | null;
  blurb: string;
  photoUrl: string | null;
  photoAttribution: string | null;
  // Joined from venues — present on the read-with-venues path.
  venueName?: string;
  venueSlug?: string | null;
  venueAddress?: string | null;
  venueAreaName?: string | null;
  venueRating?: number | null;
  venueReviewCount?: number | null;
  venuePriceLevel?: number | null;
};

const dbh = () => db.$client;

const SELECT_ARTICLE = `
  SELECT id, city_id, category_id, vertical, locale, slug,
         title, subtitle, intro, outro, cover_url, cover_attribution,
         source, status, generated_at, published_at, view_count,
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

/**
 * Return the article's venue picks joined with the underlying venue
 * facts (name, slug, address, area, rating, price). Ordered by rank.
 */
export function getArticleVenues(articleId: string): ArticleVenuePick[] {
  const rows = dbh().prepare(`
    SELECT av.id, av.article_id, av.venue_id, av.rank, av.headline, av.blurb,
           av.photo_url, av.photo_attribution,
           v.name AS venue_name, v.slug AS venue_slug, v.address AS venue_address,
           v.rating AS venue_rating, v.review_count AS venue_review_count,
           v.price_level AS venue_price_level,
           a.name AS venue_area_name
      FROM article_venues av
      JOIN venues v ON v.id = av.venue_id
      LEFT JOIN areas a ON a.id = v.area_id
     WHERE av.article_id = ?
     ORDER BY av.rank ASC
  `).all(articleId) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: String(r.id),
    articleId: String(r.article_id),
    venueId: String(r.venue_id),
    rank: Number(r.rank),
    headline: (r.headline as string | null) ?? null,
    blurb: String(r.blurb),
    photoUrl: (r.photo_url as string | null) ?? null,
    photoAttribution: (r.photo_attribution as string | null) ?? null,
    venueName: String(r.venue_name),
    venueSlug: (r.venue_slug as string | null) ?? null,
    venueAddress: (r.venue_address as string | null) ?? null,
    venueAreaName: (r.venue_area_name as string | null) ?? null,
    venueRating: r.venue_rating !== null ? Number(r.venue_rating) : null,
    venueReviewCount: r.venue_review_count !== null ? Number(r.venue_review_count) : null,
    venuePriceLevel: r.venue_price_level !== null ? Number(r.venue_price_level) : null,
  }));
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

export type VenuePickInput = {
  venueId: string;
  rank: number;
  headline?: string | null;
  blurb: string;
  photoUrl?: string | null;
  photoAttribution?: string | null;
};

/**
 * Insert an article + its venue picks transactionally. The picks share
 * the article's auto-generated id; partial-state can't leak through if
 * one of the venue inserts fails.
 */
export function createArticleWithPicks(
  article: ArticleInput,
  picks: VenuePickInput[],
): Article {
  if (picks.length === 0) throw new Error('article_needs_picks');
  if (picks.length > 50) throw new Error('too_many_picks');

  const conn = dbh();
  const id = crypto.randomUUID();
  const status = article.status ?? 'draft';
  const generatedAt = article.source === 'ai' ? Math.floor(Date.now() / 1000) : null;
  const publishedAt = status === 'published' ? Math.floor(Date.now() / 1000) : null;

  const tx = conn.transaction(() => {
    conn.prepare(`
      INSERT INTO articles (
        id, city_id, category_id, vertical, locale, slug,
        title, subtitle, intro, outro,
        cover_url, cover_attribution,
        source, status, generated_at, published_at, prompt_meta
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      article.cityId, article.categoryId ?? null,
      article.vertical, article.locale, article.slug,
      article.title, article.subtitle ?? null,
      article.intro ?? null, article.outro ?? null,
      article.coverUrl ?? null, article.coverAttribution ?? null,
      article.source ?? 'ai', status, generatedAt, publishedAt,
      article.promptMeta ? JSON.stringify(article.promptMeta) : null,
    );

    const insertPick = conn.prepare(`
      INSERT INTO article_venues (
        id, article_id, venue_id, rank, headline, blurb,
        photo_url, photo_attribution
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const pick of picks) {
      insertPick.run(
        crypto.randomUUID(), id, pick.venueId, pick.rank,
        pick.headline ?? null, pick.blurb,
        pick.photoUrl ?? null, pick.photoAttribution ?? null,
      );
    }
  });

  try { tx(); }
  catch (err) {
    if (err instanceof Error && /UNIQUE/.test(err.message)) {
      // Either (locale, slug) collision on articles or (article_id, rank)
      // collision on article_venues. Caller can rename slug or de-dup picks.
      throw new Error('article_conflict');
    }
    throw err;
  }
  return getArticle(id)!;
}

export function publishArticle(id: string): Article | null {
  dbh().prepare(`
    UPDATE articles
       SET status = 'published',
           published_at = COALESCE(published_at, unixepoch()),
           updated_at = unixepoch()
     WHERE id = ?
  `).run(id);
  return getArticle(id);
}
