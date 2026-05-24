#!/usr/bin/env node
// Weekly Places sync (§9 footer). For each non-rejected venue with a google_place_id:
//   - Re-pull facts via Places "Get Place" (cheaper than searchText).
//   - Skip overwriting columns that field_sources marks as 'owner'.
//   - Flip status='closed' if Places now says CLOSED_PERMANENTLY.
//   - Refresh photo URLs (which expire) by replacing rows with subject='venue', source='google_places'.
//   - Auto-resolve open `reports` of reason='closed' if Places agrees.
//
// Designed to be re-runnable; per-venue failures are logged but don't abort the batch.

import 'dotenv/config';
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const FIELD_MASK = [
  'id', 'displayName', 'formattedAddress', 'location', 'types', 'primaryType',
  'businessStatus', 'nationalPhoneNumber', 'regularOpeningHours', 'priceLevel',
  'websiteUri', 'rating', 'userRatingCount', 'photos',
].join(',');

const PRICE_LEVEL_MAP = {
  PRICE_LEVEL_FREE: 0, PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

const PHOTO_CACHE_DAYS = 30;

function db() {
  const p = process.env.DATABASE_PATH;
  if (!p) throw new Error('DATABASE_PATH required');
  const dir = path.dirname(path.resolve(p));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const d = new Database(p);
  d.pragma('journal_mode = WAL');
  d.pragma('foreign_keys = ON');
  return d;
}

function placesKey() {
  const k = process.env.GOOGLE_PLACES_API_KEY;
  if (!k) throw new Error('GOOGLE_PLACES_API_KEY required');
  return k;
}

async function getPlace(id) {
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`, {
    headers: { 'X-Goog-Api-Key': placesKey(), 'X-Goog-FieldMask': FIELD_MASK },
  });
  if (!res.ok) return null;
  return res.json();
}

async function resolvePhoto(name) {
  const res = await fetch(
    `https://places.googleapis.com/v1/${name}/media?maxWidthPx=1200&skipHttpRedirect=true&key=${encodeURIComponent(placesKey())}`,
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.photoUri ?? null;
}

async function main() {
  const handle = db();
  const venues = handle.prepare(`
    SELECT id, google_place_id, field_sources, status, is_permanently_closed
      FROM venues
     WHERE google_place_id IS NOT NULL
       AND status IN ('draft','pending','published','closed')
     ORDER BY last_synced_at ASC NULLS FIRST
  `).all();

  let ok = 0, failed = 0, closed = 0;

  for (const v of venues) {
    try {
      const place = await getPlace(v.google_place_id);
      if (!place) { failed++; continue; }

      let sources = {};
      try { sources = JSON.parse(v.field_sources ?? '{}') ?? {}; } catch { sources = {}; }
      const isOwner = (col) => sources[col] === 'owner';

      const isClosed = place.businessStatus === 'CLOSED_PERMANENTLY';

      const sets = [];
      const args = [];

      // Skip columns the owner has touched. Owner-controlled provenance wins.
      if (!isOwner('phone')) { sets.push('phone = ?'); args.push(place.nationalPhoneNumber ?? null); }
      if (!isOwner('opening_hours')) {
        sets.push('opening_hours = ?');
        args.push(place.regularOpeningHours ? JSON.stringify(place.regularOpeningHours) : null);
      }
      if (!isOwner('price_level')) { sets.push('price_level = ?'); args.push(PRICE_LEVEL_MAP[place.priceLevel] ?? null); }
      if (!isOwner('website')) { sets.push('website = ?'); args.push(place.websiteUri ?? null); }
      if (!isOwner('address')) { sets.push('address = ?'); args.push(place.formattedAddress ?? null); }
      if (!isOwner('name')) { sets.push('name = ?'); args.push(place.displayName?.text ?? null); }
      if (!isOwner('lat')) { sets.push('lat = ?'); args.push(place.location?.latitude ?? null); }
      if (!isOwner('lng')) { sets.push('lng = ?'); args.push(place.location?.longitude ?? null); }

      sets.push('rating = ?'); args.push(place.rating ?? null);
      sets.push('review_count = ?'); args.push(place.userRatingCount ?? null);
      sets.push('business_status = ?'); args.push(place.businessStatus ?? null);
      sets.push('is_permanently_closed = ?'); args.push(isClosed ? 1 : 0);
      sets.push('last_synced_at = unixepoch()');

      if (isClosed && v.status !== 'closed') {
        sets.push("status = 'closed'");
        closed++;
        // Auto-resolve matching open reports.
        handle.prepare(`UPDATE reports SET status = 'resolved' WHERE venue_id = ? AND reason = 'closed' AND status = 'open'`).run(v.id);
      }

      args.push(v.id);
      handle.prepare(`UPDATE venues SET ${sets.join(', ')} WHERE id = ?`).run(...args);

      // Photos: refresh URLs. Cheap heuristic — replace if any photo's cached_until has expired.
      if (Array.isArray(place.photos) && place.photos.length) {
        const stale = handle.prepare(`
          SELECT COUNT(*) AS n FROM photos
           WHERE venue_id = ? AND source = 'google_places'
             AND (cached_until IS NULL OR cached_until < unixepoch())
        `).get(v.id);
        if (stale.n > 0 || handle.prepare(`SELECT 1 FROM photos WHERE venue_id = ? LIMIT 1`).get(v.id) == null) {
          handle.prepare(`DELETE FROM photos WHERE venue_id = ? AND source = 'google_places'`).run(v.id);
          const refs = place.photos.slice(0, 6);
          for (let i = 0; i < refs.length; i++) {
            const ref = refs[i];
            const url = await resolvePhoto(ref.name);
            if (!url) continue;
            const att = ref.authorAttributions?.[0];
            handle.prepare(`
              INSERT INTO photos (id, venue_id, subject_type, source, url, attribution_text, attribution_url, cached_until, is_primary, sort_order)
              VALUES (?, ?, 'venue', 'google_places', ?, ?, ?, ?, ?, ?)
            `).run(
              crypto.randomUUID(), v.id, url, att?.displayName ?? null, att?.uri ?? null,
              Math.floor(Date.now() / 1000) + PHOTO_CACHE_DAYS * 86400,
              i === 0 ? 1 : 0, i,
            );
          }
        }
      }

      ok++;
    } catch (e) {
      console.warn(`sync fail ${v.id}: ${e.message}`);
      failed++;
    }
  }

  console.log(`sync: ok=${ok} closed=${closed} failed=${failed}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
