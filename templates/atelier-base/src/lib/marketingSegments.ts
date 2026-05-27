import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getAppRoot } from "@/lib/appRoot";
import { withFileLock } from "./fileLock";
import { listClients, type EnrichedClient } from "./clients";
import { listBookings } from "./bookings";
import { listOrders } from "./orders";
import { subscriptionsForClient } from "./push";

/**
 * Salon-client segment builder for the tenant marketing suite.
 *
 * A segment is a saved combination of filters over the salon's own customers,
 * resolved from clients.json + bookings.json + orders.json. Stored per-tenant
 * at <getAppRoot()>/data/marketing-segments.json, file-locked.
 *
 * Filter semantics: every set field is AND-ed. An unset field matches all.
 * Array fields (like serviceEverBooked) are OR-ed within the field.
 *
 * computeSegmentClients(segment) returns matched EnrichedClients tagged with
 * channel reachability so a campaign can decide which channels to use per
 * recipient without re-querying the data files.
 */

const FILE = () =>
  path.join(getAppRoot(), "data", "marketing-segments.json");
const LOCK = "marketing-segments.json";

// ---- Types ----------------------------------------------------------------

export type SegmentFilter = {
  /** Keep clients whose last appointment or order was before this ISO date. */
  lastVisitBefore?: string;
  /** Keep clients whose last appointment or order was after this ISO date. */
  lastVisitAfter?: string;
  /** Minimum lifetime value in the store's currency (bookings + orders). */
  minTotalSpend?: number;
  /**
   * Keep clients who have at least one completed booking for any of these
   * service ids. OR within the array.
   */
  serviceEverBooked?: string[];
  /** Minimum number of cancelled bookings (no-show proxy). */
  minNoShowCount?: number;
  /** True: only clients with at least one upcoming confirmed booking. */
  hasUpcomingBooking?: boolean;
  /** True: only clients with at least one push subscription. */
  optedIntoPush?: boolean;
  /** True: only clients where email is non-empty. */
  hasEmail?: boolean;
  /** True: only clients where phone is non-empty. */
  hasPhone?: boolean;
};

export type MarketingSegment = {
  id: string;
  name: string;
  description: string;
  filter: SegmentFilter;
  createdAt: string;
};

/**
 * Each matched client is tagged with the channels available to reach them.
 * The campaign layer uses this to skip channels the recipient hasn't opted
 * into or hasn't provided contact info for.
 */
export type SegmentClient = EnrichedClient & {
  reach: {
    email: boolean;
    phone: boolean;
    push: boolean;
  };
};

// ---- Helpers ----------------------------------------------------------------

