import { NextResponse } from "next/server";
import { loadMembership } from "@/lib/settings";

export const runtime = "nodejs";

/**
 * Public membership configuration, read by the booking flow to render the
 * "become a member" offer. Prices and the discount only; no secrets.
 */
export async function GET() {
  const m = await loadMembership();
  return NextResponse.json({
    enabled: !!m.enabled,
    discountPercent: Number(m.discountPercent) || 0,
    price1m: Number(m.price1m) || 0,
    price6m: Number(m.price6m) || 0,
    price12m: Number(m.price12m) || 0,
  });
}
