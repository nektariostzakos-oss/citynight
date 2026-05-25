'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import type { Locale } from '@/lib/i18n';

const COPY: Record<Locale | 'default', { idle: string; loading: string; error: string }> = {
  en:      { idle: 'Upgrade to Featured →', loading: 'Redirecting…',  error: 'Could not start checkout.' },
  el:      { idle: 'Αναβάθμιση σε Featured →', loading: 'Ανακατεύθυνση…', error: 'Αποτυχία checkout.' },
  de:      { idle: 'Auf Featured upgraden →', loading: 'Weiterleitung…', error: 'Checkout fehlgeschlagen.' },
  fr:      { idle: 'Passer à Featured →',  loading: 'Redirection…',   error: 'Échec du checkout.' },
  it:      { idle: 'Passa a Featured →',   loading: 'Reindirizzo…',   error: 'Checkout fallito.' },
  default: { idle: 'Upgrade to Featured →', loading: 'Redirecting…',  error: 'Could not start checkout.' },
};

export function UpgradeButton({ venueId }: { venueId: string }) {
  const params = useParams();
  const localeParam = typeof params?.locale === 'string' ? params.locale : 'en';
  const c = (COPY as Record<string, typeof COPY.default>)[localeParam] ?? COPY.default;

  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');

  async function go() {
    setState('loading');
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ venueId, plan: 'featured', locale: localeParam }),
      });
      if (!res.ok) { setState('error'); return; }
      const json = await res.json();
      if (json.url) { window.location.href = json.url; return; }
      setState('error');
    } catch {
      setState('error');
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={go}
        disabled={state === 'loading'}
        className="rounded-md bg-[var(--color-accent-pink)] px-5 py-2.5 text-sm font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)] disabled:opacity-60"
      >
        {state === 'loading' ? c.loading : c.idle}
      </button>
      {state === 'error' && <p className="text-xs text-[var(--color-danger)]">{c.error}</p>}
    </div>
  );
}
