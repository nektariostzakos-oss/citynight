import { getAppRoot } from "@/lib/appRoot";
import { promises as fs } from "fs";
import path from "path";
import { wallClockInTzToUtc } from "./tz";
import { loadBusiness } from "./settings";
import { withFileLock } from "./fileLock";

const FILE = () => path.join(getAppRoot(), "data", "bookings.json");
const LOCK = "bookings.json";

export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

export type Booking = {
  id: string;
  serviceId: string;
  serviceName: string;
  price: number;
  duration: number;
  barberId: string;
  barberName: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  email: string;
  notes?: string;
  status: BookingStatus;
  createdAt: string;
  lang?: "en" | "el";
  remindedAt?: string;
  /** Set by the cron when the post-visit review email has been sent. */
  reviewedAt?: string;
  /** True when this booking bypassed the public form (walk-in / in-shop). */
  walkIn?: boolean;
  /** Fixed deposit due for this booking, copied from the service at booking
   * time. 0 / undefined means the service takes no deposit. */
  deposit?: number;
  /** True once the customer has paid the deposit through Stripe Checkout. */
  depositPaid?: boolean;
  /** Percent off applied because the customer held an active membership when
   * they booked (0 / undefined = no membership discount). */
  membershipDiscount?: number;
  /** When this booking redeemed a class pack, the customer-pack id used.
   *  Set so cancellations can return the credit. */
  usedPackId?: string;
};

export type NewBooking = Omit<Booking, "id" | "status" | "createdAt">;

async function readAll(): Promise<Booking[]> {
  try {
    const raw = await fs.readFile(FILE(), "utf-8");
    return JSON.parse(raw) as Booking[];
  } catch {
    return [];
  }
}

async function writeAll(items: Booking[]) {
  await fs.mkdir(path.dirname(FILE()), { recursive: true });
  await fs.writeFile(FILE(), JSON.stringify(items, null, 2), "utf-8");
}

export async function listBookings(): Promise<Booking[]> {
  const all = await readAll();
  return all.sort((a, b) =>
    `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`)
  );
}

export async function getTakenSlots(
  date: string,
  barberId: string
): Promise<string[]> {
  const all = await readAll();
  return all
    .filter(
      (b) =>
        b.date === date &&
        b.status !== "cancelled" &&
        (barberId === "any" ? true : b.barberId === barberId)
    )
    .map((b) => b.time);
}

/**
 * Block out a window based on existing bookings' duration + optional buffer
 * time. Returns an array of slot times (HH:MM) that cannot be booked on
 * the given date for the given staff member because an existing booking
 * is already running during that slot (or its clean-up buffer).
 *
 * `step` is the slot grid granularity in minutes (default 30).
 */
export async function getOccupiedSlots(
  date: string,
  barberId: string,
  getBufferForService: (serviceId: string) => number = () => 0,
  step = 30
): Promise<string[]> {
  const all = await readAll();
  const blocked = new Set<string>();
  for (const b of all) {
    if (b.date !== date) continue;
    if (b.status === "cancelled") continue;
    if (barberId !== "any" && b.barberId !== barberId && b.barberId !== "any") continue;
    const [h, m] = b.time.split(":").map(Number);
    const start = h * 60 + (m || 0);
    const buffer = getBufferForService(b.serviceId);
    const end = start + (b.duration || step) + buffer;
    for (let t = start; t < end; t += step) {
      const hh = Math.floor(t / 60).toString().padStart(2, "0");
      const mm = (t % 60).toString().padStart(2, "0");
      blocked.add(`${hh}:${mm}`);
    }
  }
  return Array.from(blocked);
}

