'use client';

import { useState } from 'react';

export type VenueDomainEditorLabels = {
  heading: string;
  body: string;
  inputLabel: string;
  placeholder: string;
  save: string;
  saving: string;
  saved: string;
  remove: string;
  error: string;
  active: string;
  inactive: string;
  setupHeading: string;
  /** Use the literal placeholder `{domain}` — replaced client-side with the
   *  saved value. Plain string so the server component can pass this label
   *  bundle across the RSC boundary without serialising a function. */
  setupLine1Tpl: string;
  setupLine2: string;
  setupLine3: string;
};

export function VenueDomainEditor({
  venueId, endpoint, initial, labels,
}: {
  venueId: string;
  /** Override save endpoint for the SaaS dashboard. */
  endpoint?: string;
  initial: string;
  labels: VenueDomainEditorLabels;
}) {
  const saveUrl = endpoint ?? `/api/venues/${venueId}/domain`;
  const [domain, setDomain] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function persist(value: string | null) {
    setStatus('saving'); setErrorMsg(null);
    const res = await fetch(saveUrl, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ domain: value }),
    });
    if (res.ok) {
      const data = (await res.json()) as { domain: string | null };
      setSaved(data.domain ?? '');
      setDomain(data.domain ?? '');
      setStatus('ok');
      return;
    }
    setStatus('error');
    setErrorMsg(await res.text().catch(() => labels.error));
  }

  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-[var(--color-fg-0)]">{labels.heading}</h2>
      <p className="mt-1 text-sm text-[var(--color-fg-2)]">{labels.body}</p>

      <div className="mt-3 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em]">
        {saved ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-success)]/60 px-2.5 py-1 text-[var(--color-success)]">
            <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
            {labels.active}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-bg-3)] px-2.5 py-1 text-[var(--color-fg-3)]">
            <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-fg-3)]" />
            {labels.inactive}
          </span>
        )}
      </div>

      <label className="mt-5 block">
        <span className="text-xs uppercase tracking-widest text-[var(--color-fg-2)]">{labels.inputLabel}</span>
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder={labels.placeholder}
          className="mt-2 block w-full rounded-md border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-3 py-2 text-[var(--color-fg-0)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
        />
      </label>

      <div className="mt-4 flex items-center justify-end gap-3">
        {status === 'ok' && <span className="text-sm text-[var(--color-success)]">{labels.saved}</span>}
        {status === 'error' && <span className="text-sm text-[var(--color-danger)]">{errorMsg ?? labels.error}</span>}
        {saved && (
          <button
            type="button"
            onClick={() => persist(null)}
            disabled={status === 'saving'}
            className="rounded-md border border-[var(--color-bg-3)] px-4 py-2 text-sm font-semibold text-[var(--color-fg-1)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] disabled:opacity-60"
          >
            {labels.remove}
          </button>
        )}
        <button
          type="button"
          onClick={() => persist(domain || null)}
          disabled={status === 'saving' || domain === saved}
          className="rounded-md bg-[var(--color-accent-pink)] px-4 py-2 text-sm font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)] disabled:opacity-60"
        >
          {status === 'saving' ? labels.saving : labels.save}
        </button>
      </div>

      {saved && (
        <details className="mt-6 rounded-lg border border-[var(--color-bg-2)] bg-[var(--color-bg-1)] p-4 text-sm text-[var(--color-fg-1)]">
          <summary className="cursor-pointer font-display text-base font-semibold text-[var(--color-fg-0)]">
            {labels.setupHeading}
          </summary>
          <ol className="mt-3 space-y-2 pl-5 text-sm leading-relaxed">
            <li>{labels.setupLine1Tpl.replace('{domain}', saved)}</li>
            <li>{labels.setupLine2}</li>
            <li>{labels.setupLine3}</li>
          </ol>
        </details>
      )}
    </section>
  );
}
