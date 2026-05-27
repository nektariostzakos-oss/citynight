import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getAppRoot } from "./appRoot";

/**
 * Owner-side analytics for a single tenant — what the studio owner sees in
 * their own /admin/analytics dashboard. Computed live from the tenant's
 * data tree (data/{bookings,clients,services,orders,reviews}.json).
 *
 * The fleet-wide version lives in `src/lib/fleetAnalytics.ts` (operator
 * scope, every tenant); this one is per-tenant and runs inside the demo
 * app, so it reads through getAppRoot() and is automatically tenant-aware
 * via the AsyncLocalStorage context server.js sets up.
 */

const DAY = 86_400_000;
const WEEKS = 12;

type BookingRow = {
  id?: string;
  status?: string;
  price?: number;
  duration?: number;
  date?: string;
  time?: string;
  createdAt?: string;
  serviceId?: string;
  serviceName?: string;
  barberId?: string;
  barberName?: string;
  email?: string;
  name?: string;
  usedPackId?: string;
};
type OrderRow = { status?: string; subtotal?: number; createdAt?: string };
type ReviewRow = { rating?: number };

async function readArray<T>(file: string): Promise<T[]> {
  try {
    const v = JSON.parse(await fs.readFile(file, "utf-8"));
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

const dataFile = (name: string) => path.join(getAppRoot(), "data", name);

export type OwnerAnalytics = {
  bookings30: number;
  bookingsTotal: number;
  revenue30: number;
  orderRevenue30: number;
  upcoming: number;
  cancelled30: number;
  cancelRate30: number;
  completedBookings30: number;
  clientCount: number;
  reviewCount: number;
  avgRating: number;
  avgBookingValue30: number;
  packRedemptions30: number;
  byStatus: Record<"pending" | "confirmed" | "completed" | "cancelled", number>;
  trend: { label: string; value: number }[];
  topServices: { id: string; name: string; count: number; revenue: number }[];
  topClients: { email: string; name: string; visits: number; spend: number }[];
  busiestHours: { hour: string; count: number }[];
  /** Per weekday (Mon..Sun) bookings counts, for a load heatmap. */
  byWeekday: { label: string; value: number }[];
};

function startOfDay(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export async function ownerAnalytics(): Promise<OwnerAnalytics> {
  const now = Date.now();
  const cut30 = now - 30 * DAY;
  const todayStart = startOfDay(now);

  const [bookings, orders, clients, reviews] = await Promise.all([
    readArray<BookingRow>(dataFile("bookings.json")),
    readArray<OrderRow>(dataFile("orders.json")),
    readArray<unknown>(dataFile("clients.json")),
    readArray<ReviewRow>(dataFile("reviews.json")),
  ]);

  let bookings30 = 0;
  let revenue30 = 0;
  let cancelled30 = 0;
  let completed30 = 0;
  let upcoming = 0;
  let packRedemptions30 = 0;
  const byStatus = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 } as OwnerAnalytics["byStatus"];
  const weekly = new Array<number>(WEEKS).fill(0);
  const svcCount = new Map<string, { name: string; count: number; revenue: number }>();
  const clientAgg = new Map<string, { name: string; visits: number; spend: number }>();
  const hourCount = new Map<string, number>();
  const weekdayCount = new Array<number>(7).fill(0);

  for (const b of bookings) {
    const created = b.createdAt ? Date.parse(b.createdAt) : NaN;
    const status = (b.status as keyof typeof byStatus) || "pending";
    if (status in byStatus) byStatus[status]++;
    if (Number.isFinite(created) && created >= cut30) {
      bookings30++;
      if (status === "completed") {
        completed30++;
        revenue30 += Number(b.price) || 0;
      }
      if (status === "cancelled") cancelled30++;
      if (b.usedPackId) packRedemptions30++;
      const wk = Math.floor((now - created) / (7 * DAY));
      if (wk >= 0 && wk < WEEKS) weekly[WEEKS - 1 - wk]++;
    }
    if ((status === "confirmed" || status === "pending") && b.date) {
      const d = Date.parse(`${b.date}T00:00:00`);
      if (Number.isFinite(d) && d >= todayStart) upcoming++;
    }
    // Top services (all-time, but heavier weight on 30d via revenue30 split
    // would be overkill; lifetime count + revenue is the clearer view).
    if (b.serviceId) {
      const prev = svcCount.get(b.serviceId) ?? {
        name: b.serviceName || b.serviceId,
        count: 0,
        revenue: 0,
      };
      prev.count++;
      if (status === "completed") prev.revenue += Number(b.price) || 0;
      svcCount.set(b.serviceId, prev);
    }
    // Top clients (by email — same client across visits).
    if (b.email) {
      const key = b.email.trim().toLowerCase();
      if (key) {
        const prev = clientAgg.get(key) ?? {
          name: b.name || key.split("@")[0],
          visits: 0,
          spend: 0,
        };
        prev.visits++;
        if (status === "completed") prev.spend += Number(b.price) || 0;
        clientAgg.set(key, prev);
      }
    }
    // Hour-of-day distribution (live bookings only, last 30 days).
    if (b.time && status !== "cancelled" && Number.isFinite(created) && created >= cut30) {
      const hh = String(b.time).slice(0, 2);
      hourCount.set(hh, (hourCount.get(hh) ?? 0) + 1);
    }
    // Weekday distribution (last 30 days, live).
    if (b.date && status !== "cancelled" && Number.isFinite(created) && created >= cut30) {
      const [y, m, d] = b.date.split("-").map(Number);
      if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
        const wd = new Date(Date.UTC(y, (m || 1) - 1, d || 1)).getUTCDay();
        weekdayCount[wd]++;
      }
    }
  }

  let orderRevenue30 = 0;
  for (const o of orders) {
    const created = o.createdAt ? Date.parse(o.createdAt) : NaN;
    if (Number.isFinite(created) && created >= cut30 && typeof o.subtotal === "number") {
      orderRevenue30 += o.subtotal;
    }
  }

  const ratings = reviews
    .map((r) => r.rating)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  const avgRating = ratings.length
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : 0;

  const avgBookingValue30 = completed30 > 0 ? Math.round((revenue30 / completed30) * 100) / 100 : 0;

  const trend = weekly.map((value, i) => {
    const weekStart = now - (WEEKS - i) * 7 * DAY;
    const label = new Date(weekStart).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
    return { label: `Week of ${label}`, value };
  });

  const topServices = [...svcCount.entries()]
    .map(([id, v]) => ({ id, name: v.name, count: v.count, revenue: Math.round(v.revenue) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topClients = [...clientAgg.entries()]
    .map(([email, v]) => ({ email, name: v.name, visits: v.visits, spend: Math.round(v.spend) }))
    .sort((a, b) => b.spend - a.spend || b.visits - a.visits)
    .slice(0, 5);

  const busiestHours = [...hourCount.entries()]
    .map(([hour, count]) => ({ hour: `${hour}:00`, count }))
    .sort((a, b) => Number(a.hour.split(":")[0]) - Number(b.hour.split(":")[0]));

  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  // Display Mon..Sun, the operator-friendly order.
  const byWeekday = [1, 2, 3, 4, 5, 6, 0].map((i) => ({
    label: DAY_LABELS[i],
    value: weekdayCount[i],
  }));

  const cancelRate30 = bookings30 > 0 ? Math.round((cancelled30 / bookings30) * 1000) / 10 : 0;

  return {
    bookings30,
    bookingsTotal: bookings.length,
    revenue30: Math.round(revenue30),
    orderRevenue30: Math.round(orderRevenue30),
    upcoming,
    cancelled30,
    cancelRate30,
    completedBookings30: completed30,
    clientCount: clients.length,
    reviewCount: ratings.length,
    avgRating,
    avgBookingValue30,
    packRedemptions30,
    byStatus,
    trend,
    topServices,
    topClients,
    busiestHours,
    byWeekday,
  };
}
