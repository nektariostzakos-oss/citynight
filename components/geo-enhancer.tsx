'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useVisitorLocation } from './visitor-location-provider';
import { useNearbyCities } from './nearby-cities-context';
import type { Locale } from '@/lib/i18n';
import { formatDistanceKm } from '@/lib/geo-distance';

// One client component, three jobs:
//
// 1. iOS / first-time tap CTA. iOS Safari silently drops
//    navigator.geolocation.getCurrentPosition() unless it's bound to a user
//    gesture. We render a small floating button whenever the provider asked
//    for help (error in ACTIONABLE_ERRORS). Pressing it triggers
//    requestPreciseFromGesture() — sync call inside the gesture handler.
//
// 2. Found-you confirmation panel. The instant `source` flips to 'precise',
//    we render a visible card: "Found you near X — go now". Auto-navigates
//    after 3 s. Visitor can cancel or hit "Take me there" immediately. No
//    silent redirects — the user always sees what happened.
//
// 3. Debug overlay. Append ?debug=geo to any URL to surface live state
//    (source, error, permission state, last lat/lng, nearestCities[0]).
//    Useful for diagnosing iOS-specific oddness in the field.

const REDIRECT_FLAG = 'cn:geo-redirected';
const AUTO_REDIRECT_MS = 3000;

