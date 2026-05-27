// Read helpers for the venue mini-site subdirectory pages (Phase F1).
// Owner-edited content via the dashboard; no AI ever touches these tables.
// (Same integrity boundary as §6 — AI writes nothing here.)

import 'server-only';
import { db } from '@/db';

const dbh = () => db.$client;

export type MenuSection = {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  items: MenuItem[];
};

export type MenuItem = {
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

export type MiniSiteContent = {
  aboutText: string | null;
  reservationUrl: string | null;
  reservationEmail: string | null;
  reservationPhone: string | null;
  reservationNotes: string | null;
};

/** Fetch the menu — sections + nested items — in render order. */
export function getVenueMenu(venueId: string): MenuSection[] {
  const sections = dbh().prepare(
    `SELECT id, name, description, sort_order AS sortOrder
       FROM venue_menu_sections
      WHERE venue_id = ?
      ORDER BY sort_order ASC, created_at ASC`,
  ).all(venueId) as Omit<MenuSection, 'items'>[];

  if (!sections.length) return [];

  // Single batched query for items, grouped client-side. Cheaper than
  // N+1 across sections; one venue rarely has hundreds of items.
  const sectionIds = sections.map((s) => s.id);
  const placeholders = sectionIds.map(() => '?').join(',');
  const items = dbh().prepare(
    `SELECT id, section_id AS sectionId, name, description, price,
            is_popular AS isPopular, is_vegetarian AS isVegetarian,
            is_vegan AS isVegan, is_gluten_free AS isGlutenFree,
            sort_order AS sortOrder
       FROM venue_menu_items
      WHERE section_id IN (${placeholders})
      ORDER BY sort_order ASC, created_at ASC`,
  ).all(...sectionIds) as (MenuItem & { sectionId: string })[];

  // Booleans come back as 0/1 from SQLite — normalise so the renderer
  // can use them as JSX truthiness without surprises.
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

/** Fetch the mini-site fields on the venue itself (about, reservation). */
export function getMiniSiteContent(venueId: string): MiniSiteContent {
  const row = dbh().prepare(
    `SELECT about_text AS aboutText,
            reservation_url AS reservationUrl,
            reservation_email AS reservationEmail,
            reservation_phone AS reservationPhone,
            reservation_notes AS reservationNotes
       FROM venues WHERE id = ?`,
  ).get(venueId) as MiniSiteContent | undefined;
  return row ?? {
    aboutText: null, reservationUrl: null, reservationEmail: null,
    reservationPhone: null, reservationNotes: null,
  };
}

/** Which subdirectory tabs actually have content for this venue? Drives the
 *  sub-nav — we hide a tab when there's nothing on it, instead of showing
 *  empty pages to users who clicked through. */
export function getMiniSiteAvailability(venueId: string): {
  menu: boolean;
  about: boolean;
  book: boolean;
  gallery: boolean;
} {
  const counts = dbh().prepare(`
    SELECT
      (SELECT COUNT(*) FROM venue_menu_items mi
         JOIN venue_menu_sections ms ON ms.id = mi.section_id
        WHERE ms.venue_id = ?) AS menu_items,
      (SELECT COUNT(*) FROM photos
        WHERE venue_id = ? AND subject_type = 'venue') AS photo_count,
      (SELECT 1 FROM venues
        WHERE id = ?
          AND (about_text IS NOT NULL AND length(trim(about_text)) > 0)) AS has_about,
      (SELECT 1 FROM venues
        WHERE id = ?
          AND (reservation_url IS NOT NULL
            OR reservation_email IS NOT NULL
            OR reservation_phone IS NOT NULL
            OR phone IS NOT NULL)) AS has_book
  `).get(venueId, venueId, venueId, venueId) as {
    menu_items: number; photo_count: number;
    has_about: number | null; has_book: number | null;
  };
  return {
    menu: (counts.menu_items ?? 0) > 0,
    about: !!counts.has_about,
    // Book is available whenever the venue has SOMETHING we can offer the
    // visitor — even a public phone counts. Owner can refine via dashboard.
    book: !!counts.has_book,
    // Gallery shows when there's more than just the hero photo.
    gallery: (counts.photo_count ?? 0) > 1,
  };
}
