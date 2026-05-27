// Owner write paths for the mini-site content (Phase F1b). Three discrete
// functions; each enforces its own ownership / tier gate. Parallels
// lib/owner-edit.ts (facts) and lib/owner-design.ts (design).
//
// Tier policy:
//   • About text  → Free claim (content depth helps SEO, want it open)
//   • Reservation → Featured (this is the conversion surface that drives revenue)
//   • Menu        → Featured (same — the most visible "this is a real website" signal)

import 'server-only';
import { db } from '@/db';
import { randomUUID } from 'node:crypto';

const dbh = () => db.$client;

type VenueRow = { id: string; owner_id: string | null; tier: 'free' | 'featured' };

function loadOwnedVenue(venueId: string, ownerId: string): VenueRow {
  const row = dbh().prepare(
    `SELECT id, owner_id, tier FROM venues WHERE id = ?`,
  ).get(venueId) as VenueRow | undefined;
  if (!row) throw new Response('Not found', { status: 404 });
  if (row.owner_id !== ownerId) throw new Response('Forbidden', { status: 403 });
  return row;
}

function requireFeatured(row: VenueRow): void {
  if (row.tier !== 'featured') throw new Response('Featured required', { status: 402 });
}

// -------- About --------------------------------------------------------------

/** Bound on what we accept as About text. Plain text only (renderer uses
 *  `whitespace-pre-line`; no markdown parser, no HTML). Keep length sane so
 *  we don't store essays an owner pastes by accident. */
const ABOUT_MAX = 5000;

export function setOwnerAbout(venueId: string, ownerId: string, raw: unknown): void {
  loadOwnedVenue(venueId, ownerId);
  const text = normaliseAbout(raw);
  dbh().prepare(`UPDATE venues SET about_text = ? WHERE id = ?`).run(text, venueId);
}

function normaliseAbout(raw: unknown): string | null {
  if (raw === null || raw === '') return null;
  if (typeof raw !== 'string') throw new Response('Invalid about text', { status: 400 });
  const trimmed = raw.trim();
  if (!trimmed.length) return null;
  if (trimmed.length > ABOUT_MAX) throw new Response('About too long', { status: 400 });
  return trimmed;
}

// -------- Reservation settings ----------------------------------------------

export type ReservationInput = {
  reservationUrl?: string | null;
  reservationEmail?: string | null;
  reservationPhone?: string | null;
  reservationNotes?: string | null;
};

const URL_MAX = 500;
const EMAIL_MAX = 200;
const PHONE_MAX = 30;
const NOTES_MAX = 1000;

export function setOwnerReservation(venueId: string, ownerId: string, input: ReservationInput): void {
  const row = loadOwnedVenue(venueId, ownerId);
  requireFeatured(row);

  const sets: string[] = [];
  const args: unknown[] = [];

  if (input.reservationUrl !== undefined) {
    const v = normaliseUrlMaybeNull(input.reservationUrl);
    sets.push('reservation_url = ?'); args.push(v);
  }
  if (input.reservationEmail !== undefined) {
    const v = normaliseEmailMaybeNull(input.reservationEmail);
    sets.push('reservation_email = ?'); args.push(v);
  }
  if (input.reservationPhone !== undefined) {
    const v = normaliseStringMaybeNull(input.reservationPhone, PHONE_MAX);
    sets.push('reservation_phone = ?'); args.push(v);
  }
  if (input.reservationNotes !== undefined) {
    const v = normaliseStringMaybeNull(input.reservationNotes, NOTES_MAX);
    sets.push('reservation_notes = ?'); args.push(v);
  }
  if (!sets.length) return;
  args.push(venueId);
  dbh().prepare(`UPDATE venues SET ${sets.join(', ')} WHERE id = ?`).run(...args);
}

function normaliseStringMaybeNull(raw: unknown, max: number): string | null {
  if (raw === null || raw === '') return null;
  if (typeof raw !== 'string') throw new Response('Invalid string field', { status: 400 });
  const t = raw.trim();
  if (!t.length) return null;
  if (t.length > max) throw new Response('Field too long', { status: 400 });
  return t;
}
function normaliseUrlMaybeNull(raw: unknown): string | null {
  const t = normaliseStringMaybeNull(raw, URL_MAX);
  if (!t) return null;
  try {
    const u = new URL(t);
    if (!['http:', 'https:'].includes(u.protocol)) throw new Error('protocol');
    return u.toString();
  } catch {
    throw new Response('Invalid reservation URL', { status: 400 });
  }
}
function normaliseEmailMaybeNull(raw: unknown): string | null {
  const t = normaliseStringMaybeNull(raw, EMAIL_MAX);
  if (!t) return null;
  // Minimal RFC-ish check — full validation is impossible client-side and
  // the SMTP forwarder (Phase F1b future) is the real authority.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) {
    throw new Response('Invalid reservation email', { status: 400 });
  }
  return t.toLowerCase();
}

// -------- Menu (full replace) -----------------------------------------------

export type MenuInput = {
  sections: ReadonlyArray<{
    id?: string;
    name: string;
    description?: string | null;
    items: ReadonlyArray<{
      id?: string;
      name: string;
      description?: string | null;
      price?: string | null;
      isPopular?: boolean;
      isVegetarian?: boolean;
      isVegan?: boolean;
      isGlutenFree?: boolean;
    }>;
  }>;
};

