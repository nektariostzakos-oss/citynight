// POST /api/sites/[id]/checkout — paid-upgrade Stripe Checkout for a site.
// Body: { plan: 'monthly' | 'zip', locale?: 'el'|'en'|'de'|'fr'|'it' }
//   • monthly → €19/mo subscription unlocks custom domain
//   • zip     → €190 one-time unlocks Atelier ZIP download
// On webhook success (stripe.ts):
//   • monthly → sites.stripe_subscription_id + saas_status='active'
//   • zip     → sites.zip_purchased_at + sites.zip_stripe_session_id

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { requireSameOrigin } from '@/lib/csrf';
import { stripe, PRICE_SITE_MONTHLY, PRICE_SITE_ZIP } from '@/lib/stripe';
import { db } from '@/db';

const VALID_PLANS = ['monthly', 'zip'] as const;
type Plan = (typeof VALID_PLANS)[number];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const user = await requireUser();
  const { id } = await params;

  let body: { plan?: unknown; locale?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const plan: Plan | null = typeof body.plan === 'string' && (VALID_PLANS as readonly string[]).includes(body.plan)
    ? (body.plan as Plan) : null;
  if (!plan) return NextResponse.json({ ok: false, error: 'invalid_plan' }, { status: 400 });

  const allowedLocales = ['en', 'el', 'de', 'fr', 'it'] as const;
  const locale = (allowedLocales as readonly string[]).includes(body.locale as string)
    ? (body.locale as string) : 'el';

  const site = db.$client.prepare(`SELECT id, owner_id, name FROM sites WHERE id = ?`)
    .get(id) as { id: string; owner_id: string; name: string } | undefined;
  if (!site) return NextResponse.json({ ok: false }, { status: 404 });
  if (site.owner_id !== user.id) return NextResponse.json({ ok: false }, { status: 403 });

  const priceId = plan === 'monthly' ? PRICE_SITE_MONTHLY : PRICE_SITE_ZIP;
  if (!priceId) {
    return NextResponse.json({
      ok: false,
      error: `Stripe price not configured for plan=${plan}`,
    }, { status: 500 });
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const session = await stripe().checkout.sessions.create({
    mode: plan === 'monthly' ? 'subscription' : 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: {
      siteId: id,
      userId: user.id,
      plan: plan === 'monthly' ? 'site-monthly' : 'site-zip',
    },
    ...(plan === 'monthly'
      ? { subscription_data: { metadata: { siteId: id, userId: user.id, plan: 'site-monthly' } } }
      : {}),
    success_url: `${base}/${locale}/dashboard/sites/${id}?paid=${plan}`,
    cancel_url: `${base}/${locale}/dashboard/sites/${id}?canceled=1`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ ok: true, url: session.url });
}
