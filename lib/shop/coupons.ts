// Per-site coupons. Replaces atelier's data/coupons.json with SQLite
// queries against site_coupons. The applyCoupon() helper is the central
// gate — used during checkout to validate code + scope + expiry + min
// spend in one call, returning a computed discount in cents.

import 'server-only';
import { db } from '@/db';

export type SiteCoupon = {
  id: string;
  siteId: string;
  code: string;
  kind: 'percent' | 'fixed';
  value: number;                 // percent if kind=percent; cents if kind=fixed
  maxUses: number | null;
  usedCount: number;
  minTotalCents: number;
  appliesTo: 'bookings' | 'shop' | 'both';
  active: boolean;
  expiresAt: number | null;
};

const dbh = () => db.$client;

const SELECT = `
  SELECT id, site_id, code, kind, value, max_uses, used_count,
         min_total_cents, applies_to, active, expires_at
    FROM site_coupons
`;

function row(r: Record<string, unknown>): SiteCoupon {
  return {
    id: String(r.id),
    siteId: String(r.site_id),
    code: String(r.code),
    kind: r.kind as 'percent' | 'fixed',
    value: Number(r.value),
    maxUses: r.max_uses !== null ? Number(r.max_uses) : null,
    usedCount: Number(r.used_count),
    minTotalCents: Number(r.min_total_cents),
    appliesTo: r.applies_to as 'bookings' | 'shop' | 'both',
    active: Number(r.active) === 1,
    expiresAt: r.expires_at !== null ? Number(r.expires_at) : null,
  };
}

export function listCoupons(siteId: string): SiteCoupon[] {
  return (dbh().prepare(`${SELECT}
     WHERE site_id = ?
     ORDER BY active DESC, expires_at ASC
  `).all(siteId) as Record<string, unknown>[]).map(row);
}

export function getCouponByCode(siteId: string, code: string): SiteCoupon | null {
  const r = dbh().prepare(`${SELECT}
     WHERE site_id = ? AND code = ?
     LIMIT 1
  `).get(siteId, code.toUpperCase().trim()) as Record<string, unknown> | undefined;
  return r ? row(r) : null;
}

export type ApplyResult =
  | { ok: true; couponId: string; discountCents: number; coupon: SiteCoupon }
  | { ok: false; reason: 'not_found' | 'inactive' | 'expired' | 'exhausted' | 'wrong_scope' | 'below_min' };

/**
 * Validate a coupon against an order. Returns the discount in cents on
 * success, or a specific failure reason for the UI. Does NOT consume the
 * coupon — incrementCouponUse() is called inside the order transaction.
 */
export function applyCoupon(args: {
  siteId: string;
  code: string;
  scope: 'bookings' | 'shop';
  subtotalCents: number;
  now?: number;
}): ApplyResult {
  const coupon = getCouponByCode(args.siteId, args.code);
  if (!coupon) return { ok: false, reason: 'not_found' };
  if (!coupon.active) return { ok: false, reason: 'inactive' };

  const now = args.now ?? Math.floor(Date.now() / 1000);
  if (coupon.expiresAt !== null && coupon.expiresAt < now) {
    return { ok: false, reason: 'expired' };
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, reason: 'exhausted' };
  }
  if (coupon.appliesTo !== 'both' && coupon.appliesTo !== args.scope) {
    return { ok: false, reason: 'wrong_scope' };
  }
  if (args.subtotalCents < coupon.minTotalCents) {
    return { ok: false, reason: 'below_min' };
  }

  const discountCents = coupon.kind === 'percent'
    ? Math.floor((args.subtotalCents * coupon.value) / 100)
    : Math.min(coupon.value, args.subtotalCents);

  return { ok: true, couponId: coupon.id, discountCents, coupon };
}

/** Increment used_count atomically. Caller is expected to wrap this in
 * the same transaction as the order insert so a failed order rollback
 * also rolls back the coupon use. */
export function incrementCouponUse(couponId: string): void {
  dbh().prepare(
    `UPDATE site_coupons SET used_count = used_count + 1 WHERE id = ?`,
  ).run(couponId);
}
