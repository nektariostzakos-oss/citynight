// CRUD for the Featured-tier event posting feature.
//   GET    /api/venues/[id]/events             — list (owner-scoped)
//   POST   /api/venues/[id]/events             — create
//   PATCH  /api/venues/[id]/events?eventId=…   — edit
//   DELETE /api/venues/[id]/events?eventId=…   — delete
//
// Authorization: every method requires the caller to be the venue owner AND
// the venue tier to be 'featured'. Otherwise 403 — Featured is the contract.
//
// Revalidates the public venue page after every mutation so the new event
// shows up within seconds.

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { requireSameOrigin } from '@/lib/csrf';
import { rateLimit429 } from '@/lib/rate-limit';
import { db } from '@/db';

type VenueRow = { id: string; tier: 'free' | 'featured'; slug: string | null; city: string; bucket: string | null };

function loadVenue(venueId: string, userId: string): VenueRow | null {
  const row = db.$client.prepare(`
    SELECT v.id, v.tier, v.slug,
           c.slug AS city,
           COALESCE(a.slug, cat.slug) AS bucket
      FROM venues v
      JOIN cities c ON c.id = v.city_id
      LEFT JOIN areas a ON a.id = v.area_id
      LEFT JOIN categories cat ON cat.id = v.category_id
     WHERE v.id = ? AND v.owner_id = ?
  `).get(venueId, userId) as VenueRow | undefined;
  return row ?? null;
}

function revalidatePublic(v: VenueRow) {
  if (!v.slug || !v.bucket) return;
  for (const l of ['en', 'el', 'de', 'fr', 'it']) {
    revalidatePath(`/${l}/greece/${v.city}/${v.bucket}/${v.slug}`);
  }
}

function ensureFeatured(v: VenueRow | null) {
  if (!v) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  if (v.tier !== 'featured') return NextResponse.json({ ok: false, error: 'featured_required' }, { status: 403 });
  return null;
}

function parseTs(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value);
  if (typeof value === 'string') {
    const ms = Date.parse(value);
    if (Number.isFinite(ms)) return Math.floor(ms / 1000);
  }
  return null;
}

// ── GET ──────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const v = loadVenue(id, user.id);
  if (!v) return NextResponse.json({ ok: false }, { status: 404 });

  const rows = db.$client.prepare(`
    SELECT id, title, description, starts_at AS startsAt, ends_at AS endsAt, url, status
      FROM venue_events
     WHERE venue_id = ?
     ORDER BY starts_at DESC
     LIMIT 100
  `).all(id);
  return NextResponse.json({ ok: true, events: rows });
}

// ── POST ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const user = await requireUser();
  // Cap event-posting to 20/hour per user to keep noise + abuse contained.
  const rl = rateLimit429(`venue-events:create:${user.id}`, { max: 20, windowMs: 60 * 60_000 });
  if (rl) return rl;
  const { id } = await params;
  const v = loadVenue(id, user.id);
  const guard = ensureFeatured(v); if (guard) return guard;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'bad_input' }, { status: 400 }); }

  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 140) : '';
  const description = typeof body.description === 'string' ? body.description.trim().slice(0, 2000) : null;
  const startsAt = parseTs(body.startsAt);
  const endsAt = parseTs(body.endsAt);
  const url = typeof body.url === 'string' ? body.url.trim().slice(0, 500) : null;

  if (!title || !startsAt) {
    return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 });
  }

  const eventId = crypto.randomUUID();
  db.$client.prepare(`
    INSERT INTO venue_events (id, venue_id, title, description, starts_at, ends_at, url, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?)
  `).run(eventId, id, title, description, startsAt, endsAt, url, user.id);

  revalidatePublic(v!);
  return NextResponse.json({ ok: true, eventId });
}

// ── PATCH ────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const user = await requireUser();
  const { id } = await params;
  const v = loadVenue(id, user.id);
  const guard = ensureFeatured(v); if (guard) return guard;

  const eventId = new URL(req.url).searchParams.get('eventId');
  if (!eventId) return NextResponse.json({ ok: false, error: 'missing_eventId' }, { status: 400 });

  // Confirm the event actually belongs to this venue (defence-in-depth).
  const existing = db.$client.prepare(`SELECT id FROM venue_events WHERE id = ? AND venue_id = ?`).get(eventId, id) as { id: string } | undefined;
  if (!existing) return NextResponse.json({ ok: false }, { status: 404 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const sets: string[] = [];
  const args: unknown[] = [];
  if (typeof body.title === 'string')       { sets.push('title = ?');       args.push(body.title.trim().slice(0, 140)); }
  if ('description' in body)                { sets.push('description = ?'); args.push(typeof body.description === 'string' ? body.description.trim().slice(0, 2000) : null); }
  if ('startsAt' in body)                   { const t = parseTs(body.startsAt); if (t == null) return NextResponse.json({ ok: false, error: 'bad_starts_at' }, { status: 400 }); sets.push('starts_at = ?'); args.push(t); }
  if ('endsAt' in body)                     { sets.push('ends_at = ?');    args.push(parseTs(body.endsAt)); }
  if ('url' in body)                        { sets.push('url = ?');        args.push(typeof body.url === 'string' ? body.url.trim().slice(0, 500) : null); }
  if (body.status === 'canceled' || body.status === 'published' || body.status === 'draft') {
    sets.push('status = ?'); args.push(body.status);
  }
  if (!sets.length) return NextResponse.json({ ok: true, updated: 0 });

  sets.push('updated_at = unixepoch()');
  args.push(eventId);
  db.$client.prepare(`UPDATE venue_events SET ${sets.join(', ')} WHERE id = ?`).run(...args);

  revalidatePublic(v!);
  return NextResponse.json({ ok: true });
}

// ── DELETE ───────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const user = await requireUser();
  const { id } = await params;
  const v = loadVenue(id, user.id);
  const guard = ensureFeatured(v); if (guard) return guard;

  const eventId = new URL(req.url).searchParams.get('eventId');
  if (!eventId) return NextResponse.json({ ok: false, error: 'missing_eventId' }, { status: 400 });

  const result = db.$client.prepare(`DELETE FROM venue_events WHERE id = ? AND venue_id = ?`).run(eventId, id);
  if (result.changes === 0) return NextResponse.json({ ok: false }, { status: 404 });

  revalidatePublic(v!);
  return NextResponse.json({ ok: true });
}
