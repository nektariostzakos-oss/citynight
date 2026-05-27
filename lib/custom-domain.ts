// Custom-domain → venue lookup (Phase D).
//
// Middleware calls lookupVenueByHost() on every inbound request whose Host
// header isn't a citynight.gr surface. Returns the venue's canonical path
// segments so the middleware can rewrite. Owner-set domains live in
// venues.custom_domain with a UNIQUE index.

import 'server-only';
import { db } from '@/db';

const dbh = () => db.$client;

export type CustomDomainTarget =
  | { kind: 'venue'; venueId: string; citySlug: string; bucketSlug: string; venueSlug: string }
  | { kind: 'site'; siteId: string; slug: string; citySlug: string | null };

// Tiny in-process cache to spare SQLite a roundtrip on every request. The
// Hostinger origin is a single Node process (§4) so a Map is correct + safe.
// TTL is short so flips/clears land within a minute even without an explicit
// invalidate hook.
const CACHE = new Map<string, { value: CustomDomainTarget | null; expires: number }>();
const TTL_MS = 60_000;

export function lookupVenueByHost(rawHost: string | null): CustomDomainTarget | null {
  if (!rawHost) return null;
  const host = normaliseHost(rawHost);
  if (!host) return null;
  // Citynight itself + local dev never resolve via this path.
  if (isCitynightHost(host)) return null;

  const cached = CACHE.get(host);
  const now = Date.now();
  if (cached && cached.expires > now) return cached.value;

  // Check sites first (SaaS tenants — paying customers, higher priority
  // than directory venue custom domains and far more numerous in steady-state).
  const siteRow = dbh().prepare(`
    SELECT id AS siteId, slug, city_slug AS citySlug
      FROM sites
     WHERE custom_domain = ?
       AND status = 'published'
       AND saas_status IN ('active','past_due','trialing')
     LIMIT 1
  `).get(host) as { siteId: string; slug: string; citySlug: string | null } | undefined;
  if (siteRow) {
    const value: CustomDomainTarget = { kind: 'site', ...siteRow };
    CACHE.set(host, { value, expires: now + TTL_MS });
    return value;
  }

  const venueRow = dbh().prepare(`
    SELECT v.id AS venueId, c.slug AS citySlug,
           COALESCE(a.slug, cat.slug) AS bucketSlug,
           v.slug AS venueSlug
      FROM venues v
      JOIN cities c ON c.id = v.city_id
      LEFT JOIN areas a ON a.id = v.area_id
      LEFT JOIN categories cat ON cat.id = v.category_id
     WHERE v.custom_domain = ?
       AND v.status = 'published'
     LIMIT 1
  `).get(host) as { venueId: string; citySlug: string; bucketSlug: string | null; venueSlug: string | null } | undefined;

  const value: CustomDomainTarget | null =
    venueRow && venueRow.venueSlug && venueRow.bucketSlug
      ? {
          kind: 'venue',
          venueId: venueRow.venueId,
          citySlug: venueRow.citySlug,
          bucketSlug: venueRow.bucketSlug,
          venueSlug: venueRow.venueSlug,
        }
      : null;
  CACHE.set(host, { value, expires: now + TTL_MS });
  return value;
}

/** Strip protocol / port / path / trailing dot from a Host-header-style value. */
export function normaliseHost(raw: string): string | null {
  if (typeof raw !== 'string') return null;
  let s = raw.trim().toLowerCase();
  if (!s) return null;
  // Strip protocol if user pasted a full URL into the dashboard.
  s = s.replace(/^https?:\/\//, '');
  // Strip path and query.
  s = s.split('/')[0] ?? '';
  // Strip port.
  s = s.split(':')[0] ?? '';
  // Strip trailing dot (DNS canonical form).
  s = s.replace(/\.$/, '');
  if (!s) return null;
  // Cheap validity check: at least one dot, no whitespace, ASCII or punycode.
  if (!/^[a-z0-9.-]+\.[a-z0-9.-]+$/.test(s)) return null;
  if (s.length > 253) return null;
  return s;
}

export function isCitynightHost(host: string): boolean {
  return (
    host === 'citynight.gr' ||
    host.endsWith('.citynight.gr') ||
    host === 'localhost' ||
    host.startsWith('127.0.0.1') ||
    // IPv6 loopback bracketless form (we already stripped port + brackets in
    // normaliseHost above for the bracketed case).
    host === '::1'
  );
}

/** Invalidate the in-process cache for a single host. Call when an owner
 *  saves or clears a custom_domain so the next request reflects the change
 *  without waiting for TTL. */
export function invalidateCustomDomain(host: string): void {
  const n = normaliseHost(host);
  if (n) CACHE.delete(n);
}
