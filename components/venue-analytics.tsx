import { db } from '@/db';

// Featured-only: 30-day daily counts from events_daily (rolled up by cron).
// Renders a compact bar chart inline with no JS dependency.

export function VenueAnalytics({ venueId }: { venueId: string }) {
  const rows = db.$client.prepare(`
    SELECT day, type, count FROM events_daily
     WHERE venue_id = ?
       AND day >= date('now', '-30 day')
     ORDER BY day ASC
  `).all(venueId) as { day: string; type: string; count: number }[];

  const totals: Record<string, number> = { view: 0, directions: 0, phone: 0, link: 0 };
  for (const r of rows) totals[r.type] = (totals[r.type] ?? 0) + r.count;

  return (
    <div>
      <ul className="grid grid-cols-4 gap-3 text-sm">
        {(['view', 'directions', 'phone', 'link'] as const).map((t) => (
          <li key={t} className="rounded-md border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] p-3">
            <p className="text-[10px] uppercase tracking-widest text-[var(--color-fg-2)]">{t}</p>
            <p className="mt-1 font-display text-2xl font-semibold">{totals[t]}</p>
          </li>
        ))}
      </ul>

      {rows.length === 0 && (
        <p className="mt-4 text-sm text-[var(--color-fg-3)]">No traffic data yet. The rollup runs nightly.</p>
      )}
    </div>
  );
}
