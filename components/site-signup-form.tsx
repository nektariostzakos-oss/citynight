'use client';

import { useState } from 'react';

export type SiteSignupLabels = {
  heading: string;
  sub: string;
  nameLabel: string;
  namePlaceholder: string;
  verticalLabel: string;
  cityLabel: string;
  cityPlaceholder: string;
  submit: string;
  submitting: string;
  error: string;
  freeNotice: string;
};

export function SiteSignupForm({
  locale,
  labels,
  verticals,
}: {
  locale: string;
  labels: SiteSignupLabels;
  verticals: Record<string, string>;
}) {
  const [name, setName] = useState('');
  const [vertical, setVertical] = useState('restaurant');
  const [city, setCity] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting'); setErrorMsg(null);
    const res = await fetch('/api/sites', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, vertical, city: city || null }),
    });
    if (!res.ok) {
      setStatus('error');
      setErrorMsg(await res.text().catch(() => labels.error));
      return;
    }
    const data = (await res.json()) as { siteId?: string };
    if (data.siteId) {
      window.location.href = `/${locale}/dashboard/sites/${data.siteId}?welcome=1`;
      return;
    }
    setStatus('error');
    setErrorMsg(labels.error);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <label className="block">
        <span className="text-xs uppercase tracking-widest text-[var(--color-fg-2)]">{labels.nameLabel}</span>
        <input
          required
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={labels.namePlaceholder}
          maxLength={120}
          className="mt-2 block w-full rounded-md border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-3 py-2 text-[var(--color-fg-0)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
        />
      </label>

      <fieldset>
        <legend className="text-xs uppercase tracking-widest text-[var(--color-fg-2)]">{labels.verticalLabel}</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Object.entries(verticals).map(([id, label]) => (
            <label
              key={id}
              className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                vertical === id
                  ? 'border-[var(--color-accent-pink)] bg-[color-mix(in_oklab,var(--color-accent-pink)_10%,transparent)] text-[var(--color-fg-0)]'
                  : 'border-[var(--color-bg-3)] bg-[var(--color-bg-1)] text-[var(--color-fg-1)] hover:border-[var(--color-bg-3)]'
              }`}
            >
              <input
                type="radio"
                name="vertical"
                value={id}
                checked={vertical === id}
                onChange={() => setVertical(id)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="text-xs uppercase tracking-widest text-[var(--color-fg-2)]">{labels.cityLabel}</span>
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={labels.cityPlaceholder}
          maxLength={80}
          className="mt-2 block w-full rounded-md border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-3 py-2 text-[var(--color-fg-0)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
        />
      </label>

      <p className="rounded-md border border-[var(--color-success)]/40 bg-[var(--color-success)]/10 px-4 py-3 text-sm text-[var(--color-fg-1)]">
        {labels.freeNotice}
      </p>

      <div className="flex items-center justify-between gap-3">
        {status === 'error' && <p className="text-sm text-[var(--color-danger)]">{errorMsg ?? labels.error}</p>}
        <button
          type="submit"
          disabled={status === 'submitting' || !name.trim()}
          className="ml-auto inline-flex items-center gap-2 rounded-md bg-[var(--color-accent-pink)] px-5 py-2.5 text-sm font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)] disabled:opacity-60"
        >
          {status === 'submitting' ? labels.submitting : labels.submit}
        </button>
      </div>
    </form>
  );
}

