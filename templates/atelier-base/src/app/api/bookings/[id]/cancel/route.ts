import { NextRequest, NextResponse } from "next/server";
import { listBookings, updateStatus } from "../../../../../lib/bookings";
import { verifyBookingToken } from "../../../../../lib/bookingToken";
import { loadBusiness } from "../../../../../lib/settings";
import { wallClockInTzToUtc } from "../../../../../lib/tz";
import { allowAction, clientIp } from "../../../../../lib/rateLimit";
import { notifyBookingCancelled } from "../../../../../lib/notify";
import { refundPackForBooking } from "../../../../../lib/packs";
import { promoteForSlot } from "../../../../../lib/waitlist";

/**
 * Token-authenticated self-service cancel endpoint for booking confirmation
 * email links. No admin session needed — the token in the booking URL is
 * proof that the requester has the email the booking was sent to.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = clientIp(req);
  if (!allowAction(`cancel:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { token?: string };
  const token = body.token ?? "";

  const valid = await verifyBookingToken(id, token);
  if (!valid) {
    return NextResponse.json({ error: "Invalid link." }, { status: 403 });
  }

  const all = await listBookings();
  const booking = all.find((b) => b.id === id);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  if (booking.status === "cancelled") {
    return NextResponse.json({ ok: true, already: true });
  }
  if (booking.status === "completed") {
    return NextResponse.json(
      { error: "Booking already completed, so it cannot be cancelled." },
      { status: 400 }
    );
  }

  // Enforce the cancellation window from business settings (default 4h).
  const business = await loadBusiness();
  const tz = business.timezone || "Europe/Athens";
  const slotTs = wallClockInTzToUtc(booking.date, booking.time, tz);
  const hoursUntil = (slotTs - Date.now()) / 3_600_000;
  const windowH = business.bookingRules?.cancellationWindowHours ?? 4;
  if (hoursUntil <= windowH) {
    return NextResponse.json(
      { error: `Less than ${windowH} hours before the appointment. Please call us instead.` },
      { status: 400 }
    );
  }

  const updated = await updateStatus(id, "cancelled");
  if (updated) {
    // Push the customer + owner, alongside any email. Best-effort: never throws.
    notifyBookingCancelled(updated).catch(() => {});
    // Return the class credit if this booking redeemed a pack — idempotent
    // on bookingId so a double-cancel doesn't refund twice.
    if (updated.usedPackId) {
      refundPackForBooking(updated.id).catch(() => {});
    }
    // Surface the freed slot to anyone on the waitlist for this exact
    // service + date + time. Best-effort.
    promoteForSlot(updated.serviceId, updated.date, updated.time).catch(() => {});
  }
  return NextResponse.json({ ok: true, booking: updated });
}
