// New-venue submission (§12). Auto-validates against Google Places. Decision:
//   confidence >= 0.7 + reviewCount >= 3        → auto_publish (status='published')
//   confidence >= 0.4                            → hold       (status='pending')
//   otherwise                                    → reject     (status='rejected')

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { findPlacesMatch } from '@/lib/places-validate';
import { db } from '@/db';

export async function POST(req: NextRequest) {
  const user = await requireUser();
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const citySlug = typeof body.citySlug === 'string' ? body.citySlug : '';
  const categorySlug = typeof body.categorySlug === 'string' ? body.categorySlug : '';
  if (!name || !citySlug || !categorySlug) return NextResponse.json({ ok: false, error: 'missing fields' }, { status: 400 });

  const sqlite = db.$client;
  const city = sqlite.prepare(`SELECT id, name FROM cities WHERE slug = ? AND is_published = 1`).get(citySlug) as
    | { id: string; name: string } | undefined;
  const cat = sqlite.prepare(`SELECT id FROM categories WHERE slug = ?`).get(categorySlug) as { id: string } | undefined;
  if (!city || !cat) return NextResponse.json({ ok: false, error: 'unknown city or category' }, { status: 400 });

  const match = await findPlacesMatch({ name, city: city.name });
  const confidence = match?.confidence ?? 0;
  const fresh = !!match && (match.reviewCount ?? 0) >= 3;

  let decision: 'auto_publish' | 'hold' | 'reject';
  let status: 'published' | 'pending' | 'rejected';
  if (confidence >= 0.7 && fresh) { decision = 'auto_publish'; status = 'published'; }
  else if (confidence >= 0.4) { decision = 'hold'; status = 'pending'; }
  else { decision = 'reject'; status = 'rejected'; }

  const venueId = crypto.randomUUID();
  const tx = sqlite.transaction(() => {
    sqlite.prepare(`
      INSERT INTO venues (
        id, city_id, category_id, google_place_id, name, address, lat, lng,
        rating, review_count, business_status,
        field_sources, status, claim, owner_id, last_synced_at, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', ?, unixepoch(), ?)
    `).run(
      venueId, city.id, cat.id, match?.placeId ?? null, name,
      match?.address ?? null, match?.lat ?? null, match?.lng ?? null,
      match?.rating ?? null, match?.reviewCount ?? null, match?.businessStatus ?? null,
      JSON.stringify(match ? { name: 'owner', address: 'google_places', lat: 'google_places', lng: 'google_places' } : { name: 'owner' }),
      status,
      user.id,
      status === 'published' ? Math.floor(Date.now() / 1000) : null,
    );
    sqlite.prepare(`
      INSERT INTO venue_submissions (id, venue_id, submitted_by, places_match, confidence, auto_decision)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), venueId, user.id, match ? 1 : 0, confidence, decision);
  });
  tx();

  return NextResponse.json({ ok: true, venueId, decision, status, confidence });
}
