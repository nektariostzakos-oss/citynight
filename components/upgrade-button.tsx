'use client';

import { useState } from 'react';

export function UpgradeButton({ venueId }: { venueId: string }) {
  const [loading, setLoading] = useState(false);

  async function go() {
    setLoading(true);
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ venueId, plan: 'featured' }),
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
      className="rounded-md bg-[var(--color-accent-pink)] px-5 py-2.5 text-sm font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)] disabled:opacity-60"
    >
      {loading ? 'Redirecting…' : 'Upgrade to Featured →'}
    </button>
  );
}
