'use client';

import { useState } from 'react';

export type VenueReservationEditorLabels = {
  heading: string;
  body: string;
  urlLabel: string;
  urlHint: string;
  emailLabel: string;
  emailHint: string;
  phoneLabel: string;
  phoneHint: string;
  notesLabel: string;
  notesHint: string;
  save: string;
  saving: string;
  saved: string;
  error: string;
};

export type ReservationInitial = {
  reservationUrl: string;
  reservationEmail: string;
  reservationPhone: string;
  reservationNotes: string;
};

export function VenueReservationEditor({
  venueId, endpoint, initial, labels,
}: {
  venueId: string;
  /** Override save endpoint for the SaaS dashboard. */
  endpoint?: string;
  initial: ReservationInitial;
  labels: VenueReservationEditorLabels;
}) {
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const saveUrl = endpoint ?? `/api/venues/${venueId}/reservation`;

  async function onSave() {
    setStatus('saving'); setErrorMsg(null);
    const res = await fetch(saveUrl, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        reservationUrl: form.reservationUrl,
        reservationEmail: form.reservationEmail,
        reservationPhone: form.reservationPhone,
        reservationNotes: form.reservationNotes,
      }),
    });
    if (res.ok) { setStatus('saved'); return; }
    setStatus('error');
    setErrorMsg(await res.text().catch(() => labels.error));
  }

  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-[var(--color-fg-0)]">
        {labels.heading}
      </h2>
      <p className="mt-1 text-sm text-[var(--color-fg-2)]">{labels.body}</p>

      <div className="mt-5 grid gap-4">
        <Field
          label={labels.urlLabel}
          hint={labels.urlHint}
          type="url"
          value={form.reservationUrl}
          onChange={(v) => setForm({ ...form, reservationUrl: v })}
        />
        <Field
          label={labels.emailLabel}
          hint={labels.emailHint}
          type="email"
          value={form.reservationEmail}
          onChange={(v) => setForm({ ...form, reservationEmail: v })}
        />
        <Field
          label={labels.phoneLabel}
          hint={labels.phoneHint}
          type="tel"
          value={form.reservationPhone}
          onChange={(v) => setForm({ ...form, reservationPhone: v })}
        />
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-[var(--color-fg-2)]">{labels.notesLabel}</span>
          <textarea
            value={form.reservationNotes}
            onChange={(e) => setForm({ ...form, reservationNotes: e.target.value })}
            placeholder={labels.notesHint}
            rows={3}
            className="mt-2 block w-full rounded-md border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-3 py-2 text-[var(--color-fg-0)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
          />
        </label>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        {status === 'saved' && <span className="text-sm text-[var(--color-success)]">{labels.saved}</span>}
        {status === 'error' && <span className="text-sm text-[var(--color-danger)]">{errorMsg ?? labels.error}</span>}
        <button
          type="button"
          onClick={onSave}
          disabled={status === 'saving'}
          className="rounded-md bg-[var(--color-accent-pink)] px-4 py-2 text-sm font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)] disabled:opacity-60"
        >
          {status === 'saving' ? labels.saving : labels.save}
        </button>
      </div>
    </section>
  );
}

function Field({
  label, hint, value, onChange, type = 'text',
}: {
  label: string; hint?: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-[var(--color-fg-2)]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 block w-full rounded-md border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-3 py-2 text-[var(--color-fg-0)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
      />
      {hint && <span className="mt-1 block text-xs text-[var(--color-fg-3)]">{hint}</span>}
    </label>
  );
}
