// GET /api/sites/[id]/booking/slots?serviceId=&staffId=&date=YYYY-MM-DD
//
// Public — returns the bookable slot grid for the requested
// service+staff+date, accounting for the staff's default schedule, any
// site_availability_rules overrides, site_holidays, and existing live
// bookings. Slot grid step is 30 min (matches atelier's default).

import { NextRequest, NextResponse } from 'next/server';
import { getService, getStaff, getSlotsForService } from '@/lib/booking';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const serviceIdOrSlug = url.searchParams.get('serviceId');
  const staffIdOrSlug = url.searchParams.get('staffId');
  const date = url.searchParams.get('date');

  if (!serviceIdOrSlug || !staffIdOrSlug || !date) {
    return NextResponse.json({ error: 'missing_params' }, { status: 400 });
  }
  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: 'bad_date' }, { status: 400 });
  }

  const service = getService(id, serviceIdOrSlug);
  if (!service) return NextResponse.json({ error: 'service_not_found' }, { status: 404 });
  const staff = getStaff(id, staffIdOrSlug);
  if (!staff) return NextResponse.json({ error: 'staff_not_found' }, { status: 404 });

  const slots = getSlotsForService(
    id, staff.id, service.id, date,
    service.durationMinutes, service.bufferMinutes,
  );
  return NextResponse.json({ slots });
}
