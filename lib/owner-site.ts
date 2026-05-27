// Owner write paths for SaaS sites (Phase G4). Mirrors lib/owner-edit.ts +
// lib/owner-minisite.ts on the venue side. Each function:
//   1. Confirms ownership of the site (owner_id match) — else 403/404
//   2. Validates input (length caps, URL/email shape)
//   3. UPDATE on the locked-down column set
//
// Subscription state (sites.saas_status, stripe_*) is NEVER editable here —
// only the Stripe webhook can flip those fields, per §11.

import 'server-only';
import { db } from '@/db';
import { randomUUID } from 'node:crypto';
import { normaliseHost, invalidateCustomDomain } from './custom-domain';

const dbh = () => db.$client;

type SiteRow = { id: string; owner_id: string };

function loadOwnedSite(siteId: string, ownerId: string): SiteRow {
  const row = dbh().prepare(`SELECT id, owner_id FROM sites WHERE id = ?`).get(siteId) as SiteRow | undefined;
  if (!row) throw new Response('Not found', { status: 404 });
  if (row.owner_id !== ownerId) throw new Response('Forbidden', { status: 403 });
  return row;
}

// -------- business info -------------------------------------------------------

export type SiteInfoInput = {
  name?: string | null;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  contactEmail?: string | null;
  tagline?: string | null;
  wordmark?: string | null;
};

export function setSiteInfo(siteId: string, ownerId: string, input: SiteInfoInput): void {
  loadOwnedSite(siteId, ownerId);
  const sets: string[] = [];
  const args: unknown[] = [];
  if (input.name !== undefined) {
    const v = String(input.name ?? '').trim();
    if (!v || v.length > 120) throw new Response('Invalid name', { status: 400 });
    sets.push('name = ?'); args.push(v);
  }
  if (input.city !== undefined)         { sets.push('city = ?');          args.push(strOrNull(input.city, 80)); }
  if (input.address !== undefined)      { sets.push('address = ?');       args.push(strOrNull(input.address, 200)); }
  if (input.phone !== undefined)        { sets.push('phone = ?');         args.push(strOrNull(input.phone, 30)); }
  if (input.contactEmail !== undefined) {
    const v = strOrNull(input.contactEmail, 200);
    if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new Response('Invalid email', { status: 400 });
    sets.push('contact_email = ?'); args.push(v ? v.toLowerCase() : null);
  }
  if (input.tagline !== undefined)      { sets.push('tagline = ?');       args.push(strOrNull(input.tagline, 80)); }
  if (input.wordmark !== undefined)     { sets.push('wordmark = ?');      args.push(strOrNull(input.wordmark, 40)); }
  if (!sets.length) return;
  args.push(siteId);
  dbh().prepare(`UPDATE sites SET ${sets.join(', ')} WHERE id = ?`).run(...args);
}

// -------- about ---------------------------------------------------------------

const ABOUT_MAX = 5000;

export function setSiteAbout(siteId: string, ownerId: string, raw: unknown): void {
  loadOwnedSite(siteId, ownerId);
  const text = raw === null || raw === '' ? null : (() => {
    if (typeof raw !== 'string') throw new Response('Invalid about', { status: 400 });
    const t = raw.trim();
    if (!t) return null;
    if (t.length > ABOUT_MAX) throw new Response('About too long', { status: 400 });
    return t;
  })();
  dbh().prepare(`UPDATE sites SET about_text = ? WHERE id = ?`).run(text, siteId);
}

// -------- reservation --------------------------------------------------------

export type SiteReservationInput = {
  reservationUrl?: string | null;
  reservationEmail?: string | null;
  reservationPhone?: string | null;
  reservationNotes?: string | null;
};

export function setSiteReservation(siteId: string, ownerId: string, input: SiteReservationInput): void {
  loadOwnedSite(siteId, ownerId);
  const sets: string[] = [];
  const args: unknown[] = [];
  if (input.reservationUrl !== undefined)   {
    const v = normaliseUrl(input.reservationUrl);
    sets.push('reservation_url = ?'); args.push(v);
  }
  if (input.reservationEmail !== undefined) {
    const v = strOrNull(input.reservationEmail, 200);
    if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new Response('Invalid email', { status: 400 });
    sets.push('reservation_email = ?'); args.push(v ? v.toLowerCase() : null);
  }
  if (input.reservationPhone !== undefined) { sets.push('reservation_phone = ?'); args.push(strOrNull(input.reservationPhone, 30)); }
  if (input.reservationNotes !== undefined) { sets.push('reservation_notes = ?'); args.push(strOrNull(input.reservationNotes, 1000)); }
  if (!sets.length) return;
  args.push(siteId);
  dbh().prepare(`UPDATE sites SET ${sets.join(', ')} WHERE id = ?`).run(...args);
}

// -------- custom domain -------------------------------------------------------

