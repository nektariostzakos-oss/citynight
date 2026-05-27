import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "../../../lib/auth";
import {
  createGiftCard,
  listGiftCards,
  redeemGiftCard,
} from "../../../lib/giftCards";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ cards: await listGiftCards() });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();

  // Action routing — { action: "create" | "redeem" }
  if (body.action === "redeem") {
    const result = await redeemGiftCard(
      String(body.code || ""),
      Number(body.amount) || 0,
      body.note ? String(body.note) : undefined
    );
    if (!result.ok) return NextResponse.json(result, { status: 400 });
    return NextResponse.json(result);
  }

  // Default: create manually (admin issues a comp card, e.g. apology / staff gift)
  const amount = Number(body.amount) || 0;
  if (amount <= 0) return NextResponse.json({ error: "Amount must be > 0" }, { status: 400 });
  const card = await createGiftCard({
    amount,
    buyerName: String(body.buyerName || "Admin-issued"),
    buyerEmail: String(body.buyerEmail || ""),
    recipient: body.recipient ? String(body.recipient) : undefined,
  });
  return NextResponse.json({ card }, { status: 201 });
}
