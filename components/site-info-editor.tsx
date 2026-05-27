'use client';

import { useState } from 'react';

export type SiteInfoLabels = {
  heading: string;
  body: string;
  name: string;
  wordmark: string;
  wordmarkHint: string;
  tagline: string;
  taglineHint: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  save: string;
  saving: string;
  saved: string;
  error: string;
};

export type SiteInfoInitial = {
  name: string;
  wordmark: string;
  tagline: string;
  city: string;
  address: string;
  phone: string;
  contactEmail: string;
};

export function SiteInfoEditor({
  siteId, initial, labels,
}: { siteId: string; initial: SiteInfoInitial; labels: SiteInfoLabels }) {
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSave() {
    setStatus('saving'); setErrorMsg(null);
    const res = await fetch(`/api/sites/${siteId}/info`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        wordmark: form.wordmark,
        tagline: form.tagline,
        city: form.city,
        address: form.address,
        phone: form.phone,
        contactEmail: form.contactEmail,
      }),
    });
    if (res.ok) setStatus('saved');
    else { setStatus('error'); setErrorMsg(await res.text().catch(() => labels.error)); }
  }

  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-[var(--color-fg-0)]">{labels.heading}</h2>
      <p className="mt-1 text-sm text-[var(--color-fg-2)]">{labels.body}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label={labels.name}     value={form.name}     onChange={(v) => setForm({ ...form, name: v })} className="sm:col-span-2" />
        <Field label={labels.wordmark} hint={labels.wordmarkHint} value={form.wordmark} onChange={(v) => setForm({ ...form, wordmark: v })} maxLength={40} />
        <Field label={labels.tagline}  hint={labels.taglineHint}  value={form.tagline}  onChange={(v) => setForm({ ...form, tagline: v })} maxLength={80} />
        <Field label={labels.city}     value={form.city}     onChange={(v) => setForm({ ...form, city: v })} />
        <Field label={labels.phone}    value={form.phone}    onChange={(v) => setForm({ ...form, phone: v })} type="tel" />
        <Field label={labels.email}    value={form.contactEmail} onChange={(v) => setForm({ ...form, contactEmail: v })} type="email" className="sm:col-span-2" />
        <Field label={labels.address}  value={form.address}  onChange={(v) => setForm({ ...form, address: v })} className="sm:col-span-2" />
      </div>
      <div className="mt-4 flex items-center justify-end gap-3">
        {status === 'saved' && <span className="text-sm text-[var(--color-success)]">{labels.saved}</span>}
        {status === 'error' && <span className="text-sm text-[var(--color-danger)]">{errorMsg ?? labels.error}</span>}
        <button
          type="button"
          onClick={onSave}
          disabled={status === 'saving' || !form.name.trim()}
          className="rounded-md bg-[var(--color-accent-pink)] px-4 py-2 text-sm font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)] disabled:opacity-60"
        >
          {status === 'saving' ? labels.saving : labels.save}
        </button>
      </div>
    </section>
  );
}

function Field({
  label, hint, value, onChange, type = 'text', className, maxLength,
}: {
  label: string; hint?: string; value: string; onChange: (v: string) => void;
  type?: string; className?: string; maxLength?: number;
}) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="text-xs uppercase tracking-widest text-[var(--color-fg-2)]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        className="mt-2 block w-full rounded-md border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-3 py-2 text-[var(--color-fg-0)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
      />
      {hint && <span className="mt-1 block text-xs text-[var(--color-fg-3)]">{hint}</span>}
    </label>
  );
}
