"use client";

import { useEffect, useMemo, useState } from "react";

type Series = {
  date: string;
  bookings: number;
  revenue: number;
  orders: number;
  orderRevenue: number;
  views: number;
  unique: number;
};

type Analytics = {
  days: number;
  series: Series[];
  kpis: {
    totalBookings: number;
    completedBookings: number;
    pendingBookings: number;
    cancelledBookings: number;
    bookingRevenue: number;
    orderCount: number;
    orderRevenue: number;
    totalViews: number;
    uniqueVisitors: number;
    conversion: number;
    avgTicket: number;
    productCount: number;
    lowStock: number;
  };
  breakdowns: {
    topServices: { id: string; name: string; count: number; revenue: number }[];
    topBarbers: { id: string; name: string; count: number; revenue: number }[];
    topProducts: { id: string; name: string; qty: number; revenue: number }[];
    topPages: { path: string; count: number }[];
    topReferrers: { source: string; count: number }[];
    langBreakdown: { lang: string; count: number }[];
    hourHistogram: number[];
    dowHistogram: number[];
  };
};

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const RANGES: { days: number; label: string }[] = [
  { days: 7, label: "7d" },
  { days: 30, label: "30d" },
  { days: 90, label: "90d" },
  { days: 365, label: "12m" },
];

export default function AnalyticsPanel() {
  const [data, setData] = useState<Analytics | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  async function load(n: number) {
    setLoading(true);
    const r = await fetch(`/api/analytics?days=${n}`);
    if (r.ok) {
      const d = await r.json();
      setData(d);
    }
    setLoading(false);
  }
  useEffect(() => {
    load(days);
  }, [days]);

  if (loading || !data) {
    return <p className="text-white/60">Loading analytics…</p>;
  }

  const { kpis, series, breakdowns } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl">Analytics</h2>
        <div className="flex gap-1 rounded-full border border-white/15 bg-white/[0.04] p-1">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={`rounded-full px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest transition-colors ${
                days === r.days
                  ? "bg-[#c9a961] text-black"
                  : "text-white/70 hover:bg-white/10"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Bookings" value={kpis.totalBookings.toString()} sub={`${kpis.completedBookings} completed · ${kpis.pendingBookings} pending`} />
        <Kpi label="Booking revenue" value={`$${kpis.bookingRevenue.toFixed(0)}`} sub={`Avg ticket $${kpis.avgTicket.toFixed(1)}`} />
        <Kpi label="Orders" value={kpis.orderCount.toString()} sub={`$${kpis.orderRevenue.toFixed(0)} revenue`} />
        <Kpi label="Pageviews" value={kpis.totalViews.toString()} sub={`${kpis.uniqueVisitors} unique · ${kpis.conversion.toFixed(2)}% → book`} />
      </div>

      <TrendCard title="Views vs bookings" series={series} keys={["views", "bookings"]} labels={["Views", "Bookings"]} />
      <TrendCard title="Revenue (booking + orders)" series={series} keys={["revenue", "orderRevenue"]} labels={["Bookings", "Orders"]} money />

      <div className="grid gap-5 lg:grid-cols-2">
        <BarCard title="Top services" rows={breakdowns.topServices.map((s) => ({ label: s.name, value: s.count, hint: `$${s.revenue}` }))} />
        <BarCard title="Top products" rows={breakdowns.topProducts.map((p) => ({ label: p.name, value: p.qty, hint: `$${p.revenue.toFixed(0)}` }))} />
        <BarCard title="Top pages" rows={breakdowns.topPages.map((p) => ({ label: p.path || "/", value: p.count }))} />
        <BarCard title="Top referrers" rows={breakdowns.topReferrers.map((r) => ({ label: r.source, value: r.count }))} />
        <BarCard title="Barbers" rows={breakdowns.topBarbers.map((b) => ({ label: b.name, value: b.count, hint: `$${b.revenue}` }))} />
        <BarCard
          title="Peak days"
          rows={breakdowns.dowHistogram.map((v, i) => ({ label: DOW[i], value: v })).sort((a, b) => b.value - a.value)}
        />
      </div>

      <HourlyChart hours={breakdowns.hourHistogram} />

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Low stock" value={kpis.lowStock.toString()} sub={`of ${kpis.productCount} products`} />
        <Kpi label="Cancelled" value={kpis.cancelledBookings.toString()} sub="bookings (all-time)" />
        <Kpi label="Languages" value={breakdowns.langBreakdown.length.toString()} sub={breakdowns.langBreakdown.slice(0, 3).map((l) => `${l.lang}:${l.count}`).join(" · ")} />
      </div>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs uppercase tracking-widest text-white/60">{label}</p>
      <p className="mt-2 font-serif text-3xl text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-white/60">{sub}</p>}
    </div>
  );
}

function TrendCard({
  title,
  series,
  keys,
  labels,
  money,
}: {
  title: string;
  series: Series[];
  keys: (keyof Series)[];
  labels: string[];
  money?: boolean;
}) {
  const max = useMemo(() => {
    let m = 1;
    for (const r of series) for (const k of keys) m = Math.max(m, Number(r[k]));
    return m;
  }, [series, keys]);

  const colors = ["#c9a961", "#6aa0ff"];
  const W = 100;
  const H = 32;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-white/70">{title}</h3>
        <div className="flex gap-3 text-[10px] uppercase tracking-widest">
          {labels.map((l, i) => (
            <span key={l} className="flex items-center gap-1.5 text-white/60">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: colors[i] }} />
              {l}
            </span>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full" preserveAspectRatio="none">
        <line x1="0" x2={W} y1={H} y2={H} stroke="rgba(255,255,255,.08)" strokeWidth="0.2" />
        {keys.map((k, i) => {
          const pts = series
            .map((r, idx) => {
              const x = (idx / Math.max(1, series.length - 1)) * W;
              const y = H - (Number(r[k]) / max) * (H - 2);
              return `${x.toFixed(2)},${y.toFixed(2)}`;
            })
            .join(" ");
          return (
            <polyline
              key={String(k)}
              fill="none"
              stroke={colors[i]}
              strokeWidth="0.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={pts}
            />
          );
        })}
      </svg>
      <div className="mt-2 flex justify-between text-[10px] text-white/60">
        <span>{series[0]?.date}</span>
        <span>
          Max: {money ? `$${max.toFixed(0)}` : max}
        </span>
        <span>{series.at(-1)?.date}</span>
      </div>
    </div>
  );
}

function BarCard({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: number; hint?: string }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-white/70">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-white/60">No data yet.</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.slice(0, 8).map((r, i) => (
            <li key={i} className="text-sm">
              <div className="mb-1 flex justify-between gap-3">
                <span className="truncate text-white/85">{r.label}</span>
                <span className="shrink-0 text-white/60">
                  {r.value}
                  {r.hint && <span className="ml-2 text-white/60">{r.hint}</span>}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full bg-[#c9a961]"
                  style={{ width: `${(r.value / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function HourlyChart({ hours }: { hours: number[] }) {
  const max = Math.max(1, ...hours);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-white/70">
        Bookings by hour
      </h3>
      <div className="flex h-28 items-end gap-1">
        {hours.map((v, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end">
            <div
              className="w-full rounded-t bg-[#c9a961]"
              style={{ height: `${(v / max) * 100}%` }}
              title={`${i}:00: ${v}`}
            />
            {i % 3 === 0 && (
              <span className="mt-1 text-[9px] text-white/60">{i}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
