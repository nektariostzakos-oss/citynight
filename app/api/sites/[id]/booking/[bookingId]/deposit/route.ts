// POST /api/sites/[id]/booking/[bookingId]/deposit
//
// Public — given a freshly-created booking that requires a deposit (the
// row has `deposit_percent` set and status='pending'), create a Stripe
// PaymentIntent on the site's Connect account and return the client_secret
// for the booking-flow front-end to confirm via Stripe Elements.
//
// The endpoint is idempotent on `deposit_stripe_payment_intent_id` — if a
// PaymentIntent has already been created for this booking, we return its
// client_secret instead of creating a duplicate.
//
// Rate-limited 10/hour/IP — looser than the booking POST since legitimate
// users may retry on payment failure.

import { NextRequest, NextResponse } from 'next/server';
import { requireSameOrigin } from '@/lib/csrf';
import { rateLimit429, ipKey } from '@/lib/rate-limit';
import { getBooking } from '@/lib/booking';
import { stripe } from '@/lib/stripe';
import { createDestinationPaymentIntent } from '@/lib/stripe-connect';
import { db } from '@/db';

const dbh = () => db.$client;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; bookingId: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const limited = rateLimit429(`booking-deposit:${ipKey(req)}`, { max: 10, windowMs: 60 * 60_000 });
  if (limited) return limited;

  const { id: siteId, bookingId } = await params;
  const booking = getBooking(siteId, bookingId);
  if (!booking) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (booking.depositPercent == null || booking.depositPercent <= 0) {
    return NextResponse.json({ error: 'no_deposit' }, { status: 400 });
  }
  if (booking.status !== 'pending' && booking.status !== 'confirmed') {
    return NextResponse.json({ error: 'wrong_status' }, { status: 409 });
  }
  if (booking.depositPaidCents && booking.depositPaidCents > 0) {
    return NextResponse.json({ error: 'already_paid' }, { status: 409 });
  }

  // Idempotency — reuse a previously-created PaymentIntent if Stripe still
  // accepts confirmation on it. requires_payment_method / requires_confirmation
  // are the live states; anything else means the intent is gone and we mint
  // a fresh one.
  if (booking.depositStripePaymentIntentId) {
    try {
      const existing = await stripe().paymentIntents.retrieve(booking.depositStripePaymentIntentId);
      const REUSABLE = new Set(['requires_payment_method', 'requires_confirmation', 'requires_action']);
      if (REUSABLE.has(existing.status) && existing.client_secret) {
        return NextResponse.json({ clientSecret: existing.client_secret, paymentIntentId: existing.id });
      }
    } catch {
      // Fall through to create a new one.
    }
  }

  const depositCents = Math.max(1, Math.round((booking.priceCents * booking.depositPercent) / 100));

  let result;
  try {
    result = await createDestinationPaymentIntent({
      siteId,
      amountCents: depositCents,
      currency: booking.currency,
      description: `Booking deposit · ${booking.date} ${booking.time}`,
      metadata: { bookingId: booking.id, kind: 'booking-deposit' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'connect_error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Record the PaymentIntent id so duplicate calls find it.
  dbh().prepare(`
    UPDATE site_bookings
       SET deposit_stripe_payment_intent_id = ?,
           updated_at = unixepoch()
     WHERE site_id = ? AND id = ?
  `).run(result.paymentIntent.id, siteId, bookingId);

  return NextResponse.json({
    clientSecret: result.paymentIntent.client_secret,
    paymentIntentId: result.paymentIntent.id,
    applicationFeeCents: result.applicationFeeCents,
    depositCents,
  });
}
