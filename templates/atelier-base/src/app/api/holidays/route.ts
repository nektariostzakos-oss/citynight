import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "../../../lib/auth";
import { addHoliday, deleteHoliday, listHolidays } from "../../../lib/holidays";

export async function GET() {
  return NextResponse.json({ holidays: await listHolidays() });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.date) return NextResponse.json({ error: "date required" }, { status: 400 });
  const h = await addHoliday({
    date: String(body.date),
    label: String(body.label || "Closed"),
    recurring: !!body.recurring,
  });
  return NextResponse.json({ holiday: h }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await deleteHoliday(id);
  return NextResponse.json({ ok: true });
}
