// POST /api/sites/[id]/booking — create a booking from the public site.
//
// Input shape (JSON):
//   { serviceId, staffId, date: "YYYY-MM-DD", time: "HH:MM",
//     customerName, customerEmail?, customerPhone?, customerNotes?, lang?,
//     depositPercent? }
//
// `serviceId` / `staffId` accept either DB id or slug. The endpoint pulls
// price + duration + buffer from the service row at booking time so the
// caller can't lie about price. Collision detection is transactional
// inside lib/booking/createBooking.
//
// Deposits (I.5c): when `depositPercent` is set (1..100), the booking is
// created in status='pending' with the percent recorded; the front-end
// then calls POST /booking/[bookingId]/deposit to mint a Stripe Connect
// PaymentIntent. The webhook flips status → confirmed on
// payment_intent.succeeded.
//
// CSRF: same-origin check (proxy.ts puts citynight + custom domains in
// the trusted-origin set). Rate-limit: 5 attempts / hour / IP — booking
// spam from automated bots is real; legit customers never need more.

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireSameOrigin } from '@/lib/csrf';
import { rateLimit429, ipKey } from '@/lib/rate-limit';
import {
  createBooking,
  getService,
  getStaff,
  BookingCollisionError,
  type NewBookingInput,
} from '@/lib/booking';
import { revalidateSitePaths } from '@/lib/site-revalidate';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const LANG_RE = /^[a-z]{2}$/;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const limited = rateLimit429(`booking:${ipKey(req)}`, { max: 5, windowMs: 60 * 60_000 });
  if (limited) return limited;

  const { id: siteId } = await params;
  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }

  const serviceRef = strOrNull(body.serviceId, 80);
  const staffRef = strOrNull(body.staffId, 80);
  const date = strOrNull(body.date, 10);
  const time = strOrNull(body.time, 5);
  const customerName = strOrNull(body.customerName, 120);
  const customerEmail = strOrNull(body.customerEmail, 200);
  const customerPhone = strOrNull(body.customerPhone, 30);
  const customerNotes = strOrNull(body.customerNotes, 500);
  const lang = strOrNull(body.lang, 2);
  const depositPercent = intInRange(body.depositPercent, 1, 100);

  if (!serviceRef || !staffRef || !date || !time || !customerName) {
    return NextResponse.json({ error: 'missing_required' }, { status: 400 });
  }
  if (!DATE_RE.test(date) || !TIME_RE.test(time)) {
    return NextResponse.json({ error: 'bad_format' }, { status: 400 });
  }
  if (!customerEmail && !customerPhone) {
    return NextResponse.json({ error: 'contact_required' }, { status: 400 });
  }
  if (lang && !LANG_RE.test(lang)) {
    return NextResponse.json({ error: 'bad_lang' }, { status: 400 });
  }

  const service = getService(siteId, serviceRef);
  if (!service || !service.enabled) {
    return NextResponse.json({ error: 'service_not_found' }, { status: 404 });
  }
  const staff = getStaff(siteId, staffRef);
  if (!staff || !staff.enabled) {
    return NextResponse.json({ error: 'staff_not_found' }, { status: 404 });
  }

  const input: NewBookingInput = {
    serviceId: service.id,
    staffId: staff.id,
    date, time,
    durationMinutes: service.durationMinutes,
    bufferMinutes: service.bufferMinutes,
    customerName,
    customerEmail: customerEmail ?? undefined,
    customerPhone: customerPhone ?? undefined,
    customerNotes: customerNotes ?? undefined,
    priceCents: service.priceCents,
    depositPercent: depositPercent ?? undefined,
    lang: lang ?? undefined,
  };

  try {
    const booking = createBooking(siteId, input);
    revalidateSitePaths(siteId, ['/book'], revalidatePath);
    return NextResponse.json({
      ok: true,
      booking: {
        id: booking.id,
        date: booking.date,
        time: booking.time,
        durationMinutes: booking.durationMinutes,
        priceCents: booking.priceCents,
        currency: booking.currency,
      },
    });
  } catch (err) {
    if (err instanceof BookingCollisionError) {
      return NextResponse.json({ error: 'slot_taken' }, { status: 409 });
    }
    throw err;
  }
}

function strOrNull(v: unknown, maxLen: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t || t.length > maxLen) return null;
  return t;
}

function intInRange(v: unknown, min: number, max: number): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  const n = Math.floor(v);
  if (n < min || n > max) return null;
  return n;
}
