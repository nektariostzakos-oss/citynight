'use client';

import { useState } from 'react';

export function SiteContactForm({
  siteId, siteName, kind = 'reservation',
}: { siteId: string; siteName: string; kind?: 'reservation' | 'contact' }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', partySize: '', desiredAt: '', body: '',
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'thanks' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting'); setErrorMsg(null);
    if (!form.email && !form.phone) {
      setStatus('error'); setErrorMsg('Provide email or phone.');
      return;
    }
    const res = await fetch(`/api/sites/${siteId}/contact`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        kind,
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
    setErrorMsg(await res.text().catch(() => 'Failed.'));
  }

  if (status === 'thanks') {
    return (
      <section className="site-panel-strong p-6">
        <h2 className="site-h3">Thanks — your message is in.</h2>
        <p className="site-body mt-3">{siteName} will reply to the email or phone you gave.</p>
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} className="site-panel p-6 space-y-5">
      <h2 className="site-h3">{kind === 'reservation' ? 'Request a reservation' : 'Send us a message'}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <Field label="Phone" type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        {kind === 'reservation' && (
          <>
            <Field label="Party size" type="number" inputProps={{ min: 1, max: 200 }} value={form.partySize} onChange={(v) => setForm({ ...form, partySize: v })} />
            <Field label="Preferred date & time" type="datetime-local" value={form.desiredAt} onChange={(v) => setForm({ ...form, desiredAt: v })} className="sm:col-span-2" />
          </>
        )}
        <label className="block sm:col-span-2">
          <span className="site-eyebrow">{kind === 'reservation' ? 'Anything else?' : 'Message'}</span>
          <textarea
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            rows={3}
            className="mt-2 block w-full rounded-md border px-3 py-2 focus:outline-none"
            style={{ borderColor: 'var(--site-border-strong)', background: 'transparent', color: 'var(--site-fg)' }}
          />
        </label>
      </div>
      <div className="flex items-center justify-between gap-3">
        {status === 'error' && <p className="text-sm" style={{ color: 'var(--site-primary)' }}>{errorMsg}</p>}
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="site-cta ml-auto disabled:opacity-60"
        >
          {status === 'submitting' ? 'Sending…' : 'Send'}
        </button>
      </div>
    </form>
  );
}

function Field({
  label, value, onChange, type = 'text', required, className, inputProps,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; className?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="site-eyebrow">{label}{required && ' *'}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        {...inputProps}
        className="mt-2 block w-full rounded-md border px-3 py-2 focus:outline-none"
        style={{ borderColor: 'var(--site-border-strong)', background: 'transparent', color: 'var(--site-fg)' }}
      />
    </label>
  );
}
