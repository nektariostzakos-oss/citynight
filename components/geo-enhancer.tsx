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
// 2. Tap-bound CTA for iOS (and any state where the auto-prompt didn't land).
//    iOS Safari silently drops navigator.geolocation.getCurrentPosition()
//    unless it's bound to a user gesture. We render a small glassy floating
//    button whenever we need help: 'needs-gesture' (iOS first visit),
//    'permission denied' (visitor previously declined — show iOS Settings
//    instructions), 'timeout' / 'position unavailable' (retry).

const REDIRECT_FLAG = 'cn:geo-redirected';

type LocCopy = {
  near: string;          // headline copy: "take me to my nearest city"
  useMyLocation: string; // primary CTA label (first try)
  retry: string;         // CTA label after a failed attempt
  finding: string;       // CTA label while waiting for the GPS fix
  denied: string;        // explainer when permission was denied
  unavailable: string;   // explainer when GPS couldn't get a fix
  iosSettingsHint: string; // pointer to Settings → Safari → Location
};

const COPY: Record<Locale, LocCopy> = {
  en: {
    near: 'Take me to my nearest city',
    useMyLocation: 'Use my location',
    retry: 'Try again',
    finding: 'Finding you…',
    denied: 'Location is blocked for this site.',
    unavailable: 'Could not get your location.',
    iosSettingsHint: 'iOS: Settings → Safari → Location → Allow.',
  },
  el: {
    near: 'Πήγαινε με στην πιο κοντινή πόλη',
    useMyLocation: 'Χρήση τοποθεσίας',
    retry: 'Δοκίμασε ξανά',
    finding: 'Σε εντοπίζουμε…',
    denied: 'Η τοποθεσία είναι μπλοκαρισμένη για το site.',
    unavailable: 'Δεν βρέθηκε η τοποθεσία σου.',
    iosSettingsHint: 'iOS: Ρυθμίσεις → Safari → Τοποθεσία → Επιτρέπεται.',
  },
  de: {
    near: 'Bring mich zur nächsten Stadt',
    useMyLocation: 'Standort verwenden',
    retry: 'Erneut versuchen',
    finding: 'Suche…',
    denied: 'Standort ist für diese Seite gesperrt.',
    unavailable: 'Standort konnte nicht ermittelt werden.',
    iosSettingsHint: 'iOS: Einstellungen → Safari → Standort → Erlauben.',
  },
  fr: {
    near: 'Aller à la ville la plus proche',
    useMyLocation: 'Utiliser ma position',
    retry: 'Réessayer',
    finding: 'Localisation…',
    denied: 'La localisation est bloquée pour ce site.',
    unavailable: 'Impossible d’obtenir votre position.',
    iosSettingsHint: 'iOS : Réglages → Safari → Localisation → Autoriser.',
  },
  it: {
    near: 'Portami nella città più vicina',
    useMyLocation: 'Usa la mia posizione',
    retry: 'Riprova',
    finding: 'Ti localizzo…',
    denied: 'La posizione è bloccata per questo sito.',
    unavailable: 'Impossibile ottenere la tua posizione.',
    iosSettingsHint: 'iOS: Impostazioni → Safari → Posizione → Consenti.',
  },
};

// States in which we render the floating CTA. We keep it visible after a
// failed attempt so the visitor can see the reason + retry.
const ACTIONABLE_ERRORS = new Set<string>([
  'needs-gesture',
  'permission denied',
  'position unavailable',
  'timeout',
  'precise lookup failed',
  'geolocation unsupported',
]);

export function GeoEnhancer({ locale }: { locale: Locale }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    visitor, error, preciseLoading,
    requestPreciseFromGesture,
  } = useVisitorLocation();
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

    try {
      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(REDIRECT_FLAG)) return;
    } catch { /* private mode */ }

    const target = nearestCities[0];
    if (!target) return;

    redirectedRef.current = true;
    try { sessionStorage.setItem(REDIRECT_FLAG, target.slug); } catch { /* ignore */ }
    router.push(`/${locale}/greece/${target.slug}`);
  }, [visitor.source, nearestCities, pathname, locale, router]);

  // ── 2. Tap CTA ─────────────────────────────────────────────────────────
  // Visible whenever the auto-prompt didn't land AND we don't already have
  // a precise fix AND the visitor hasn't dismissed it.
  const showCta =
    visitor.source !== 'precise' &&
    !dismissed &&
    (error === null ? false : ACTIONABLE_ERRORS.has(error));
  // ^ if error is null we don't render; auto-prompt may still be in flight.

  if (!showCta) return null;

  const denied = error === 'permission denied';
  const failed =
    error === 'position unavailable' ||
    error === 'timeout' ||
    error === 'precise lookup failed';

  // Sub-line text under the headline. Empty for the initial "needs-gesture"
  // state so the CTA stays a single clean line on first show.
  const subline = denied
    ? `${c.denied} ${c.iosSettingsHint}`
    : failed
    ? c.unavailable
    : '';

  // CTA label: first time vs. retry.
  const label = preciseLoading
    ? c.finding
    : (denied || failed)
    ? c.retry
    : c.useMyLocation;

  return (
    <div
      role="dialog"
      aria-label={c.near}
      className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md flex-col gap-2 rounded-2xl border border-[var(--color-bg-3)] bg-[color-mix(in_oklab,var(--color-bg-1)_92%,transparent)] p-3 shadow-[0_18px_60px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:left-4 sm:right-auto"
    >
      <div className="flex items-center gap-3">
        <span aria-hidden className="relative inline-flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-accent-cyan)] opacity-70" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--color-accent-cyan)]" />
        </span>
        <p className="flex-1 text-sm leading-snug text-[var(--color-fg-1)]">{c.near}</p>
        <button
          type="button"
          // IMPORTANT: requestPreciseFromGesture calls navigator.geolocation
          // SYNCHRONOUSLY inside this onClick — no await/setState before the
          // API call, so iOS Safari accepts the gesture.
          onClick={() => requestPreciseFromGesture()}
          disabled={preciseLoading || denied}
          className="shrink-0 rounded-full bg-[var(--color-accent-cyan)] px-3 py-1.5 text-xs font-semibold text-[var(--color-bg-0)] transition hover:brightness-110 disabled:opacity-60"
        >
          {label}
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
      {subline && (
        <p className="pl-6 text-[11px] leading-snug text-[var(--color-fg-3)]">{subline}</p>
      )}
    </div>
  );
}