export async function createBooking(
  input: NewBooking,
  options: { capacity?: number } = {},
): Promise<Booking> {
  return withFileLock(LOCK, async () => {
    const all = await readAll();
    // Overlap detection: reject the new booking if any *live* booking with
    // the same stylist (or the "any" pool) has an interval that intersects
    // the incoming one. Previously we only matched identical start times,
    // so a 60-min booking at 10:00 didn't clash with a walk-in at 10:30.
    //
    // Group classes (Service.capacity > 1): the slot can carry up to N
    // concurrent bookings of the *same* service, so we count overlapping
    // live bookings for this serviceId+time and reject only once the slot
    // is full. Bookings for a different service in the same slot still
    // conflict — the room is occupied.
    const capacity = Math.max(1, Math.floor(options.capacity ?? 1));
    const [nh, nm] = String(input.time).split(":").map(Number);
    const newStart = nh * 60 + (nm || 0);
    const newEnd = newStart + (Number(input.duration) || 30);
    let sameSlotSameService = 0;
    let foreignConflict: Booking | null = null;
    for (const b of all) {
      if (b.date !== input.date) continue;
      if (b.status === "cancelled") continue;
      if (b.barberId !== input.barberId && b.barberId !== "any" && input.barberId !== "any") {
        continue;
      }
      const [bh, bm] = b.time.split(":").map(Number);
      const bStart = bh * 60 + (bm || 0);
      const bEnd = bStart + (Number(b.duration) || 30);
      const overlaps = newStart < bEnd && bStart < newEnd;
      if (!overlaps) continue;
      if (capacity > 1 && b.serviceId === input.serviceId && b.time === input.time && b.duration === input.duration) {
        sameSlotSameService++;
      } else {
        foreignConflict = b;
        break;
      }
    }
    if (foreignConflict) {
      throw new Error("That slot overlaps an existing booking. Pick another time.");
    }
    if (capacity > 1 && sameSlotSameService >= capacity) {
      throw new Error("This class is full. Join the waitlist and we'll let you know.");
    }
    if (capacity <= 1 && sameSlotSameService > 0) {
      throw new Error("That slot overlaps an existing booking. Pick another time.");
    }
    const booking: Booking = {
      ...input,
      id: `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };
    all.push(booking);
    await writeAll(all);
    return booking;
  });
}

export async function updateStatus(
  id: string,
  status: BookingStatus
): Promise<Booking | null> {
  return withFileLock(LOCK, async () => {
    const all = await readAll();
    const idx = all.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    // Enforce state machine — terminal states can't be resurrected.
    const current = all[idx].status;
    const TERMINAL: BookingStatus[] = ["cancelled", "completed"];
    if (TERMINAL.includes(current) && status !== current) {
      throw new Error(`Cannot change booking from ${current} to ${status}.`);
    }
    all[idx].status = status;
    await writeAll(all);
    return all[idx];
  });
}

export async function deleteBooking(id: string): Promise<boolean> {
  return withFileLock(LOCK, async () => {
    const all = await readAll();
    const next = all.filter((b) => b.id !== id);
    if (next.length === all.length) return false;
    await writeAll(next);
    return true;
  });
}

/** Mark a booking as reminded (used by the 30-min reminder cron). */
export async function markReminded(id: string): Promise<void> {
  await withFileLock(LOCK, async () => {
    const all = await readAll();
    const idx = all.findIndex((b) => b.id === id);
    if (idx === -1) return;
    all[idx].remindedAt = new Date().toISOString();
    await writeAll(all);
  });
}

/** Flag a booking's deposit as paid (called after Stripe Checkout succeeds). */
export async function markDepositPaid(id: string): Promise<Booking | null> {
  return withFileLock(LOCK, async () => {
    const all = await readAll();
    const idx = all.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    all[idx].depositPaid = true;
    await writeAll(all);
    return all[idx];
  });
}

/** Look up one booking by id (no sorting, no side effects). */
export async function getBooking(id: string): Promise<Booking | null> {
  const all = await readAll();
  return all.find((b) => b.id === id) ?? null;
}

export async function markReviewRequested(id: string): Promise<void> {
  await withFileLock(LOCK, async () => {
    const all = await readAll();
    const idx = all.findIndex((b) => b.id === id);
    if (idx === -1) return;
    all[idx].reviewedAt = new Date().toISOString();
    await writeAll(all);
  });
}

/**
 * Bookings that finished 2–24h ago, are marked completed, have an email,
 * and haven't received a review request yet. Cron picks these up.
 */
export async function dueForReviewRequest(): Promise<Booking[]> {
  const [all, business] = await Promise.all([readAll(), loadBusiness()]);
  const tz = business.timezone || "Europe/Athens";
  const now = Date.now();
  const minAgeMs = 2 * 60 * 60_000;
  const maxAgeMs = 24 * 60 * 60_000;
  return all.filter((b) => {
    if (b.status !== "completed") return false;
    if (b.reviewedAt) return false;
    if (!b.email) return false;
    const slotEnd = wallClockInTzToUtc(b.date, b.time, tz) + (b.duration || 30) * 60_000;
    const age = now - slotEnd;
    return age >= minAgeMs && age <= maxAgeMs;
  });
}

/**
 * Bookings starting roughly 8 hours from now (window 7h55m–8h05m) that
 * haven't been reminded yet and aren't cancelled / completed. The cron
 * fires every 5 min, so this window guarantees we catch each booking once.
 */
export async function dueForReminder(): Promise<Booking[]> {
  const [all, business] = await Promise.all([readAll(), loadBusiness()]);
  const tz = business.timezone || "Europe/Athens";
  const now = Date.now();
  const from = now + (8 * 60 - 5) * 60_000; // 7h55m
  const to = now + (8 * 60 + 5) * 60_000;   // 8h05m
  return all.filter((b) => {
    if (b.status === "cancelled" || b.status === "completed") return false;
    if (b.remindedAt) return false;
    if (!b.email) return false;
    // Booking date + time are wall-clock in the business timezone. Convert
    // to a real UTC instant before comparing to Date.now() — otherwise on a
    // UTC host the reminder fires at the wrong wall-clock time (off by the TZ offset).
    const t = wallClockInTzToUtc(b.date, b.time, tz);
    return Number.isFinite(t) && t >= from && t <= to;
  });
}
