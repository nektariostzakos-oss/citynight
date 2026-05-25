import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rateLimit429, ipKey } from '@/lib/rate-limit';

// First-party analytics endpoint. Writes one row per view/directions/phone/link
// click; nightly cron rolls up into events_daily (§Phase 6).
//
// Validation: venueId must exist; type must be one of the enum values.
// Rate-limit: 120 events / minute per IP. Real users won't hit this; bots
// trying to spam the events table will trip it fast.

const ALLOWED = new Set(['view', 'directions', 'phone', 'link']);

export async function POST(req: NextRequest) {
  const ipLimit = rateLimit429(`events:${ipKey(req)}`, { max: 120, windowMs: 60_000 });
  if (ipLimit) return ipLimit;

  let body: { venueId?: unknown; type?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const venueId = typeof body.venueId === 'string' ? body.venueId : null;
  const type = typeof body.type === 'string' ? body.type : null;
  if (!venueId || !type || !ALLOWED.has(type)) return NextResponse.json({ ok: false }, { status: 400 });

  // Cheap existence check; protects against random ID spam filling the table.
  const exists = db.$client.prepare(`SELECT 1 FROM venues WHERE id = ? AND status = 'published'`).get(venueId);
  if (!exists) return NextResponse.json({ ok: false }, { status: 404 });

  db.$client.prepare(`INSERT INTO events (venue_id, type) VALUES (?, ?)`).run(venueId, type);
  return NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
}
