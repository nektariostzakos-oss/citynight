// Phase K.2 — neighborhood derivation from article picks.
//
// Articles aren't directly tagged to areas. Instead, each article picks
// venues, and venues have an area_id. We derive an article's "areas" from
// its picks — an article featuring 3 venues in Kolonaki and 2 in Psyrri
// surfaces under BOTH neighborhood pages (it's a meaningful article for
// either area's reader).
//
// This file owns the SQL that joins articles → article_venues → venues →
// areas to produce:
//   - listAreasForCity: areas that appear in any published article (with
//     article count for sorting + display)
//   - listArticlesByCityArea: articles featuring at least one venue in
//     the requested area

import 'server-only';
import { db } from '@/db';
import type { Article } from './articles';

const dbh = () => db.$client;

export type AreaWithCount = {
  id: string;
  slug: string;
  name: string;
  articleCount: number;
};

/** Areas inside the city that any published article in the locale touches.
 * Sorted by article-count descending so the busiest neighborhoods surface
 * first. Areas with no articles are filtered out. */
export function listAreasForCity(cityId: string, locale: string): AreaWithCount[] {
  return (dbh().prepare(`
    SELECT a.id, a.slug, a.name,
           COUNT(DISTINCT av.article_id) AS articleCount
      FROM areas a
      JOIN venues v ON v.area_id = a.id
      JOIN article_venues av ON av.venue_id = v.id
      JOIN articles ar ON ar.id = av.article_id
     WHERE a.city_id = ?
       AND ar.locale = ?
       AND ar.status = 'published'
     GROUP BY a.id, a.slug, a.name
    HAVING articleCount > 0
     ORDER BY articleCount DESC, a.name ASC
  `).all(cityId, locale) as Array<{ id: string; slug: string; name: string; articleCount: number }>);
}

export type AreaRow = { id: string; slug: string; name: string };

export function getAreaBySlug(cityId: string, slug: string): AreaRow | null {
  const r = dbh().prepare(
    `SELECT id, slug, name FROM areas WHERE city_id = ? AND slug = ? LIMIT 1`,
  ).get(cityId, slug) as AreaRow | undefined;
  return r ?? null;
}

/** Articles featuring at least one venue in the given area. DISTINCT
 * because an article with multiple venues in the same area would
 * otherwise duplicate. */
export function listArticlesByCityArea(
  cityId: string,
  areaId: string,
  locale: string,
  opts: { limit?: number } = {},
): Article[] {
  const limit = Math.min(500, Math.max(1, Math.floor(opts.limit ?? 100)));
  const rows = dbh().prepare(`
    SELECT DISTINCT ar.id, ar.city_id, ar.category_id, ar.vertical, ar.locale, ar.slug,
           ar.title, ar.subtitle, ar.intro, ar.outro, ar.cover_url, ar.cover_attribution,
           ar.source, ar.status, ar.generated_at, ar.published_at, ar.view_count,
           ar.created_at, ar.updated_at
      FROM articles ar
      JOIN article_venues av ON av.article_id = ar.id
      JOIN venues v ON v.id = av.venue_id
     WHERE ar.city_id = ?
       AND v.area_id = ?
       AND ar.locale = ?
       AND ar.status = 'published'
     ORDER BY COALESCE(ar.published_at, ar.created_at) DESC
     LIMIT ?
  `).all(cityId, areaId, locale, limit) as Record<string, unknown>[];

  return rows.map((r) => ({
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
  }));
}
