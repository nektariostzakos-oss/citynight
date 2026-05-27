import Link from "next/link";
import { redirect } from "next/navigation";
import { isStaff } from "@/lib/auth";
import { ownerAnalytics } from "@/lib/ownerAnalytics";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Analytics",
  robots: { index: false, follow: false },
};

/* ── tiny inline SVG charts (no client JS) ───────────────────────────── */

function Sparkline({ data, width = 280, height = 56, label }: { data: number[]; width?: number; height?: number; label?: string }) {
  const clean = data.filter((n) => Number.isFinite(n));
  if (clean.length < 2) return <svg width={width} height={height} aria-hidden="true" />;
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const span = max - min || 1;
  const stepX = width / (clean.length - 1);
  const pad = 3;
  const pts = clean.map((v, i) => {
    const x = i * stepX;
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = `M ${pts.join(" L ")}`;
  const area = `${line} L ${width},${height} L 0,${height} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label={label} preserveAspectRatio="none">
      <path d={area} fill="var(--gold)" fillOpacity="0.12" />
      <path d={line} fill="none" stroke="var(--gold)" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function BarChart({ data, height = 140, label }: { data: { label: string; value: number }[]; height?: number; label?: string }) {
  const clean = data.filter((d) => Number.isFinite(d.value));
  if (clean.length === 0) return <svg width="100%" height={height} aria-hidden="true" />;
  const max = Math.max(...clean.map((d) => d.value), 1);
  const w = 920;
  const slot = w / clean.length;
  const barW = Math.max(2, slot * 0.7);
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} role="img" aria-label={label} preserveAspectRatio="none">
      {clean.map((d, i) => {
        const h = (d.value / max) * (height - 18);
        const x = i * slot + (slot - barW) / 2;
        const y = height - h - 14;
        return (
          <g key={i}>
            <title>{`${d.label}: ${d.value}`}</title>
            <rect x={x} y={y} width={barW} height={Math.max(1, h)} fill="var(--gold)" fillOpacity="0.85" rx="1.5" />
          </g>
        );
      })}
      <line x1="0" y1={height - 14} x2={w} y2={height - 14} stroke="var(--border-strong)" strokeWidth="1" />
    </svg>
  );
}

/* ── tile primitives ─────────────────────────────────────────────────── */

function Tile({ label, value, hint, accent }: { label: string; value: string | number; hint?: string; accent?: "amber" | "emerald" | "red" }) {
  const frame =
    accent === "amber"
      ? "border-amber-400/40 bg-amber-400/[0.06]"
      : accent === "emerald"
        ? "border-emerald-400/40 bg-emerald-400/[0.05]"
        : accent === "red"
          ? "border-red-400/40 bg-red-400/[0.06]"
          : "border-[var(--border)]";
  return (
    <div className={`rounded-2xl border p-5 ${frame}`}>
      <div className="text-xs uppercase tracking-wider text-[var(--muted2)]">{label}</div>
      <div className="mt-2 font-serif text-3xl">{value}</div>
      {hint && <div className="mt-1 text-xs text-[var(--muted2)]">{hint}</div>}
    </div>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-xl">{title}</h2>
        {hint && <span className="text-xs text-[var(--muted2)]">{hint}</span>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/* ── page ────────────────────────────────────────────────────────────── */

export default async function OwnerAnalyticsPage() {
  const ok = await isStaff();
  if (!ok) redirect("/admin/login");

  const a = await ownerAnalytics();
  const trendValues = a.trend.map((p) => p.value);
  const fmt = (n: number) => n.toLocaleString();

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 text-[var(--foreground)]">
      <header className="mb-8">
        <div className="text-xs uppercase tracking-[0.3em] text-[var(--gold)]">Studio</div>
        <h1 className="mt-2 font-serif text-3xl">Analytics</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          A live view of bookings, revenue and clients for this studio. Computed
          from your own data — nothing is sent off-site. Read-only.
        </p>
        <div className="mt-3 flex gap-4 text-xs">
          <Link href="/admin" className="text-[var(--gold)] hover:underline">← Dashboard</Link>
          <Link href="/admin/packs" className="text-[var(--gold)] hover:underline">Class packs →</Link>
        </div>
      </header>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Bookings, 30 days" value={fmt(a.bookings30)} hint={`${fmt(a.bookingsTotal)} all time`} />
        <Tile label="Revenue, 30 days" value={fmt(a.revenue30)} hint={`+${fmt(a.orderRevenue30)} from shop`} />
        <Tile label="Upcoming bookings" value={fmt(a.upcoming)} hint="confirmed or pending, today onwards" />
        <Tile
          label="Cancel rate, 30 days"
          value={`${a.cancelRate30.toFixed(1)}%`}
          hint={`${fmt(a.cancelled30)} of ${fmt(a.bookings30)} cancelled`}
          accent={a.cancelRate30 >= 20 ? "amber" : a.cancelRate30 >= 35 ? "red" : undefined}
        />
        <Tile label="Avg booking value" value={fmt(a.avgBookingValue30)} hint={`${fmt(a.completedBookings30)} completed, 30d`} />
        <Tile label="Clients on file" value={fmt(a.clientCount)} />
        <Tile label="Avg rating" value={a.avgRating > 0 ? a.avgRating.toFixed(1) : "—"} hint={`${fmt(a.reviewCount)} review${a.reviewCount === 1 ? "" : "s"}`} />
        <Tile label="Pack redemptions" value={fmt(a.packRedemptions30)} hint="bookings paid with a class credit, 30d" />
      </div>

      {/* Booking volume trend */}
      <div className="mt-6">
        <Card title="Booking volume" hint="bookings created per week, last 12 weeks">
          {trendValues.some((v) => v > 0) ? (
            <Sparkline data={trendValues} height={80} label="Weekly booking volume" />
          ) : (
            <p className="text-sm text-[var(--muted2)]">Fills in as bookings accrue.</p>
          )}
          <div className="mt-1 flex justify-between text-xs text-[var(--muted2)]">
            <span>{a.trend[0]?.label.replace("Week of ", "")}</span>
            <span>{a.trend[a.trend.length - 1]?.label.replace("Week of ", "")}</span>
          </div>
        </Card>
      </div>

      {/* Status + weekday side by side */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Status breakdown" hint="all-time">
          <ul className="space-y-3">
            {(["confirmed", "pending", "completed", "cancelled"] as const).map((s) => {
              const total = a.byStatus.confirmed + a.byStatus.pending + a.byStatus.completed + a.byStatus.cancelled;
              const n = a.byStatus[s];
              const pct = total > 0 ? Math.round((n / total) * 100) : 0;
              const tone =
                s === "cancelled" ? "bg-red-400" :
                s === "completed" ? "bg-emerald-400" :
                s === "pending" ? "bg-amber-400" : "bg-[var(--gold)]";
              return (
                <li key={s}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="capitalize text-[var(--muted)]">{s}</span>
                    <span className="text-[var(--muted2)]">{fmt(n)} · {pct}%</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-[var(--surface-strong)]">
                    <div className={`h-2 rounded-full ${tone}`} style={{ width: `${Math.max(3, pct)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title="Booking load by weekday" hint="live bookings, last 30 days">
          <BarChart data={a.byWeekday} height={140} label="Weekday booking load" />
          <div className="mt-2 grid grid-cols-7 text-center text-[10px] uppercase tracking-wider text-[var(--muted2)]">
            {a.byWeekday.map((d) => (<span key={d.label}>{d.label}</span>))}
          </div>
        </Card>
      </div>

      {/* Busiest hours */}
      <div className="mt-6">
        <Card title="Busiest hours" hint="live bookings, last 30 days">
          {a.busiestHours.length === 0 ? (
            <p className="text-sm text-[var(--muted2)]">No bookings to show yet.</p>
          ) : (
            <>
              <BarChart data={a.busiestHours.map((h) => ({ label: h.hour, value: h.count }))} height={120} label="Hour of day" />
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] uppercase tracking-wider text-[var(--muted2)]">
                {a.busiestHours.map((h) => (<span key={h.hour}>{h.hour}</span>))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Top services + top clients */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Top services" hint="by lifetime visits">
          {a.topServices.length === 0 ? (
            <p className="text-sm text-[var(--muted2)]">No bookings yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {a.topServices.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0 truncate text-[var(--foreground)]">{s.name}</span>
                  <span className="shrink-0 text-[var(--muted2)]">
                    <span className="font-serif text-base text-[var(--foreground)]">{fmt(s.count)}</span>
                    <span className="ml-2 text-xs">· {fmt(s.revenue)} revenue</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Top clients" hint="by total spend">
          {a.topClients.length === 0 ? (
            <p className="text-sm text-[var(--muted2)]">No clients on file yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {a.topClients.map((c) => (
                <li key={c.email} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{c.name}</span>
                    <span className="block truncate font-mono text-[11px] text-[var(--muted2)]">{c.email}</span>
                  </span>
                  <span className="shrink-0 text-right text-[var(--muted2)]">
                    <span className="block font-serif text-base text-[var(--foreground)]">{fmt(c.spend)}</span>
                    <span className="block text-xs">{fmt(c.visits)} visit{c.visits === 1 ? "" : "s"}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </main>
  );
}
