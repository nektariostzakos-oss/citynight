import { getAppRoot } from "@/lib/appRoot";
import { promises as fs } from "fs";
import path from "path";

const FILE = () => path.join(getAppRoot(), "data", "reviews.json");

export type Review = {
  id: string;
  name: string;
  rating: number;
  title: string;
  body: string;
  /**
   * Where the review came from:
   *  - booking : customer review after a service appointment (existing flow)
   *  - order   : customer review for a shop product (new — requires token)
   *  - manual  : added by an operator from the admin panel
   *  - import  : seeded from another platform
   */
  source: "booking" | "order" | "manual" | "import";
  bookingId?: string;
  /**
   * Product the review is about. Set for source = "order"; absent for service
   * reviews. Read by /shop/[slug] and the shop ItemList JSON-LD to compute
   * per-product aggregates.
   */
  productId?: string;
  /**
   * Order the review came from, used by the token-gated review form to verify
   * the reviewer actually purchased the product. Never surfaced publicly.
   */
  orderId?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

async function readAll(): Promise<Review[]> {
  try {
    return JSON.parse(await fs.readFile(FILE(), "utf-8")) as Review[];
  } catch {
    return [];
  }
}
async function writeAll(items: Review[]) {
  await fs.mkdir(path.dirname(FILE()), { recursive: true });
  await fs.writeFile(FILE(), JSON.stringify(items, null, 2), "utf-8");
}

export async function listReviews(status?: Review["status"]): Promise<Review[]> {
  const all = await readAll();
  const filtered = status ? all.filter((r) => r.status === status) : all;
  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createReview(input: Omit<Review, "id" | "createdAt" | "status"> & { status?: Review["status"] }): Promise<Review> {
  const all = await readAll();
  const r: Review = {
    ...input,
    status: input.status ?? "pending",
    id: `rv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  all.push(r);
  await writeAll(all);
  return r;
}

export async function updateReview(id: string, patch: Partial<Review>): Promise<Review | null> {
  const all = await readAll();
  const i = all.findIndex((r) => r.id === id);
  if (i < 0) return null;
  all[i] = { ...all[i], ...patch, id: all[i].id };
  await writeAll(all);
  return all[i];
}

export async function deleteReview(id: string): Promise<boolean> {
  const all = await readAll();
  const next = all.filter((r) => r.id !== id);
  if (next.length === all.length) return false;
  await writeAll(next);
  return true;
}

// ---- Per-product helpers ----------------------------------------------------

/**
 * Approved reviews for a single product, newest first. Used by /shop/[slug]
 * to render the customer-facing review block AND by the JSON-LD emitter to
 * decide whether an AggregateRating + Review array should be embedded.
 *
 * "Only when real": the caller must check `length > 0` before emitting any
 * rating signal — schema.org requires a real review count, and fabricating
 * one trips Google's review-snippet policy.
 */
export async function listApprovedProductReviews(
  productId: string,
): Promise<Review[]> {
  const all = await readAll();
  return all
    .filter(
      (r) =>
        r.status === "approved" &&
        r.productId === productId &&
        r.source === "order",
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export type ProductAggregate = {
  count: number;
  /** Mean rating, 0 when count === 0. Rounded to 1dp for display. */
  average: number;
};

/**
 * Aggregate rating for a product, computed from approved order-sourced
 * reviews. Returns `{count: 0, average: 0}` when there are no reviews —
 * callers must check `count > 0` before emitting JSON-LD AggregateRating.
 */
export async function productAggregate(
  productId: string,
): Promise<ProductAggregate> {
  const reviews = await listApprovedProductReviews(productId);
  if (reviews.length === 0) return { count: 0, average: 0 };
  const sum = reviews.reduce((s, r) => s + r.rating, 0);
  return {
    count: reviews.length,
    average: Math.round((sum / reviews.length) * 10) / 10,
  };
}

/**
 * Bulk version of `productAggregate` for callers like the /shop list page
 * that need every product's aggregate in one pass. Returns a `Map` keyed by
 * productId so unknown products simply look up to `undefined`.
 */
export async function allProductAggregates(): Promise<
  Map<string, ProductAggregate>
> {
  const all = await readAll();
  const byProduct = new Map<string, { sum: number; count: number }>();
  for (const r of all) {
    if (r.status !== "approved" || r.source !== "order" || !r.productId) continue;
    const cur = byProduct.get(r.productId) ?? { sum: 0, count: 0 };
    cur.sum += r.rating;
    cur.count += 1;
    byProduct.set(r.productId, cur);
  }
  const out = new Map<string, ProductAggregate>();
  for (const [productId, v] of byProduct) {
    out.set(productId, {
      count: v.count,
      average: Math.round((v.sum / v.count) * 10) / 10,
    });
  }
  return out;
}

/**
 * Has this email already left a review for this product+order? Prevents one
 * customer leaving multiple reviews on the same line item via repeated
 * submissions of the token (the token is not single-use; this dedup is).
 */
export async function hasReviewForOrderProduct(
  orderId: string,
  productId: string,
): Promise<boolean> {
  const all = await readAll();
  return all.some(
    (r) => r.orderId === orderId && r.productId === productId,
  );
}
