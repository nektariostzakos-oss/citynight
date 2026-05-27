import { NextResponse } from "next/server";
import { isAdmin } from "../../../../lib/auth";
import { listClients } from "../../../../lib/clients";
import { toCsv } from "../../../../lib/csv";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const clients = await listClients();
  const csv = toCsv(
    clients.map((c) => ({
      name: c.name,
      email: c.email,
      phone: c.phone,
      notes: c.notes ?? "",
      tags: (c.tags ?? []).join("|"),
      bookings: c.bookingCount,
      orders: c.orderCount,
      lifetimeValue: c.lifetimeValue.toFixed(2),
      lastSeen: c.lastSeen ?? "",
      createdAt: c.createdAt,
    })),
    ["name", "email", "phone", "notes", "tags", "bookings", "orders", "lifetimeValue", "lastSeen", "createdAt"]
  );
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="clients-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
