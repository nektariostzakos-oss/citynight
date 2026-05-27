// Per-site product catalogue. Replaces atelier's data/products.json with
// SQLite queries against site_products. Mirrors the booking lib shape —
// prices stored as integer cents, listEnabled is the public path,
// list returns everything for the dashboard.

import 'server-only';
import { db } from '@/db';

export type SiteProduct = {
  id: string;
  siteId: string;
  slug: string;
  name: string;
  category: string | null;
  shortDesc: string | null;
  longDesc: string | null;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  stock: number | null;
  featured: boolean;
  enabled: boolean;
  sortOrder: number;
};

const dbh = () => db.$client;

const SELECT = `
  SELECT id, site_id, slug, name, category, short_desc, long_desc,
         price_cents, currency, image_url, stock, featured, enabled, sort_order
    FROM site_products
`;

function row(r: Record<string, unknown>): SiteProduct {
  return {
    id: String(r.id),
    siteId: String(r.site_id),
    slug: String(r.slug),
    name: String(r.name),
    category: (r.category as string | null) ?? null,
    shortDesc: (r.short_desc as string | null) ?? null,
    longDesc: (r.long_desc as string | null) ?? null,
    priceCents: Number(r.price_cents),
    currency: String(r.currency),
    imageUrl: (r.image_url as string | null) ?? null,
    stock: r.stock !== null ? Number(r.stock) : null,
    featured: Number(r.featured) === 1,
    enabled: Number(r.enabled) === 1,
    sortOrder: Number(r.sort_order),
  };
}

export function listProducts(siteId: string): SiteProduct[] {
  return (dbh().prepare(`${SELECT}
     WHERE site_id = ?
     ORDER BY sort_order ASC, name ASC
  `).all(siteId) as Record<string, unknown>[]).map(row);
}

export function listEnabledProducts(siteId: string): SiteProduct[] {
  return (dbh().prepare(`${SELECT}
     WHERE site_id = ? AND enabled = 1
     ORDER BY sort_order ASC, name ASC
  `).all(siteId) as Record<string, unknown>[]).map(row);
}

export function listFeaturedProducts(siteId: string, limit = 6): SiteProduct[] {
  return (dbh().prepare(`${SELECT}
     WHERE site_id = ? AND enabled = 1 AND featured = 1
     ORDER BY sort_order ASC, name ASC
     LIMIT ?
  `).all(siteId, limit) as Record<string, unknown>[]).map(row);
}

export function getProduct(siteId: string, idOrSlug: string): SiteProduct | null {
  const r = dbh().prepare(`${SELECT}
     WHERE site_id = ? AND (id = ? OR slug = ?)
     LIMIT 1
  `).get(siteId, idOrSlug, idOrSlug) as Record<string, unknown> | undefined;
  return r ? row(r) : null;
}

/** Decrement a tracked-stock product by `qty`, returning the new stock
 * level. Idempotent ON CONFLICT-style logic isn't needed — this runs
 * inside the order-creation transaction so a single decrement is final.
 * Products with `stock IS NULL` are unlimited; no-op for those. */
export function decrementStock(siteId: string, productId: string, qty: number): number | null {
  const r = dbh().prepare(
    `SELECT stock FROM site_products WHERE site_id = ? AND id = ?`,
  ).get(siteId, productId) as { stock: number | null } | undefined;
  if (!r || r.stock === null) return null;
  const next = Math.max(0, r.stock - qty);
  dbh().prepare(
    `UPDATE site_products SET stock = ?, updated_at = unixepoch() WHERE site_id = ? AND id = ?`,
  ).run(next, siteId, productId);
  return next;
}
