// Featured-owner design override write path. Parallels lib/owner-edit.ts but
// scoped exclusively to the design columns. Three guarantees enforced here:
//
//   1. Only the venue's owner can touch their own design_params.
//   2. Only Featured-tier venues can override the design (free venues stay
//      on whatever the AI design writer + fallback produce).
//   3. The blob must validate through parseDesignParams() — same gate the
//      seed pipeline uses — so an arbitrary JSON payload can never make it
//      to the renderer.
//
// This is the only owner-side path that writes venues.design_params or
// venues.design_params_locked. The AI design writer
// (scripts/seed/lib/design-writer.js) covers the seed-side path, and
// refuses any row where design_params_locked = 1.

import 'server-only';
import { db } from '@/db';
import { parseDesignParams, type DesignParams } from './design-system';

function dbh() { return db.$client; }

type VenueRow = {
  id: string;
  owner_id: string | null;
  tier: 'free' | 'featured';
};

function loadOwnedFeaturedVenue(venueId: string, ownerId: string): VenueRow {
  const row = dbh().prepare(
    `SELECT id, owner_id, tier FROM venues WHERE id = ?`,
  ).get(venueId) as VenueRow | undefined;
  if (!row) throw new Response('Not found', { status: 404 });
  if (row.owner_id !== ownerId) throw new Response('Forbidden', { status: 403 });
  if (row.tier !== 'featured') {
    // 402 Payment Required reads cleanly here: the resource exists, the user
    // owns it, but the tier gate blocks the action.
    throw new Response('Featured required', { status: 402 });
  }
  return row;
}

/**
 * Save an owner-picked DesignParams. Validates the blob against the schema,
 * persists it, and sets design_params_locked = 1 so the AI design writer
 * leaves this row alone on future seed runs.
 *
 * Returns the canonicalised DesignParams that ended up in the DB.
 */
export function setOwnerDesignParams(
  venueId: string,
  ownerId: string,
  raw: unknown,
): DesignParams {
  loadOwnedFeaturedVenue(venueId, ownerId);
  const canonical = parseDesignParams(raw);
  if (!canonical) throw new Response('Invalid design params', { status: 400 });

  dbh().prepare(
    `UPDATE venues
       SET design_params = ?, design_params_locked = 1
     WHERE id = ?`,
  ).run(JSON.stringify(canonical), venueId);

  return canonical;
}

/**
 * Clear an owner override. Removes the lock so the next AI design pass picks
 * this venue up again, and nulls design_params so the renderer immediately
 * falls back to the category-aware deterministic default until the AI
 * repopulates. Keeps the UX honest — owner sees the change land instantly.
 */
export function clearOwnerDesignOverride(venueId: string, ownerId: string): void {
  loadOwnedFeaturedVenue(venueId, ownerId);
  dbh().prepare(
    `UPDATE venues
       SET design_params = NULL, design_params_locked = 0
     WHERE id = ?`,
  ).run(venueId);
}
