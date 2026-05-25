import { db } from '@/db';

// Featured-only analytics for the owner dashboard. One SQL call pulls the
// last 28 days from events_daily; we project a 14-day sparkline per event
// type, this-week vs last-week deltas, and 30-day totals — all in a single
// pass over the result set.
//
// Visual: small bar sparkline (no canvas / SVG library, just divs with
// dynamic height) so it works under reduced-motion + dark/light themes.

type Row = { day: string; type: string; count: number };
type EventType = 'view' | 'directions' | 'phone' | 'link';

const TYPES: readonly EventType[] = ['view', 'directions', 'phone', 'link'] as const;
const TYPE_COLOR: Record<EventType, string> = {
  view:       'var(--color-accent-cyan)',
  directions: 'var(--color-accent-pink)',
  phone:      'var(--color-accent-amber)',
  link:       'var(--color-accent-violet)',
};

function yyyymmdd(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function VenueAnalytics({ venueId }: { venueId: string }) {
  const rows = db.$client.prepare(`
    SELECT day, type, count FROM events_daily
     WHERE venue_id = ?
       AND day >= date('now', '-28 day')
     ORDER BY day ASC
  `).all(venueId) as Row[];

  // Index by (day, type).
  const idx = new Map<string, number>();
  for (const r of rows) idx.set(`${r.day}|${r.type}`, r.count);

  // Build a 14-day spark + totals (30d, this 7d, prev 7d) per type.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const lastNDays = (n: number) =>
    Array.from({ length: n }, (_, i) => {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - (n - 1 - i));
      return yyyymmdd(d);
    });
  const spark14 = lastNDays(14);

  const totals: Record<EventType, { sum30: number; thisWeek: number; prevWeek: number; spark: number[] }> = {
    view:       { sum30: 0, thisWeek: 0, prevWeek: 0, spark: [] },
    directions: { sum30: 0, thisWeek: 0, prevWeek: 0, spark: [] },
    phone:      { sum30: 0, thisWeek: 0, prevWeek: 0, spark: [] },
    link:       { sum30: 0, thisWeek: 0, prevWeek: 0, spark: [] },
  };

  // 30-day totals (entire row set).
  for (const r of rows) {
    if (TYPES.includes(r.type as EventType)) totals[r.type as EventType].sum30 += r.count;
  }
  // This-week (last 7d) + prev-week (8..14d ago).
  const thisWeekDays = lastNDays(7);
  const prevWeekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - (13 - i));
    return yyyymmdd(d);
  });
  for (const t of TYPES) {
    for (const day of thisWeekDays) totals[t].thisWeek += idx.get(`${day}|${t}`) ?? 0;
    for (const day of prevWeekDays) totals[t].prevWeek += idx.get(`${day}|${t}`) ?? 0;
    totals[t].spark = spark14.map((day) => idx.get(`${day}|${t}`) ?? 0);
  }

  return (
    <div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TYPES.map((t) => {
          const d = totals[t];
          const max = Math.max(1, ...d.spark);
          const delta = d.thisWeek - d.prevWeek;
          const deltaPct = d.prevWeek === 0
            ? (d.thisWeek > 0 ? 100 : 0)
            : Math.round(((d.thisWeek - d.prevWeek) / d.prevWeek) * 100);
          const trend = delta === 0 ? '·' : delta > 0 ? '▲' : '▼';
          const trendClass = delta === 0
            ? 'text-[var(--color-fg-3)]'
            : delta > 0
            ? 'text-[var(--color-success)]'
            : 'text-[var(--color-danger)]';

          return (
            <li key={t} className="rounded-lg border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] p-3">
              <div className="flex items-baseline justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-fg-2)]">{t}</p>
                <span className={`text-[10px] font-semibold ${trendClass}`}>
                  {trend} {Math.abs(deltaPct)}%
                </span>
              </div>
              <p className="mt-1 font-display text-2xl font-semibold text-[var(--color-fg-0)]">{d.sum30}</p>
              <p className="text-[10px] text-[var(--color-fg-3)]">30 d</p>

              {/* 14-day sparkline as 14 vertical bars */}
              <div className="mt-2 flex h-8 items-end gap-[1px]" aria-hidden>
                {d.spark.map((v, i) => (
                  <span
                    key={i}
                    style={{
                      height: `${Math.max(2, (v / max) * 100)}%`,
                      background: v > 0 ? TYPE_COLOR[t] : 'var(--color-bg-2)',
                    }}
                    className="block w-full rounded-[1px] opacity-80"
                  />
                ))}
              </div>
              <p className="mt-1 text-[10px] text-[var(--color-fg-3)]">
                14 d · {d.thisWeek} this · {d.prevWeek} prev
              </p>
            </li>
          );
        })}
      </ul>

      {rows.length === 0 && (
        <p className="mt-4 text-sm text-[var(--color-fg-3)]">
          No traffic data yet. The rollup runs nightly — Featured venues start collecting at the next 03:00 Athens-time tick.
        </p>
      )}
    </div>
  );
}
