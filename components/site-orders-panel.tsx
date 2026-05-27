'use client';

// Phase I.6d — owner dashboard orders table.
//
// Lists shop orders, sorted by newest first. Status transitions flow
// through PATCH /api/sites/[id]/orders/[orderId] which is state-machine
// guarded (terminal statuses can't downgrade).

import { useEffect, useState, useTransition } from 'react';

type Order = {
  id: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  totalCents: number;
  currency: string;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  createdAt: number;
};

type Labels = {
  heading: string;
  body: string;
  empty: string;
  loadError: string;
  columnWhen: string;
  columnCustomer: string;
  columnTotal: string;
  columnStatus: string;
  columnActions: string;
  markShipped: string;
  markDelivered: string;
  cancel: string;
  refund: string;
  showCancelled: string;
};

const STATUS_NEXT: Record<Order['status'], Array<{ to: Order['status']; key: keyof Labels }>> = {
  pending:   [{ to: 'cancelled', key: 'cancel' }],
  paid:      [{ to: 'shipped', key: 'markShipped' }, { to: 'refunded', key: 'refund' }],
  shipped:   [{ to: 'delivered', key: 'markDelivered' }, { to: 'refunded', key: 'refund' }],
  delivered: [{ to: 'refunded', key: 'refund' }],
  cancelled: [],
  refunded:  [],
};

const STATUS_STYLES: Record<Order['status'], string> = {
  pending:   'border-amber-500/40 bg-amber-500/10 text-amber-400',
  paid:      'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
  shipped:   'border-cyan-500/40 bg-cyan-500/10 text-cyan-400',
  delivered: 'border-[var(--color-bg-3)] bg-[var(--color-bg-1)] text-[var(--color-fg-2)]',
  cancelled: 'border-[var(--color-bg-3)] bg-[var(--color-bg-1)] text-[var(--color-fg-3)]',
  refunded:  'border-red-500/40 bg-red-500/10 text-red-400',
};

export function SiteOrdersPanel({ siteId, labels }: { siteId: string; labels: Labels }) {
  const [rows, setRows] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [pending, startTransition] = useTransition();

  function load() {
    fetch(`/api/sites/${siteId}/orders`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d: { orders: Order[] }) => {
        const filtered = includeCancelled ? d.orders : d.orders.filter((o) => o.status !== 'cancelled');
        setRows(filtered);
        setError(null);
      })
      .catch(() => setError('load'));
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [includeCancelled, siteId]);

  function patch(id: string, to: Order['status']) {
    startTransition(async () => {
      const res = await fetch(`/api/sites/${siteId}/orders/${id}`, {
        method: 'PATCH', credentials: 'same-origin',
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
          <input type="checkbox" checked={includeCancelled} onChange={(e) => setIncludeCancelled(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent-cyan)]" />
          {labels.showCancelled}
        </label>
      </div>
      <p className="mt-1 text-sm text-[var(--color-fg-2)]">{labels.body}</p>

      <div className="mt-5">
        {rows === null && !error && <p className="text-sm text-[var(--color-fg-2)]">…</p>}
        {error && <p className="text-sm text-red-400">{labels.loadError}</p>}
        {rows && rows.length === 0 && <p className="text-sm text-[var(--color-fg-2)]">{labels.empty}</p>}
        {rows && rows.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-[var(--color-bg-2)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--color-bg-1)] text-[var(--color-fg-2)]">
                <tr>
                  <th className="px-4 py-3 font-medium">{labels.columnWhen}</th>
                  <th className="px-4 py-3 font-medium">{labels.columnCustomer}</th>
                  <th className="px-4 py-3 font-medium">{labels.columnTotal}</th>
                  <th className="px-4 py-3 font-medium">{labels.columnStatus}</th>
                  <th className="px-4 py-3 font-medium text-right">{labels.columnActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-bg-2)]">
                {rows.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-3 text-[var(--color-fg-1)]">{new Date(o.createdAt * 1000).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-[var(--color-fg-1)]">
                      <div>{o.customerName}</div>
                      <div className="text-xs text-[var(--color-fg-2)]">{o.customerEmail ?? o.customerPhone ?? ''}</div>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-fg-0)] font-medium">{(o.totalCents / 100).toFixed(2)} {o.currency}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[o.status]}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {STATUS_NEXT[o.status].map((opt) => (
                          <button key={opt.to} type="button" disabled={pending} onClick={() => patch(o.id, opt.to)} className="rounded border border-[var(--color-bg-3)] px-2 py-1 text-xs text-[var(--color-fg-1)] hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)] disabled:opacity-60">
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
