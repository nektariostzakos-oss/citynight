import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "../../../lib/auth";
import { deleteClient, importClients, listClients, upsertClient } from "../../../lib/clients";
import { fromCsv } from "../../../lib/csv";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const clients = await listClients();
  return NextResponse.json({ clients });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("text/csv") || ct.includes("text/plain")) {
    const text = await req.text();
    const rows = fromCsv(text);
    const summary = await importClients(rows);
    return NextResponse.json({ ok: true, ...summary });
  }
  const body = await req.json();
  if (Array.isArray(body.rows)) {
    const summary = await importClients(body.rows);
    return NextResponse.json({ ok: true, ...summary });
  }
  if (!body.name || (!body.email && !body.phone)) {
    return NextResponse.json(
      { error: "Name + (email or phone) required." },
      { status: 400 }
    );
  }
  const c = await upsertClient(body);
  return NextResponse.json({ client: c }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const ok = await deleteClient(id);
  return NextResponse.json({ ok });
}
