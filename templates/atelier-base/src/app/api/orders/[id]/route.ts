import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "../../../../lib/auth";
import { updateOrderStatus, type OrderStatus } from "../../../../lib/orders";
import { deactivateGiftCardsForOrder } from "../../../../lib/giftCards";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const { status } = await req.json();
  const allowed = ["new", "paid", "shipped", "completed", "cancelled"];
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: "Bad status" }, { status: 400 });
  }
  let o;
  try {
    o = await updateOrderStatus(id, status as OrderStatus);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 409 }
    );
  }
  if (!o) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Cancelling an order that issued gift cards should invalidate those
  // codes — otherwise the refunded buyer can still spend the balance.
  let giftsDeactivated = 0;
  if (status === "cancelled") {
    giftsDeactivated = await deactivateGiftCardsForOrder(id);
  }

  return NextResponse.json({ order: o, giftsDeactivated });
}
