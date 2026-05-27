import { getAppRoot } from "@/lib/appRoot";
import { promises as fs } from "fs";
import path from "path";
import { withFileLock } from "./fileLock";

/**
 * Class packs — prepaid bundles of class credits the customer buys once and
 * redeems against later bookings. Two files:
 *
 *   data/packs.json           the tenant's pack catalogue (definitions)
 *   data/customer-packs.json  per-customer balances, one row per purchase
 *
 * A pack is "applies to a serviceId or any service in a category". When a
 * customer books, useBalanceFor() finds the first active pack that covers
 * the booked service and decrements its remaining count. Booking pricing
 * goes to zero when redeemed; the booking record gets `usedPackId` set so
 * cancellations can return the credit.
 *
 * Memberships (recurring subscriptions) are handled separately by
 * subscriptions.ts. Packs are one-off purchases that drain.
 */

const PACKS_FILE = () => path.join(getAppRoot(), "data", "packs.json");
const BAL_FILE = () => path.join(getAppRoot(), "data", "customer-packs.json");
const PACKS_LOCK = "packs.json";
const BAL_LOCK = "customer-packs.json";

/** A pack definition in the catalogue. */
export type Pack = {
  id: string;
  name: string;
  /** Total class credits granted on purchase. */
  classes: number;
  /** Price in the tenant's currency, charged once at purchase. */
  price: number;
  /** Validity, in days from purchase. 0 / undefined = never expires. */
  validityDays?: number;
  /**
   * Restrict which services this pack can be redeemed against. Empty means
   * any service. Either a list of service ids, or a list of category names
   * matched against the service's `category` field — whichever the operator
   * finds easier to maintain.
   */
  appliesToServiceIds?: string[];
  appliesToCategories?: string[];
  enabled: boolean;
  createdAt: string;
};

/** One customer's owned pack instance, with remaining balance. */
export type CustomerPack = {
  id: string;
  packId: string;
  /** Snapshot of the pack name at purchase, so a renamed catalogue entry
   *  doesn't rewrite history. */
  packName: string;
  customerEmail: string;
  customerName?: string;
  classesGranted: number;
  classesRemaining: number;
  purchasedAt: string;
  /** ISO timestamp when the pack expires, or null for no expiry. */
  expiresAt: string | null;
  /** Snapshot of the redemption rules at purchase, same fallback logic. */
  appliesToServiceIds?: string[];
  appliesToCategories?: string[];
  /** Audit trail of redemptions: { bookingId, at, serviceId }. */
  redemptions: Array<{ bookingId: string; at: string; serviceId: string }>;
  /** Set when the operator (or a Stripe refund) voided this pack. */
  voidedAt?: string;
};

/* ── catalogue ───────────────────────────────────────────────────────── */

async function readPacks(): Promise<Pack[]> {
  try {
    return JSON.parse(await fs.readFile(PACKS_FILE(), "utf-8")) as Pack[];
  } catch {
    return [];
  }
}

async function writePacks(items: Pack[]): Promise<void> {
  await fs.mkdir(path.dirname(PACKS_FILE()), { recursive: true });
  await fs.writeFile(PACKS_FILE(), JSON.stringify(items, null, 2), "utf-8");
}

export async function listPacks(): Promise<Pack[]> {
  return readPacks();
}

export async function listActivePacks(): Promise<Pack[]> {
  return (await readPacks()).filter((p) => p.enabled);
}

export type NewPack = Omit<Pack, "id" | "createdAt" | "enabled"> & { enabled?: boolean };

