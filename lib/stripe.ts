// Server-side Stripe client. Single instance reused per request.
// API version is pinned so Stripe's incremental changes don't silently affect
// us; bump it deliberately when we verify the new shape.

import 'server-only';
import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function stripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY required.');
  _stripe = new Stripe(key, { apiVersion: '2026-04-22.dahlia' });
  return _stripe;
}

export const PRICE_FEATURED_MONTHLY = process.env.STRIPE_PRICE_FEATURED_MONTHLY ?? '';
export const PRICE_AD_SECTION_MONTHLY = process.env.STRIPE_PRICE_AD_SECTION_MONTHLY ?? '';
