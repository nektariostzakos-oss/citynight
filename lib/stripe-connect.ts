// Stripe Connect helpers — Phase I.5c.
//
// citynight is a marketplace: each site owner connects their own Stripe
// account via Connect (Express). Bookings, orders, memberships charge
// directly to that account using destination charges, with citynight
// taking an application_fee_amount on top.
//
// Onboarding flow:
//   1. Owner clicks "Connect Stripe" in /dashboard/sites/[siteId].
//   2. POST /api/sites/[id]/stripe/connect — creates an Express Account
//      if not already present, returns a Stripe-hosted Account Link URL.
//   3. Owner finishes the Stripe onboarding (KYC, bank details).
//   4. Stripe fires account.updated → webhook updates
//      sites.stripe_charges_enabled / stripe_payouts_enabled /
//      stripe_details_submitted.
//
// PLATFORM_FEE_PERCENT is the cut citynight takes on every connected-account
// charge. 5% is a placeholder until the user picks a marketplace rate.

import 'server-only';
import type Stripe from 'stripe';
import { stripe } from './stripe';
import { db } from '@/db';

const dbh = () => db.$client;

export const PLATFORM_FEE_PERCENT = 5;

type SiteConnectRow = {
  id: string;
  ownerId: string;
  contactEmail: string | null;
  country: string;
  stripeAccountId: string | null;
  stripeChargesEnabled: number;
  stripePayoutsEnabled: number;
  stripeDetailsSubmitted: number;
};

function loadSite(siteId: string): SiteConnectRow | null {
  const r = dbh().prepare(`
    SELECT id, owner_id AS ownerId, contact_email AS contactEmail, country,
           stripe_account_id AS stripeAccountId,
           stripe_charges_enabled AS stripeChargesEnabled,
           stripe_payouts_enabled AS stripePayoutsEnabled,
           stripe_details_submitted AS stripeDetailsSubmitted
      FROM sites WHERE id = ?
  `).get(siteId) as SiteConnectRow | undefined;
  return r ?? null;
}

/**
 * Idempotent: returns the existing Connect account id if one is recorded,
 * otherwise creates an Express account, stores its id on the site, and
 * returns the new id. Newly-created accounts have all readiness flags = 0
 * — those flip true via the account.updated webhook once onboarding ends.
 */
export async function ensureConnectAccount(siteId: string, ownerEmail: string): Promise<string> {
  const site = loadSite(siteId);
  if (!site) throw new Error('site_not_found');
  if (site.stripeAccountId) return site.stripeAccountId;

  const account = await stripe().accounts.create({
    type: 'express',
    country: site.country || 'GR',
    email: site.contactEmail || ownerEmail,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: { siteId },
  });

  dbh().prepare(`
    UPDATE sites
       SET stripe_account_id = ?,
           stripe_account_country = ?,
           stripe_account_currency = ?,
           stripe_account_updated_at = unixepoch()
     WHERE id = ?
  `).run(account.id, account.country ?? null, account.default_currency ?? null, siteId);

  return account.id;
}

/**
 * Build a Stripe-hosted Account Link the owner navigates to in order to
 * finish onboarding. The link is single-use and short-lived; we generate
 * a fresh one each time the owner clicks "Connect Stripe".
 */
export async function createOnboardingLink(args: {
  accountId: string;
  returnUrl: string;
  refreshUrl: string;
}): Promise<string> {
  const link = await stripe().accountLinks.create({
    account: args.accountId,
    refresh_url: args.refreshUrl,
    return_url: args.returnUrl,
    type: 'account_onboarding',
  });
  return link.url;
}

/**
 * Mirror an Account object's readiness flags onto the site row. Called
 * from the webhook on `account.updated`.
 */
export function syncAccountReadiness(account: Stripe.Account): boolean {
  const siteId = (account.metadata as Record<string, string> | undefined)?.siteId;
  if (!siteId) return false;
  dbh().prepare(`
    UPDATE sites
       SET stripe_charges_enabled = ?,
           stripe_payouts_enabled = ?,
           stripe_details_submitted = ?,
           stripe_account_country = COALESCE(?, stripe_account_country),
           stripe_account_currency = COALESCE(?, stripe_account_currency),
           stripe_account_updated_at = unixepoch()
     WHERE id = ? AND stripe_account_id = ?
  `).run(
    account.charges_enabled ? 1 : 0,
    account.payouts_enabled ? 1 : 0,
    account.details_submitted ? 1 : 0,
    account.country ?? null,
    account.default_currency ?? null,
    siteId,
    account.id,
  );
  return true;
}

/** Read the current readiness state for a site (used by the dashboard). */
export function readConnectStatus(siteId: string): {
  connected: boolean;
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
} {
  const site = loadSite(siteId);
  if (!site) {
    return { connected: false, accountId: null, chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false };
  }
  return {
    connected: site.stripeAccountId != null,
    accountId: site.stripeAccountId,
    chargesEnabled: site.stripeChargesEnabled === 1,
    payoutsEnabled: site.stripePayoutsEnabled === 1,
    detailsSubmitted: site.stripeDetailsSubmitted === 1,
  };
}

/**
 * Create a destination-charge PaymentIntent on a site's connected account.
 * The platform earns `applicationFeeCents` on top of every successful
 * charge. The connected account ID must come from the site row — never
 * from caller input — to prevent a malicious tenant from charging on
 * someone else's account.
 */
export async function createDestinationPaymentIntent(args: {
  siteId: string;
  amountCents: number;
  currency: string;
  description: string;
  metadata: Record<string, string>;
  applicationFeeCents?: number;
}): Promise<{ paymentIntent: Stripe.PaymentIntent; applicationFeeCents: number }> {
  const site = loadSite(args.siteId);
  if (!site || !site.stripeAccountId) throw new Error('connect_account_missing');
  if (!site.stripeChargesEnabled) throw new Error('connect_charges_disabled');

  const appFee = args.applicationFeeCents ?? Math.floor((args.amountCents * PLATFORM_FEE_PERCENT) / 100);
  const intent = await stripe().paymentIntents.create({
    amount: args.amountCents,
    currency: args.currency.toLowerCase(),
    description: args.description,
    application_fee_amount: appFee,
    on_behalf_of: site.stripeAccountId,
    transfer_data: { destination: site.stripeAccountId },
    metadata: { siteId: args.siteId, ...args.metadata },
    automatic_payment_methods: { enabled: true },
  });
  return { paymentIntent: intent, applicationFeeCents: appFee };
}
