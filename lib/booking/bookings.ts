// Per-site bookings. Replaces atelier's data/bookings.json with SQLite
// queries against site_bookings. Atelier ran an in-process file lock to
// serialise writes — SQLite gives us transactional collision checks via
// IMMEDIATE transactions, so no locks needed.
//
// Pricing is cents (priceCents). `date` is "YYYY-MM-DD" in the site's
// timezone, `time` is "HH:MM" local. The slot-collision query is indexed
// on (site_id, staff_id, date, time).

import 'server-only';
import { db } from '@/db';
import { getServiceBufferMinutes } from './services';
import { upsertClientFromContact, recordBookingForClient } from '@/lib/crm/clients';

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'no_show' | 'cancelled';
const TERMINAL_STATUSES = new Set<BookingStatus>(['cancelled', 'completed', 'no_show']);

export type SiteBooking = {
  id: string;
  siteId: string;
  serviceId: string;
  staffId: string;
  clientId: string | null;
  date: string;
  time: string;
  durationMinutes: number;
  bufferMinutes: number;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  priceCents: number;
  currency: string;
  depositPercent: number | null;
  depositPaidCents: number | null;
  depositStripePaymentIntentId: string | null;
  membershipId: string | null;
  discountPercent: number | null;
  status: BookingStatus;
  cancelledAt: number | null;
  cancellationReason: string | null;
  completedAt: number | null;
  notes: string | null;
  customerNotes: string | null;
  walkIn: boolean;
  lang: string;
  createdAt: number;
  updatedAt: number;
};

export type NewBookingInput = {
  serviceId: string;
  staffId: string;
  clientId?: string | null;
  date: string;                 // "YYYY-MM-DD"
  time: string;                 // "HH:MM"
  durationMinutes: number;
  bufferMinutes?: number;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  priceCents: number;
  currency?: string;
  depositPercent?: number | null;
  depositPaidCents?: number | null;
  depositStripePaymentIntentId?: string | null;
  membershipId?: string | null;
  discountPercent?: number | null;
  customerNotes?: string | null;
  walkIn?: boolean;
  lang?: string;
};

const dbh = () => db.$client;

const SELECT = `
  SELECT id, site_id, service_id, staff_id, client_id,
         date, time, duration_minutes, buffer_minutes,
         customer_name, customer_email, customer_phone,
         price_cents, currency,
         deposit_percent, deposit_paid_cents, deposit_stripe_payment_intent_id,
         membership_id, discount_percent,
         status, cancelled_at, cancellation_reason, completed_at,
         notes, customer_notes, walk_in, lang,
         created_at, updated_at
    FROM site_bookings
`;

function row(r: Record<string, unknown>): SiteBooking {
  return {
    id: String(r.id),
    siteId: String(r.site_id),
    serviceId: String(r.service_id),
    staffId: String(r.staff_id),
    clientId: (r.client_id as string | null) ?? null,
    date: String(r.date),
    time: String(r.time),
    durationMinutes: Number(r.duration_minutes),
    bufferMinutes: Number(r.buffer_minutes),
    customerName: String(r.customer_name),
    customerEmail: (r.customer_email as string | null) ?? null,
    customerPhone: (r.customer_phone as string | null) ?? null,
    priceCents: Number(r.price_cents),
    currency: String(r.currency),
    depositPercent: r.deposit_percent !== null ? Number(r.deposit_percent) : null,
    depositPaidCents: r.deposit_paid_cents !== null ? Number(r.deposit_paid_cents) : null,
    depositStripePaymentIntentId: (r.deposit_stripe_payment_intent_id as string | null) ?? null,
    membershipId: (r.membership_id as string | null) ?? null,
    discountPercent: r.discount_percent !== null ? Number(r.discount_percent) : null,
    status: r.status as BookingStatus,
    cancelledAt: r.cancelled_at !== null ? Number(r.cancelled_at) : null,
    cancellationReason: (r.cancellation_reason as string | null) ?? null,
    completedAt: r.completed_at !== null ? Number(r.completed_at) : null,
    notes: (r.notes as string | null) ?? null,
    customerNotes: (r.customer_notes as string | null) ?? null,
    walkIn: Number(r.walk_in) === 1,
    lang: String(r.lang),
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  };
}

function toMinutes(hhmm: string): number {
  const seg = hhmm.split(':');
  const h = Number(seg[0] ?? 0);
  const m = Number(seg[1] ?? 0);
  return h * 60 + m;
}

/** Bookings for the dashboard / owner views, sorted by upcoming first.
 * Cancelled bookings are included unless `excludeCancelled` is set. */
export function listBookings(
  siteId: string,
  opts: { from?: string; to?: string; staffId?: string; excludeCancelled?: boolean; limit?: number } = {},
): SiteBooking[] {
  const filters: string[] = ['site_id = ?'];
  const args: unknown[] = [siteId];
  if (opts.from) { filters.push('date >= ?'); args.push(opts.from); }
  if (opts.to)   { filters.push('date <= ?'); args.push(opts.to); }
  if (opts.staffId) { filters.push('staff_id = ?'); args.push(opts.staffId); }
  if (opts.excludeCancelled) { filters.push(`status != 'cancelled'`); }
  const limit = opts.limit ? `LIMIT ${Math.max(1, Math.floor(opts.limit))}` : '';
  return (dbh().prepare(`${SELECT}
     WHERE ${filters.join(' AND ')}
     ORDER BY date ASC, time ASC
     ${limit}
  `).all(...args) as Record<string, unknown>[]).map(row);
}

export function getBooking(siteId: string, bookingId: string): SiteBooking | null {
  const r = dbh().prepare(`${SELECT} WHERE site_id = ? AND id = ? LIMIT 1`)
    .get(siteId, bookingId) as Record<string, unknown> | undefined;
  return r ? row(r) : null;
}

