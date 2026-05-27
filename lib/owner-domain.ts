// Owner write path for custom_domain (Phase D). Featured-only.
// Normalises + validates the input, enforces uniqueness, invalidates the
// in-process custom-domain cache so the next request sees the change.

import 'server-only';
import { db } from '@/db';
import { normaliseHost, invalidateCustomDomain } from './custom-domain';

const dbh = () => db.$client;

type VenueRow = { id: string; owner_id: string | null; tier: 'free' | 'featured'; custom_domain: string | null };

function loadOwnedFeatured(venueId: string, ownerId: string): VenueRow {
  const row = dbh().prepare(
    `SELECT id, owner_id, tier, custom_domain FROM venues WHERE id = ?`,
  ).get(venueId) as VenueRow | undefined;
  if (!row) throw new Response('Not found', { status: 404 });
  if (row.owner_id !== ownerId) throw new Response('Forbidden', { status: 403 });
  if (row.tier !== 'featured') throw new Response('Featured required', { status: 402 });
  return row;
}

/**
 * Set or clear the venue's custom_domain. Pass null/'' to clear.
 * Returns the canonical normalised domain that was stored.
 */
export function setOwnerCustomDomain(
  venueId: string, ownerId: string, raw: string | null,
): string | null {
  const row = loadOwnedFeatured(venueId, ownerId);

  if (raw === null || raw === '') {
    if (row.custom_domain) invalidateCustomDomain(row.custom_domain);
    dbh().prepare(`UPDATE venues SET custom_domain = NULL WHERE id = ?`).run(venueId);
    return null;
  }

  const host = normaliseHost(String(raw));
  if (!host) throw new Response('Invalid domain', { status: 400 });

  // Cheap sanity checks. We refuse anything that looks like a citynight
  // surface (would shadow the directory) and anything containing reserved
  // path components.
  if (host === 'citynight.gr' || host.endsWith('.citynight.gr')) {
    throw new Response('citynight.gr cannot be used as a custom domain', { status: 400 });
  }

  try {
    dbh().prepare(`UPDATE venues SET custom_domain = ? WHERE id = ?`).run(host, venueId);
  } catch (err) {
    // UNIQUE index violation = another venue already owns this domain.
    const msg = err instanceof Error ? err.message : String(err);
    if (/UNIQUE constraint failed/i.test(msg)) {
      throw new Response('Domain is already taken by another venue', { status: 409 });
    }
    throw err;
  }

  // Invalidate both old (if any) and new entries in the lookup cache.
  if (row.custom_domain && row.custom_domain !== host) invalidateCustomDomain(row.custom_domain);
  invalidateCustomDomain(host);
  return host;
}
