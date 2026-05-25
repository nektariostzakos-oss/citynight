// New-venue submission (§12). Auto-validates against Google Places. Decision:
//   confidence >= 0.7 + reviewCount >= 3        → auto_publish (status='published')
//   confidence >= 0.4                            → hold       (status='pending')
//   otherwise                                    → reject     (status='rejected')
//
// Rate limit: 3 successful or held submissions per user per 24h. Reject/bad-
// input attempts don't count toward the cap (so a typo doesn't lock you out).

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { findPlacesMatch } from '@/lib/places-validate';
import { requireSameOrigin } from '@/lib/csrf';
import { db } from '@/db';

const DAILY_SUBMISSION_CAP = 3;
const RATE_WINDOW_S = 24 * 60 * 60;

function recordAttempt(userId: string, outcome: string, venueId: string | null, ip: string | null) {
  db.$client.prepare(
    `INSERT INTO submission_attempts (id, user_id, ip, outcome, venue_id) VALUES (?, ?, ?, ?, ?)`,
  ).run(crypto.randomUUID(), userId, ip, outcome, venueId);
}

export async function POST(req: NextRequest) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const user = await requireUser();
  // CF / proxy header first; fall back to undefined locally.
  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch {
    recordAttempt(user.id, 'bad_input', null, ip);
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const citySlug = typeof body.citySlug === 'string' ? body.citySlug : '';
  const categorySlug = typeof body.categorySlug === 'string' ? body.categorySlug : '';
  if (!name || !citySlug || !categorySlug) {
    recordAttempt(user.id, 'bad_input', null, ip);
    return NextResponse.json({ ok: false, error: 'missing fields' }, { status: 400 });
  }

  // Rate limit — count attempts in the last 24h that actually persisted
  // (auto_publish or hold). Reject + bad_input attempts are free.
  const recent = (db.$client.prepare(
    `SELECT COUNT(*) AS n FROM submission_attempts
      WHERE user_id = ? AND created_at >= unixepoch() - ?
        AND outcome IN ('auto_publish', 'hold')`,
  ).get(user.id, RATE_WINDOW_S) as { n: number }).n;
  if (recent >= DAILY_SUBMISSION_CAP) {
    recordAttempt(user.id, 'rate_limited', null, ip);
    return NextResponse.json(
      { ok: false, error: 'rate_limited', limit: DAILY_SUBMISSION_CAP, windowHours: 24 },
      { status: 429 },
    );
  }

  const sqlite = db.$client;
  const city = sqlite.prepare(`SELECT id, name FROM cities WHERE slug = ? AND is_published = 1`).get(citySlug) as
    | { id: string; name: string } | undefined;
  const cat = sqlite.prepare(`SELECT id FROM categories WHERE slug = ?`).get(categorySlug) as { id: string } | undefined;
  if (!city || !cat) {
    recordAttempt(user.id, 'bad_input', null, ip);
    return NextResponse.json({ ok: false, error: 'unknown city or category' }, { status: 400 });
  }

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

  recordAttempt(user.id, decision, venueId, ip);

  return NextResponse.json({ ok: true, venueId, decision, status, confidence });
}
