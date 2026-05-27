// SaaS site helpers (Phase G1). Server-only — owner CRUD on the `sites`
// table. Mirrors lib/owner-edit.ts for the venue side, but the entity is
// the customer's whole website (not a directory listing).
//
// Slug generation is deterministic-with-fallback: derive from the business
// name, normalise, deduplicate by appending -2, -3, … until unique. Slugs
// are immutable after creation — they're the public URL of the customer's
// site and changing them would break links.

import 'server-only';
import { db } from '@/db';
import { randomUUID } from 'node:crypto';

const dbh = () => db.$client;

export type Vertical =
  | 'restaurant' | 'bar' | 'rooftop' | 'nightclub'
  | 'beach_club' | 'hotel' | 'cafe' | 'salon' | 'other';

// Each vertical maps to a renderer template. v1 ships restaurant + bar +
// rooftop; the rest fall back to the generic 'other' template (lightly
// branded landing page + about + contact). New verticals are added by
// pairing a vertical with a templateId and shipping a render mode for it
// in Phase G3.
const VERTICAL_TO_TEMPLATE: Record<Vertical, string> = {
  restaurant: 'restaurant',
  bar:        'bar',
  rooftop:    'bar', // shares the bar renderer for v1 with palette/copy tweaks
  nightclub:  'bar',
  beach_club: 'bar',
  hotel:      'other',
  cafe:       'restaurant',
  salon:      'other',
  other:      'other',
};

export function templateForVertical(v: Vertical): string {
  return VERTICAL_TO_TEMPLATE[v] ?? 'other';
}

export type CreateSiteInput = {
  ownerId: string;
  name: string;
  vertical: Vertical;
  city?: string | null;
  contactEmail?: string | null;
};

export function createSite(input: CreateSiteInput): { id: string; slug: string } {
  const sqlite = dbh();
  const name = input.name.trim();
  if (!name || name.length > 120) throw new Response('Invalid name', { status: 400 });

  const slug = uniqueSlug(sqlite, slugify(name));
  const id = randomUUID();

  sqlite.prepare(`
    INSERT INTO sites
      (id, slug, owner_id, name, vertical, template_id, city, country, contact_email,
       saas_status, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'GR', ?, 'trialing', 'draft', unixepoch())
  `).run(
    id, slug, input.ownerId, name, input.vertical, templateForVertical(input.vertical),
    input.city ?? null,
    input.contactEmail ?? null,
  );

  return { id, slug };
}

/**
 * After a successful Stripe Checkout the webhook calls this. Two modes:
 *   • plan='site-monthly' → saas_status='active', current_period_end set,
 *     status flipped to 'published' so the site goes live.
 *   • plan='site-zip'     → zip_purchased_at set, zip_stripe_session_id set.
 *     status stays as-is (the customer is hosting it themselves anyway).
 */
export function activateSiteSubscription(args: {
  siteId: string;
  customerId: string;
  subscriptionId: string;
  status: 'active' | 'past_due' | 'canceled' | 'incomplete';
  currentPeriodEnd: number | null;
}): void {
  const sqlite = dbh();
  const saasStatus =
    args.status === 'active'      ? 'active' :
    args.status === 'past_due'    ? 'past_due' :
    args.status === 'canceled'    ? 'canceled' :
                                    'trialing';
  sqlite.prepare(`
    UPDATE sites
       SET saas_status = ?,
           stripe_customer_id = ?,
           stripe_subscription_id = ?,
           current_period_end = ?,
           status = CASE WHEN ? = 'active' THEN 'published' ELSE status END,
           published_at = COALESCE(published_at, CASE WHEN ? = 'active' THEN unixepoch() END)
     WHERE id = ?
  `).run(
    saasStatus, args.customerId, args.subscriptionId, args.currentPeriodEnd,
    saasStatus, saasStatus,
    args.siteId,
  );
}

export function recordZipPurchase(args: {
  siteId: string;
  customerId: string;
  sessionId: string;
}): void {
  dbh().prepare(`
    UPDATE sites
       SET zip_purchased_at = unixepoch(),
           zip_stripe_session_id = ?,
           stripe_customer_id = COALESCE(stripe_customer_id, ?)
     WHERE id = ?
  `).run(args.sessionId, args.customerId, args.siteId);
}

export function getOwnedSite(siteId: string, ownerId: string): { id: string; slug: string; name: string; saasStatus: string; status: string } | null {
  return (dbh().prepare(
    `SELECT id, slug, name, saas_status AS saasStatus, status FROM sites WHERE id = ? AND owner_id = ?`,
  ).get(siteId, ownerId) as { id: string; slug: string; name: string; saasStatus: string; status: string } | undefined) ?? null;
}

export function getSiteBySlug(slug: string): { id: string; slug: string; status: string } | null {
  return (dbh().prepare(
    `SELECT id, slug, status FROM sites WHERE slug = ?`,
  ).get(slug) as { id: string; slug: string; status: string } | undefined) ?? null;
}

function slugify(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'site';
}

function uniqueSlug(
  sqlite: ReturnType<typeof dbh>,
  base: string,
): string {
  const exists = sqlite.prepare(`SELECT 1 FROM sites WHERE slug = ? LIMIT 1`);
  if (!exists.get(base)) return base;
  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`;
    if (!exists.get(candidate)) return candidate;
  }
  // Very unlikely — last-resort hash suffix.
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}
