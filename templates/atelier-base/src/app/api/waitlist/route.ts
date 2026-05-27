import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "../../../lib/auth";
import { addWaitlist, deleteWaitlist, listWaitlist, updateWaitlistStatus } from "../../../lib/waitlist";
import { allowAction, clientIp } from "../../../lib/rateLimit";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ waitlist: await listWaitlist() });
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!allowAction(`waitlist:${ip}`, 5, 60 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }
  const body = await req.json();
  if (!body.name || (!body.email && !body.phone)) {
    return NextResponse.json({ error: "Name + contact required" }, { status: 400 });
  }
  const e = await addWaitlist({
    name: String(body.name).slice(0, 80),
    phone: String(body.phone || "").slice(0, 40),
    email: String(body.email || "").slice(0, 120),
    serviceId: String(body.serviceId || ""),
    serviceName: String(body.serviceName || ""),
    barberId: String(body.barberId || "any"),
    preferredDate: String(body.preferredDate || ""),
    preferredTime: String(body.preferredTime || ""),
    notes: body.notes ? String(body.notes).slice(0, 500) : undefined,
  });
  return NextResponse.json({ entry: e }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, status } = await req.json();
  const e = await updateWaitlistStatus(id, status);
  if (!e) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ entry: e });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await deleteWaitlist(id);
  return NextResponse.json({ ok: true });
}
