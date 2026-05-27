// Server-only read helpers for the SaaS site renderer (Phase G3).
// Mirrors lib/mini-site.ts on the venue side. The split keeps the two
// products from accidentally sharing data — a venue lookup never returns
// a site row, and vice versa.

import 'server-only';
import { db } from '@/db';

const dbh = () => db.$client;

export type SiteRecord = {
  id: string;
  slug: string;
  citySlug: string | null;
  /** 0 = held by the system user (migrated, unclaimed); 1 = real owner. */
  isClaimed: 0 | 1;
  name: string;
  vertical: string;
  templateId: string;
  city: string | null;
  country: string;
  address: string | null;
  phone: string | null;
  contactEmail: string | null;
  hours: string | null;
  aboutText: string | null;
  reservationUrl: string | null;
  reservationEmail: string | null;
  reservationPhone: string | null;
  reservationNotes: string | null;
  designParams: string | null;
  wordmark: string | null;
  tagline: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  customDomain: string | null;
  saasStatus: string;
  status: string;
  publishedAt: number | null;
};

const SITE_COLUMNS = `
  s.id, s.slug, s.city_slug AS citySlug, s.name, s.vertical, s.template_id AS templateId,
  s.city, s.country, s.address, s.phone, s.contact_email AS contactEmail,
  s.hours, s.about_text AS aboutText,
  s.reservation_url AS reservationUrl, s.reservation_email AS reservationEmail,
  s.reservation_phone AS reservationPhone, s.reservation_notes AS reservationNotes,
  s.design_params AS designParams,
  s.wordmark, s.tagline, s.logo_url AS logoUrl, s.favicon_url AS faviconUrl,
  s.custom_domain AS customDomain,
  s.saas_status AS saasStatus, s.status, s.published_at AS publishedAt,
  CASE WHEN u.email = 'system@citynight.gr' THEN 0 ELSE 1 END AS isClaimed
`;

/** Look up a published site by slug alone — used by the custom-domain
 *  middleware where the URL doesn't carry a city segment. */
export function getPublishedSiteBySlug(slug: string): SiteRecord | null {
  return (dbh().prepare(
    `SELECT ${SITE_COLUMNS} FROM sites s JOIN users u ON u.id = s.owner_id
      WHERE s.slug = ? AND s.status = 'published' LIMIT 1`,
  ).get(slug) as SiteRecord | undefined) ?? null;
}

/** Look up a published site by (citySlug, slug). */
export function getPublishedSiteByCityAndSlug(
  citySlug: string, slug: string,
): SiteRecord | null {
  return (dbh().prepare(
    `SELECT ${SITE_COLUMNS} FROM sites s JOIN users u ON u.id = s.owner_id
      WHERE s.slug = ? AND s.city_slug = ? AND s.status = 'published' LIMIT 1`,
  ).get(slug, citySlug) as SiteRecord | undefined) ?? null;
}

export type SiteMenuSection = {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  items: SiteMenuItem[];
};

export type SiteMenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
  isPopular: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  sortOrder: number;
};

export function getSiteMenu(siteId: string): SiteMenuSection[] {
  const sections = dbh().prepare(`
    SELECT id, name, description, sort_order AS sortOrder
      FROM site_menu_sections
     WHERE site_id = ?
     ORDER BY sort_order ASC, created_at ASC
  `).all(siteId) as Omit<SiteMenuSection, 'items'>[];
  if (!sections.length) return [];

  const placeholders = sections.map(() => '?').join(',');
  const items = dbh().prepare(`
    SELECT id, section_id AS sectionId, name, description, price,
           is_popular AS isPopular, is_vegetarian AS isVegetarian,
           is_vegan AS isVegan, is_gluten_free AS isGlutenFree,
           sort_order AS sortOrder
      FROM site_menu_items
     WHERE section_id IN (${placeholders})
     ORDER BY sort_order ASC, created_at ASC
  `).all(...sections.map((s) => s.id)) as (SiteMenuItem & { sectionId: string })[];

  const bool = (n: unknown) => n === 1 || n === true;
  return sections.map((s) => ({
    ...s,
    items: items
      .filter((i) => i.sectionId === s.id)
      .map(({ sectionId: _sectionId, ...rest }) => ({
        ...rest,
        isPopular: bool(rest.isPopular),
        isVegetarian: bool(rest.isVegetarian),
        isVegan: bool(rest.isVegan),
        isGlutenFree: bool(rest.isGlutenFree),
      })),
  }));
}

export type SitePhoto = {
  id: string;
  url: string;
  attribution: string | null;
  isPrimary: boolean;
  sortOrder: number;
};

export function getSitePhotos(siteId: string): SitePhoto[] {
  const rows = dbh().prepare(`
    SELECT id, url, attribution_text AS attribution,
           is_primary AS isPrimary, sort_order AS sortOrder
      FROM site_photos
     WHERE site_id = ?
     ORDER BY is_primary DESC, sort_order ASC, created_at ASC
  `).all(siteId) as Array<{ id: string; url: string; attribution: string | null; isPrimary: number | boolean; sortOrder: number }>;
  return rows.map((r) => ({ ...r, isPrimary: r.isPrimary === 1 || r.isPrimary === true }));
}

export function getSiteAvailability(siteId: string): {
  menu: boolean; about: boolean; gallery: boolean;
} {
  const c = dbh().prepare(`
    SELECT
      (SELECT COUNT(*) FROM site_menu_items mi
        JOIN site_menu_sections ms ON ms.id = mi.section_id
       WHERE ms.site_id = ?) AS items,
      (SELECT COUNT(*) FROM site_photos WHERE site_id = ?) AS photos,
      (SELECT 1 FROM sites WHERE id = ? AND about_text IS NOT NULL AND length(trim(about_text)) > 0) AS has_about
  `).get(siteId, siteId, siteId) as { items: number; photos: number; has_about: number | null };
  return {
    menu: (c.items ?? 0) > 0,
    about: !!c.has_about,
    gallery: (c.photos ?? 0) > 0,
  };
}
