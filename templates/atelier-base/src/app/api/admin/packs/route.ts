import { NextRequest, NextResponse } from "next/server";
import {
  listPacks,
  listCustomerPacks,
  createPack,
  updatePack,
  deletePack,
  grantPack,
  voidCustomerPack,
  type NewPack,
} from "../../../../lib/packs";
import { isStaff } from "../../../../lib/auth";

/**
 * Admin-only API for the class-packs page.
 *
 *   GET                                  → { packs, customerPacks }
 *   POST { action: "createPack", ... }   → create a catalogue entry
 *   POST { action: "updatePack", id, patch } → edit a catalogue entry
 *   POST { action: "grant", packId, customerEmail, customerName? } → issue
 *   POST { action: "voidCustomerPack", id } → void a customer's pack
 *   POST { action: "deletePack", id }   → remove a catalogue entry
 *
 * Mutating actions all gate on isStaff(); reads do too — these are operator
 * tools, not public.
 */

async function gate(): Promise<NextResponse | null> {
  const ok = await isStaff();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

export async function GET() {
  const denied = await gate();
  if (denied) return denied;
  const [packs, customerPacks] = await Promise.all([
    listPacks(),
    listCustomerPacks(),
  ]);
  return NextResponse.json({ packs, customerPacks });
}

export async function POST(req: NextRequest) {
  const denied = await gate();
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    [k: string]: unknown;
  };
  const action = String(body.action || "");

  if (action === "createPack") {
    const name = String(body.name || "").trim();
    const classes = Math.max(1, Math.floor(Number(body.classes) || 0));
    const price = Math.max(0, Number(body.price) || 0);
    if (!name) return NextResponse.json({ error: "Name required." }, { status: 400 });
    if (!classes) return NextResponse.json({ error: "Classes must be ≥ 1." }, { status: 400 });
    const input: NewPack = {
      name,
      classes,
      price,
      validityDays: body.validityDays != null ? Math.max(0, Math.floor(Number(body.validityDays))) : undefined,
      appliesToServiceIds: Array.isArray(body.appliesToServiceIds)
        ? (body.appliesToServiceIds as string[]).map(String).filter(Boolean)
        : undefined,
      appliesToCategories: Array.isArray(body.appliesToCategories)
        ? (body.appliesToCategories as string[]).map(String).filter(Boolean)
        : undefined,
    };
    const pack = await createPack(input);
    return NextResponse.json({ pack }, { status: 201 });
  }

  if (action === "updatePack") {
    const id = String(body.id || "");
    const patch = (body.patch ?? {}) as Record<string, unknown>;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const pack = await updatePack(id, patch as never);
    if (!pack) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ pack });
  }

  if (action === "deletePack") {
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const ok = await deletePack(id);
    return NextResponse.json({ ok });
  }

  if (action === "grant") {
    const packId = String(body.packId || "");
    const customerEmail = String(body.customerEmail || "").trim();
    const customerName = body.customerName ? String(body.customerName) : undefined;
    if (!packId || !customerEmail) {
      return NextResponse.json({ error: "packId and customerEmail required" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    }
    const granted = await grantPack({ packId, customerEmail, customerName });
    if (!granted) return NextResponse.json({ error: "Pack not found" }, { status: 404 });
    return NextResponse.json({ customerPack: granted }, { status: 201 });
  }

  if (action === "voidCustomerPack") {
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const voided = await voidCustomerPack(id);
    if (!voided) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ customerPack: voided });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
