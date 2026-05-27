import { NextResponse } from "next/server";
import { isAdmin } from "../../../lib/auth";
import { listAudit } from "../../../lib/audit";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ entries: await listAudit(500) });
}
