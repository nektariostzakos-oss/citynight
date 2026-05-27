import { redirect } from "next/navigation";
import { currentUser } from "../../../lib/auth";
import { listBookings } from "../../../lib/bookings";
import { getActiveStaff } from "../../../lib/customStaff";
import { loadBusiness } from "../../../lib/settings";
import { todayIsoInTz } from "../../../lib/tz";
import ScheduleActions from "./ScheduleActions";

export const metadata = {
  title: "Daily schedule · Admin",
  robots: { index: false, follow: false, noarchive: true },
};

export const dynamic = "force-dynamic";

const DAYS_FULL: Record<number, string> = {
  0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday",
  4: "Thursday", 5: "Friday", 6: "Saturday",
};

function addMinutes(hhmm: string, add: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + (m || 0) + add;
  const H = Math.floor(total / 60).toString().padStart(2, "0");
  const M = (total % 60).toString().padStart(2, "0");
  return `${H}:${M}`;
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const me = await currentUser();
  if (!me) redirect("/admin/login");

  const [business, staffList, bookings] = await Promise.all([
    loadBusiness(),
    getActiveStaff(),
    listBookings(),
  ]);
  const tz = business.timezone || "Europe/Athens";
  const { date: dateParam } = await searchParams;
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayIsoInTz(tz);

  // Scope: barbers see only their own schedule.
  const scoped = bookings.filter((b) =>
    b.date === date &&
    b.status !== "cancelled" &&
    (me.role === "admin" || b.barberId === me.barberId || b.barberId === "any")
  );

  // Group by stylist.
  const byStaff = new Map<string, typeof scoped>();
  for (const s of staffList) {
    if (me.role !== "admin" && s.id !== me.barberId) continue;
    byStaff.set(s.id, []);
  }
  for (const b of scoped) {
    const k = b.barberId === "any" ? (me.role !== "admin" ? me.barberId ?? "any" : "any") : b.barberId;
    const list = byStaff.get(k) ?? [];
    list.push(b);
    byStaff.set(k, list);
  }
  for (const list of byStaff.values()) {
    list.sort((a, b) => a.time.localeCompare(b.time));
  }

  const [y, mm, dd] = date.split("-").map(Number);
  const dowName = DAYS_FULL[new Date(Date.UTC(y, (mm || 1) - 1, dd || 1)).getUTCDay()];

  const staffIds = Array.from(byStaff.keys());
  const totalBookings = scoped.length;
  const totalRevenue = scoped.reduce((s, b) => s + (Number(b.price) || 0), 0);

  return (
    <main className="min-h-screen bg-white px-6 py-8 text-black print:py-4">
      <ScheduleActions />

      <header className="mx-auto max-w-5xl border-b-2 border-black pb-3">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-black/60">
              {business.name || "Your Salon"} · {business.city || ""}
            </p>
            <h1 className="mt-1 font-serif text-3xl">
              {dowName} · {date}
            </h1>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{totalBookings} booking{totalBookings === 1 ? "" : "s"}</p>
            <p className="text-black/60">${totalRevenue.toFixed(2)} potential</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-8 py-6 print:space-y-4">
        {staffIds.length === 0 && (
          <p className="text-center text-black/50">No stylists configured.</p>
        )}
        {staffIds.map((sid) => {
          const staffName = staffList.find((s) => s.id === sid)?.name ?? "Unassigned";
          const list = byStaff.get(sid) ?? [];
          return (
            <section key={sid} className="break-inside-avoid">
              <h2 className="border-b border-black/30 pb-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-black/70">
                {staffName} · {list.length}
              </h2>
              {list.length === 0 ? (
                <p className="mt-3 text-sm text-black/40">No bookings.</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-widest text-black/50">
                      <th className="pb-2 pr-2 w-[90px]">Time</th>
                      <th className="pb-2 pr-2 w-[90px]">End</th>
                      <th className="pb-2 pr-2">Service</th>
                      <th className="pb-2 pr-2">Client</th>
                      <th className="pb-2 pr-2 w-[120px]">Phone</th>
                      <th className="pb-2 pr-2 w-[60px] text-right">$</th>
                      <th className="pb-2 pr-2 w-[80px]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((b) => (
                      <tr key={b.id} className="border-t border-black/10">
                        <td className="py-2 pr-2 font-mono font-semibold">{b.time}</td>
                        <td className="py-2 pr-2 font-mono text-black/60">
                          {addMinutes(b.time, Number(b.duration) || 30)}
                        </td>
                        <td className="py-2 pr-2">{b.serviceName}</td>
                        <td className="py-2 pr-2">{b.name}{b.walkIn ? " · walk-in" : ""}</td>
                        <td className="py-2 pr-2 font-mono text-black/70">{b.phone}</td>
                        <td className="py-2 pr-2 text-right">${b.price}</td>
                        <td className="py-2 pr-2 text-[11px] uppercase tracking-widest text-black/60">
                          {b.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <footer className="mx-auto mt-8 max-w-5xl border-t border-black/20 pt-3 text-center text-[10px] text-black/40">
        Printed {new Date().toISOString().slice(0, 10)} · {business.name || "Your Salon"}
      </footer>
    </main>
  );
}
