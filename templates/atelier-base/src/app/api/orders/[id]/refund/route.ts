import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { listOrders, markOrderRefunded } from "@/lib/orders";
import { refundPayment, retrieveCheckoutSession } from "@/lib/stripe";

/**
 * POST /api/orders/:id/refund
 *
 * Admin-only. Issues a real Stripe refund for the order's payment, then
 * flags the order refunded. The order must carry a Stripe reference:
 * `paymentIntentId` (wallet / express checkout) or `stripeSessionId`
 * (hosted Checkout) — a manually-marked order has nothing to refund.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const order = (await listOrders()).find((o) => o.id === id);
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  if (order.status === "refunded") {
    return NextResponse.json({ error: "Order is already refunded." }, { status: 409 });
  }
  if (order.status === "cancelled") {
    return NextResponse.json({ error: "Cancelled orders cannot be refunded." }, { status: 409 });
  }

  // Resolve the payment intent: stored directly, or via the Checkout session.
  let paymentIntentId = order.paymentIntentId ?? "";
  if (!paymentIntentId && order.stripeSessionId) {
    const session = await retrieveCheckoutSession(order.stripeSessionId);
    paymentIntentId = session?.paymentIntent ?? "";
  }
  if (!paymentIntentId) {
    return NextResponse.json(
      { error: "This order has no linked Stripe payment to refund." },
      { status: 400 },
    );
  }

  const refund = await refundPayment(paymentIntentId);
  if (!refund.ok) {
    return NextResponse.json({ error: refund.error }, { status: 502 });
  }

  const updated = await markOrderRefunded(id);
  return NextResponse.json({ order: updated, refundId: refund.refundId });
}
