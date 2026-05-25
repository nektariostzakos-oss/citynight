// Stripe webhook → SQLite is the source of truth for subscription state (§11).
// Two product families are handled:
//   - Featured tier: flips venues.tier between 'featured' and 'free'
//   - Ad Section:    flips ad_campaigns.status from 'pending_payment' →
//                    'pending_moderation' (on first paid), 'active' (admin
//                    approval flips moderation), or 'paused'/'ended' on
//                    cancellation. ad_campaigns.stripe_subscription_id is the
//                    join key.
//
// Routing by `metadata.plan` set at Checkout creation. Anything else is 200-OK'd.

import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { db } from '@/db';

export const runtime = 'nodejs';

function dbh() { return db.$client; }

// As of Stripe API 2025-04-30.basil, current_period_end moved off the
// Subscription object onto the per-item record. Read it from the first item.
function currentPeriodEndFor(sub: Stripe.Subscription): number | null {
  const item = sub.items?.data?.[0] as { current_period_end?: number } | undefined;
  return item?.current_period_end ?? null;
}

function upsertVenueSubscription(args: {
  venueId: string;
  userId: string;
  customerId: string;
  subscriptionId: string;
  status: 'active' | 'past_due' | 'canceled' | 'incomplete';
  currentPeriodEnd: number | null;
}) {
  const sqlite = dbh();
  const existing = sqlite.prepare(`SELECT id FROM subscriptions WHERE stripe_subscription_id = ?`)
    .get(args.subscriptionId) as { id: string } | undefined;
  if (existing) {
    sqlite.prepare(`UPDATE subscriptions SET status = ?, current_period_end = ? WHERE id = ?`)
      .run(args.status, args.currentPeriodEnd, existing.id);
  } else {
    sqlite.prepare(`
      INSERT INTO subscriptions (id, venue_id, user_id, stripe_customer_id, stripe_subscription_id, status, current_period_end)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), args.venueId, args.userId, args.customerId, args.subscriptionId, args.status, args.currentPeriodEnd);
  }
  // venues.tier mirrors subscription state.
  const tier = args.status === 'active' ? 'featured' : 'free';
  sqlite.prepare(`UPDATE venues SET tier = ? WHERE id = ?`).run(tier, args.venueId);
}

function upsertAdCampaignSubscription(args: {
  adCampaignId: string;
  subscriptionId: string;
  status: 'active' | 'past_due' | 'canceled' | 'incomplete';
}) {
  const sqlite = dbh();
  // Stamp the subscription id on the campaign row (idempotent).
  sqlite.prepare(`UPDATE ad_campaigns SET stripe_subscription_id = ? WHERE id = ? AND (stripe_subscription_id IS NULL OR stripe_subscription_id = ?)`)
    .run(args.subscriptionId, args.adCampaignId, args.subscriptionId);

  // Status transitions:
  //   active   → keep moderation as-is. If already approved, the campaign serves.
  //              If pending_moderation, it waits for admin.
  //   past_due → 'paused' (we keep the campaign row around for reactivation).
  //   canceled → 'ended'.
  //   incomplete → still 'pending_payment' (no flip yet).
  if (args.status === 'active') {
    // Only promote from pending_payment → pending_moderation on the first paid event.
    sqlite.prepare(`
      UPDATE ad_campaigns SET status = 'pending_moderation'
      WHERE id = ? AND status = 'pending_payment'
    `).run(args.adCampaignId);
    // If admin already approved, reactivate.
    sqlite.prepare(`
      UPDATE ad_campaigns SET status = 'active'
      WHERE id = ? AND moderation = 'approved' AND status IN ('paused', 'pending_moderation')
    `).run(args.adCampaignId);
  } else if (args.status === 'past_due') {
    sqlite.prepare(`UPDATE ad_campaigns SET status = 'paused' WHERE id = ?`).run(args.adCampaignId);
  } else if (args.status === 'canceled') {
    sqlite.prepare(`UPDATE ad_campaigns SET status = 'ended' WHERE id = ?`).run(args.adCampaignId);
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new NextResponse('Webhook secret missing', { status: 500 });

  const sig = req.headers.get('stripe-signature');
  if (!sig) return new NextResponse('No signature', { status: 400 });

  const raw = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'verify failed';
    return new NextResponse(`Bad signature: ${msg}`, { status: 400 });
  }

  // Idempotency: Stripe retries on any non-2xx / timeout. INSERT OR IGNORE
  // on (event_id) returns changes=0 if we've already processed this event;
  // we 200 without re-running the handler so a duplicate delivery never
  // re-charges the venue tier, re-sends an email, etc.
  const seen = dbh().prepare(
    `INSERT OR IGNORE INTO stripe_events_seen (event_id, type) VALUES (?, ?)`,
  ).run(event.id, event.type);
  if (seen.changes === 0) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object as {
        id: string;
        customer: string;
        subscription: string;
        metadata?: { venueId?: string; userId?: string; adCampaignId?: string; plan?: string };
      };
      if (!s.subscription) break;
      const sub = await stripe().subscriptions.retrieve(s.subscription);
      const customerId = typeof s.customer === 'string' ? s.customer : String(s.customer);

      if (s.metadata?.plan === 'ad-section' && s.metadata.adCampaignId) {
        upsertAdCampaignSubscription({
          adCampaignId: s.metadata.adCampaignId,
          subscriptionId: sub.id,
          status: mapStatus(sub.status),
        });
      } else if (s.metadata?.venueId && s.metadata.userId) {
        upsertVenueSubscription({
          venueId: s.metadata.venueId,
          userId: s.metadata.userId,
          customerId,
          subscriptionId: sub.id,
          status: mapStatus(sub.status),
          currentPeriodEnd: currentPeriodEndFor(sub),
        });
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const meta = sub.metadata as { venueId?: string; userId?: string; adCampaignId?: string; plan?: string } | undefined;
      if (meta?.plan === 'ad-section' && meta.adCampaignId) {
        upsertAdCampaignSubscription({
          adCampaignId: meta.adCampaignId,
          subscriptionId: sub.id,
          status: mapStatus(sub.status),
        });
      } else if (meta?.venueId && meta.userId) {
        upsertVenueSubscription({
          venueId: meta.venueId,
          userId: meta.userId,
          customerId: typeof sub.customer === 'string' ? sub.customer : String(sub.customer),
          subscriptionId: sub.id,
          status: mapStatus(sub.status),
          currentPeriodEnd: currentPeriodEndFor(sub),
        });
      }
      break;
    }
    default:
      // Unhandled — Stripe expects a 2xx.
      break;
  }

  return NextResponse.json({ received: true });
}

function mapStatus(s: string): 'active' | 'past_due' | 'canceled' | 'incomplete' {
  if (s === 'active' || s === 'trialing') return 'active';
  if (s === 'past_due') return 'past_due';
  if (s === 'incomplete' || s === 'incomplete_expired') return 'incomplete';
  return 'canceled';
}
