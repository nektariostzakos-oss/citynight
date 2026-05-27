// GET /api/sites/[id]/booking/services — public list of enabled services
// for the booking flow on the site at /cities/{city}/{slug}/book.

import { NextRequest, NextResponse } from 'next/server';
import { listEnabledServices } from '@/lib/booking';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const services = listEnabledServices(id).map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    description: s.description,
    category: s.category,
    durationMinutes: s.durationMinutes,
    priceCents: s.priceCents,
  }));
  return NextResponse.json({ services });
}
