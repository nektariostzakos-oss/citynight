import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "../../../lib/auth";
import { deleteStaff, listAdminStaff, upsertStaff } from "../../../lib/customStaff";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ staff: await listAdminStaff() });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.id || !body.name) return NextResponse.json({ error: "id + name required" }, { status: 400 });
  const item = await upsertStaff({
    id: String(body.id),
    name: String(body.name),
    role: String(body.role || ""),
    bio: String(body.bio || ""),
    photo: String(body.photo || ""),
    specialties: Array.isArray(body.specialties) ? body.specialties : [],
    enabled: body.enabled !== false,
    workDays: Array.isArray(body.workDays) ? body.workDays.map(Number) : [1, 2, 3, 4, 5, 6],
    startTime: String(body.startTime || "10:00"),
    endTime: String(body.endTime || "21:00"),
    breakStart: body.breakStart ? String(body.breakStart) : undefined,
    breakEnd: body.breakEnd ? String(body.breakEnd) : undefined,
    order: Number(body.order) || 0,
  });
  return NextResponse.json({ member: item });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await deleteStaff(id);
  return NextResponse.json({ ok: true });
}
