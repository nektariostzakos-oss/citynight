// Per-site orders. Replaces atelier's data/orders.json with SQLite
// queries against site_orders + site_order_items. createOrder() is the
// canonical entry point — it computes totals from product rows (never
// trusts client input), optionally applies a coupon + gift card, decrements
// stock, and writes everything in a single transaction.

import 'server-only';
import { db } from '@/db';
import { getProduct, decrementStock, type SiteProduct } from './products';
import { applyCoupon, incrementCouponUse, type ApplyResult } from './coupons';
import { checkGiftCard, commitGiftCardRedemption, type RedeemResult } from './gift-cards';
import { upsertClientFromContact, recordOrderForClient } from '@/lib/crm/clients';

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
const TERMINAL: Set<OrderStatus> = new Set(['cancelled', 'refunded']);

export type SiteOrderItem = {
  id: string;
  orderId: string;
  productId: string | null;
  name: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
};

export type SiteOrder = {
  id: string;
  siteId: string;
  clientId: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingPostal: string | null;
  shippingCountry: string | null;
  notes: string | null;
  lang: string;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  couponId: string | null;
  giftCardId: string | null;
  stripePaymentIntentId: string | null;
  stripeCheckoutSessionId: string | null;
  applicationFeeCents: number | null;
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
};

const dbh = () => db.$client;

const SELECT_ORDER = `
  SELECT id, site_id, client_id, customer_name, customer_email, customer_phone,
         shipping_address, shipping_city, shipping_postal, shipping_country,
         notes, lang,
         subtotal_cents, discount_cents, shipping_cents, tax_cents, total_cents,
         currency, coupon_id, gift_card_id,
         stripe_payment_intent_id, stripe_checkout_session_id, application_fee_cents,
         status, created_at, updated_at
    FROM site_orders
`;

function orderRow(r: Record<string, unknown>): SiteOrder {
  return {
    id: String(r.id), siteId: String(r.site_id),
    clientId: (r.client_id as string | null) ?? null,
    customerName: String(r.customer_name),
    customerEmail: (r.customer_email as string | null) ?? null,
    customerPhone: (r.customer_phone as string | null) ?? null,
    shippingAddress: (r.shipping_address as string | null) ?? null,
    shippingCity: (r.shipping_city as string | null) ?? null,
    shippingPostal: (r.shipping_postal as string | null) ?? null,
    shippingCountry: (r.shipping_country as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    lang: String(r.lang),
    subtotalCents: Number(r.subtotal_cents),
    discountCents: Number(r.discount_cents),
    shippingCents: Number(r.shipping_cents),
    taxCents: Number(r.tax_cents),
    totalCents: Number(r.total_cents),
    currency: String(r.currency),
    couponId: (r.coupon_id as string | null) ?? null,
    giftCardId: (r.gift_card_id as string | null) ?? null,
    stripePaymentIntentId: (r.stripe_payment_intent_id as string | null) ?? null,
    stripeCheckoutSessionId: (r.stripe_checkout_session_id as string | null) ?? null,
    applicationFeeCents: r.application_fee_cents !== null ? Number(r.application_fee_cents) : null,
    status: r.status as OrderStatus,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  };
}

export type CartLine = { productId: string; quantity: number };
export type NewOrderInput = {
  items: CartLine[];
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  shippingAddress?: string | null;
  shippingCity?: string | null;
  shippingPostal?: string | null;
  shippingCountry?: string | null;
  notes?: string | null;
  lang?: string;
  couponCode?: string | null;
  giftCardCode?: string | null;
  shippingCents?: number;
  taxCents?: number;
};

export class OrderError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
    this.name = 'OrderError';
  }
}

export type PricedOrder = {
  order: SiteOrder;
  items: SiteOrderItem[];
  couponApplied: ApplyResult & { ok: true } | null;
  giftCardApplied: RedeemResult & { ok: true } | null;
};

/**
 * Create a pending order. Computes subtotal from product rows (never
 * trusts client price), applies coupon then gift card, decrements stock,
 * inserts order + items + redemptions all inside one transaction.
 *
 * The order lands in status='pending' — Stripe Connect PaymentIntent
 * (created separately) flips it to 'paid' via webhook.
 */
