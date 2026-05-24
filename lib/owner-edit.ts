// §12: owner edits write the editable columns (hours, phone, website, address,
// description) but EACH change is flagged in `field_sources` so we can tell what
// came from Google vs the owner. We never let an owner edit AI-only columns and
// never let the AI path touch fact columns — those constraints live elsewhere.
//
// This module is the ONE write path for owner-driven edits.

import 'server-only';
import { db } from '@/db';

export type OwnerEditableFacts = {
  phone?: string | null;
  openingHours?: unknown | null; // JSON-serializable
  website?: string | null;
  address?: string | null;
};

export type OwnerEditableContent = {
  description?: string | null; // owner-authored description (NOT AI) — replaces seed text
};

export type OwnerEditInput = OwnerEditableFacts & OwnerEditableContent;

function dbh() { return db.$client; }

function isString(v: unknown): v is string { return typeof v === 'string'; }

export function ownerUpdateVenue(venueId: string, ownerId: string, input: OwnerEditInput) {
  const sqlite = dbh();

  // Confirm ownership before touching anything.
  const venue = sqlite.prepare(
    `SELECT id, owner_id, field_sources FROM venues WHERE id = ?`,
  ).get(venueId) as { id: string; owner_id: string | null; field_sources: string } | undefined;
  if (!venue) throw new Response('Not found', { status: 404 });
  if (venue.owner_id !== ownerId) throw new Response('Forbidden', { status: 403 });

  const sets: string[] = [];
  const args: unknown[] = [];
  const fs: Record<string, 'owner'> = {};

  if (input.phone !== undefined) {
    sets.push('phone = ?'); args.push(isString(input.phone) ? input.phone : null);
    fs.phone = 'owner';
  }
  if (input.openingHours !== undefined) {
    sets.push('opening_hours = ?'); args.push(input.openingHours == null ? null : JSON.stringify(input.openingHours));
    fs.opening_hours = 'owner';
  }
  if (input.website !== undefined) {
    sets.push('website = ?'); args.push(isString(input.website) ? input.website : null);
    fs.website = 'owner';
  }
  if (input.address !== undefined) {
    sets.push('address = ?'); args.push(isString(input.address) ? input.address : null);
    fs.address = 'owner';
  }
  if (input.description !== undefined) {
    sets.push('description = ?'); args.push(isString(input.description) ? input.description : null);
    fs.description = 'owner';
  }

  if (!sets.length) return { updated: 0 };

  // Merge field_sources JSON in-app so we don't depend on json_set being available.
  let merged: Record<string, string> = {};
  try { merged = JSON.parse(venue.field_sources ?? '{}') ?? {}; } catch { merged = {}; }
  merged = { ...merged, ...fs };
  sets.push('field_sources = ?'); args.push(JSON.stringify(merged));

  args.push(venueId);
  sqlite.prepare(`UPDATE venues SET ${sets.join(', ')} WHERE id = ?`).run(...args);
  return { updated: sets.length - 1 };
}
