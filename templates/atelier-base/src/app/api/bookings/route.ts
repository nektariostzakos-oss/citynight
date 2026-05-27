import { NextRequest, NextResponse } from "next/server";
import {
  createBooking,
  getOccupiedSlots,
  listBookings,
  type NewBooking,
} from "../../../lib/bookings";
import { getSlotsForDay } from "../../../lib/services";
import { currentUser, isStaff } from "../../../lib/auth";
import { sendBookingConfirmation } from "../../../lib/email";
import { notifyBookingCreated } from "../../../lib/notify";
import { allowAction, clientIp } from "../../../lib/rateLimit";
import { loadBusiness } from "../../../lib/settings";
import { wallClockInTzToUtc } from "../../../lib/tz";
import { listAdminServices } from "../../../lib/customServices";
import { listAdminStaff, slotFilterForStaff } from "../../../lib/customStaff";
import { signBookingId } from "../../../lib/bookingToken";
import { redeemCoupon, validateCoupon } from "../../../lib/coupons";
import { findClientByContact } from "../../../lib/clients";
import { activeSubscriptionFor } from "../../../lib/subscriptions";
import { findRedeemablePack, redeemFromPack } from "../../../lib/packs";

const MAX_FIELD = 200;
const MAX_NOTES = 1000;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const barber = url.searchParams.get("barber");

  if (date && barber) {
    // `taken` = slots blocked by existing bookings (buffer-aware) plus slots
    // outside the chosen stylist's working hours / lunch break for that day.
    const services = await listAdminServices();
    const bufferById = new Map(
      services.map((s) => [s.id, Math.max(0, Number(s.bufferMinutes) || 0)])
    );
    const occupied = await getOccupiedSlots(
      date,
      barber,
      (sid) => bufferById.get(sid) ?? 0
    );

    const blocked = new Set<string>(occupied);

    // If a specific stylist is chosen and they don't work that day (or the
    // requested slot is during their break), mark the whole daily grid as
    // blocked so the UI shows "no times available". We derive the daily
    // grid from getSlotsForDay against business hours.
    if (barber !== "any") {
      const staff = (await listAdminStaff()).find((s) => s.id === barber);
      if (staff) {
        const [y, m, d] = date.split("-").map(Number);
        const dow = new Date(Date.UTC(y, (m || 1) - 1, d || 1)).getUTCDay();
        const filter = slotFilterForStaff(staff, dow);
        const business = await loadBusiness();
        const grid = getSlotsForDay(dow, business.hours);
        if (filter === null) {
          for (const s of grid) blocked.add(s);
        } else {
          for (const s of grid) if (!filter(s)) blocked.add(s);
        }
      }
    }

    return NextResponse.json({ taken: Array.from(blocked) });
  }

  const me = await currentUser();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const all = await listBookings();
  const bookings =
    me.role === "admin"
      ? all
      : all.filter((b) => b.barberId === me.barberId || b.barberId === "any");
  return NextResponse.json({ bookings });
}

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const actor = await isStaff();

    // Admin/staff create bookings through the walk-in modal — skip the
    // anti-abuse gates (rate limit + honeypot). Public form still gets them.
    if (!actor) {
      if (!allowAction(`book:hour:${ip}`, 5, 60 * 60_000)) {
        return NextResponse.json(
          { error: "Too many booking attempts. Try again later." },
          { status: 429 }
        );
      }
      if (!allowAction(`book:day:${ip}`, 30, 24 * 60 * 60_000)) {
        return NextResponse.json(
          { error: "Daily booking limit reached." },
          { status: 429 }
        );
      }
    }

    const body = (await req.json()) as NewBooking & {
      website?: string; // honeypot
      couponCode?: string;
    };

    // Honeypot — real users never fill this hidden field. Skip for staff.
    if (!actor && typeof body.website === "string" && body.website.trim().length > 0) {
      return NextResponse.json({ error: "Spam detected" }, { status: 400 });
    }

    // Per-email throttle — closes the email-bombing vector where an
    // attacker uses a rotating IP to send many booking-confirmation
    // emails to a victim's address. Exempts staff callers.
    if (!actor && typeof body.email === "string" && body.email.trim().length > 0) {
      const emailKey = body.email.trim().toLowerCase();
      if (!allowAction(`book:email:${emailKey}`, 3, 60 * 60_000)) {
        return NextResponse.json(
          { error: "Too many recent bookings for this email. Try again later or contact us." },
          { status: 429 }
        );
      }
    }

    const required: (keyof NewBooking)[] = [
      "serviceId",
      "serviceName",
      "price",
      "duration",
      "barberId",
      "barberName",
      "date",
      "time",
      "name",
      "phone",
    ];
    for (const k of required) {
      if (body[k] === undefined || body[k] === "")
        return NextResponse.json(
          { error: `Missing field: ${String(k)}` },
          { status: 400 }
        );
    }

    // Length limits — protect storage + emails from absurd inputs.
    const stringFields: (keyof NewBooking)[] = [
      "serviceId",
      "serviceName",
      "barberId",
      "barberName",
      "date",
      "time",
      "name",
      "phone",
      "email",
    ];
    for (const k of stringFields) {
      const v = body[k];
      if (typeof v === "string" && v.length > MAX_FIELD) {
        return NextResponse.json(
          { error: `Field "${String(k)}" is too long.` },
          { status: 400 }
        );
      }
    }
    if (body.notes && String(body.notes).length > MAX_NOTES) {
      return NextResponse.json(
        { error: "Notes too long." },
        { status: 400 }
      );
    }

    // Format checks.
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email))) {
      return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    }
    if (!/^\+?[0-9 ()\-]{6,20}$/.test(String(body.phone))) {
      return NextResponse.json(
        { error: "Invalid phone number." },
        { status: 400 }
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.date))) {
      return NextResponse.json({ error: "Invalid date." }, { status: 400 });
    }
    if (!/^\d{2}:\d{2}$/.test(String(body.time))) {
      return NextResponse.json({ error: "Invalid time." }, { status: 400 });
    }
    // Reject past dates. Booking date+time are wall-clock in the business
    // timezone — convert to UTC ms before comparing to Date.now() to avoid
    // a UTC-host false-positive that rejects valid near-term slots.
    const business = await loadBusiness();
    const tz = business.timezone || "Europe/Athens";
    const slotTs = wallClockInTzToUtc(String(body.date), String(body.time), tz);
    if (Number.isFinite(slotTs) && slotTs < Date.now() - 5 * 60_000) {
      return NextResponse.json(
        { error: "That time is in the past." },
        { status: 400 }
      );
    }

    // SERVER-SIDE AVAILABILITY ENFORCEMENT — don't trust the client slot.
    // 1. Reject bookings outside business opening hours / closed days
    // 2. Reject bookings that overlap an existing booking (buffer-aware)
    // 3. Reject bookings outside the chosen stylist's working hours / break
    // Admin walk-ins (staff callers) are exempt — front desk may need to
    // override for in-person edge cases (regular who insists on 09:30 etc).
    if (!actor) {
      const [y, mm, dd] = String(body.date).split("-").map(Number);
      const dow = new Date(Date.UTC(y, (mm || 1) - 1, dd || 1)).getUTCDay();
      const validSlots = getSlotsForDay(dow, business.hours);
      if (validSlots.length === 0) {
        return NextResponse.json({ error: "We're closed on that day." }, { status: 400 });
      }
      if (!validSlots.includes(String(body.time))) {
        return NextResponse.json(
          { error: "That time is outside our opening hours." },
          { status: 400 }
        );
      }

      // Staff availability
      if (String(body.barberId) !== "any") {
        const staff = (await listAdminStaff()).find((s) => s.id === String(body.barberId));
        if (staff) {
          const filter = slotFilterForStaff(staff, dow);
          if (filter === null) {
            return NextResponse.json(
              { error: "That stylist isn't working on that day." },
              { status: 400 }
            );
          }
          if (!filter(String(body.time))) {
            return NextResponse.json(
              { error: "That stylist isn't available at that time." },
              { status: 400 }
            );
          }
        }
      }

      // Buffer-aware overlap check against existing bookings
      const services = await listAdminServices();
      const bufferById = new Map(
        services.map((s) => [s.id, Math.max(0, Number(s.bufferMinutes) || 0)])
      );
      const occupied = await getOccupiedSlots(
        String(body.date),
        String(body.barberId),
        (sid) => bufferById.get(sid) ?? 0
      );
      if (occupied.includes(String(body.time))) {
        return NextResponse.json(
          { error: "That slot was just taken. Pick another time." },
          { status: 409 }
        );
      }

      // Force walkIn=false for public callers — staff-only flag
      body.walkIn = false;

      // Patch-test gate for chemical services. If the service is flagged
      // requiresPatchTest and we can find no record of a completed test
      // on this client (matched by email or phone), reject with a clear
      // message so the UI can redirect them to book a patch test first.
      const svc = services.find((s) => s.id === String(body.serviceId));
      if (svc?.requiresPatchTest) {
        const client = await findClientByContact(String(body.email || ""), String(body.phone || ""));
        if (!client?.patchTestAt) {
          return NextResponse.json(
            {
              error:
                "This service requires a 48h patch test before your first visit. Please contact us to arrange one. We'll do it free of charge.",
            },
            { status: 400 }
          );
        }
      }
    }

    // Coupon handling for bookings. Server-side; same semantics as orders.
    let appliedCoupon: { code: string; discount: number } | null = null;
    if (typeof body.couponCode === "string" && body.couponCode.trim().length > 0) {
      const gross = Number(body.price) || 0;
      const res = await validateCoupon(body.couponCode.trim(), gross, "bookings");
      if (!res.ok) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      appliedCoupon = { code: res.coupon!.code, discount: res.discount ?? 0 };
      body.price = Math.max(0, Number((gross - (res.discount ?? 0)).toFixed(2)));
      body.notes = [body.notes, `Coupon: ${res.coupon!.code} (-$${(res.discount ?? 0).toFixed(2)})`]
        .filter(Boolean)
        .join(" · ");
      await redeemCoupon(res.coupon!.id);
    }

    // Authoritative deposit: copied from the service, never trusted from the
    // client. The customer can pay it after booking; it starts unpaid.
    const bookedService = (await listAdminServices()).find(
      (s) => s.id === String(body.serviceId),
    );
    body.deposit = Math.max(0, Number(bookedService?.deposit) || 0);
    body.depositPaid = false;

    // Membership discount: an active membership takes a standing percentage
    // off every booking. Server-side and authoritative; applied after any
    // coupon so the two stack predictably.
    body.membershipDiscount = 0;
    if (typeof body.email === "string" && body.email.trim()) {
      const sub = await activeSubscriptionFor(body.email);
      if (sub && sub.discountPercent > 0) {
        const gross = Number(body.price) || 0;
        const off = Number(((gross * sub.discountPercent) / 100).toFixed(2));
        body.price = Math.max(0, Number((gross - off).toFixed(2)));
        body.membershipDiscount = sub.discountPercent;
        body.notes = [
          body.notes,
          `Member -${sub.discountPercent}% (-$${off.toFixed(2)})`,
        ]
          .filter(Boolean)
          .join(" · ");
      }
    }

    // Class-pack redemption (auto). When the customer holds an active pack
    // covering this service, draw a credit instead of charging — packs are
    // expiry-bound, so use-it-or-lose-it matches the customer's expectation.
    // Skipped for anonymous (no email) bookings since packs are keyed by
    // email. Runs after coupon + membership so those apply when no pack
    // exists; if a pack does apply, it zeroes the booking and the prior
    // discount lines are effectively no-ops on a 0 price.
    let redeemedPack: Awaited<ReturnType<typeof findRedeemablePack>> = null;
    if (typeof body.email === "string" && body.email.trim()) {
      redeemedPack = await findRedeemablePack(
        body.email.trim().toLowerCase(),
        String(body.serviceId),
        (bookedService as { category?: string } | undefined)?.category,
      );
      if (redeemedPack) {
        body.price = 0;
        body.deposit = 0;
        body.depositPaid = true;
        body.membershipDiscount = 0;
        body.usedPackId = redeemedPack.id;
        body.notes = [
          body.notes,
          `Pack: ${redeemedPack.packName} (1 credit)`,
        ]
          .filter(Boolean)
          .join(" · ");
      }
    }

    // Group-class capacity: if the service carries a capacity > 1, allow
    // up to N concurrent bookings for the same slot. createBooking handles
    // the count + full-class rejection.
    const capacity = Math.max(
      1,
      Math.floor(Number((bookedService as { capacity?: number } | undefined)?.capacity) || 1),
    );
    const booking = await createBooking(body, { capacity });
    // Spend the credit AFTER the booking persists so we never decrement a
    // pack on a booking that failed to write. Best-effort: a stale credit
    // is corrected by the cancellation refund path.
    if (redeemedPack) {
      redeemFromPack(redeemedPack.id, booking.id, String(body.serviceId)).catch(() => {});
    }
    if (booking.email) {
      sendBookingConfirmation(booking).catch((err) => {
        console.error("[bookings] confirmation email failed", {
          bookingId: booking.id,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }
    // Web Push, alongside the email (email stays the fallback). Best-effort:
    // notifyBookingCreated never throws, and a push failure must not break
    // the booking — fire and forget.
    notifyBookingCreated(booking).catch(() => {});
    const manageToken = await signBookingId(booking.id);
    return NextResponse.json({ booking, manageToken, appliedCoupon }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Booking failed";
    return NextResponse.json({ error: msg }, { status: 409 });
  }
}
