// Per-site services catalogue. Replaces atelier's data/services.json with
// SQLite queries against site_services. Prices are stored as integer cents
// (priceCents) and surfaced unchanged; UI converts at the boundary.

import 'server-only';
import { db } from '@/db';

export type SiteService = {
  id: string;
  siteId: string;
  slug: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  bufferMinutes: number;
  priceCents: number;
  category: string | null;
  enabled: boolean;
  sortOrder: number;
};

const dbh = () => db.$client;

function row(r: Record<string, unknown>): SiteService {
  return {
    id: String(r.id),
    siteId: String(r.site_id),
    slug: String(r.slug),
    name: String(r.name),
    description: (r.description as string | null) ?? null,
    durationMinutes: Number(r.duration_minutes),
    bufferMinutes: Number(r.buffer_minutes),
    priceCents: Number(r.price_cents),
    category: (r.category as string | null) ?? null,
    enabled: Number(r.enabled) === 1,
    sortOrder: Number(r.sort_order),
  };
}

/** All services for a site, ordered for display. Includes disabled by default
 * — callers that only want public-bookable services should filter on `enabled`
 * or call `listEnabledServices`. */
export function listServices(siteId: string): SiteService[] {
  return (dbh().prepare(`
    SELECT id, site_id, slug, name, description,
           duration_minutes, buffer_minutes, price_cents,
           category, enabled, sort_order
      FROM site_services
     WHERE site_id = ?
     ORDER BY sort_order ASC, name ASC
  `).all(siteId) as Record<string, unknown>[]).map(row);
}

export function listEnabledServices(siteId: string): SiteService[] {
  return (dbh().prepare(`
    SELECT id, site_id, slug, name, description,
           duration_minutes, buffer_minutes, price_cents,
           category, enabled, sort_order
      FROM site_services
     WHERE site_id = ? AND enabled = 1
     ORDER BY sort_order ASC, name ASC
  `).all(siteId) as Record<string, unknown>[]).map(row);
}

/** Look up a service by id OR slug (the public booking flow uses slug,
 * the dashboard uses id). Returns null if missing or wrong site. */
export function getService(siteId: string, idOrSlug: string): SiteService | null {
  const r = dbh().prepare(`
    SELECT id, site_id, slug, name, description,
           duration_minutes, buffer_minutes, price_cents,
           category, enabled, sort_order
      FROM site_services
     WHERE site_id = ? AND (id = ? OR slug = ?)
     LIMIT 1
  `).get(siteId, idOrSlug, idOrSlug) as Record<string, unknown> | undefined;
  return r ? row(r) : null;
}

/** Buffer-minutes lookup used by the slot-occupancy algorithm. Cached at
 * the caller (or just re-queried — site_services has tens of rows). */
export function getServiceBufferMinutes(siteId: string, serviceId: string): number {
  const r = dbh().prepare(
    `SELECT buffer_minutes FROM site_services WHERE site_id = ? AND id = ?`,
  ).get(siteId, serviceId) as { buffer_minutes: number } | undefined;
  return r ? Number(r.buffer_minutes) : 0;
}

/** Slot-grid generator for a given site/day. Returns "HH:MM" strings every
 * `step` minutes between `open` and `close`. Atelier had this as a static
 * HOURS constant; in citynight the open/close are stored on the site
 * (TODO: when the per-day hours editor lands, switch from this generic
 * version to a per-weekday lookup). */
export function generateSlotGrid(open: string, close: string, step = 30): string[] {
  const o = open.split(':'); const c = close.split(':');
  const oh = Number(o[0] ?? 0); const om = Number(o[1] ?? 0);
  const ch = Number(c[0] ?? 0); const cm = Number(c[1] ?? 0);
  const startMin = oh * 60 + om;
  const endMin = ch * 60 + cm;
  if (!Number.isFinite(startMin) || !Number.isFinite(endMin) || endMin <= startMin) return [];
  const out: string[] = [];
  for (let m = startMin; m < endMin; m += step) {
    const hh = Math.floor(m / 60).toString().padStart(2, '0');
    const mm = (m % 60).toString().padStart(2, '0');
    out.push(`${hh}:${mm}`);
  }
  return out;
}