export async function createPack(input: NewPack): Promise<Pack> {
  return withFileLock(PACKS_LOCK, async () => {
    const all = await readPacks();
    const pack: Pack = {
      ...input,
      id: `pk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      enabled: input.enabled ?? true,
      createdAt: new Date().toISOString(),
    };
    all.push(pack);
    await writePacks(all);
    return pack;
  });
}

export async function updatePack(
  id: string,
  patch: Partial<Omit<Pack, "id" | "createdAt">>,
): Promise<Pack | null> {
  return withFileLock(PACKS_LOCK, async () => {
    const all = await readPacks();
    const i = all.findIndex((p) => p.id === id);
    if (i < 0) return null;
    all[i] = { ...all[i], ...patch };
    await writePacks(all);
    return all[i];
  });
}

export async function deletePack(id: string): Promise<boolean> {
  return withFileLock(PACKS_LOCK, async () => {
    const all = await readPacks();
    const next = all.filter((p) => p.id !== id);
    if (next.length === all.length) return false;
    await writePacks(next);
    return true;
  });
}

/* ── customer balances ───────────────────────────────────────────────── */

async function readBalances(): Promise<CustomerPack[]> {
  try {
    return JSON.parse(await fs.readFile(BAL_FILE(), "utf-8")) as CustomerPack[];
  } catch {
    return [];
  }
}

async function writeBalances(items: CustomerPack[]): Promise<void> {
  await fs.mkdir(path.dirname(BAL_FILE()), { recursive: true });
  await fs.writeFile(BAL_FILE(), JSON.stringify(items, null, 2), "utf-8");
}

export async function listCustomerPacks(): Promise<CustomerPack[]> {
  return (await readBalances()).sort((a, b) =>
    b.purchasedAt.localeCompare(a.purchasedAt),
  );
}

/** All non-voided, non-expired, non-empty packs for one customer. */
export async function activePacksFor(email: string): Promise<CustomerPack[]> {
  const e = email.trim().toLowerCase();
  if (!e) return [];
  const now = Date.now();
  return (await readBalances()).filter(
    (p) =>
      p.customerEmail.toLowerCase() === e &&
      !p.voidedAt &&
      p.classesRemaining > 0 &&
      (p.expiresAt === null || Date.parse(p.expiresAt) > now),
  );
}

/**
 * Find the best pack to redeem against a booked service, if any. Picks the
 * pack whose redemption rules apply, expiring soonest first. Returns null
 * if nothing applies — the booking falls back to paid.
 */
export async function findRedeemablePack(
  email: string,
  serviceId: string,
  serviceCategory?: string,
): Promise<CustomerPack | null> {
  const candidates = await activePacksFor(email);
  if (candidates.length === 0) return null;
  const eligible = candidates.filter((p) => {
    const idOk =
      !p.appliesToServiceIds ||
      p.appliesToServiceIds.length === 0 ||
      p.appliesToServiceIds.includes(serviceId);
    const catOk =
      !p.appliesToCategories ||
      p.appliesToCategories.length === 0 ||
      (serviceCategory ? p.appliesToCategories.includes(serviceCategory) : false);
    // Treat the two rules as OR'd when both are set so a pack scoped to
    // either an explicit service or its category still applies.
    if (p.appliesToServiceIds?.length && p.appliesToCategories?.length) {
      return idOk || catOk;
    }
    if (p.appliesToServiceIds?.length) return idOk;
    if (p.appliesToCategories?.length) return catOk;
    return true; // unrestricted pack — applies everywhere
  });
  if (eligible.length === 0) return null;
  // Sort by soonest expiry, then by oldest purchase (FIFO), to drain the
  // pack most at risk of expiring first.
  eligible.sort((a, b) => {
    const ax = a.expiresAt ? Date.parse(a.expiresAt) : Number.POSITIVE_INFINITY;
    const bx = b.expiresAt ? Date.parse(b.expiresAt) : Number.POSITIVE_INFINITY;
    if (ax !== bx) return ax - bx;
    return a.purchasedAt.localeCompare(b.purchasedAt);
  });
  return eligible[0];
}

/** Grant a customer a fresh pack (e.g. after a Stripe purchase or a manual issue). */
export async function grantPack(input: {
  packId: string;
  customerEmail: string;
  customerName?: string;
}): Promise<CustomerPack | null> {
  const packs = await readPacks();
  const pack = packs.find((p) => p.id === input.packId);
  if (!pack) return null;
  return withFileLock(BAL_LOCK, async () => {
    const all = await readBalances();
    const expiresAt = pack.validityDays && pack.validityDays > 0
      ? new Date(Date.now() + pack.validityDays * 86_400_000).toISOString()
      : null;
    const row: CustomerPack = {
      id: `cp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      packId: pack.id,
      packName: pack.name,
      customerEmail: input.customerEmail.trim().toLowerCase(),
      customerName: input.customerName,
      classesGranted: pack.classes,
      classesRemaining: pack.classes,
      purchasedAt: new Date().toISOString(),
      expiresAt,
      appliesToServiceIds: pack.appliesToServiceIds,
      appliesToCategories: pack.appliesToCategories,
      redemptions: [],
    };
    all.push(row);
    await writeBalances(all);
    return row;
  });
}

/** Spend one credit from a customer pack; records the audit entry. */
export async function redeemFromPack(
  customerPackId: string,
  bookingId: string,
  serviceId: string,
): Promise<CustomerPack | null> {
  return withFileLock(BAL_LOCK, async () => {
    const all = await readBalances();
    const i = all.findIndex((p) => p.id === customerPackId);
    if (i < 0) return null;
    const p = all[i];
    if (p.classesRemaining <= 0 || p.voidedAt) return null;
    if (p.expiresAt && Date.parse(p.expiresAt) <= Date.now()) return null;
    all[i] = {
      ...p,
      classesRemaining: p.classesRemaining - 1,
      redemptions: [
        ...p.redemptions,
        { bookingId, at: new Date().toISOString(), serviceId },
      ],
    };
    await writeBalances(all);
    return all[i];
  });
}

/** Refund a redeemed credit when a booking is cancelled. Idempotent on bookingId. */
export async function refundPackForBooking(bookingId: string): Promise<CustomerPack | null> {
  return withFileLock(BAL_LOCK, async () => {
    const all = await readBalances();
    const i = all.findIndex((p) =>
      p.redemptions.some((r) => r.bookingId === bookingId),
    );
    if (i < 0) return null;
    const p = all[i];
    const stillThere = p.redemptions.some((r) => r.bookingId === bookingId);
    if (!stillThere) return p;
    all[i] = {
      ...p,
      classesRemaining: p.classesRemaining + 1,
      redemptions: p.redemptions.filter((r) => r.bookingId !== bookingId),
    };
    await writeBalances(all);
    return all[i];
  });
}

/** Void a pack (operator action or refund). Sets voidedAt + zeros remaining. */
export async function voidCustomerPack(id: string): Promise<CustomerPack | null> {
  return withFileLock(BAL_LOCK, async () => {
    const all = await readBalances();
    const i = all.findIndex((p) => p.id === id);
    if (i < 0) return null;
    all[i] = { ...all[i], voidedAt: new Date().toISOString(), classesRemaining: 0 };
    await writeBalances(all);
    return all[i];
  });
}
