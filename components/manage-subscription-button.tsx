'use client';

import { useState } from 'react';

// Opens the Stripe Customer Portal so the owner can update payment method,
// download invoices, or cancel. Returns to the billing page after they're done.

export function ManageSubscriptionButton({ venueId, label }: { venueId: string; label: string }) {
  const [loading, setLoading] = useState(false);

  async function go() {
    setLoading(true);
    const res = await fetch('/api/stripe/portal', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ venueId }),
    });
    if (!res.ok) { setLoading(false); return; }
    const json = await res.json();
    if (json.url) window.location.href = json.url;
    else setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={loading}
      className="rounded-md border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-5 py-2.5 text-sm font-semibold text-[var(--color-fg-0)] transition hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)] disabled:opacity-60"
    >
      {loading ? '…' : label}
    </button>
  );
}
