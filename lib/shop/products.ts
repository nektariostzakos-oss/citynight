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

// ─── owner CRUD ───────────────────────────────────────────────────────

export type ProductInput = {
  slug: string;
  name: string;
  category?: string | null;
  shortDesc?: string | null;
  longDesc?: string | null;
  priceCents: number;
  currency?: string;
  imageUrl?: string | null;
  stock?: number | null;
  featured?: boolean;
  enabled?: boolean;
  sortOrder?: number;
};

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,80}[a-z0-9])?$/;

function validateInput(input: ProductInput): void {
  if (!input.slug || !SLUG_RE.test(input.slug)) throw new Error('bad_slug');
  if (!input.name || input.name.length > 120) throw new Error('bad_name');
  if (!Number.isInteger(input.priceCents) || input.priceCents < 0 || input.priceCents > 100_000_00) {
    throw new Error('bad_price');
  }
  if (input.stock !== undefined && input.stock !== null) {
    if (!Number.isInteger(input.stock) || input.stock < 0 || input.stock > 100_000) {
      throw new Error('bad_stock');
    }
  }
}

export function createProduct(siteId: string, input: ProductInput): SiteProduct {
  validateInput(input);
  const id = crypto.randomUUID();
  try {
    dbh().prepare(`
      INSERT INTO site_products (
        id, site_id, slug, name, category, short_desc, long_desc,
        price_cents, currency, image_url, stock, featured, enabled, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, siteId, input.slug, input.name,
      input.category ?? null, input.shortDesc ?? null, input.longDesc ?? null,
      input.priceCents, input.currency ?? 'EUR',
      input.imageUrl ?? null, input.stock ?? null,
      input.featured ? 1 : 0, input.enabled === false ? 0 : 1,
      input.sortOrder ?? 0,
    );
  } catch (err) {
    // UNIQUE (site_id, slug) violation → friendlier error
    if (err instanceof Error && /UNIQUE/.test(err.message)) throw new Error('slug_taken');
    throw err;
  }
  return getProduct(siteId, id)!;
}

export function updateProduct(siteId: string, productId: string, patch: Partial<ProductInput>): SiteProduct | null {
  const existing = dbh().prepare(`SELECT id FROM site_products WHERE site_id = ? AND id = ?`).get(siteId, productId);
  if (!existing) return null;

  const sets: string[] = [];
  const args: unknown[] = [];
  const push = (col: string, v: unknown) => { sets.push(`${col} = ?`); args.push(v); };

  if (patch.slug !== undefined) {
    if (!SLUG_RE.test(patch.slug)) throw new Error('bad_slug');
    push('slug', patch.slug);
  }
  if (patch.name !== undefined) {
    if (!patch.name || patch.name.length > 120) throw new Error('bad_name');
    push('name', patch.name);
  }
  if (patch.category !== undefined)  push('category', patch.category);
  if (patch.shortDesc !== undefined) push('short_desc', patch.shortDesc);
  if (patch.longDesc !== undefined)  push('long_desc', patch.longDesc);
  if (patch.priceCents !== undefined) {
    if (!Number.isInteger(patch.priceCents) || patch.priceCents < 0) throw new Error('bad_price');
    push('price_cents', patch.priceCents);
  }
  if (patch.currency !== undefined)  push('currency', patch.currency);
  if (patch.imageUrl !== undefined)  push('image_url', patch.imageUrl);
  if (patch.stock !== undefined) {
    if (patch.stock !== null && (!Number.isInteger(patch.stock) || patch.stock < 0)) throw new Error('bad_stock');
    push('stock', patch.stock);
  }
  if (patch.featured !== undefined) push('featured', patch.featured ? 1 : 0);
  if (patch.enabled !== undefined)  push('enabled', patch.enabled ? 1 : 0);
  if (patch.sortOrder !== undefined) push('sort_order', patch.sortOrder);

  if (sets.length === 0) return getProduct(siteId, productId);
  sets.push('updated_at = unixepoch()');
  args.push(siteId, productId);

  try {
    dbh().prepare(`UPDATE site_products SET ${sets.join(', ')} WHERE site_id = ? AND id = ?`).run(...args);
  } catch (err) {
    if (err instanceof Error && /UNIQUE/.test(err.message)) throw new Error('slug_taken');
    throw err;
  }
  return getProduct(siteId, productId);
}

export function deleteProduct(siteId: string, productId: string): boolean {
  const info = dbh().prepare(`DELETE FROM site_products WHERE site_id = ? AND id = ?`).run(siteId, productId);
  return info.changes > 0;
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
