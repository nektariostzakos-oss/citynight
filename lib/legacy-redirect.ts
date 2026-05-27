// Phase H2/H3 — old /greece/{city}/{bucket}/{venue}* URLs map to the new
// /[locale]/cities/{citySlug}/{slug} surface via sites.legacy_venue_id
// (set by the H1 migration) and sites.city_slug (set by H3's backfill).

import 'server-only';
import { db } from '@/db';

const dbh = () => db.$client;

const CACHE = new Map<string, { target: { citySlug: string; slug: string } | null; expires: number }>();
const TTL_MS = 5 * 60_000;

/**
 * Resolve a legacy directory URL's slugs to the canonical (city, slug)
 * pair on the migrated SaaS site. Caller redirects to
 *   /[locale]/cities/{citySlug}/{slug}{subpath}
 */
export function findMigratedSiteTarget(
  citySlug: string,
  bucketSlug: string,
  venueSlug: string,
): { citySlug: string; slug: string } | null {
  const key = `${citySlug}/${bucketSlug}/${venueSlug}`;
  const now = Date.now();
  const cached = CACHE.get(key);
  if (cached && cached.expires > now) return cached.target;

  const row = dbh().prepare(`
    SELECT s.slug, s.city_slug AS citySlug
      FROM sites s
      JOIN venues v ON v.id = s.legacy_venue_id
      JOIN cities c ON c.id = v.city_id AND c.slug = ?
      LEFT JOIN areas a ON a.id = v.area_id
      LEFT JOIN categories cat ON cat.id = v.category_id
     WHERE v.slug = ?
       AND (a.slug = ? OR cat.slug = ?)
       AND s.status = 'published'
     LIMIT 1
  `).get(citySlug, venueSlug, bucketSlug, bucketSlug) as { slug: string; citySlug: string | null } | undefined;

  const target = row?.citySlug ? { citySlug: row.citySlug, slug: row.slug } : null;
  CACHE.set(key, { target, expires: now + TTL_MS });
  return target;
}

/** Back-compat shim — kept temporarily for any caller that still expects
 *  just the slug. New callers should use findMigratedSiteTarget(). */
export function findMigratedSiteSlug(
  citySlug: string, bucketSlug: string, venueSlug: string,
): string | null {
  return findMigratedSiteTarget(citySlug, bucketSlug, venueSlug)?.slug ?? null;
}
