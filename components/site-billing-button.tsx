'use client';

import { useState } from 'react';

export function SiteBillingButton({
  siteId, label, busyLabel,
}: { siteId: string; label: string; busyLabel: string }) {
  const [busy, setBusy] = useState(false);
  async function onClick() {
    setBusy(true);
    const res = await fetch(`/api/sites/${siteId}/billing-portal`, { method: 'POST' });
    if (res.ok) {
      const data = (await res.json()) as { url?: string };
      if (data.url) window.location.href = data.url;
    }
    setBusy(false);
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-md border border-[var(--color-bg-3)] px-4 py-2 text-sm font-semibold text-[var(--color-fg-1)] hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)] disabled:opacity-60"
    >
      {busy ? busyLabel : label}
    </button>
  );
}