export class BookingCollisionError extends Error {
  constructor(public conflictingBookingId: string) {
    super('That slot overlaps an existing booking. Pick another time.');
    this.name = 'BookingCollisionError';
  }
}

/**
 * Insert a booking with transactional collision detection. Throws
 * `BookingCollisionError` if any LIVE booking for the same staff at the
 * same site has an interval overlapping the requested one. Uses SQLite's
 * BEGIN IMMEDIATE so concurrent writers serialise.
 */
export function createBooking(siteId: string, input: NewBookingInput): SiteBooking {
  const buffer = input.bufferMinutes ?? getServiceBufferMinutes(siteId, input.serviceId);
  const newStart = toMinutes(input.time);
  const newEnd = newStart + input.durationMinutes + buffer;

  const conn = dbh();
  const tx = conn.transaction(() => {
    const overlaps = conn.prepare(`
      SELECT id, time, duration_minutes, buffer_minutes
        FROM site_bookings
       WHERE site_id = ?
         AND staff_id = ?
         AND date = ?
         AND status NOT IN ('cancelled','no_show')
    `).all(siteId, input.staffId, input.date) as {
      id: string; time: string; duration_minutes: number; buffer_minutes: number;
    }[];

    for (const b of overlaps) {
      const bStart = toMinutes(b.time);
      const bEnd = bStart + b.duration_minutes + b.buffer_minutes;
      if (newStart < bEnd && bStart < newEnd) {
        throw new BookingCollisionError(b.id);
      }
    }

    // A booking that requires a deposit starts in 'pending' and flips to
    // 'confirmed' on payment_intent.succeeded (see app/api/stripe/webhook).
    // No deposit → 'confirmed' immediately, as before.
    const initialStatus: BookingStatus = (input.depositPercent && input.depositPercent > 0) ? 'pending' : 'confirmed';

    // Resolve / create the client row inside the same transaction so the
    // booking insert and the client rollup move together — partial state
    // can't leak through if the booking later fails.
    const clientId = input.clientId
      ?? upsertClientFromContact(siteId, {
        name: input.customerName,
        email: input.customerEmail ?? null,
        phone: input.customerPhone ?? null,
      });

    const id = crypto.randomUUID();
    conn.prepare(`
      INSERT INTO site_bookings (
        id, site_id, service_id, staff_id, client_id,
        date, time, duration_minutes, buffer_minutes,
        customer_name, customer_email, customer_phone,
        price_cents, currency,
        deposit_percent, deposit_paid_cents, deposit_stripe_payment_intent_id,
        membership_id, discount_percent,
        status, customer_notes, walk_in, lang
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?
      )
    `).run(
      id, siteId, input.serviceId, input.staffId, clientId,
      input.date, input.time, input.durationMinutes, buffer,
      input.customerName, input.customerEmail ?? null, input.customerPhone ?? null,
      input.priceCents, input.currency ?? 'EUR',
      input.depositPercent ?? null, input.depositPaidCents ?? null, input.depositStripePaymentIntentId ?? null,
      input.membershipId ?? null, input.discountPercent ?? null,
      initialStatus, input.customerNotes ?? null, input.walkIn ? 1 : 0, input.lang ?? 'en',
    );

    // Bump the client rollups. Only count toward total_bookings if the
    // booking is immediately confirmed — pending deposits flip later via
    // updateBookingStatus, which doesn't double-count.
    if (initialStatus === 'confirmed') {
      recordBookingForClient(clientId, input.priceCents, Math.floor(Date.now() / 1000));
    }

    return id;
  });

  const id = (tx as () => string)();
  // Re-read so the response shows defaults set by the DB.
  return getBooking(siteId, id)!;
}

/**
 * State-machine guarded status update. Terminal statuses (cancelled,
 * completed, no_show) cannot transition to anything other than themselves.
 */
export function updateBookingStatus(
  siteId: string,
  bookingId: string,
  next: BookingStatus,
  reason?: string,
): SiteBooking | null {
  const current = getBooking(siteId, bookingId);
  if (!current) return null;
  if (TERMINAL_STATUSES.has(current.status) && current.status !== next) {
    throw new Error(`Cannot change booking from ${current.status} to ${next}.`);
  }
  const sets: string[] = ['status = ?', 'updated_at = unixepoch()'];
  const args: unknown[] = [next];
  if (next === 'cancelled') {
    sets.push('cancelled_at = unixepoch()', 'cancellation_reason = ?');
    args.push(reason ?? null);
  }
  if (next === 'completed') {
    sets.push('completed_at = unixepoch()');
  }
  args.push(siteId, bookingId);
  dbh().prepare(
    `UPDATE site_bookings SET ${sets.join(', ')} WHERE site_id = ? AND id = ?`,
  ).run(...args);

  // Rollup bump on pending → confirmed (deposit paid path). The initial
  // 'confirmed' booking already bumped rollups in createBooking; pending
  // didn't, so we bump here.
  if (current.status === 'pending' && next === 'confirmed' && current.clientId) {
    recordBookingForClient(current.clientId, current.priceCents, Math.floor(Date.now() / 1000));
  }

  return getBooking(siteId, bookingId);
}

/** Capture the deposit payment intent reference after Stripe confirms. */
export function markDepositPaid(
  siteId: string,
  bookingId: string,
  paidCents: number,
  paymentIntentId: string,
): SiteBooking | null {
  dbh().prepare(`
    UPDATE site_bookings
       SET deposit_paid_cents = ?,
           deposit_stripe_payment_intent_id = ?,
           updated_at = unixepoch()
     WHERE site_id = ? AND id = ?
  `).run(paidCents, paymentIntentId, siteId, bookingId);
  return getBooking(siteId, bookingId);
}
