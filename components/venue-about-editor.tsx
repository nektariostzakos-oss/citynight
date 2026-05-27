'use client';

import { useState } from 'react';

export type VenueAboutEditorLabels = {
  heading: string;
  body: string;
  placeholder: string;
  save: string;
  saving: string;
  saved: string;
  error: string;
  /** Template string with `{n}` placeholder — e.g. `"{n} chars"`. */
  countTpl: string;
};

export function VenueAboutEditor({
  venueId, endpoint, initial, labels, maxLength = 5000,
}: {
  venueId: string;
  /** Override the save endpoint — e.g. `/api/sites/${siteId}/about` for the SaaS dashboard. */
  endpoint?: string;
  initial: string;
  labels: VenueAboutEditorLabels;
  maxLength?: number;
}) {
  const [text, setText] = useState(initial);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveUrl = endpoint ?? `/api/venues/${venueId}/about`;

  async function onSave() {
    setStatus('saving');
    const res = await fetch(saveUrl, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ aboutText: text }),
    });
    setStatus(res.ok ? 'saved' : 'error');
  }

  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-[var(--color-fg-0)]">
        {labels.heading}
      </h2>
      <p className="mt-1 text-sm text-[var(--color-fg-2)]">{labels.body}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, maxLength))}
        placeholder={labels.placeholder}
        rows={8}
        className="mt-4 block w-full rounded-md border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-3 py-2 text-[var(--color-fg-0)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-[var(--color-fg-3)]">{labels.countTpl.replace('{n}', String(text.length))} / {maxLength}</p>
        <div className="flex items-center gap-3">
          {status === 'saved' && <span className="text-sm text-[var(--color-success)]">{labels.saved}</span>}
          {status === 'error' && <span className="text-sm text-[var(--color-danger)]">{labels.error}</span>}
          <button
            type="button"
            onClick={onSave}
            disabled={status === 'saving'}
            className="rounded-md bg-[var(--color-accent-pink)] px-4 py-2 text-sm font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)] disabled:opacity-60"
          >
            {status === 'saving' ? labels.saving : labels.save}
          </button>
        </div>
      </div>
    </section>
  );
}
