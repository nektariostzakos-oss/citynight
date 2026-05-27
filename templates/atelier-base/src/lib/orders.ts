import { getAppRoot } from "@/lib/appRoot";
import { promises as fs } from "fs";
import path from "path";
import { withFileLock } from "./fileLock";

const FILE = () => path.join(getAppRoot(), "data", "orders.json");
const LOCK = "orders.json";

export type OrderLine = {
  id: string;
  name: string;
  price: number;
  qty: number;
};

export type OrderStatus =
  | "new" | "paid" | "shipped" | "completed" | "cancelled" | "refunded";

export type Order = {
  id: string;
  items: OrderLine[];
  subtotal: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  postal: string;
  notes?: string;
  lang: "en" | "el";
  status: OrderStatus;
  createdAt: string;
  /** Stripe payment references — set when the order was paid through Stripe.
   *  The refund flow needs one of these to issue a real refund. */
  paymentIntentId?: string;
  stripeSessionId?: string;
  currency?: string;
  /**
   * ISO timestamp set when the post-purchase review-request emails were sent
   * for this order. The scheduler uses this flag for once-only delivery — it
   * never sends a second batch for the same order, even after admin status
   * flips. Unset on new orders.
   */
  reviewRequestedAt?: string;
};

async function readAll(): Promise<Order[]> {
  try {
    const raw = await fs.readFile(FILE(), "utf-8");
    return JSON.parse(raw) as Order[];
  } catch {
    return [];
  }
}

async function writeAll(list: Order[]) {
  await fs.mkdir(path.dirname(FILE()), { recursive: true });
  await fs.writeFile(FILE(), JSON.stringify(list, null, 2), "utf-8");
}

export async function listOrders(): Promise<Order[]> {
  const all = await readAll();
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Look up a single order by id. Returns null when not found. */
export async function getOrder(id: string): Promise<Order | null> {
  const all = await readAll();
  return all.find((o) => o.id === id) ?? null;
}

export async function createOrder(
  input: Omit<Order, "id" | "status" | "createdAt">
): Promise<Order> {
  return withFileLock(LOCK, async () => {
    const all = await readAll();
    const order: Order = {
      ...input,
      id: `o_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      status: "new",
      createdAt: new Date().toISOString(),
    };
    all.push(order);
    await writeAll(all);
    return order;
  });
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<Order | null> {
  return withFileLock(LOCK, async () => {
    const all = await readAll();
    const idx = all.findIndex((o) => o.id === id);
    if (idx === -1) return null;
    const current = all[idx].status;
    // Terminal states: cancelled / completed / refunded. No resurrection.
    const TERMINAL: OrderStatus[] = ["cancelled", "completed", "refunded"];
    if (TERMINAL.includes(current) && status !== current) {
      throw new Error(`Cannot change order from ${current} to ${status}.`);
    }
    all[idx].status = status;
    await writeAll(all);
    return all[idx];
  });
}

/**
 * Store the Stripe payment references on an order after the fact (the
 * Checkout-session flow creates the order before the session exists).
 */
export async function setOrderPaymentRef(
  id: string,
  ref: { paymentIntentId?: string; stripeSessionId?: string; currency?: string },
): Promise<void> {
  await withFileLock(LOCK, async () => {
    const all = await readAll();
    const idx = all.findIndex((o) => o.id === id);
    if (idx === -1) return;
    if (ref.paymentIntentId) all[idx].paymentIntentId = ref.paymentIntentId;
    if (ref.stripeSessionId) all[idx].stripeSessionId = ref.stripeSessionId;
    if (ref.currency) all[idx].currency = ref.currency;
    await writeAll(all);
  });
}

/**
 * Orders due for a "rate your purchase" email.
 *
 * Eligibility:
 *  - status is "paid" / "shipped" / "completed" (the customer has either
 *    paid or received the goods),
 *  - the order is at least `minAgeDays` days old (default 3 — gives shipping
 *    a chance to land),
 *  - `reviewRequestedAt` is unset.
 *
 * The scheduler calls this once per tick; it's a read-only filter, so we
 * keep it free of side effects.
 */
export async function dueForOrderReviewRequest(
  minAgeDays = 3,
): Promise<Order[]> {
  const all = await readAll();
  const cutoff = Date.now() - minAgeDays * 24 * 60 * 60 * 1000;
  return all.filter(
    (o) =>
      !o.reviewRequestedAt &&
      (o.status === "paid" || o.status === "shipped" || o.status === "completed") &&
      new Date(o.createdAt).getTime() <= cutoff,
  );
}

/**
 * Stamp `reviewRequestedAt` so the scheduler doesn't send the email twice.
 * Called after a successful enqueue, NOT after a delivery attempt — the
 * email layer logs failures separately, but we still flip the flag so an
 * outright bad recipient doesn't get retried every 5 minutes forever.
 */
export async function markOrderReviewRequested(id: string): Promise<void> {
  await withFileLock(LOCK, async () => {
    const all = await readAll();
    const idx = all.findIndex((o) => o.id === id);
    if (idx === -1) return;
    all[idx].reviewRequestedAt = new Date().toISOString();
    await writeAll(all);
  });
}

/** Flag an order refunded. The Stripe refund itself is issued by the route. */
export async function markOrderRefunded(id: string): Promise<Order | null> {
  return withFileLock(LOCK, async () => {
    const all = await readAll();
    const idx = all.findIndex((o) => o.id === id);
    if (idx === -1) return null;
    all[idx].status = "refunded";
    await writeAll(all);
    return all[idx];
  });
}
