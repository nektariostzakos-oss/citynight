// Phase K.5 — category-level chips on city pages.
//
// `categories` table holds both leaf categories (cat_night_club, cat_bar,
// cat_rooftop_bar, ...) and three parent rows (parent_nightlife,
// parent_food, parent_stay). The city-page chip row surfaces only the
// LEAF categories — the parent verticals are already covered by the
// "Browse by interest" row above.
//
// Each chip carries an article count for the current city + locale.
// Categories with no articles still render (with count 0) so every city
// page shows the same visual catalogue regardless of seeding state.

import 'server-only';
import { db } from '@/db';

const dbh = () => db.$client;

export type CategoryChip = {
  id: string;
  slug: string;
  name: string;
  /** 'nightlife' | 'food' | 'stay' | null — derived from category.parent_id. */
  vertical: 'nightlife' | 'food' | 'stay' | null;
  articleCount: number;
};

const PARENT_TO_VERTICAL: Record<string, 'nightlife' | 'food' | 'stay'> = {
  parent_nightlife: 'nightlife',
  parent_food:      'food',
  parent_stay:      'stay',
};

/** Leaf categories (rows whose id doesn't start with 'parent_'), each
 * with the count of published articles for this city + locale. Ordered
 * by article count desc, then alphabetically. */
export function listCategoriesForCity(cityId: string, locale: string): CategoryChip[] {
  const rows = dbh().prepare(`
    SELECT cat.id, cat.slug, cat.name AS rawName, cat.parent_id AS parentId,
           COALESCE(
             (SELECT name FROM translations
               WHERE entity_type = 'category'
                 AND entity_id = cat.id
                 AND field = 'name'
                 AND locale = ?),
             cat.name
           ) AS name,
           (SELECT COUNT(*) FROM articles
             WHERE articles.city_id = ?
               AND articles.locale = ?
               AND articles.status = 'published'
               AND articles.category_id = cat.id) AS articleCount
      FROM categories cat
     WHERE cat.id NOT LIKE 'parent_%'
     ORDER BY articleCount DESC, name ASC
  `).all(locale, cityId, locale) as Array<{
    id: string; slug: string; name: string; parentId: string | null; articleCount: number;
  }>;

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    vertical: r.parentId ? (PARENT_TO_VERTICAL[r.parentId] ?? null) : null,
    articleCount: Number(r.articleCount),
  }));
}
