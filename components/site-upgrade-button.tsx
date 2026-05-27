'use client';

import { useState } from 'react';

export function SiteUpgradeButton({
  siteId, plan, label, busyLabel, locale,
}: {
  siteId: string;
  plan: 'monthly' | 'zip';
  label: string;
  busyLabel: string;
  locale: string;
}) {
  const [busy, setBusy] = useState(false);
  async function onClick() {
    setBusy(true);
    const res = await fetch(`/api/sites/${siteId}/checkout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ plan, locale }),
    });
    if (res.ok) {
      const data = (await res.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    }
    setBusy(false);
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-md bg-[var(--color-accent-pink)] px-4 py-2 text-sm font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)] disabled:opacity-60"
    >
      {busy ? busyLabel : label}
    </button>
  );
}
