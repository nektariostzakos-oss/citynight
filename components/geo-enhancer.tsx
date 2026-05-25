'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useVisitorLocation } from './visitor-location-provider';
import { useNearbyCities } from './nearby-cities-context';
import type { Locale } from '@/lib/i18n';

// One client component, two jobs:
//
// 1. Auto-redirect on precise location lock.
//    The moment `source` flips to 'precise' and we have a nearest city, push
//    the visitor to /{locale}/greece/{nearest.slug}. Only fires from the
//    doorway / locale-root (so we don't yank users mid-browse). Fires once
//    per session (sessionStorage flag) so refreshing the city page doesn't
//    bounce them again.
//
// 2. iOS Safari tap CTA.
//    iOS silently drops navigator.geolocation.getCurrentPosition() unless
//    it's bound to a user gesture (see visitor-location-provider.tsx). When
//    the provider sets error='needs-gesture' on iOS we render a small
//    glassy floating button. One tap fires requestPrecise() inside the
//    gesture handler — the permission popup then appears, and the redirect
//    flow above kicks in on success.

const REDIRECT_FLAG = 'cn:geo-redirected';

const COPY: Record<Locale, { useMyLocation: string; finding: string; near: string }> = {
  en: { useMyLocation: 'Use my location', finding: 'Finding you…',     near: 'Take me to my nearest city' },
  el: { useMyLocation: 'Χρήση τοποθεσίας',  finding: 'Σε εντοπίζουμε…',  near: 'Πήγαινε με στην πιο κοντινή πόλη' },
  de: { useMyLocation: 'Standort verwenden', finding: 'Suche…',           near: 'Bring mich zur nächsten Stadt' },
  fr: { useMyLocation: 'Utiliser ma position', finding: 'Localisation…',  near: 'Aller à la ville la plus proche' },
  it: { useMyLocation: 'Usa la mia posizione', finding: 'Ti localizzo…', near: 'Portami nella città più vicina' },
};

export function GeoEnhancer({ locale }: { locale: Locale }) {
  const router = useRouter();
  const pathname = usePathname();
  const { visitor, error, requestPrecise, preciseLoading } = useVisitorLocation();
  const { nearestCities } = useNearbyCities();
  const redirectedRef = useRef(false);
  const [dismissed, setDismissed] = useState(false);

  const c = COPY[locale];

  // ── 1. Auto-redirect when precise location resolves ────────────────────
  useEffect(() => {
    if (redirectedRef.current) return;
    if (visitor.source !== 'precise') return;
    if (nearestCities.length === 0) return;

    // Only redirect from the doorway / locale root — not from deeper pages.
    const onRoot = pathname === '/' || pathname === `/${locale}` || pathname === `/${locale}/`;
    if (!onRoot) return;

    // Don't re-redirect within the same session if the visitor came back.
    try {
      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(REDIRECT_FLAG)) return;
    } catch { /* private mode */ }

    const target = nearestCities[0];
    if (!target) return;

    redirectedRef.current = true;
    try { sessionStorage.setItem(REDIRECT_FLAG, target.slug); } catch { /* ignore */ }
    router.push(`/${locale}/greece/${target.slug}`);
  }, [visitor.source, nearestCities, pathname, locale, router]);

  // ── 2. iOS tap CTA ─────────────────────────────────────────────────────
  // Visible only when:
  //   - the provider gave up on auto-prompt (error === 'needs-gesture'), and
  //   - we don't already have a precise fix, and
  //   - the visitor hasn't dismissed it this session.
  const needsTap = error === 'needs-gesture' && visitor.source !== 'precise' && !dismissed;
  if (!needsTap) return null;

  return (
    <div
      role="dialog"
      aria-label={c.near}
      className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-[var(--color-bg-3)] bg-[color-mix(in_oklab,var(--color-bg-1)_92%,transparent)] p-3 shadow-[0_18px_60px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:left-4 sm:right-auto"
    >
      <span aria-hidden className="relative inline-flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-accent-cyan)] opacity-70" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--color-accent-cyan)]" />
      </span>
      <p className="flex-1 text-sm leading-snug text-[var(--color-fg-1)]">{c.near}</p>
      <button
        type="button"
        onClick={() => { void requestPrecise(); }}
        disabled={preciseLoading}
        className="shrink-0 rounded-full bg-[var(--color-accent-cyan)] px-3 py-1.5 text-xs font-semibold text-[var(--color-bg-0)] transition hover:brightness-110 disabled:opacity-60"
      >
        {preciseLoading ? c.finding : c.useMyLocation}
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="rounded-md p-1 text-[var(--color-fg-3)] hover:text-[var(--color-fg-1)]"
      >
        ×
      </button>
    </div>
  );
}
