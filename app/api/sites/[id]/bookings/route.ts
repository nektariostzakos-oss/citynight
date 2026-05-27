// GET /api/sites/[id]/bookings?from=&to=&staffId=&excludeCancelled=1
//
// Owner-only — dashboard view. Returns bookings sorted by upcoming first,
// optionally filtered by date range / staff / cancelled status. `from`/`to`
// are inclusive date strings "YYYY-MM-DD".

import { NextRequest, NextResponse } from 'next/server';
import { requireSiteOwner } from '@/lib/auth/site-owner';
import { listBookings } from '@/lib/booking';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await requireSiteOwner(id);
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }

  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const staffId = url.searchParams.get('staffId');
  const excludeCancelled = url.searchParams.get('excludeCancelled') === '1';
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? Math.min(500, Math.max(1, parseInt(limitParam, 10))) : 200;

  if (from && !DATE_RE.test(from)) return NextResponse.json({ error: 'bad_from' }, { status: 400 });
  if (to && !DATE_RE.test(to))   return NextResponse.json({ error: 'bad_to' }, { status: 400 });

  const bookings = listBookings(id, {
    from: from ?? undefined,
    to: to ?? undefined,
    staffId: staffId ?? undefined,
    excludeCancelled,
    limit,
  });
  return NextResponse.json({ bookings });
}
