import { getAppRoot } from "@/lib/appRoot";
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { deleteBooking, updateStatus, type Booking } from "../../../../lib/bookings";
import { currentUser, isAdmin } from "../../../../lib/auth";
import { log as auditLog } from "../../../../lib/audit";
import { notifyBookingCancelled } from "../../../../lib/notify";
import { refundPackForBooking } from "../../../../lib/packs";
import { promoteForSlot } from "../../../../lib/waitlist";

async function readBooking(id: string): Promise<Booking | null> {
  try {
    const raw = await fs.readFile(
      path.join(getAppRoot(), "data", "bookings.json"),
      "utf-8"
    );
    const all = JSON.parse(raw) as Booking[];
    return all.find((b) => b.id === id) ?? null;
  } catch {
    return null;
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await currentUser();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await readBooking(id);
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Barbers can only touch their own bookings.
  if (me.role !== "admin" && existing.barberId !== me.barberId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { status } = await req.json();
  const allowed = ["pending", "confirmed", "completed", "cancelled"];
  if (!allowed.includes(status))
    return NextResponse.json({ error: "Bad status" }, { status: 400 });
  let updated;
  try {
    updated = await updateStatus(id, status);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 409 }
    );
  }
  if (!updated)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  // A staff-side cancellation pushes the customer + owner devices, alongside
  // any email. Best-effort: never throws into the response.
  if (status === "cancelled") {
    notifyBookingCancelled(updated).catch(() => {});
    // Return any redeemed class-pack credit (idempotent on bookingId) and
    // signal the waitlist that a seat just opened.
    if (updated.usedPackId) refundPackForBooking(updated.id).catch(() => {});
    promoteForSlot(updated.serviceId, updated.date, updated.time).catch(() => {});
  }
  await auditLog({ userId: me.id, userEmail: me.email, action: `booking.${status}`, target: id });
  return NextResponse.json({ booking: updated });
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await currentUser();
  if (!me || me.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  // Snapshot before delete so we can refund the pack credit + promote the
  // waitlist; once the booking is gone these signals are unreachable.
  const before = await readBooking(id);
  const ok = await deleteBooking(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (before) {
    if (before.usedPackId) refundPackForBooking(before.id).catch(() => {});
    promoteForSlot(before.serviceId, before.date, before.time).catch(() => {});
  }
  await auditLog({ userId: me.id, userEmail: me.email, action: "booking.delete", target: id });
  return NextResponse.json({ ok: true });
}
