'use client';

// Phase I.5e — Stripe Connect onboarding control for the owner dashboard.
// Reads /api/sites/[id]/stripe/connect on mount to show current readiness,
// POSTs to the same route to mint a fresh Account Link and navigates the
// owner there.

import { useEffect, useState, useTransition } from 'react';

type Status = {
  connected: boolean;
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
};

type Labels = {
  heading: string;
  body: string;
  cta: string;
  resumeCta: string;
  busy: string;
  ready: string;
  needsAttention: string;
  notStarted: string;
};

export function SiteConnectButton({ siteId, labels }: { siteId: string; labels: Labels }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    fetch(`/api/sites/${siteId}/stripe/connect`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d: Status) => setStatus(d))
      .catch(() => setError('load_failed'));
  }, [siteId]);

  function start() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/sites/${siteId}/stripe/connect`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!res.ok) { setError('start_failed'); return; }
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    });
  }

  const state = !status ? 'loading'
    : !status.connected ? 'notStarted'
    : status.chargesEnabled && status.payoutsEnabled ? 'ready'
    : 'needsAttention';

  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-[var(--color-fg-0)]">{labels.heading}</h2>
      <p className="mt-1 text-sm text-[var(--color-fg-2)]">{labels.body}</p>

      <div className="mt-5 flex items-center gap-4">
        {state === 'loading' && (
          <span className="text-sm text-[var(--color-fg-2)]">…</span>
        )}
        {state === 'ready' && (
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            ● {labels.ready}
          </span>
        )}
        {state === 'needsAttention' && (
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
            ● {labels.needsAttention}
          </span>
        )}
        {state === 'notStarted' && (
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-bg-3)] px-3 py-1 text-xs font-semibold text-[var(--color-fg-2)]">
            ○ {labels.notStarted}
          </span>
        )}

        {state !== 'loading' && (
          <button
            type="button"
            onClick={start}
            disabled={pending}
            className="rounded-md border border-[var(--color-bg-3)] px-4 py-2 text-sm font-semibold text-[var(--color-fg-1)] hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)] disabled:opacity-60"
          >
            {pending ? labels.busy : (state === 'ready' || state === 'needsAttention' ? labels.resumeCta : labels.cta)}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-3 text-xs text-red-400">Could not start onboarding. Retry, please.</p>
      )}
    </section>
  );
}
