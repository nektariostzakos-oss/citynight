import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "../../../lib/auth";
import { listBookings } from "../../../lib/bookings";
import { listOrders } from "../../../lib/orders";
import { listProducts } from "../../../lib/products";
import { listViews } from "../../../lib/views";
import { loadBusiness } from "../../../lib/settings";
import { dateAtOffsetInTz } from "../../../lib/tz";

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function rangeDays(days: number, tz: string): string[] {
  // Walk N days back from *today* in the business timezone, so admin analytics
  // align with the wall-clock day the shop experiences (not UTC day).
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    out.push(dateAtOffsetInTz(-i, tz).iso);
  }
  return out;
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days")) || 30));
  const business = await loadBusiness();
  const tz = business.timezone || "Europe/Athens";
  const window = rangeDays(days, tz);
  const windowSet = new Set(window);

  const [bookings, orders, products, views] = await Promise.all([
    listBookings(),
    listOrders(),
    listProducts(),
    listViews(),
  ]);

  const productMap = new Map(products.map((p) => [p.id, p]));

  const bookingsSeries = Object.fromEntries(window.map((d) => [d, 0]));
  const revenueSeries = Object.fromEntries(window.map((d) => [d, 0]));
  const viewsSeries = Object.fromEntries(window.map((d) => [d, 0]));
  const uniqueSeries = Object.fromEntries(window.map((d) => [d, new Set<string>()]));
  const ordersSeries = Object.fromEntries(window.map((d) => [d, 0]));
  const orderRevenueSeries = Object.fromEntries(window.map((d) => [d, 0]));

  let totalBookings = 0;
  let completedBookings = 0;
  let pendingBookings = 0;
  let cancelledBookings = 0;
  let bookingRevenue = 0;

  const serviceTally = new Map<string, { name: string; count: number; revenue: number }>();
  const barberTally = new Map<string, { name: string; count: number; revenue: number }>();
  const hourTally = new Array(24).fill(0);
  const dowTally = new Array(7).fill(0);

  for (const b of bookings) {
    const d = b.date;
    if (windowSet.has(d)) {
      bookingsSeries[d] += 1;
      if (b.status === "completed") revenueSeries[d] += b.price;
    }
    if (windowSet.has(dayKey(b.createdAt))) {
      // keep outcome counters only over window
    }
    totalBookings += 1;
    if (b.status === "completed") { completedBookings += 1; bookingRevenue += b.price; }
    if (b.status === "pending") pendingBookings += 1;
    if (b.status === "cancelled") cancelledBookings += 1;

    const sKey = b.serviceId;
    const s = serviceTally.get(sKey) ?? { name: b.serviceName, count: 0, revenue: 0 };
    s.count += 1;
    if (b.status === "completed") s.revenue += b.price;
    serviceTally.set(sKey, s);

    const bKey = b.barberId;
    const bb = barberTally.get(bKey) ?? { name: b.barberName, count: 0, revenue: 0 };
    bb.count += 1;
    if (b.status === "completed") bb.revenue += b.price;
    barberTally.set(bKey, bb);

    const h = Number(b.time.slice(0, 2));
    if (!Number.isNaN(h)) hourTally[h] += 1;
    const dow = new Date(`${b.date}T00:00:00`).getDay();
    dowTally[dow] += 1;
  }

  let orderCount = 0;
  let orderRevenue = 0;
  const productTally = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const o of orders) {
    const d = dayKey(o.createdAt);
    if (windowSet.has(d)) {
      ordersSeries[d] += 1;
      if (o.status !== "cancelled") orderRevenueSeries[d] += o.subtotal;
    }
    orderCount += 1;
    if (o.status !== "cancelled") orderRevenue += o.subtotal;
    for (const line of o.items) {
      const meta = productMap.get(line.id);
      const name = meta?.name_en ?? line.name;
      const t = productTally.get(line.id) ?? { name, qty: 0, revenue: 0 };
      t.qty += line.qty;
      t.revenue += line.qty * line.price;
      productTally.set(line.id, t);
    }
  }

  let totalViews = 0;
  const pageTally = new Map<string, number>();
  const refTally = new Map<string, number>();
  const sidPerDay = new Set<string>();
  const langTally = new Map<string, number>();

  for (const v of views) {
    const d = dayKey(v.createdAt);
    if (!windowSet.has(d)) continue;
    totalViews += 1;
    viewsSeries[d] += 1;
    if (v.sid) {
      uniqueSeries[d].add(v.sid);
      sidPerDay.add(`${d}::${v.sid}`);
    }
    pageTally.set(v.path, (pageTally.get(v.path) ?? 0) + 1);
    const ref = refSource(v.ref);
    refTally.set(ref, (refTally.get(ref) ?? 0) + 1);
    if (v.lang) langTally.set(v.lang, (langTally.get(v.lang) ?? 0) + 1);
  }

  const uniqueVisitorsTotal = new Set(
    views
      .filter((v) => windowSet.has(dayKey(v.createdAt)) && v.sid)
      .map((v) => v.sid)
  ).size;

  const series = window.map((d) => ({
    date: d,
    bookings: bookingsSeries[d],
    revenue: revenueSeries[d],
    orders: ordersSeries[d],
    orderRevenue: orderRevenueSeries[d],
    views: viewsSeries[d],
    unique: uniqueSeries[d].size,
  }));

  const topServices = [...serviceTally.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const topBarbers = [...barberTally.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.revenue - a.revenue);

  const topProducts = [...productTally.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  const topPages = [...pageTally.entries()]
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topReferrers = [...refTally.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const langBreakdown = [...langTally.entries()]
    .map(([lang, count]) => ({ lang, count }))
    .sort((a, b) => b.count - a.count);

  const bookingsInWindow = series.reduce((s, r) => s + r.bookings, 0);
  const viewsInWindow = series.reduce((s, r) => s + r.views, 0);
  const conversion = viewsInWindow ? (bookingsInWindow / viewsInWindow) * 100 : 0;

  return NextResponse.json({
    days,
    series,
    kpis: {
      totalBookings,
      completedBookings,
      pendingBookings,
      cancelledBookings,
      bookingRevenue,
      orderCount,
      orderRevenue,
      totalViews,
      uniqueVisitors: uniqueVisitorsTotal,
      conversion,
      avgTicket: completedBookings ? bookingRevenue / completedBookings : 0,
      productCount: products.length,
      lowStock: products.filter((p) => p.stock <= 3).length,
    },
    breakdowns: {
      topServices,
      topBarbers,
      topProducts,
      topPages,
      topReferrers,
      langBreakdown,
      hourHistogram: hourTally,
      dowHistogram: dowTally,
    },
  });
}

function refSource(ref: string): string {
  if (!ref) return "Direct";
  try {
    const u = new URL(ref);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "Direct";
  }
}
