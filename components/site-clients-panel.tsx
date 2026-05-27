'use client';

// Phase I.7 — owner dashboard clients panel.
// Searchable table with rollups (bookings count, total spent, last visit).

import { useEffect, useState, useTransition } from 'react';
import { formatAthensDate } from '@/lib/format-date';

type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tags: string[];
  notes: string | null;
  totalBookings: number;
  totalSpentCents: number;
  lastBookedAt: number | null;
};

type Labels = {
  heading: string;
  body: string;
  empty: string;
  loadError: string;
  searchPlaceholder: string;
  columnName: string;
  columnContact: string;
  columnBookings: string;
  columnSpent: string;
  columnLast: string;
};

export function SiteClientsPanel({ siteId, labels }: { siteId: string; labels: Labels }) {
  const [rows, setRows] = useState<Client[] | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function load(q: string) {
    const url = new URL(`/api/sites/${siteId}/clients`, window.location.origin);
    if (q) url.searchParams.set('search', q);
    fetch(url.toString(), { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d: { clients: Client[] }) => { setRows(d.clients); setError(null); })
      .catch(() => setError('load'));
  }
  useEffect(() => { load(''); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [siteId]);

  function onSearch(q: string) {
    setSearch(q);
    startTransition(() => load(q));
  }

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-xl font-semibold text-[var(--color-fg-0)]">{labels.heading}</h2>
        <input
          type="search"
          placeholder={labels.searchPlaceholder}
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-56 rounded border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] p-2 text-xs text-[var(--color-fg-0)]"
        />
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
                  <th className="px-4 py-3 font-medium">{labels.columnName}</th>
                  <th className="px-4 py-3 font-medium">{labels.columnContact}</th>
                  <th className="px-4 py-3 font-medium text-right">{labels.columnBookings}</th>
                  <th className="px-4 py-3 font-medium text-right">{labels.columnSpent}</th>
                  <th className="px-4 py-3 font-medium">{labels.columnLast}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-bg-2)]">
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 text-[var(--color-fg-0)]">
                      <div>{c.name}</div>
                      {c.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {c.tags.map((t) => (
                            <span key={t} className="inline-flex items-center rounded-full border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--color-fg-2)]">{t}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-fg-1)]">
                      <div>{c.email ?? '—'}</div>
                      <div className="text-xs text-[var(--color-fg-2)]">{c.phone ?? ''}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-fg-1)]">{c.totalBookings}</td>
                    <td className="px-4 py-3 text-right text-[var(--color-fg-1)]">{(c.totalSpentCents / 100).toFixed(2)} €</td>
                    <td className="px-4 py-3 text-[var(--color-fg-2)]">
                      {c.lastBookedAt ? formatAthensDate(c.lastBookedAt) : '—'}
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
