// Owner photo CRUD for SaaS sites (Phase G4). Mirrors lib/owner-photos.ts
// on the venue side. The §6 photo-integrity rule doesn't apply identically
// — sites aren't directory listings — but we still validate ownership and
// guard the disk path through lib/uploads.ts.

import 'server-only';
import { randomUUID } from 'node:crypto';
import { db } from '@/db';
import { deleteUploadFile, MAX_PHOTOS_PER_VENUE, type SavedPhoto } from './uploads';

const dbh = () => db.$client;
const MAX_PHOTOS_PER_SITE = MAX_PHOTOS_PER_VENUE;

type SiteRow = { id: string; owner_id: string };

function loadOwnedSite(siteId: string, ownerId: string): SiteRow {
  const row = dbh().prepare(`SELECT id, owner_id FROM sites WHERE id = ?`).get(siteId) as SiteRow | undefined;
  if (!row) throw new Response('Not found', { status: 404 });
  if (row.owner_id !== ownerId) throw new Response('Forbidden', { status: 403 });
  return row;
}

export function countSitePhotos(siteId: string): number {
  return (dbh().prepare(`SELECT COUNT(*) AS c FROM site_photos WHERE site_id = ?`).get(siteId) as { c: number }).c;
}

export function attachSitePhoto(
  siteId: string, ownerId: string, saved: SavedPhoto,
): { id: string } {
  loadOwnedSite(siteId, ownerId);
  if (countSitePhotos(siteId) >= MAX_PHOTOS_PER_SITE) {
    throw new Response(`Maximum ${MAX_PHOTOS_PER_SITE} photos per site`, { status: 400 });
  }
  const maxSort = (dbh().prepare(`SELECT COALESCE(MAX(sort_order), -1) AS m FROM site_photos WHERE site_id = ?`)
    .get(siteId) as { m: number }).m;
  const id = randomUUID();
  dbh().prepare(`
    INSERT INTO site_photos (id, site_id, url, storage_key, is_primary, sort_order, created_at)
    VALUES (?, ?, ?, ?, 0, ?, unixepoch())
  `).run(id, siteId, saved.url, saved.storageKey, maxSort + 1);
  return { id };
}

export async function deleteSitePhoto(
  siteId: string, ownerId: string, photoId: string,
): Promise<void> {
  loadOwnedSite(siteId, ownerId);
  const row = dbh().prepare(`SELECT id, storage_key FROM site_photos WHERE id = ? AND site_id = ?`)
    .get(photoId, siteId) as { id: string; storage_key: string | null } | undefined;
  if (!row) throw new Response('Not found', { status: 404 });
  dbh().prepare(`DELETE FROM site_photos WHERE id = ? AND site_id = ?`).run(photoId, siteId);
  if (row.storage_key) await deleteUploadFile(row.storage_key);
}

export function reorderSitePhotos(
  siteId: string, ownerId: string, ids: readonly string[], primaryId: string | null,
): void {
  loadOwnedSite(siteId, ownerId);
  const dbi = dbh();
  const tx = dbi.transaction(() => {
    const idSet = new Set(ids);
    const rows = dbi.prepare(`SELECT id FROM site_photos WHERE site_id = ?`).all(siteId) as { id: string }[];
    const owned = new Set(rows.map((r) => r.id));
    for (const id of ids) {
      if (!owned.has(id)) throw new Response('Unknown photo id', { status: 400 });
    }
    const setSort = dbi.prepare(`UPDATE site_photos SET sort_order = ? WHERE id = ? AND site_id = ?`);
    ids.forEach((id, idx) => setSort.run(idx, id, siteId));

    dbi.prepare(`UPDATE site_photos SET is_primary = 0 WHERE site_id = ?`).run(siteId);
    if (primaryId) {
      if (!idSet.has(primaryId)) throw new Response('Primary id not in list', { status: 400 });
      dbi.prepare(`UPDATE site_photos SET is_primary = 1 WHERE id = ? AND site_id = ?`).run(primaryId, siteId);
    }
  });
  tx();
}

export function listSitePhotos(siteId: string): Array<{ id: string; url: string; isPrimary: boolean; sortOrder: number }> {
  return (dbh().prepare(`
    SELECT id, url, is_primary AS isPrimary, sort_order AS sortOrder
      FROM site_photos
     WHERE site_id = ?
     ORDER BY sort_order ASC
  `).all(siteId) as Array<{ id: string; url: string; isPrimary: number | boolean; sortOrder: number }>).map((r) => ({
    ...r,
    isPrimary: r.isPrimary === 1 || r.isPrimary === true,
  }));
}
