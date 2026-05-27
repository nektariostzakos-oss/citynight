// GET    /api/sites/[id]/bookings/[bookingId]  — one booking, owner-only
// PATCH  /api/sites/[id]/bookings/[bookingId]  — owner updates status
//
// Status transitions are guarded by lib/booking.updateBookingStatus —
// terminal statuses (cancelled / completed / no_show) cannot transition
// to anything other than themselves.

import { NextRequest, NextResponse } from 'next/server';
import { requireSameOrigin } from '@/lib/csrf';
import { requireSiteOwner } from '@/lib/auth/site-owner';
import { getBooking, updateBookingStatus, type BookingStatus } from '@/lib/booking';

const VALID_STATUS = new Set<BookingStatus>(['pending', 'confirmed', 'completed', 'no_show', 'cancelled']);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; bookingId: string }> }) {
  const { id, bookingId } = await params;
  try { await requireSiteOwner(id); } catch (e) { if (e instanceof Response) return e; throw e; }
  const booking = getBooking(id, bookingId);
  if (!booking) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ booking });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; bookingId: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const { id, bookingId } = await params;
  try { await requireSiteOwner(id); } catch (e) { if (e instanceof Response) return e; throw e; }

  let body: { status?: unknown; reason?: unknown };
  try { body = (await req.json()) as { status?: unknown; reason?: unknown }; }
  catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }

  const status = typeof body.status === 'string' ? body.status as BookingStatus : null;
  if (!status || !VALID_STATUS.has(status)) {
    return NextResponse.json({ error: 'bad_status' }, { status: 400 });
  }
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : undefined;

  try {
    const updated = updateBookingStatus(id, bookingId, status, reason);
    if (!updated) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ ok: true, booking: updated });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Cannot change booking')) {
      return NextResponse.json({ error: 'invalid_transition', detail: err.message }, { status: 409 });
    }
    throw err;
  }
}
