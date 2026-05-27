// GET /api/sites/[id]/booking/staff?serviceId=<id-or-slug>
//
// Public — returns the enabled staff who can perform the requested service.
// `serviceId` accepts either the service row id or its slug; the lookup
// returns null if the service doesn't exist, in which case we 404.

import { NextRequest, NextResponse } from 'next/server';
import { getService, listStaffForService, listEnabledStaff } from '@/lib/booking';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const serviceIdOrSlug = url.searchParams.get('serviceId');

  // No service filter → return all enabled staff (the booking flow uses
  // this for the "pick anyone" path).
  if (!serviceIdOrSlug) {
    const all = listEnabledStaff(id).map(stripStaff);
    return NextResponse.json({ staff: all });
  }

  const service = getService(id, serviceIdOrSlug);
  if (!service) return NextResponse.json({ error: 'service_not_found' }, { status: 404 });

  const staff = listStaffForService(id, service.id).map(stripStaff);
  return NextResponse.json({ staff });
}

function stripStaff(s: { id: string; slug: string; name: string; role: string | null; bio: string | null; photoUrl: string | null; specialties: string[] }) {
  return {
    id: s.id, slug: s.slug, name: s.name,
    role: s.role, bio: s.bio, photoUrl: s.photoUrl, specialties: s.specialties,
  };
}
