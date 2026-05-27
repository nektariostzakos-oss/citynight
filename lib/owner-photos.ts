// Owner-uploaded photo CRUD (Phase F1d-2). Parallel to lib/owner-edit.ts,
// lib/owner-design.ts, lib/owner-minisite.ts. Touches ONLY the photos table
// rows owned by this venue, only when source='owner_upload' (so a malicious
// payload can't delete a Places-sourced row or attach an AI photo).
//
// §6 photo-integrity rule: the `photos` CHECK constraint already enforces
// that venue/product photos can only come from google_places / owner_upload
// / placeholder. We never write subjectType or source from user input —
// they're hardcoded here.

import 'server-only';
import { randomUUID } from 'node:crypto';
import { db } from '@/db';
import { deleteUploadFile, MAX_PHOTOS_PER_VENUE, type SavedPhoto } from './uploads';

const dbh = () => db.$client;

type VenueRow = { id: string; owner_id: string | null };

function loadOwnedVenue(venueId: string, ownerId: string): VenueRow {
  const row = dbh().prepare(`SELECT id, owner_id FROM venues WHERE id = ?`).get(venueId) as VenueRow | undefined;
  if (!row) throw new Response('Not found', { status: 404 });
  if (row.owner_id !== ownerId) throw new Response('Forbidden', { status: 403 });
  return row;
}

export function countOwnerPhotos(venueId: string): number {
  return (dbh().prepare(
    `SELECT COUNT(*) AS c FROM photos WHERE venue_id = ? AND source = 'owner_upload'`,
  ).get(venueId) as { c: number }).c;
}

/**
 * Insert a new owner_upload photo row referencing a file that's already on
 * disk (saveVenuePhoto() in lib/uploads.ts ran first). Returns the new id.
 */
export function attachOwnerPhoto(
  venueId: string, ownerId: string, saved: SavedPhoto,
): { id: string } {
  loadOwnedVenue(venueId, ownerId);

  const count = countOwnerPhotos(venueId);
  if (count >= MAX_PHOTOS_PER_VENUE) {
    throw new Response(`Maximum ${MAX_PHOTOS_PER_VENUE} photos per venue`, { status: 400 });
  }

  // sort_order = current max + 1 so new uploads land at the end of the
  // gallery. Owner can reorder via PATCH.
  const maxSort = (dbh().prepare(
    `SELECT COALESCE(MAX(sort_order), -1) AS m FROM photos WHERE venue_id = ?`,
  ).get(venueId) as { m: number }).m;

  const id = randomUUID();
  dbh().prepare(`
    INSERT INTO photos
      (id, venue_id, subject_type, source, url, storage_key,
       attribution_text, is_primary, sort_order, created_at)
    VALUES (?, ?, 'venue', 'owner_upload', ?, ?, NULL, 0, ?, unixepoch())
  `).run(id, venueId, saved.url, saved.storageKey, maxSort + 1);

  return { id };
}

/** Permanently delete an owner_upload photo + its file on disk. Refuses to
 *  touch rows that don't have source='owner_upload' (so the dashboard can't
 *  accidentally remove Places photos). */
export async function deleteOwnerPhoto(
  venueId: string, ownerId: string, photoId: string,
): Promise<void> {
  loadOwnedVenue(venueId, ownerId);
  const row = dbh().prepare(
    `SELECT id, source, storage_key FROM photos WHERE id = ? AND venue_id = ?`,
  ).get(photoId, venueId) as { id: string; source: string; storage_key: string | null } | undefined;
  if (!row) throw new Response('Not found', { status: 404 });
  if (row.source !== 'owner_upload') {
    throw new Response('Cannot delete Places photo', { status: 400 });
  }
  dbh().prepare(`DELETE FROM photos WHERE id = ? AND venue_id = ?`).run(photoId, venueId);
  if (row.storage_key) await deleteUploadFile(row.storage_key);
}

/** Reorder the owner_upload photos and (optionally) flip the primary flag.
 *  Body is the full ordered list of owner_upload ids — Places photos sit
 *  separately and aren't reorderable (they come from the source of truth). */
export function reorderOwnerPhotos(
  venueId: string, ownerId: string, ids: readonly string[], primaryId: string | null,
): void {
  loadOwnedVenue(venueId, ownerId);
  const dbi = dbh();
  const tx = dbi.transaction(() => {
    const idSet = new Set(ids);
    // Validate every id belongs to this venue + is owner_upload, else refuse
    // — partial reorders are nasty UX and easier to forbid than to recover.
    const rows = dbi.prepare(
      `SELECT id FROM photos WHERE venue_id = ? AND source = 'owner_upload'`,
    ).all(venueId) as { id: string }[];
    const owned = new Set(rows.map((r) => r.id));
    for (const id of ids) {
      if (!owned.has(id)) throw new Response('Unknown photo id', { status: 400 });
    }

    const setSort = dbi.prepare(`UPDATE photos SET sort_order = ? WHERE id = ? AND venue_id = ?`);
    ids.forEach((id, idx) => setSort.run(idx, id, venueId));

    // Primary flag: clear all, then set the one chosen (if any). Only
    // owner_upload rows are allowed to be primary via this path — Places
    // photos stay non-primary unless the owner uploads first and chooses one.
    dbi.prepare(`UPDATE photos SET is_primary = 0 WHERE venue_id = ?`).run(venueId);
    if (primaryId) {
      if (!idSet.has(primaryId)) throw new Response('Primary id not in list', { status: 400 });
      dbi.prepare(`UPDATE photos SET is_primary = 1 WHERE id = ? AND venue_id = ?`).run(primaryId, venueId);
    }
  });
  tx();
}

export function listOwnerPhotos(venueId: string): Array<{ id: string; url: string; isPrimary: boolean; sortOrder: number }> {
  return dbh().prepare(`
    SELECT id, url,
           is_primary AS isPrimary, sort_order AS sortOrder
      FROM photos
     WHERE venue_id = ? AND source = 'owner_upload'
     ORDER BY sort_order ASC
  `).all(venueId) as Array<{ id: string; url: string; isPrimary: number | boolean; sortOrder: number }> as Array<{ id: string; url: string; isPrimary: boolean; sortOrder: number }>;
}
