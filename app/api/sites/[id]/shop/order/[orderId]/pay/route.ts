// POST /api/sites/[id]/shop/order/[orderId]/pay
//
// Mints (or reuses) a Stripe Connect PaymentIntent for the given pending
// order. Returns client_secret for Stripe Elements. Idempotent on
// stripe_payment_intent_id — duplicate calls reuse the existing intent
// when Stripe still accepts confirmation, otherwise mint a fresh one.

import { NextRequest, NextResponse } from 'next/server';
import { requireSameOrigin } from '@/lib/csrf';
import { rateLimit429, ipKey } from '@/lib/rate-limit';
import { stripe } from '@/lib/stripe';
import { createDestinationPaymentIntent } from '@/lib/stripe-connect';
import { getOrder, attachStripePaymentIntent } from '@/lib/shop';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; orderId: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const limited = rateLimit429(`shop-pay:${ipKey(req)}`, { max: 20, windowMs: 60 * 60_000 });
  if (limited) return limited;

  const { id: siteId, orderId } = await params;
  const order = getOrder(siteId, orderId);
  if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (order.status !== 'pending') {
    return NextResponse.json({ error: 'wrong_status' }, { status: 409 });
  }
  if (order.totalCents <= 0) {
    return NextResponse.json({ error: 'zero_total' }, { status: 400 });
  }

  // Idempotency: reuse confirmable intent.
  if (order.stripePaymentIntentId) {
    try {
      const existing = await stripe().paymentIntents.retrieve(order.stripePaymentIntentId);
      const REUSABLE = new Set(['requires_payment_method', 'requires_confirmation', 'requires_action']);
      if (REUSABLE.has(existing.status) && existing.client_secret) {
        return NextResponse.json({
          clientSecret: existing.client_secret,
          paymentIntentId: existing.id,
          totalCents: order.totalCents,
        });
      }
    } catch {
      // Stripe lost it — mint a new one.
    }
  }

  let result;
  try {
    result = await createDestinationPaymentIntent({
      siteId,
      amountCents: order.totalCents,
      currency: order.currency,
      description: `Shop order ${orderId.slice(0, 8)}`,
      metadata: { orderId: order.id, kind: 'shop-order' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'connect_error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  attachStripePaymentIntent(siteId, orderId, result.paymentIntent.id, result.applicationFeeCents);

  return NextResponse.json({
    clientSecret: result.paymentIntent.client_secret,
    paymentIntentId: result.paymentIntent.id,
    applicationFeeCents: result.applicationFeeCents,
    totalCents: order.totalCents,
  });
}