export function createOrder(siteId: string, input: NewOrderInput): PricedOrder {
  if (!input.items.length) throw new OrderError('empty_cart');

  // Resolve products + compute line items + subtotal BEFORE the transaction
  // so we can fail fast on bad input without holding a write lock.
  type Resolved = { product: SiteProduct; quantity: number; lineTotalCents: number };
  const resolved: Resolved[] = [];
  let subtotalCents = 0;
  let currency: string | null = null;
  for (const line of input.items) {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0 || line.quantity > 99) {
      throw new OrderError('bad_quantity');
    }
    const product = getProduct(siteId, line.productId);
    if (!product || !product.enabled) throw new OrderError('product_unavailable');
    if (product.stock !== null && product.stock < line.quantity) {
      throw new OrderError('out_of_stock');
    }
    if (currency === null) currency = product.currency;
    else if (currency !== product.currency) throw new OrderError('currency_mismatch');
    const lineTotalCents = product.priceCents * line.quantity;
    subtotalCents += lineTotalCents;
    resolved.push({ product, quantity: line.quantity, lineTotalCents });
  }

  // Optional coupon
  let couponApplied: ApplyResult & { ok: true } | null = null;
  if (input.couponCode) {
    const result = applyCoupon({ siteId, code: input.couponCode, scope: 'shop', subtotalCents });
    if (!result.ok) throw new OrderError(`coupon_${result.reason}`);
    couponApplied = result;
  }

  const discountAfterCoupon = couponApplied?.discountCents ?? 0;
  const subtotalAfterCoupon = Math.max(0, subtotalCents - discountAfterCoupon);

  // Optional gift card (applied AFTER coupon — order of operations matches
  // atelier's behaviour where the gift card is a payment method, not a discount).
  let giftCardApplied: RedeemResult & { ok: true } | null = null;
  if (input.giftCardCode && subtotalAfterCoupon > 0) {
    const result = checkGiftCard({ siteId, code: input.giftCardCode, subtotalCents: subtotalAfterCoupon });
    if (!result.ok) throw new OrderError(`gift_card_${result.reason}`);
    giftCardApplied = result;
  }

  const shippingCents = Math.max(0, input.shippingCents ?? 0);
  const taxCents = Math.max(0, input.taxCents ?? 0);
  const giftCardCents = giftCardApplied?.appliedCents ?? 0;
  const totalCents = Math.max(0, subtotalAfterCoupon - giftCardCents + shippingCents + taxCents);

  const conn = dbh();
  const tx = conn.transaction(() => {
    // Resolve / create the client row inside the order transaction so
    // both move atomically.
    const clientId = upsertClientFromContact(siteId, {
      name: input.customerName,
      email: input.customerEmail ?? null,
      phone: input.customerPhone ?? null,
    });

    const orderId = crypto.randomUUID();
    conn.prepare(`
      INSERT INTO site_orders (
        id, site_id, client_id,
        customer_name, customer_email, customer_phone,
        shipping_address, shipping_city, shipping_postal, shipping_country,
        notes, lang,
        subtotal_cents, discount_cents, shipping_cents, tax_cents, total_cents,
        currency, coupon_id, gift_card_id,
        status
      ) VALUES (
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        'pending'
      )
    `).run(
      orderId, siteId, clientId,
      input.customerName, input.customerEmail ?? null, input.customerPhone ?? null,
      input.shippingAddress ?? null, input.shippingCity ?? null,
      input.shippingPostal ?? null, input.shippingCountry ?? null,
      input.notes ?? null, input.lang ?? 'en',
      subtotalCents, discountAfterCoupon + giftCardCents, shippingCents, taxCents, totalCents,
      currency ?? 'EUR',
      couponApplied?.couponId ?? null,
      giftCardApplied?.giftCardId ?? null,
    );

    for (const r of resolved) {
      conn.prepare(`
        INSERT INTO site_order_items (id, order_id, product_id, name, unit_price_cents, quantity, line_total_cents)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(), orderId, r.product.id, r.product.name,
        r.product.priceCents, r.quantity, r.lineTotalCents,
      );
      decrementStock(siteId, r.product.id, r.quantity);
    }

    if (couponApplied) incrementCouponUse(couponApplied.couponId);
    if (giftCardApplied) {
      commitGiftCardRedemption({
        giftCardId: giftCardApplied.giftCardId,
        orderId,
        appliedCents: giftCardApplied.appliedCents,
        remainingBalance: giftCardApplied.remainingBalance,
      });
    }

    return orderId;
  });

  const orderId = (tx as () => string)();
  const order = getOrder(siteId, orderId)!;
  const items = listOrderItems(orderId);
  return { order, items, couponApplied, giftCardApplied };
}

export function getOrder(siteId: string, orderId: string): SiteOrder | null {
  const r = dbh().prepare(`${SELECT_ORDER} WHERE site_id = ? AND id = ? LIMIT 1`)
    .get(siteId, orderId) as Record<string, unknown> | undefined;
  return r ? orderRow(r) : null;
}

export function listOrders(
  siteId: string,
  opts: { status?: OrderStatus; limit?: number } = {},
): SiteOrder[] {
  const filters: string[] = ['site_id = ?'];
  const args: unknown[] = [siteId];
  if (opts.status) { filters.push('status = ?'); args.push(opts.status); }
  const limit = opts.limit ? `LIMIT ${Math.max(1, Math.floor(opts.limit))}` : 'LIMIT 200';
  return (dbh().prepare(`${SELECT_ORDER}
     WHERE ${filters.join(' AND ')}
     ORDER BY created_at DESC
     ${limit}
  `).all(...args) as Record<string, unknown>[]).map(orderRow);
}

export function listOrderItems(orderId: string): SiteOrderItem[] {
  return (dbh().prepare(`
    SELECT id, order_id, product_id, name, unit_price_cents, quantity, line_total_cents
      FROM site_order_items
     WHERE order_id = ?
     ORDER BY id
  `).all(orderId) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    orderId: String(r.order_id),
    productId: (r.product_id as string | null) ?? null,
    name: String(r.name),
    unitPriceCents: Number(r.unit_price_cents),
    quantity: Number(r.quantity),
    lineTotalCents: Number(r.line_total_cents),
  }));
}

/** State-machine guarded status update. Terminal statuses (cancelled,
 * refunded) cannot transition to anything other than themselves. */
export function updateOrderStatus(
  siteId: string,
  orderId: string,
  next: OrderStatus,
): SiteOrder | null {
  const current = getOrder(siteId, orderId);
  if (!current) return null;
  if (TERMINAL.has(current.status) && current.status !== next) {
    throw new Error(`Cannot change order from ${current.status} to ${next}.`);
  }
  const sets: string[] = ['status = ?', 'updated_at = unixepoch()'];
  const args: unknown[] = [next];
  if (next === 'paid')      sets.push('paid_at = unixepoch()');
  if (next === 'shipped')   sets.push('shipped_at = unixepoch()');
  if (next === 'delivered') sets.push('delivered_at = unixepoch()');
  if (next === 'cancelled') sets.push('cancelled_at = unixepoch()');
  args.push(siteId, orderId);
  dbh().prepare(
    `UPDATE site_orders SET ${sets.join(', ')} WHERE site_id = ? AND id = ?`,
  ).run(...args);

  // Rollup: bump client total_spent + last_ordered_at when the order
  // first reaches 'paid'. Subsequent transitions (shipped/delivered)
  // don't change spend; refunded is logged but rollup not decremented in
  // v1 — refunds are rare enough that owners can read the orders table
  // directly when they need accurate spend.
  if (current.status === 'pending' && next === 'paid' && current.clientId) {
    recordOrderForClient(current.clientId, current.totalCents, Math.floor(Date.now() / 1000));
  }

  return getOrder(siteId, orderId);
}

/** Capture the Stripe PaymentIntent / Checkout Session after the deposit
 * flow returns success. Webhook will flip status='paid' on
 * payment_intent.succeeded. */
export function attachStripePaymentIntent(
  siteId: string,
  orderId: string,
  paymentIntentId: string,
  applicationFeeCents: number,
): void {
  dbh().prepare(`
    UPDATE site_orders
       SET stripe_payment_intent_id = ?,
           application_fee_cents = ?,
           updated_at = unixepoch()
     WHERE site_id = ? AND id = ?
  `).run(paymentIntentId, applicationFeeCents, siteId, orderId);
}
