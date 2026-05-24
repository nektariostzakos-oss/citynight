import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { stripe, PRICE_AD_SECTION_MONTHLY } from '@/lib/stripe';
import { db } from '@/db';

// POST /api/stripe/checkout-ad → Stripe Checkout URL for an Ad Section subscription.
//
// Body:
//   { name, creativeUrl, targetUrl, scope: 'site'|'section'|'category',
//     targetCityId?, targetAreaId?, targetCategoryId? }
//
// Flow:
//   1. Create an ad_campaigns row in `pending_payment` status (the campaign
//      can't run before the subscription exists, and we need the campaign id
//      to carry through Stripe metadata).
//   2. Open a Checkout Session for the Ad Section price; metadata carries
//      both userId + adCampaignId so the webhook can flip the row to
//      `pending_moderation` on payment success.
//   3. Admin moderates separately → status='active' or 'rejected'.

const VALID_SCOPES = new Set(['site', 'section', 'category']);

export async function POST(req: NextRequest) {
  const user = await requireUser();
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const name = typeof body.name === 'string' ? body.name.slice(0, 200) : null;
  const creativeUrl = typeof body.creativeUrl === 'string' ? body.creativeUrl : null;
  const targetUrl = typeof body.targetUrl === 'string' ? body.targetUrl : null;
  const scope = typeof body.scope === 'string' && VALID_SCOPES.has(body.scope) ? body.scope : null;
  const targetCityId = typeof body.targetCityId === 'string' ? body.targetCityId : null;
  const targetAreaId = typeof body.targetAreaId === 'string' ? body.targetAreaId : null;
  const targetCategoryId = typeof body.targetCategoryId === 'string' ? body.targetCategoryId : null;

  if (!name || !creativeUrl || !targetUrl || !scope) {
    return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 });
  }
  if (!PRICE_AD_SECTION_MONTHLY) {
    return NextResponse.json({ ok: false, error: 'STRIPE_PRICE_AD_SECTION_MONTHLY not configured' }, { status: 500 });
  }
  // 'section'/'category' need a target id — refuse if it's missing.
  if (scope === 'category' && !targetCategoryId) {
    return NextResponse.json({ ok: false, error: 'targetCategoryId required for scope=category' }, { status: 400 });
  }
  if (scope === 'section' && !targetCityId && !targetAreaId) {
    return NextResponse.json({ ok: false, error: 'targetCityId or targetAreaId required for scope=section' }, { status: 400 });
  }

  const campaignId = crypto.randomUUID();
  db.$client.prepare(`
    INSERT INTO ad_campaigns (
      id, advertiser_id, name, creative_url, target_url, scope,
      target_city_id, target_area_id, target_category_id,
      status, moderation
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment', 'pending')
  `).run(
    campaignId, user.id, name, creativeUrl, targetUrl, scope,
    targetCityId, targetAreaId, targetCategoryId,
  );

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: PRICE_AD_SECTION_MONTHLY, quantity: 1 }],
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: { adCampaignId: campaignId, userId: user.id, plan: 'ad-section' },
    subscription_data: { metadata: { adCampaignId: campaignId, userId: user.id, plan: 'ad-section' } },
    success_url: `${base}/${user.locale ?? 'en'}/dashboard?ad_pending=1`,
    cancel_url: `${base}/${user.locale ?? 'en'}/dashboard?ad_canceled=1`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url, adCampaignId: campaignId });
}
