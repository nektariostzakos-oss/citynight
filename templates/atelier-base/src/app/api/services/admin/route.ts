import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "../../../../lib/auth";
import { deleteService, listAdminServices, upsertService } from "../../../../lib/customServices";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ services: await listAdminServices() });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.id || !body.name) return NextResponse.json({ error: "id + name required" }, { status: 400 });
  const item = await upsertService({
    id: String(body.id),
    tkey: String(body.tkey || `svc.${body.id}`),
    name: String(body.name),
    name_el: body.name_el,
    desc: String(body.desc || ""),
    desc_el: body.desc_el,
    duration: Number(body.duration) || 30,
    price: Number(body.price) || 0,
    bufferMinutes: Number(body.bufferMinutes) || 0,
    deposit: Math.max(0, Number(body.deposit) || 0),
    fromPrice: body.fromPrice === true,
    requiresPatchTest: body.requiresPatchTest === true,
    addOnIds: Array.isArray(body.addOnIds) ? body.addOnIds.map(String) : undefined,
    category: body.category,
    enabled: body.enabled !== false,
    order: Number(body.order) || 0,
  });
  return NextResponse.json({ service: item });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await deleteService(id);
  return NextResponse.json({ ok: true });
}
