'use client';

import { useState } from 'react';

export type VenueContactFormLabels = {
  heading: string;
  body: string;
  name: string;
  namePh: string;
  email: string;
  emailPh: string;
  phone: string;
  phonePh: string;
  partySize: string;
  date: string;
  body2: string;
  body2Ph: string;
  submit: string;
  submitting: string;
  thanks: string;
  /** Pre-resolved (e.g. "{Venue} will get back to you at the email or phone you provided.") —
   *  must be a plain string so the server component can pass it across the
   *  React Server Component boundary. */
  thanksDetail: string;
  error: string;
  contactRequired: string;
};

export function VenueContactForm({
  venueId, venueName, defaultKind = 'reservation', labels,
}: {
  venueId: string;
  venueName: string;
  defaultKind?: 'reservation' | 'contact';
  labels: VenueContactFormLabels;
}) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', partySize: '', desiredAt: '', body: '',
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'thanks' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting'); setErrorMsg(null);

    if (!form.email && !form.phone) {
      setStatus('error'); setErrorMsg(labels.contactRequired);
      return;
    }

    const res = await fetch(`/api/venues/${venueId}/contact`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        kind: defaultKind,
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        partySize: form.partySize ? Number(form.partySize) : null,
        desiredAt: form.desiredAt || null,
        body: form.body || null,
      }),
    });
    if (res.ok) { setStatus('thanks'); return; }
    setStatus('error');
    setErrorMsg(await res.text().catch(() => labels.error));
  }

  if (status === 'thanks') {
    return (
      <section className="venue-panel p-6">
        <h2 className="venue-h2 text-[var(--color-fg-0)]" style={{ fontSize: '1.5rem' }}>{labels.thanks}</h2>
        <p className="venue-body mt-3">{labels.thanksDetail}</p>
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} className="venue-panel p-6">
      <header>
        <h2 className="venue-h2 text-[var(--color-fg-0)]" style={{ fontSize: '1.5rem' }}>{labels.heading}</h2>
        <p className="mt-1 text-sm text-[var(--color-fg-2)]">{labels.body}</p>
      </header>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label={labels.name} required value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder={labels.namePh} />
        <Field label={labels.email} type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder={labels.emailPh} />
        <Field label={labels.phone} type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder={labels.phonePh} />
        <Field label={labels.partySize} type="number" inputProps={{ min: 1, max: 200 }} value={form.partySize} onChange={(v) => setForm({ ...form, partySize: v })} />
        <Field label={labels.date} type="datetime-local" value={form.desiredAt} onChange={(v) => setForm({ ...form, desiredAt: v })} className="sm:col-span-2" />
        <label className="block sm:col-span-2">
          <span className="text-xs uppercase tracking-widest text-[var(--color-fg-2)]">{labels.body2}</span>
          <textarea
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder={labels.body2Ph}
            rows={3}
            className="mt-2 block w-full rounded-md border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-3 py-2 text-[var(--color-fg-0)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
          />
        </label>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        {status === 'error' && <p className="text-sm text-[var(--color-danger)]">{errorMsg ?? labels.error}</p>}
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="venue-cta ml-auto disabled:opacity-60"
        >
          {status === 'submitting' ? labels.submitting : labels.submit}
        </button>
      </div>
    </form>
  );
}

function Field({
  label, value, onChange, type = 'text', placeholder, required, className, inputProps,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean; className?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="text-xs uppercase tracking-widest text-[var(--color-fg-2)]">{label}{required && ' *'}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        {...inputProps}
        className="mt-2 block w-full rounded-md border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-3 py-2 text-[var(--color-fg-0)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
      />
    </label>
  );
}
