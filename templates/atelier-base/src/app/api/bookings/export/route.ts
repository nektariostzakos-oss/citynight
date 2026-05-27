import { NextResponse } from "next/server";
import { currentUser } from "../../../../lib/auth";
import { listBookings } from "../../../../lib/bookings";
import { toCsv } from "../../../../lib/csv";

/**
 * Booking CSV export. Admin-only by default; a barber-role caller still gets
 * the download but scoped to their own bookings (same rule as /admin).
 */
export async function GET() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const all = await listBookings();
  const scope =
    me.role === "admin"
      ? all
      : all.filter((b) => b.barberId === me.barberId || b.barberId === "any");

  const rows = scope.map((b) => ({
    id: b.id,
    date: b.date,
    time: b.time,
    duration_min: b.duration,
    service: b.serviceName,
    stylist: b.barberName,
    client: b.name,
    phone: b.phone,
    email: b.email || "",
    price_gbp: b.price,
    status: b.status,
    walk_in: b.walkIn ? "yes" : "no",
    created_at: b.createdAt,
    notes: (b.notes || "").replace(/[\r\n]+/g, " "),
  }));

  const csv = toCsv(rows, [
    "id", "date", "time", "duration_min", "service", "stylist",
    "client", "phone", "email", "price_gbp", "status", "walk_in",
    "created_at", "notes",
  ]);
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="bookings-${stamp}.csv"`,
    },
  });
}
