'use client';

import { useState } from 'react';
import type { Locale } from '@/lib/i18n';

// Static thumbnail → interactive Google Map on click (§13 cost control).
// We render a Maps Static API thumbnail until the user opts in; only then do we
// load the Maps JS bundle. Without lat/lng there's nothing to render.

const COPY: Record<Locale, { mapLabel: string; mapOf: (n: string) => string; loadInteractive: string; unavailable: string; tapToLoad: string }> = {
  en: { mapLabel: 'Map',           mapOf: (n) => `Map of ${n}`,        loadInteractive: 'Load interactive map',     unavailable: 'Map unavailable',     tapToLoad: 'Tap to load interactive map' },
  el: { mapLabel: 'Χάρτης',         mapOf: (n) => `Χάρτης για ${n}`,    loadInteractive: 'Φόρτωσε διαδραστικό χάρτη', unavailable: 'Χάρτης μη διαθέσιμος', tapToLoad: 'Πάτα για διαδραστικό χάρτη' },
  de: { mapLabel: 'Karte',         mapOf: (n) => `Karte von ${n}`,     loadInteractive: 'Interaktive Karte laden',   unavailable: 'Karte nicht verfügbar', tapToLoad: 'Tippen, um Karte zu laden' },
  fr: { mapLabel: 'Carte',         mapOf: (n) => `Carte de ${n}`,      loadInteractive: 'Charger la carte interactive', unavailable: 'Carte indisponible',  tapToLoad: 'Toucher pour charger la carte' },
  it: { mapLabel: 'Mappa',         mapOf: (n) => `Mappa di ${n}`,      loadInteractive: 'Carica mappa interattiva',  unavailable: 'Mappa non disponibile', tapToLoad: 'Tocca per caricare la mappa' },
};

export function LazyMap({ lat, lng, name, locale = 'en' }: { lat: number | null; lng: number | null; name: string; locale?: Locale }) {
  const [interactive, setInteractive] = useState(false);
  const c = COPY[locale];

  if (!lat || !lng) return null;

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const staticUrl = key
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x400&scale=2&style=feature:all|element:labels.text.fill|color:0xa3a3aa&style=feature:all|element:labels.text.stroke|color:0x07070b&style=feature:all|element:geometry|color:0x15151f&style=feature:road|color:0x1c1c29&markers=color:0xff2d95|${lat},${lng}&key=${key}`
    : null;

  return (
    <div className="mt-2">
      <p className="mb-2 text-[10px] uppercase tracking-widest text-[var(--color-fg-2)]">{c.mapLabel}</p>
      {interactive ? (
        <iframe
          title={c.mapOf(name)}
          width="100%"
          height="280"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="rounded-lg border border-[var(--color-bg-3)]"
          src={`https://www.google.com/maps/embed/v1/place?key=${key}&q=${encodeURIComponent(`${name} ${lat},${lng}`)}&zoom=16`}
        />
      ) : (
        <button
          type="button"
          onClick={() => setInteractive(true)}
          className="group relative block w-full overflow-hidden rounded-lg border border-[var(--color-bg-3)]"
          aria-label={c.loadInteractive}
        >
          {staticUrl ? (
            // Native <img> — Google's signed static-map URL changes every call
            // (key + style query string); next/image's optimizer would just
            // re-fetch it via /_next/image proxy and cache the same bytes
            // twice. width/height fixes layout shift; lazy keeps it out of
            // the LCP budget on pages where the map sits below the fold.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={staticUrl}
              alt={c.mapOf(name)}
              width={600}
              height={400}
              loading="lazy"
              decoding="async"
              className="w-full"
            />
          ) : (
            <div className="flex h-40 w-full items-center justify-center bg-[var(--color-bg-1)] text-sm text-[var(--color-fg-3)]">
              {c.unavailable}
            </div>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-0)]/60 text-sm font-semibold text-[var(--color-accent-cyan)] opacity-0 transition group-hover:opacity-100">
            {c.tapToLoad}
          </span>
        </button>
      )}
    </div>
  );
}
