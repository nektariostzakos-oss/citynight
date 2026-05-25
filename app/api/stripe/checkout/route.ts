import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { stripe, PRICE_FEATURED_MONTHLY } from '@/lib/stripe';
import { requireSameOrigin } from '@/lib/csrf';
import { db } from '@/db';

// POST /api/stripe/checkout — { venueId, plan: 'featured' } → Stripe Checkout URL.
// On success Stripe redirects to /dashboard/{venueId}?upgraded=1; the webhook is
// what actually flips the venue tier (DB source of truth, §11).

export async function POST(req: NextRequest) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const user = await requireUser();
  let body: { venueId?: unknown; plan?: unknown; locale?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const venueId = typeof body.venueId === 'string' ? body.venueId : null;
  if (!venueId) return NextResponse.json({ ok: false }, { status: 400 });
  // Honour the caller's locale so the success+cancel redirects land in the
  // same language the visitor was browsing in. Defaults to 'en' on bad input.
  const allowedLocales = ['en', 'el', 'de', 'fr', 'it'] as const;
  const locale = (allowedLocales as readonly string[]).includes(body.locale as string)
    ? (body.locale as string)
    : 'en';

  const venue = db.$client.prepare(`SELECT id, name FROM venues WHERE id = ? AND owner_id = ?`)
    .get(venueId, user.id) as { id: string; name: string } | undefined;
  if (!venue) return NextResponse.json({ ok: false }, { status: 404 });

  if (!PRICE_FEATURED_MONTHLY) {
    return NextResponse.json({ ok: false, error: 'STRIPE_PRICE_FEATURED_MONTHLY not configured' }, { status: 500 });
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;

  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: PRICE_FEATURED_MONTHLY, quantity: 1 }],
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: { venueId, userId: user.id, plan: 'featured' },
    subscription_data: { metadata: { venueId, userId: user.id, plan: 'featured' } },
    success_url: `${base}/${locale}/dashboard/${venueId}?upgraded=1`,
    cancel_url: `${base}/${locale}/dashboard/${venueId}?canceled=1`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
