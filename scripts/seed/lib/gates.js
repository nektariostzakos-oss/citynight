// §9 stage 4: gate logic for moving venues from `draft` → `published` / `pending` / `closed` / `rejected`.
//
// Rules:
//  - businessStatus = CLOSED_PERMANENTLY (or isPermanentlyClosed = 1) → 'closed'
//  - dedupe within (city_id, category_id) by slugified name within ~60m; keep the
//    higher reviewCount, mark others 'rejected'
//  - confidence: reviewCount >= 5 AND has a description → 'published' (+ unique slug + publishedAt)
//  - else → 'pending'

import { slugify } from './db.js';

const HAVERSINE_R = 6371000; // metres

export function metresBetween(a, b) {
  if (!a?.lat || !a?.lng || !b?.lat || !b?.lng) return Infinity;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
  const s = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * HAVERSINE_R * Math.asin(Math.sqrt(s));
}

// Pick a unique slug for a venue inside its city. Appends -2, -3, ... until free.
export function pickUniqueSlug(db, cityId, baseName, existingVenueId) {
  const base = slugify(baseName) || 'venue';
  const taken = db.prepare(
    'SELECT slug FROM venues WHERE city_id = ? AND slug IS NOT NULL AND id != ?'
  ).all(cityId, existingVenueId).map((r) => r.slug);
  if (!taken.includes(base)) return base;
  for (let i = 2; i < 200; i++) {
    const cand = `${base}-${i}`;
    if (!taken.includes(cand)) return cand;
  }
  return `${base}-${existingVenueId.slice(0, 6)}`;
}

// Run all gates over draft venues. Idempotent. Returns counts.
export function runGates(db) {
  const counts = { closed: 0, rejected_dedupe: 0, published: 0, pending: 0 };

  // 1) close permanently-closed
  const closeStmt = db.prepare(
    "UPDATE venues SET status = 'closed' WHERE status IN ('draft','published') AND (is_permanently_closed = 1 OR business_status = 'CLOSED_PERMANENTLY')"
  );
  counts.closed = closeStmt.run().changes;

  // 2) dedupe — within (city, category), slug collisions on (slugified-name)
  // and within 60 metres are considered the same venue.
  const candidates = db.prepare(`
    SELECT v.id, v.name, v.city_id, v.category_id, v.lat, v.lng, COALESCE(v.review_count, 0) AS rc
    FROM venues v
    WHERE v.status = 'draft'
    ORDER BY v.city_id, v.category_id, rc DESC
  `).all();

  const groups = new Map();
  for (const r of candidates) {
    const key = `${r.city_id}|${r.category_id ?? ''}|${slugify(r.name)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  const reject = db.prepare("UPDATE venues SET status = 'rejected' WHERE id = ?");
  for (const arr of groups.values()) {
    if (arr.length < 2) continue;
    const winner = arr[0]; // highest reviewCount due to ORDER BY
    for (let i = 1; i < arr.length; i++) {
      const r = arr[i];
      if (metresBetween(winner, r) <= 60) {
        reject.run(r.id);
        counts.rejected_dedupe++;
      }
    }
  }

  // 3) confidence — promote remaining drafts.
  const promotables = db.prepare(`
    SELECT id, city_id, name, COALESCE(review_count, 0) AS rc, description
    FROM venues WHERE status = 'draft'
  `).all();

  const promote = db.prepare(`
    UPDATE venues
       SET status = 'published',
           slug = ?,
           published_at = unixepoch()
     WHERE id = ?
  `);
  const hold = db.prepare("UPDATE venues SET status = 'pending' WHERE id = ?");

  for (const v of promotables) {
    const hasDescription = typeof v.description === 'string' && v.description.length > 30;
    if (v.rc >= 5 && hasDescription) {
      const slug = pickUniqueSlug(db, v.city_id, v.name, v.id);
      promote.run(slug, v.id);
      counts.published++;
    } else {
      hold.run(v.id);
      counts.pending++;
    }
  }

  return counts;
}
