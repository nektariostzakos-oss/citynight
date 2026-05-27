'use client';

import { useState } from 'react';

export type ClaimPackageLabels = {
  freeName: string; freePrice: string; freePeriod: string;
  freeDesc: string; freePoints: string[]; freeCta: string;
  monthlyName: string; monthlyPrice: string; monthlyPeriod: string;
  monthlyDesc: string; monthlyPoints: string[]; monthlyCta: string;
  zipName: string; zipPrice: string; zipPeriod: string;
  zipDesc: string; zipPoints: string[]; zipCta: string;
  busy: string; error: string;
};

type Plan = 'free' | 'monthly' | 'zip';

export function ClaimPackagePicker({
  siteId, locale, labels,
}: { siteId: string; locale: string; labels: ClaimPackageLabels }) {
  const [busyPlan, setBusyPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(plan: Plan) {
    setBusyPlan(plan); setError(null);

    // Step 1: claim the site (no-op if already owned by this user).
    const claim = await fetch(`/api/sites/${siteId}/claim`, { method: 'POST' });
    if (!claim.ok) {
      setError(await claim.text().catch(() => labels.error));
      setBusyPlan(null);
      return;
    }

    // Step 2: route depending on plan.
    if (plan === 'free') {
      window.location.href = `/${locale}/dashboard/sites/${siteId}?welcome=1`;
      return;
    }
    // Paid plan → Stripe Checkout. On success Stripe redirects back to the
    // dashboard with ?paid=monthly / ?paid=zip.
    const co = await fetch(`/api/sites/${siteId}/checkout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ plan, locale }),
    });
    if (!co.ok) {
      setError(await co.text().catch(() => labels.error));
      setBusyPlan(null);
      return;
    }
    const data = (await co.json()) as { url?: string };
    if (data.url) {
      window.location.href = data.url;
      return;
    }
    setError(labels.error);
    setBusyPlan(null);
  }

  return (
    <div>
      <div className="grid gap-6 md:grid-cols-3">
        <Card
          highlighted
          name={labels.freeName} price={labels.freePrice} period={labels.freePeriod}
          desc={labels.freeDesc} points={labels.freePoints}
          ctaLabel={busyPlan === 'free' ? labels.busy : labels.freeCta}
          onClick={() => pick('free')}
          busy={busyPlan === 'free'}
          disabled={busyPlan !== null}
        />
        <Card
          name={labels.monthlyName} price={labels.monthlyPrice} period={labels.monthlyPeriod}
          desc={labels.monthlyDesc} points={labels.monthlyPoints}
          ctaLabel={busyPlan === 'monthly' ? labels.busy : labels.monthlyCta}
          onClick={() => pick('monthly')}
          busy={busyPlan === 'monthly'}
          disabled={busyPlan !== null}
        />
        <Card
          name={labels.zipName} price={labels.zipPrice} period={labels.zipPeriod}
          desc={labels.zipDesc} points={labels.zipPoints}
          ctaLabel={busyPlan === 'zip' ? labels.busy : labels.zipCta}
          onClick={() => pick('zip')}
          busy={busyPlan === 'zip'}
          disabled={busyPlan !== null}
        />
      </div>
      {error && (
        <p className="mt-6 rounded-md border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-4 py-3 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}

function Card({
  highlighted, name, price, period, desc, points, ctaLabel, onClick, busy, disabled,
}: {
  highlighted?: boolean;
  name: string; price: string; period: string; desc: string;
  points: readonly string[];
  ctaLabel: string; onClick: () => void; busy: boolean; disabled: boolean;
}) {
  return (
    <article
      className={`flex flex-col rounded-2xl p-6 ${
        highlighted
          ? 'border border-[var(--color-accent-pink)]/40 bg-gradient-to-b from-[color-mix(in_oklab,var(--color-accent-pink)_6%,var(--color-bg-1))] to-[var(--color-bg-1)] shadow-[var(--shadow-glow-pink)]'
          : 'border border-[var(--color-bg-2)] bg-[var(--color-bg-1)]'
      }`}
    >
      <header>
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-fg-2)]">{name}</p>
        <p className="mt-2 font-display text-4xl font-semibold tracking-tight text-[var(--color-fg-0)]">
          {price}
          <span className="ml-1 text-base font-normal text-[var(--color-fg-2)]">{period}</span>
        </p>
        <p className="mt-2 text-sm text-[var(--color-fg-1)]">{desc}</p>
      </header>
      <ul className="mt-5 flex-1 space-y-2 text-sm text-[var(--color-fg-1)]">
        {points.map((p) => (
          <li key={p} className="flex gap-2">
            <span aria-hidden className="mt-0.5 text-[var(--color-accent-pink)]">✓</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`mt-6 inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold disabled:opacity-60 ${
          highlighted
            ? 'bg-[var(--color-accent-pink)] text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)]'
            : 'border border-[var(--color-bg-3)] text-[var(--color-fg-1)] hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)]'
        }`}
      >
        {busy && (
          <span aria-hidden className="h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent" />
        )}
        {ctaLabel}
      </button>
    </article>
  );
}
