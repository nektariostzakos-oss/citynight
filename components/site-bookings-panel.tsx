'use client';

// Phase I.5e — owner dashboard bookings table.
//
// Lists bookings for a site sorted by upcoming-first. Status transitions
// flow through PATCH /api/sites/[id]/bookings/[bookingId] which the lib
// guards (terminal statuses can't downgrade).

import { useEffect, useState, useTransition } from 'react';

type Booking = {
  id: string;
  date: string;
  time: string;
  durationMinutes: number;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  priceCents: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'completed' | 'no_show' | 'cancelled';
  serviceId: string;
  staffId: string;
};

type Labels = {
  heading: string;
  body: string;
  empty: string;
  loadError: string;
  columnWhen: string;
  columnCustomer: string;
  columnStatus: string;
  columnActions: string;
  markCompleted: string;
  markNoShow: string;
  cancel: string;
  showCancelled: string;
};

const STATUS_NEXT: Record<string, Array<{ to: Booking['status']; key: keyof Labels }>> = {
  pending:   [{ to: 'confirmed', key: 'markCompleted' }, { to: 'cancelled', key: 'cancel' }],
  confirmed: [{ to: 'completed', key: 'markCompleted' }, { to: 'no_show', key: 'markNoShow' }, { to: 'cancelled', key: 'cancel' }],
  completed: [],
  no_show:   [],
  cancelled: [],
};

export function SiteBookingsPanel({ siteId, labels }: { siteId: string; labels: Labels }) {
  const [rows, setRows] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const [pending, startTransition] = useTransition();

  function load() {
    const url = new URL(`/api/sites/${siteId}/bookings`, window.location.origin);
    if (!showCancelled) url.searchParams.set('excludeCancelled', '1');
    fetch(url.toString(), { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d: { bookings: Booking[] }) => { setRows(d.bookings); setError(null); })
      .catch(() => setError('load'));
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [showCancelled, siteId]);

  function patch(id: string, to: Booking['status']) {
    startTransition(async () => {
      const res = await fetch(`/api/sites/${siteId}/bookings/${id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: to }),
      });
      if (!res.ok) { setError('patch'); return; }
      load();
    });
  }

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-xl font-semibold text-[var(--color-fg-0)]">{labels.heading}</h2>
        <label className="flex items-center gap-2 text-xs text-[var(--color-fg-2)]">
          <input
            type="checkbox"
            checked={showCancelled}
            onChange={(e) => setShowCancelled(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-accent-cyan)]"
          />
          {labels.showCancelled}
        </label>
      </div>
      <p className="mt-1 text-sm text-[var(--color-fg-2)]">{labels.body}</p>

      <div className="mt-5">
        {rows === null && !error && (
          <p className="text-sm text-[var(--color-fg-2)]">…</p>
        )}
        {error && (
          <p className="text-sm text-red-400">{labels.loadError}</p>
        )}
        {rows && rows.length === 0 && (
          <p className="text-sm text-[var(--color-fg-2)]">{labels.empty}</p>
        )}
        {rows && rows.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-[var(--color-bg-2)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--color-bg-1)] text-[var(--color-fg-2)]">
                <tr>
                  <th className="px-4 py-3 font-medium">{labels.columnWhen}</th>
                  <th className="px-4 py-3 font-medium">{labels.columnCustomer}</th>
                  <th className="px-4 py-3 font-medium">{labels.columnStatus}</th>
                  <th className="px-4 py-3 font-medium text-right">{labels.columnActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-bg-2)]">
                {rows.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-3 text-[var(--color-fg-0)]">
                      <div>{b.date}</div>
                      <div className="text-xs text-[var(--color-fg-2)]">{b.time} · {b.durationMinutes} min</div>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-fg-1)]">
                      <div>{b.customerName}</div>
                      <div className="text-xs text-[var(--color-fg-2)]">
                        {b.customerEmail ?? b.customerPhone ?? ''}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={b.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {STATUS_NEXT[b.status]?.map((opt) => (
                          <button
                            key={opt.to}
                            type="button"
                            disabled={pending}
                            onClick={() => patch(b.id, opt.to)}
                            className="rounded border border-[var(--color-bg-3)] px-2 py-1 text-xs text-[var(--color-fg-1)] hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)] disabled:opacity-60"
                          >
                            {labels[opt.key] as string}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

const STATUS_STYLES: Record<Booking['status'], string> = {
  pending:   'border-amber-500/40 bg-amber-500/10 text-amber-400',
  confirmed: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
  completed: 'border-[var(--color-bg-3)] bg-[var(--color-bg-1)] text-[var(--color-fg-2)]',
  no_show:   'border-red-500/40 bg-red-500/10 text-red-400',
  cancelled: 'border-[var(--color-bg-3)] bg-[var(--color-bg-1)] text-[var(--color-fg-3)]',
};

function StatusPill({ status }: { status: Booking['status'] }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