async function readSegments(): Promise<MarketingSegment[]> {
  try {
    const raw = await fs.readFile(FILE(), "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MarketingSegment[]) : [];
  } catch {
    return [];
  }
}

async function writeSegments(items: MarketingSegment[]): Promise<void> {
  await fs.mkdir(path.dirname(FILE()), { recursive: true });
  await fs.writeFile(FILE(), JSON.stringify(items, null, 2) + "\n", "utf-8");
}

// ---- CRUD -------------------------------------------------------------------

export async function listSegments(): Promise<MarketingSegment[]> {
  return readSegments();
}

export async function getSegment(
  id: string,
): Promise<MarketingSegment | null> {
  return (await readSegments()).find((s) => s.id === id) ?? null;
}

export async function createSegment(input: {
  name: string;
  description: string;
  filter: SegmentFilter;
}): Promise<MarketingSegment> {
  return withFileLock(LOCK, async () => {
    const all = await readSegments();
    const seg: MarketingSegment = {
      id: "mseg_" + crypto.randomBytes(6).toString("hex"),
      name: input.name.trim(),
      description: input.description.trim(),
      filter: input.filter,
      createdAt: new Date().toISOString(),
    };
    all.push(seg);
    await writeSegments(all);
    return seg;
  });
}

export async function deleteSegment(id: string): Promise<boolean> {
  return withFileLock(LOCK, async () => {
    const all = await readSegments();
    const next = all.filter((s) => s.id !== id);
    if (next.length === all.length) return false;
    await writeSegments(next);
    return true;
  });
}

// ---- Resolution -------------------------------------------------------------

/**
 * Resolve a segment to its matching clients, each tagged with channel
 * reachability. Reads clients (enriched with booking + order stats),
 * bookings (for upcoming + service history), orders (for spend), and
 * push subscriptions (for push reachability) in parallel.
 */
export async function computeSegmentClients(
  segment: MarketingSegment,
): Promise<SegmentClient[]> {
  const f = segment.filter;
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10); // YYYY-MM-DD

  // Parallel loads.
  const [enriched, allBookings, allOrders] = await Promise.all([
    listClients(),
    listBookings(),
    listOrders(),
  ]);

  // Pre-build a set of services each client has ever had completed.
  // Key: clientEmail|clientPhone (normalized), value: Set of serviceIds.
  function clientKey(email: string, phone: string): string {
    const e = (email || "").trim().toLowerCase();
    const p = (phone || "").replace(/[^\d+]/g, "");
    return e || p;
  }

  const servicesCompletedByKey = new Map<string, Set<string>>();
  const upcomingByKey = new Map<string, boolean>();

  for (const b of allBookings) {
    const k = clientKey(b.email, b.phone);
    if (!k) continue;

    if (b.status === "completed" && b.serviceId) {
      if (!servicesCompletedByKey.has(k)) servicesCompletedByKey.set(k, new Set());
      servicesCompletedByKey.get(k)!.add(b.serviceId);
    }

    // Upcoming: confirmed booking whose date is today or in the future.
    if (b.status === "confirmed" && b.date >= todayIso) {
      upcomingByKey.set(k, true);
    }
  }

  // Spend from orders (non-cancelled). Bookings already captured in lifetimeValue.
  const orderSpendByKey = new Map<string, number>();
  for (const o of allOrders) {
    const k = clientKey(o.email, o.phone);
    if (!k) continue;
    if (o.status !== "cancelled") {
      orderSpendByKey.set(k, (orderSpendByKey.get(k) ?? 0) + o.subtotal);
    }
  }

  const out: SegmentClient[] = [];

  for (const client of enriched) {
    const k = clientKey(client.email, client.phone);

    // --- lastVisitBefore / lastVisitAfter ---
    if (f.lastVisitBefore !== undefined || f.lastVisitAfter !== undefined) {
      if (!client.lastSeen) continue;
      if (f.lastVisitBefore && client.lastSeen >= f.lastVisitBefore) continue;
      if (f.lastVisitAfter && client.lastSeen <= f.lastVisitAfter) continue;
    }

    // --- minTotalSpend ---
    if (
      typeof f.minTotalSpend === "number" &&
      f.minTotalSpend > 0 &&
      client.lifetimeValue < f.minTotalSpend
    ) {
      continue;
    }

    // --- serviceEverBooked ---
    if (f.serviceEverBooked && f.serviceEverBooked.length > 0) {
      const done = servicesCompletedByKey.get(k) ?? new Set<string>();
      const hasAny = f.serviceEverBooked.some((svc) => done.has(svc));
      if (!hasAny) continue;
    }

    // --- minNoShowCount ---
    if (
      typeof f.minNoShowCount === "number" &&
      f.minNoShowCount > 0 &&
      client.noShowCount < f.minNoShowCount
    ) {
      continue;
    }

    // --- hasUpcomingBooking ---
    if (f.hasUpcomingBooking === true && !upcomingByKey.get(k)) continue;

    // --- hasEmail ---
    if (f.hasEmail === true && !client.email) continue;

    // --- hasPhone ---
    if (f.hasPhone === true && !client.phone) continue;

    // --- optedIntoPush ---
    // Resolved per-client; this is the expensive step so we only hit push.ts
    // for clients that passed all other filters. We defer push checks to
    // after the filter loop and collect qualifying clients first.

    out.push(client as SegmentClient);
  }

  // Resolve push reachability for the surviving clients. One read of
  // push-subscriptions.json per qualifying client would be O(n) file reads;
  // instead we call subscriptionsForClient which reads the file once per call
  // (cached in the file read). For small salons this is fine; for larger ones
  // a future optimisation is to load all subscriptions once here.
  const withReach: SegmentClient[] = [];
  for (const client of out) {
    const pushSubs = await subscriptionsForClient(client.email, client.phone);
    const hasPush = pushSubs.length > 0;

    // Apply the optedIntoPush filter now that we know.
    if (f.optedIntoPush === true && !hasPush) continue;

    withReach.push({
      ...client,
      reach: {
        email: !!client.email,
        phone: !!client.phone,
        push: hasPush,
      },
    });
  }

  return withReach;
}
