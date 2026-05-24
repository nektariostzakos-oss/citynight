// stage: photos — resolve Places photo refs for each venue, store URLs + attribution.
// Subject is 'venue' and source is 'google_places' — the CHECK constraint blocks
// anything else, so the integrity rule is enforced by the DB itself.

import { db, uuid } from '../lib/db.js';
import { resolvePhotoUrl } from '../lib/places.js';

const CACHE_DAYS = 30;

export async function photos({ citySlug, dryRun }) {
  const handle = db();
  const where = citySlug ? `AND c.slug = '${citySlug.replace(/'/g, "''")}'` : '';
  const rows = handle.prepare(`
    SELECT v.id, v.seed_photo_refs
      FROM venues v
      JOIN cities c ON c.id = v.city_id
     WHERE v.seed_photo_refs IS NOT NULL
       AND v.status IN ('draft','pending','published')
       AND NOT EXISTS (SELECT 1 FROM photos p WHERE p.venue_id = v.id)
       ${where}
  `).all();

  console.log(`[photos] venues needing photos: ${rows.length}`);
  if (!rows.length) return;

  const insert = handle.prepare(`
    INSERT INTO photos (
      id, venue_id, subject_type, source, url,
      attribution_text, attribution_url,
      cached_until, is_primary, sort_order
    ) VALUES (?, ?, 'venue', 'google_places', ?, ?, ?, ?, ?, ?)
  `);

  let attached = 0, failed = 0;
  for (const r of rows) {
    let refs;
    try { refs = JSON.parse(r.seed_photo_refs); } catch { failed++; continue; }
    if (!Array.isArray(refs)) { failed++; continue; }

    for (let i = 0; i < refs.length; i++) {
      const ref = refs[i];
      if (!ref?.name) continue;
      if (dryRun) { console.log(`  would resolve ${ref.name}`); continue; }
      let url;
      try { url = await resolvePhotoUrl(ref.name, { maxWidthPx: 1200 }); }
      catch (e) { console.warn(`  photo fail ${ref.name}: ${e.message}`); failed++; continue; }
      if (!url) { failed++; continue; }
      const att = ref.attributions?.[0];
      insert.run(
        uuid(),
        r.id,
        url,
        att?.displayName ?? null,
        att?.uri ?? null,
        Math.floor(Date.now() / 1000) + CACHE_DAYS * 86400,
        i === 0 ? 1 : 0,
        i,
      );
      attached++;
    }
  }

  console.log(`[photos] attached=${attached} failed=${failed}`);
}
