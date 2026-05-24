'use client';

import { useState } from 'react';

export function VenueEditor({
  venueId,
  initial,
}: {
  venueId: string;
  initial: { phone: string; website: string; address: string; description: string };
}) {
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    const res = await fetch(`/api/venues/${venueId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    });
    setStatus(res.ok ? 'saved' : 'error');
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
      <Field label="Website" value={form.website} onChange={(v) => setForm({ ...form, website: v })} type="url" />
      <Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
      <label className="block">
        <span className="text-xs uppercase tracking-widest text-[var(--color-fg-2)]">Description</span>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={5}
          className="mt-2 block w-full rounded-md border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-3 py-2 text-[var(--color-fg-0)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={status === 'saving'}
        className="rounded-md bg-[var(--color-accent-pink)] px-4 py-2 text-sm font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)] disabled:opacity-60"
      >
        {status === 'saving' ? 'Saving…' : 'Save changes'}
      </button>
      {status === 'saved' && <p className="text-sm text-[var(--color-success)]">Saved. Live within seconds.</p>}
      {status === 'error' && <p className="text-sm text-[var(--color-danger)]">Couldn&apos;t save. Try again.</p>}
    </form>
  );
}

function Field({ label, value, onChange, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
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
    </label>
  );
}