const SECTION_NAME_MAX = 100;
const SECTION_DESC_MAX = 400;
const ITEM_NAME_MAX = 120;
const ITEM_DESC_MAX = 400;
const ITEM_PRICE_MAX = 40;
const MAX_SECTIONS = 30;
const MAX_ITEMS_PER_SECTION = 200;

/**
 * Replace the whole menu in a single transaction. We diff by (section id,
 * item id) so existing primary keys keep their ids — that means edits don't
 * orphan any future linkage (translations, photos, analytics) we hang off
 * those ids. Anything not in the new payload is deleted (cascade handles
 * items when a section drops out).
 */
export function replaceOwnerMenu(venueId: string, ownerId: string, input: MenuInput): void {
  const row = loadOwnedVenue(venueId, ownerId);
  requireFeatured(row);
  validateMenu(input);

  const dbi = dbh();
  const tx = dbi.transaction(() => {
    const existingSections = dbi.prepare(
      `SELECT id FROM venue_menu_sections WHERE venue_id = ?`,
    ).all(venueId) as { id: string }[];
    const keepSectionIds = new Set<string>();

    const upsertSection = dbi.prepare(`
      INSERT INTO venue_menu_sections (id, venue_id, name, description, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, unixepoch(), unixepoch())
      ON CONFLICT(id) DO UPDATE
        SET name = excluded.name,
            description = excluded.description,
            sort_order = excluded.sort_order,
            updated_at = unixepoch()
    `);
    const deleteSection = dbi.prepare(`DELETE FROM venue_menu_sections WHERE id = ? AND venue_id = ?`);
    const existingItemsForSection = dbi.prepare(
      `SELECT id FROM venue_menu_items WHERE section_id = ?`,
    );
    const upsertItem = dbi.prepare(`
      INSERT INTO venue_menu_items (id, section_id, name, description, price,
                                    is_popular, is_vegetarian, is_vegan, is_gluten_free,
                                    sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())
      ON CONFLICT(id) DO UPDATE
        SET name = excluded.name,
            description = excluded.description,
            price = excluded.price,
            is_popular = excluded.is_popular,
            is_vegetarian = excluded.is_vegetarian,
            is_vegan = excluded.is_vegan,
            is_gluten_free = excluded.is_gluten_free,
            sort_order = excluded.sort_order,
            updated_at = unixepoch()
    `);
    const deleteItem = dbi.prepare(`DELETE FROM venue_menu_items WHERE id = ? AND section_id = ?`);

    input.sections.forEach((s, sIdx) => {
      const sectionId = s.id ?? randomUUID();
      keepSectionIds.add(sectionId);
      upsertSection.run(
        sectionId, venueId,
        s.name.trim(),
        s.description?.trim() || null,
        sIdx,
      );

      const existingItems = existingItemsForSection.all(sectionId) as { id: string }[];
      const keepItemIds = new Set<string>();

      s.items.forEach((it, iIdx) => {
        const itemId = it.id ?? randomUUID();
        keepItemIds.add(itemId);
        upsertItem.run(
          itemId, sectionId,
          it.name.trim(),
          it.description?.trim() || null,
          it.price?.trim() || null,
          it.isPopular ? 1 : 0,
          it.isVegetarian ? 1 : 0,
          it.isVegan ? 1 : 0,
          it.isGlutenFree ? 1 : 0,
          iIdx,
        );
      });

      for (const ex of existingItems) {
        if (!keepItemIds.has(ex.id)) deleteItem.run(ex.id, sectionId);
      }
    });

    for (const ex of existingSections) {
      if (!keepSectionIds.has(ex.id)) deleteSection.run(ex.id, venueId);
    }
  });
  tx();
}

function validateMenu(input: MenuInput): void {
  if (!input || !Array.isArray(input.sections)) {
    throw new Response('Invalid menu payload', { status: 400 });
  }
  if (input.sections.length > MAX_SECTIONS) {
    throw new Response('Too many menu sections', { status: 400 });
  }
  for (const s of input.sections) {
    if (typeof s.name !== 'string' || !s.name.trim() || s.name.length > SECTION_NAME_MAX) {
      throw new Response('Invalid section name', { status: 400 });
    }
    if (s.description != null && (typeof s.description !== 'string' || s.description.length > SECTION_DESC_MAX)) {
      throw new Response('Invalid section description', { status: 400 });
    }
    if (!Array.isArray(s.items) || s.items.length > MAX_ITEMS_PER_SECTION) {
      throw new Response('Invalid section items', { status: 400 });
    }
    for (const it of s.items) {
      if (typeof it.name !== 'string' || !it.name.trim() || it.name.length > ITEM_NAME_MAX) {
        throw new Response('Invalid item name', { status: 400 });
      }
      if (it.description != null && (typeof it.description !== 'string' || it.description.length > ITEM_DESC_MAX)) {
        throw new Response('Invalid item description', { status: 400 });
      }
      if (it.price != null && (typeof it.price !== 'string' || it.price.length > ITEM_PRICE_MAX)) {
        throw new Response('Invalid item price', { status: 400 });
      }
    }
  }
}
