#!/usr/bin/env node
// Daily Stripe reconcile (§Phase 7). For each row in `subscriptions`, ask Stripe
// for live state and rewrite ours if they drifted. Alerts on hard drift by
// non-zero exit code so cron mail surfaces it.

import 'dotenv/config';
import Database from 'better-sqlite3';
import Stripe from 'stripe';
import path from 'node:path';
import fs from 'node:fs';

function db() {
  const p = process.env.DATABASE_PATH;
  if (!p) throw new Error('DATABASE_PATH required');
  const dir = path.dirname(path.resolve(p));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const d = new Database(p);
  d.pragma('journal_mode = WAL');
  return d;
}

function mapStatus(s) {
  if (s === 'active' || s === 'trialing') return 'active';
  if (s === 'past_due') return 'past_due';
  if (s === 'incomplete' || s === 'incomplete_expired') return 'incomplete';
  return 'canceled';
}

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY required');
  // Same pinned version as lib/stripe.ts, so the cron and the webhook read
  // the same object shape.
  const stripe = new Stripe(key, { apiVersion: '2026-10-28.endive' });

  const handle = db();
  const rows = handle.prepare(`SELECT id, venue_id, stripe_subscription_id, status FROM subscriptions`).all();
  let drift = 0;

  for (const r of rows) {
    try {
      const sub = await stripe.subscriptions.retrieve(r.stripe_subscription_id);
      const live = mapStatus(sub.status);
      // Since API 2025-04-30.basil current_period_end lives on the item, not
      // on the Subscription (same read as app/api/stripe/webhook/route.ts).
      const periodEnd = sub.items?.data?.[0]?.current_period_end ?? null;
      if (live !== r.status) {
        drift++;
        console.log(`drift ${r.stripe_subscription_id}: db=${r.status} live=${live}`);
        handle.prepare(`UPDATE subscriptions SET status = ?, current_period_end = ? WHERE id = ?`)
          .run(live, periodEnd, r.id);
        const tier = live === 'active' ? 'featured' : 'free';
        handle.prepare(`UPDATE venues SET tier = ? WHERE id = ?`).run(tier, r.venue_id);
      }
    } catch (e) {
      console.warn(`reconcile fail ${r.stripe_subscription_id}: ${e.message}`);
    }
  }

  console.log(`reconcile: ${rows.length} checked, ${drift} drifted`);
  if (drift > 0) process.exit(2); // non-zero ⇒ cron mail
}

main().catch((e) => { console.error(e); process.exit(1); });