type LocCopy = {
  near: string;
  useMyLocation: string;
  retry: string;
  finding: string;
  denied: string;
  unavailable: string;
  iosSettingsHint: string;
  foundYou: (city: string) => string;
  takeMeThere: string;
  goingIn: (sec: number) => string;
  stayHere: string;
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
    foundYou: (c) => `Found you near ${c}`,
    takeMeThere: 'Take me there →',
    goingIn: (s) => `Going in ${s}s…`,
    stayHere: 'Stay here',
  },
  el: {
    near: 'Πήγαινε με στην πιο κοντινή πόλη',
    useMyLocation: 'Χρήση τοποθεσίας',
    retry: 'Δοκίμασε ξανά',
    finding: 'Σε εντοπίζουμε…',
    denied: 'Η τοποθεσία είναι μπλοκαρισμένη για το site.',
    unavailable: 'Δεν βρέθηκε η τοποθεσία σου.',
    iosSettingsHint: 'iOS: Ρυθμίσεις → Safari → Τοποθεσία → Επιτρέπεται.',
    foundYou: (c) => `Σε βρήκαμε κοντά στο ${c}`,
    takeMeThere: 'Πάμε εκεί →',
    goingIn: (s) => `Σε ${s}δ…`,
    stayHere: 'Μείνε εδώ',
  },
  de: {
    near: 'Bring mich zur nächsten Stadt',
    useMyLocation: 'Standort verwenden',
    retry: 'Erneut versuchen',
    finding: 'Suche…',
    denied: 'Standort ist für diese Seite gesperrt.',
    unavailable: 'Standort konnte nicht ermittelt werden.',
    iosSettingsHint: 'iOS: Einstellungen → Safari → Standort → Erlauben.',
    foundYou: (c) => `Gefunden in der Nähe von ${c}`,
    takeMeThere: 'Dorthin →',
    goingIn: (s) => `In ${s}s…`,
    stayHere: 'Hier bleiben',
  },
  fr: {
    near: 'Aller à la ville la plus proche',
    useMyLocation: 'Utiliser ma position',
    retry: 'Réessayer',
    finding: 'Localisation…',
    denied: 'La localisation est bloquée pour ce site.',
    unavailable: 'Impossible d’obtenir votre position.',
    iosSettingsHint: 'iOS : Réglages → Safari → Localisation → Autoriser.',
    foundYou: (c) => `Trouvé près de ${c}`,
    takeMeThere: 'M’y emmener →',
    goingIn: (s) => `Dans ${s}s…`,
    stayHere: 'Rester ici',
  },
  it: {
    near: 'Portami nella città più vicina',
    useMyLocation: 'Usa la mia posizione',
    retry: 'Riprova',
    finding: 'Ti localizzo…',
    denied: 'La posizione è bloccata per questo sito.',
    unavailable: 'Impossibile ottenere la tua posizione.',
    iosSettingsHint: 'iOS: Impostazioni → Safari → Posizione → Consenti.',
    foundYou: (c) => `Trovato vicino a ${c}`,
    takeMeThere: 'Portami lì →',
    goingIn: (s) => `Tra ${s}s…`,
    stayHere: 'Resta qui',
  },
};

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
  const searchParams = useSearchParams();
  const debug = searchParams?.get('debug') === 'geo';

  const {
    visitor, error, preciseLoading,
    requestPreciseFromGesture,
  } = useVisitorLocation();
  const { nearestCities, hasLocation } = useNearbyCities();
  const [dismissedCta, setDismissedCta] = useState(false);
  const [dismissedFound, setDismissedFound] = useState(false);
  const [autoLeft, setAutoLeft] = useState(AUTO_REDIRECT_MS / 1000);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const c = COPY[locale];
  const nearest = nearestCities[0];

  // ── Auto-countdown when precise location is locked ─────────────────────
  // Resets to 3 every time we hand control to the panel.
  useEffect(() => {
    if (visitor.source !== 'precise' || !nearest || dismissedFound) {
      setAutoLeft(AUTO_REDIRECT_MS / 1000);
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
      return;
    }
    // Only auto-redirect from the doorway / locale-root. On deeper pages we
    // still show the found-you panel but don't auto-navigate (less hostile).
    const onRoot = pathname === '/' || pathname === `/${locale}` || pathname === `/${locale}/`;
    if (!onRoot) return;

    setAutoLeft(AUTO_REDIRECT_MS / 1000);
    autoTimerRef.current = setInterval(() => {
      setAutoLeft((s) => {
        if (s <= 1) {
          if (autoTimerRef.current) clearInterval(autoTimerRef.current);
          // Mark as redirected so the panel doesn't re-fire next time the
          // user lands back on this page in the same tab.
          try { sessionStorage.setItem(REDIRECT_FLAG, nearest.slug); } catch { /* ignore */ }
          router.push(`/${locale}/greece/${nearest.slug}`);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitor.source, nearest?.slug, pathname, locale, dismissedFound]);

  const goNow = () => {
    if (!nearest) return;
    try { sessionStorage.setItem(REDIRECT_FLAG, nearest.slug); } catch { /* ignore */ }
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    router.push(`/${locale}/greece/${nearest.slug}`);
  };

  const cancelAuto = () => {
    setDismissedFound(true);
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    autoTimerRef.current = null;
  };

  // ── State decisions ────────────────────────────────────────────────────
  const hasPrecise = visitor.source === 'precise' && hasLocation && !!nearest;
  const showFoundPanel = hasPrecise && !dismissedFound;
  const showCta =
    !hasPrecise &&
    !dismissedCta &&
    error !== null &&
    ACTIONABLE_ERRORS.has(error);

  return (
    <>
      {/* ── Found-you panel ─────────────────────────────────────────────── */}
      {showFoundPanel && nearest && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md flex-col gap-3 rounded-2xl bg-[var(--color-bg-1)] p-4 shadow-[0_18px_60px_-12px_rgba(0,0,0,0.8)] ring-1 ring-[var(--color-accent-cyan)]/40 sm:left-4 sm:right-auto"
        >
          {/* Accent strip */}
          <span
            aria-hidden
            className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-accent-cyan)] to-transparent"
          />
          <div className="flex items-start gap-3">
            <span aria-hidden className="relative mt-0.5 inline-flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-accent-cyan)] opacity-70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--color-accent-cyan)]" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[var(--color-fg-0)]">
                {c.foundYou(nearest.name)}
              </p>
              {Number.isFinite(nearest.distanceKm) && (
                <p className="mt-0.5 text-[11px] text-[var(--color-fg-2)]">
                  {formatDistanceKm(nearest.distanceKm)}
                  {autoLeft > 0 && (
                    <>
                      <span className="mx-1.5 text-[var(--color-fg-3)]">·</span>
                      {c.goingIn(autoLeft)}
                    </>
                  )}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goNow}
              className="flex-1 rounded-full bg-[var(--color-accent-cyan)] px-4 py-2 text-sm font-semibold text-[var(--color-bg-0)] transition hover:brightness-110"
            >
              {c.takeMeThere}
            </button>
            <button
              type="button"
              onClick={cancelAuto}
              className="rounded-full border border-[var(--color-bg-3)] px-3 py-2 text-xs font-semibold text-[var(--color-fg-1)] hover:border-[var(--color-fg-1)]"
            >
              {c.stayHere}
            </button>
          </div>
        </div>
      )}

      {/* ── Tap CTA for first-time / iOS-blocked / errored states ──────── */}
      {showCta && (
        <div
          role="dialog"
          aria-label={c.near}
          className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md flex-col gap-2 rounded-2xl bg-[var(--color-bg-1)] p-3 shadow-[0_18px_60px_-12px_rgba(0,0,0,0.8)] ring-1 ring-[var(--color-bg-2)] sm:left-4 sm:right-auto"
        >
          <div className="flex items-center gap-3">
            <span aria-hidden className="relative inline-flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-accent-cyan)] opacity-70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--color-accent-cyan)]" />
            </span>
            <p className="flex-1 text-sm leading-snug text-[var(--color-fg-1)]">{c.near}</p>
            <button
              type="button"
              onClick={() => requestPreciseFromGesture()}
              disabled={preciseLoading || error === 'permission denied'}
              className="shrink-0 rounded-full bg-[var(--color-accent-cyan)] px-3 py-1.5 text-xs font-semibold text-[var(--color-bg-0)] transition hover:brightness-110 disabled:opacity-60"
            >
              {preciseLoading
                ? c.finding
                : error === 'permission denied' || error === 'position unavailable' || error === 'timeout' || error === 'precise lookup failed'
                ? c.retry
                : c.useMyLocation}
            </button>
            <button
              type="button"
              onClick={() => setDismissedCta(true)}
              aria-label="Dismiss"
              className="rounded-md p-1 text-[var(--color-fg-3)] hover:text-[var(--color-fg-1)]"
            >
              ×
            </button>
          </div>
          {(error === 'permission denied') && (
            <p className="pl-6 text-[11px] leading-snug text-[var(--color-fg-3)]">
              {c.denied} {c.iosSettingsHint}
            </p>
          )}
          {(error === 'position unavailable' || error === 'timeout' || error === 'precise lookup failed') && (
            <p className="pl-6 text-[11px] leading-snug text-[var(--color-fg-3)]">
              {c.unavailable}
            </p>
          )}
        </div>
      )}

      {/* ── Debug overlay (only with ?debug=geo) ───────────────────────── */}
      {debug && (
        <pre
          className="fixed left-2 top-2 z-50 max-w-[92vw] overflow-x-auto whitespace-pre-wrap break-all rounded-md border border-[var(--color-bg-3)] bg-[var(--color-bg-0)]/95 p-2 text-[10px] leading-snug text-[var(--color-fg-1)]"
        >
{JSON.stringify({
  pathname,
  source: visitor.source,
  hasLocation,
  preciseLoading,
  error,
  cached: { lat: visitor.lat, lng: visitor.lng, city: visitor.city },
  nearest: nearest ? { slug: nearest.slug, name: nearest.name, distanceKm: nearest.distanceKm } : null,
  redirectFlag: typeof window !== 'undefined' ? sessionStorage.getItem(REDIRECT_FLAG) : null,
  ua: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : null,
}, null, 2)}
        </pre>
      )}
    </>
  );
}
