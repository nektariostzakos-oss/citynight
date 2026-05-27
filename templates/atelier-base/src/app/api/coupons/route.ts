import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "../../../lib/auth";
import { createCoupon, deleteCoupon, listCoupons, updateCoupon, validateCoupon } from "../../../lib/coupons";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (code) {
    const total = Number(url.searchParams.get("total") || 0);
    const scope = (url.searchParams.get("scope") as "bookings" | "products") || "bookings";
    return NextResponse.json(await validateCoupon(code, total, scope));
  }
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ coupons: await listCoupons() });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.code) return NextResponse.json({ error: "Code required" }, { status: 400 });
  const c = await createCoupon({
    code: String(body.code),
    kind: body.kind === "fixed" ? "fixed" : "percent",
    value: Number(body.value) || 0,
    maxUses: Number(body.maxUses) || 0,
    minTotal: Number(body.minTotal) || 0,
    expiresAt: String(body.expiresAt || ""),
    appliesTo: body.appliesTo || "all",
    active: body.active !== false,
  });
  return NextResponse.json({ coupon: c }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, ...patch } = await req.json();
  const c = await updateCoupon(id, patch);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ coupon: c });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await deleteCoupon(id);
  return NextResponse.json({ ok: true });
}