export function setSiteCustomDomain(siteId: string, ownerId: string, raw: string | null): string | null {
  const site = dbh().prepare(`SELECT id, owner_id, custom_domain FROM sites WHERE id = ?`)
    .get(siteId) as { id: string; owner_id: string; custom_domain: string | null } | undefined;
  if (!site) throw new Response('Not found', { status: 404 });
  if (site.owner_id !== ownerId) throw new Response('Forbidden', { status: 403 });

  if (raw === null || raw === '') {
    if (site.custom_domain) invalidateCustomDomain(site.custom_domain);
    dbh().prepare(`UPDATE sites SET custom_domain = NULL WHERE id = ?`).run(siteId);
    return null;
  }
  const host = normaliseHost(String(raw));
  if (!host) throw new Response('Invalid domain', { status: 400 });
  if (host === 'citynight.gr' || host.endsWith('.citynight.gr')) {
    throw new Response('citynight.gr cannot be used as a custom domain', { status: 400 });
  }
  try {
    dbh().prepare(`UPDATE sites SET custom_domain = ? WHERE id = ?`).run(host, siteId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/UNIQUE constraint failed/i.test(msg)) throw new Response('Domain is already taken', { status: 409 });
    throw err;
  }
  if (site.custom_domain && site.custom_domain !== host) invalidateCustomDomain(site.custom_domain);
  invalidateCustomDomain(host);
  return host;
}

// -------- menu (full replace) -------------------------------------------------

export type SiteMenuInput = {
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

const MAX_SECTIONS = 30;
const MAX_ITEMS_PER_SECTION = 200;

export function replaceSiteMenu(siteId: string, ownerId: string, input: SiteMenuInput): void {
  loadOwnedSite(siteId, ownerId);
  if (!input || !Array.isArray(input.sections) || input.sections.length > MAX_SECTIONS) {
    throw new Response('Invalid menu', { status: 400 });
  }
  for (const s of input.sections) {
    if (!s.name?.trim() || s.name.length > 100) throw new Response('Invalid section name', { status: 400 });
    if (s.description != null && s.description.length > 400) throw new Response('Invalid section description', { status: 400 });
    if (!Array.isArray(s.items) || s.items.length > MAX_ITEMS_PER_SECTION) throw new Response('Invalid items', { status: 400 });
    for (const it of s.items) {
      if (!it.name?.trim() || it.name.length > 120) throw new Response('Invalid item name', { status: 400 });
      if (it.description != null && it.description.length > 400) throw new Response('Invalid item description', { status: 400 });
      if (it.price != null && it.price.length > 40) throw new Response('Invalid item price', { status: 400 });
    }
  }

  const dbi = dbh();
  const tx = dbi.transaction(() => {
    const keepSec = new Set<string>();
    const upsertSec = dbi.prepare(`
      INSERT INTO site_menu_sections (id, site_id, name, description, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, unixepoch(), unixepoch())
      ON CONFLICT(id) DO UPDATE
        SET name = excluded.name, description = excluded.description,
            sort_order = excluded.sort_order, updated_at = unixepoch()
    `);
    const upsertItem = dbi.prepare(`
      INSERT INTO site_menu_items
        (id, section_id, name, description, price, is_popular, is_vegetarian, is_vegan,
         is_gluten_free, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())
      ON CONFLICT(id) DO UPDATE
        SET name = excluded.name, description = excluded.description, price = excluded.price,
            is_popular = excluded.is_popular, is_vegetarian = excluded.is_vegetarian,
            is_vegan = excluded.is_vegan, is_gluten_free = excluded.is_gluten_free,
            sort_order = excluded.sort_order, updated_at = unixepoch()
    `);
    const existingSec = dbi.prepare(`SELECT id FROM site_menu_sections WHERE site_id = ?`)
      .all(siteId) as { id: string }[];
    const deleteSec = dbi.prepare(`DELETE FROM site_menu_sections WHERE id = ? AND site_id = ?`);
    const existingItemsFor = dbi.prepare(`SELECT id FROM site_menu_items WHERE section_id = ?`);
    const deleteItem = dbi.prepare(`DELETE FROM site_menu_items WHERE id = ? AND section_id = ?`);

    input.sections.forEach((s, sIdx) => {
      const secId = s.id ?? randomUUID();
      keepSec.add(secId);
      upsertSec.run(secId, siteId, s.name.trim(), s.description?.trim() || null, sIdx);
      const existing = existingItemsFor.all(secId) as { id: string }[];
      const keepItem = new Set<string>();
      s.items.forEach((it, iIdx) => {
        const itemId = it.id ?? randomUUID();
        keepItem.add(itemId);
        upsertItem.run(
          itemId, secId, it.name.trim(), it.description?.trim() || null, it.price?.trim() || null,
          it.isPopular ? 1 : 0, it.isVegetarian ? 1 : 0, it.isVegan ? 1 : 0, it.isGlutenFree ? 1 : 0,
          iIdx,
        );
      });
      for (const ex of existing) if (!keepItem.has(ex.id)) deleteItem.run(ex.id, secId);
    });
    for (const ex of existingSec) if (!keepSec.has(ex.id)) deleteSec.run(ex.id, siteId);
  });
  tx();
}

// -------- shared helpers ------------------------------------------------------

function strOrNull(v: unknown, max: number): string | null {
  if (v == null || v === '') return null;
  if (typeof v !== 'string') throw new Response('Invalid field', { status: 400 });
  const t = v.trim();
  if (!t) return null;
  if (t.length > max) throw new Response('Field too long', { status: 400 });
  return t;
}

function normaliseUrl(v: unknown): string | null {
  const t = strOrNull(v, 500);
  if (!t) return null;
  try {
    const u = new URL(t);
    if (!['http:', 'https:'].includes(u.protocol)) throw new Error('protocol');
    return u.toString();
  } catch {
    throw new Response('Invalid URL', { status: 400 });
  }
}
