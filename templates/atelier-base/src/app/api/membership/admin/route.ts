import { NextRequest, NextResponse } from "next/server";
import { isStaff } from "@/lib/auth";
import { loadMembership, saveMembership } from "@/lib/settings";
import { listSubscriptions } from "@/lib/subscriptions";

export const runtime = "nodejs";

/** Admin: read the membership config and the list of sold memberships. */
export async function GET() {
  if (!(await isStaff())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    membership: await loadMembership(),
    subscriptions: await listSubscriptions(),
  });
}

/** Admin: save the membership config (discount + prepaid term prices). */
export async function POST(req: NextRequest) {
  if (!(await isStaff())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const num = (v: unknown) => Math.max(0, Number(v) || 0);
  const saved = await saveMembership({
    enabled: !!body.enabled,
    discountPercent: Math.min(100, num(body.discountPercent)),
    price1m: num(body.price1m),
    price6m: num(body.price6m),
    price12m: num(body.price12m),
  });
  return NextResponse.json({ membership: saved });
}
