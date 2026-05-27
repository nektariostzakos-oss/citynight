// Lookups for the new /cities/{citySlug} discovery surface (Phase H3).
// Sites store the city as free text (matches cities.name from migration).
// We join via case-insensitive equality so a renamed city in the dropdown
// still surfaces the original sites.

import 'server-only';
import { db } from '@/db';

const dbh = () => db.$client;

export type CityRecord = {
  id: string;
  slug: string;
  name: string;
  region: string | null;
  lat: number | null;
  lng: number | null;
};

export function getCityBySlugForDiscovery(slug: string): CityRecord | null {
  return (dbh().prepare(`
    SELECT id, slug, name, region, lat, lng
      FROM cities WHERE slug = ? AND is_published = 1
  `).get(slug) as CityRecord | undefined) ?? null;
}

export type SiteCard = {
  id: string;
  slug: string;
  citySlug: string | null;
  name: string;
  vertical: string;
  templateId: string;
  city: string | null;
  heroUrl: string | null;
  aboutLede: string | null;
};

/** Sites that belong to a citynight city. Matches sites.city_slug first
 *  (populated by H1/H3 backfill), falls back to case-insensitive city-name
 *  match for any rows the backfill missed. */
export function listSitesInCity(citySlug: string, cityName: string, limit = 60): SiteCard[] {
  return dbh().prepare(`
    SELECT s.id, s.slug, s.city_slug AS citySlug, s.name,
           s.vertical, s.template_id AS templateId, s.city,
           sp.url AS heroUrl,
           substr(COALESCE(s.about_text, ''), 1, 200) AS aboutLede
      FROM sites s
      LEFT JOIN site_photos sp
             ON sp.site_id = s.id
            AND sp.is_primary = 1
     WHERE (s.city_slug = ? OR LOWER(s.city) = LOWER(?))
       AND s.status = 'published'
     ORDER BY s.published_at DESC
     LIMIT ?
  `).all(citySlug, cityName, limit) as SiteCard[];
}

export function countSitesInCity(citySlug: string, cityName: string): number {
  return (dbh().prepare(
    `SELECT COUNT(*) AS c FROM sites
      WHERE (city_slug = ? OR LOWER(city) = LOWER(?))
        AND status = 'published'`,
  ).get(citySlug, cityName) as { c: number }).c;
}
