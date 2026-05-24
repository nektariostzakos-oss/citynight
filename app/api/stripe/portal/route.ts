import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { stripe } from '@/lib/stripe';
import { db } from '@/db';

// POST /api/stripe/portal — { venueId } → Stripe Billing Portal URL.
//
// We look up the existing Stripe customer from any subscription on this venue
// (Stripe assigns one when checkout.session.completed fires), then mint a
// portal session that lets the owner self-serve: update card, cancel, see
// invoices. Returning users hit this from the billing page instead of going
// through another Checkout. Cancellation flows back via webhook (§11).

export async function POST(req: NextRequest) {
  const user = await requireUser();
  let body: { venueId?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const venueId = typeof body.venueId === 'string' ? body.venueId : null;
  if (!venueId) return NextResponse.json({ ok: false }, { status: 400 });

  const venue = db.$client.prepare(
    `SELECT id FROM venues WHERE id = ? AND owner_id = ?`,
  ).get(venueId, user.id) as { id: string } | undefined;
  if (!venue) return NextResponse.json({ ok: false }, { status: 404 });

  const sub = db.$client.prepare(
    `SELECT stripe_customer_id FROM subscriptions WHERE venue_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1`,
  ).get(venueId, user.id) as { stripe_customer_id: string } | undefined;
  if (!sub?.stripe_customer_id) {
    return NextResponse.json({ ok: false, error: 'no_active_subscription' }, { status: 404 });
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const session = await stripe().billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${base}/${user.locale ?? 'en'}/dashboard/${venueId}/billing`,
  });

  return NextResponse.json({ url: session.url });
}
