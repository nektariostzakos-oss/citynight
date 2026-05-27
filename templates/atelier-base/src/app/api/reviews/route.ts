import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "../../../lib/auth";
import {
  createReview,
  deleteReview,
  hasReviewForOrderProduct,
  listReviews,
  updateReview,
} from "../../../lib/reviews";
import { allowAction, clientIp } from "../../../lib/rateLimit";
import { verifyProductReviewToken } from "../../../lib/productReviewToken";
import { getOrder } from "../../../lib/orders";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") as "pending" | "approved" | "rejected" | null;
  if (status === "approved") {
    return NextResponse.json({ reviews: await listReviews("approved") });
  }
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ reviews: await listReviews(status ?? undefined) });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const staff = await isAdmin();

  // ---- Product review: token-gated path ------------------------------------
  // When the body carries a productReviewToken we treat the submission as a
  // post-purchase review. The token alone proves the submitter received the
  // "rate your purchase" email; we additionally re-look up the order to:
  //   (a) confirm the product was actually in it (defence-in-depth — a leaked
  //       secret would otherwise let a token cover any product), and
  //   (b) reject duplicate submissions on the same (orderId, productId).
  // Status is always "pending" on this branch; the admin moderates.
  if (typeof body.productReviewToken === "string" && body.productReviewToken) {
    if (!body.name || !body.body || !body.rating) {
      return NextResponse.json(
        { error: "name, rating, body required" },
        { status: 400 },
      );
    }
    const ip = clientIp(req);
    if (!allowAction(`review:product:${ip}`, 5, 60 * 60_000)) {
      return NextResponse.json({ error: "Too many submissions." }, { status: 429 });
    }
    const payload = await verifyProductReviewToken(body.productReviewToken);
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired link." }, { status: 401 });
    }
    const order = await getOrder(payload.orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    const lineMatch = order.items.some((it) => it.id === payload.productId);
    if (!lineMatch) {
      // Token referenced a product that's not in the order — refuse to write,
      // since accepting the review would let any leaked token plant a review
      // on any product.
      return NextResponse.json({ error: "Product not in order." }, { status: 403 });
    }
    const already = await hasReviewForOrderProduct(payload.orderId, payload.productId);
    if (already) {
      return NextResponse.json(
        { error: "A review for this product on this order already exists." },
        { status: 409 },
      );
    }
    const r = await createReview({
      name: String(body.name).slice(0, 80),
      rating: Math.max(1, Math.min(5, Number(body.rating) || 5)),
      title: String(body.title || "").slice(0, 120),
      body: String(body.body).slice(0, 2000),
      source: "order",
      orderId: payload.orderId,
      productId: payload.productId,
      status: "pending",
    });
    return NextResponse.json({ review: r }, { status: 201 });
  }

  // ---- Existing path: booking / manual reviews -----------------------------
  if (!staff) {
    const ip = clientIp(req);
    if (!allowAction(`review:${ip}`, 3, 60 * 60_000)) {
      return NextResponse.json({ error: "Too many submissions." }, { status: 429 });
    }
  }
  if (!body.name || !body.body || !body.rating) {
    return NextResponse.json({ error: "name, rating, body required" }, { status: 400 });
  }
  const r = await createReview({
    name: String(body.name).slice(0, 80),
    rating: Math.max(1, Math.min(5, Number(body.rating) || 5)),
    title: String(body.title || "").slice(0, 120),
    body: String(body.body).slice(0, 2000),
    source: staff ? "manual" : "booking",
    bookingId: body.bookingId,
    status: staff ? "approved" : "pending",
  });
  return NextResponse.json({ review: r }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, ...patch } = await req.json();
  const r = await updateReview(id, patch);
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ review: r });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await deleteReview(id);
  return NextResponse.json({ ok: true });
}
