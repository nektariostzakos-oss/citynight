import { getAppRoot } from "@/lib/appRoot";
import { promises as fs } from "fs";
import path from "path";
import { withFileLock } from "./fileLock";

/**
 * Client memberships. A subscription is a prepaid membership a customer buys
 * from the booking flow: they pay once via Stripe Checkout for a fixed term
 * and get a standing discount on every booking until it expires. There is no
 * auto-renew — a membership simply lapses at `expiresAt`.
 */
const FILE = () => path.join(getAppRoot(), "data", "subscriptions.json");
const LOCK = "subscriptions.json";

/** Membership length in months. */
export type MembershipTerm = 1 | 6 | 12;

export type Subscription = {
  id: string;
  /** Lower-cased customer email — the key the booking flow matches on. */
  email: string;
  name: string;
  term: MembershipTerm;
  /** Percent off bookings, frozen from settings at purchase time so a later
   * settings change never alters a membership already sold. */
  discountPercent: number;
  /** Price paid, in the shop currency. */
  pricePaid: number;
  startsAt: string;
  expiresAt: string;
  createdAt: string;
  /** Stripe Checkout Session that paid for this membership. Used to make the
   * payment-confirmation route idempotent (a refreshed success page must not
   * create a second membership). */
  sessionId?: string;
};

async function readAll(): Promise<Subscription[]> {
  try {
    return JSON.parse(await fs.readFile(FILE(), "utf-8")) as Subscription[];
  } catch {
    return [];
  }
}

async function writeAll(items: Subscription[]) {
  await fs.mkdir(path.dirname(FILE()), { recursive: true });
  await fs.writeFile(FILE(), JSON.stringify(items, null, 2), "utf-8");
}

export async function listSubscriptions(): Promise<Subscription[]> {
  return (await readAll()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createSubscription(input: {
  email: string;
  name: string;
  term: MembershipTerm;
  discountPercent: number;
  pricePaid: number;
  sessionId?: string;
}): Promise<Subscription> {
  return withFileLock(LOCK, async () => {
    const all = await readAll();
    // Idempotency: a refreshed Stripe success page must not double-create.
    if (input.sessionId) {
      const dup = all.find((s) => s.sessionId === input.sessionId);
      if (dup) return dup;
    }
    const now = new Date();
    const expires = new Date(now);
    expires.setMonth(expires.getMonth() + input.term);
    const sub: Subscription = {
      id: `sub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      email: input.email.trim().toLowerCase(),
      name: input.name.trim(),
      term: input.term,
      discountPercent: input.discountPercent,
      pricePaid: input.pricePaid,
      startsAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      createdAt: now.toISOString(),
      sessionId: input.sessionId,
    };
    all.push(sub);
    await writeAll(all);
    return sub;
  });
}

/**
 * The customer's active (non-expired) membership, or null. If they hold more
 * than one, the membership expiring latest wins.
 */
export async function activeSubscriptionFor(
  email: string,
): Promise<Subscription | null> {
  const key = (email || "").trim().toLowerCase();
  if (!key) return null;
  const now = Date.now();
  const live = (await readAll())
    .filter((s) => s.email === key && new Date(s.expiresAt).getTime() > now)
    .sort(
      (a, b) =>
        new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime(),
    );
  return live[0] ?? null;
}
