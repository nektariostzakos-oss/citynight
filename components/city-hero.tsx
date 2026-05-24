import Image from 'next/image';
import type { LocationPhoto } from '@/lib/queries';
import type { Locale } from '@/lib/i18n';

// City hero — uses stock location photo from DB. If no photo, falls back to a
// gradient + city silhouette so the layout doesn't break before seeding.

// Per-locale copy. Greek is the primary surface — never let English leak.
// `afterDark` is the accent word that follows the city name in the H1.
const COPY: Record<Locale, { afterDark: string; alt: (city: string) => string; seasonLabel: string }> = {
  en: { afterDark: 'after dark',  alt: (c) => `${c} at night`,    seasonLabel: 'Season' },
  el: { afterDark: 'τη νύχτα',     alt: (c) => `${c} τη νύχτα`,      seasonLabel: 'Σεζόν' },
  de: { afterDark: 'bei Nacht',   alt: (c) => `${c} bei Nacht`,    seasonLabel: 'Saison' },
  fr: { afterDark: 'la nuit',     alt: (c) => `${c} la nuit`,      seasonLabel: 'Saison' },
  it: { afterDark: 'di notte',    alt: (c) => `${c} di notte`,     seasonLabel: 'Stagione' },
};

// Region labels — cities.region stores the English canonical name. The mega
// menu has its own region copy too; keep these aligned with that map.
const REGION: Record<Locale, Record<string, string>> = {
  en: { 'Attica': 'Attica', 'South Aegean': 'Cyclades & Dodecanese', 'North Aegean': 'North Aegean', 'Crete': 'Crete', 'Ionian Islands': 'Ionian', 'Central Macedonia': 'Macedonia', 'Western Macedonia': 'West Macedonia', 'East Macedonia & Thrace': 'East Macedonia & Thrace', 'Peloponnese': 'Peloponnese', 'Epirus': 'Epirus', 'Thessaly': 'Sporades & Thessaly', 'Central Greece': 'Central Greece' },
  el: { 'Attica': 'Αττική', 'South Aegean': 'Κυκλάδες & Δωδεκάνησα', 'North Aegean': 'Βόρειο Αιγαίο', 'Crete': 'Κρήτη', 'Ionian Islands': 'Ιόνιο', 'Central Macedonia': 'Μακεδονία', 'Western Macedonia': 'Δυτική Μακεδονία', 'East Macedonia & Thrace': 'Αν. Μακεδονία & Θράκη', 'Peloponnese': 'Πελοπόννησος', 'Epirus': 'Ήπειρος', 'Thessaly': 'Σποράδες & Θεσσαλία', 'Central Greece': 'Στερεά Ελλάδα' },
  de: { 'Attica': 'Attika', 'South Aegean': 'Kykladen & Dodekanes', 'North Aegean': 'Nordägäis', 'Crete': 'Kreta', 'Ionian Islands': 'Ionische Inseln', 'Central Macedonia': 'Makedonien', 'Western Macedonia': 'Westmakedonien', 'East Macedonia & Thrace': 'Ostmakedonien & Thrakien', 'Peloponnese': 'Peloponnes', 'Epirus': 'Epirus', 'Thessaly': 'Sporaden & Thessalien', 'Central Greece': 'Mittelgriechenland' },
  fr: { 'Attica': 'Attique', 'South Aegean': 'Cyclades & Dodécanèse', 'North Aegean': 'Égée du Nord', 'Crete': 'Crète', 'Ionian Islands': 'Îles ioniennes', 'Central Macedonia': 'Macédoine', 'Western Macedonia': 'Macédoine-Occidentale', 'East Macedonia & Thrace': 'Macédoine-Orientale & Thrace', 'Peloponnese': 'Péloponnèse', 'Epirus': 'Épire', 'Thessaly': 'Sporades & Thessalie', 'Central Greece': 'Grèce centrale' },
  it: { 'Attica': 'Attica', 'South Aegean': 'Cicladi & Dodecaneso', 'North Aegean': 'Egeo Settentrionale', 'Crete': 'Creta', 'Ionian Islands': 'Isole Ionie', 'Central Macedonia': 'Macedonia', 'Western Macedonia': 'Macedonia Occidentale', 'East Macedonia & Thrace': 'Macedonia Orientale & Tracia', 'Peloponnese': 'Peloponneso', 'Epirus': 'Epiro', 'Thessaly': 'Sporadi & Tessaglia', 'Central Greece': 'Grecia centrale' },
};

export function CityHero({
  cityName,
  region,
  season,
  bestFor,
  photo,
  locale,
}: {
  cityName: string;
  region: string | null;
  season: string;
  bestFor: string[];
  photo: LocationPhoto | null;
  locale: Locale;
}) {
  const c = COPY[locale];
  return (
    <section className="relative isolate -mt-px overflow-hidden bg-[var(--color-bg-0)]">
      <div className="relative aspect-[16/9] w-full md:aspect-[21/9]">
        {photo ? (
          <Image
            src={photo.url}
            alt={c.alt(cityName)}
            fill
            sizes="100vw"
            priority
            className="object-cover city-hero-crop"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-bg-1)] via-[var(--color-bg-2)] to-[var(--color-bg-0)]" />
        )}

        {/* Top + bottom gradients for legibility of overlaid copy */}
        <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-[var(--color-bg-0)]/85 to-transparent" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[var(--color-bg-0)] via-[var(--color-bg-0)]/70 to-transparent" aria-hidden />

        <div className="absolute inset-x-0 bottom-0 z-10 mx-auto max-w-6xl px-6 pb-10 sm:pb-16">
          {region && (
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-fg-2)]">{REGION[locale][region] ?? region}</p>
          )}
          <h1 className="mt-2 font-display text-5xl font-semibold leading-[0.95] tracking-tight text-[var(--color-fg-0)] md:text-7xl">
            {cityName} <span className="text-[var(--color-accent-pink)]">{c.afterDark}</span>
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-[var(--color-bg-3)] bg-[var(--color-bg-1)]/70 px-3 py-1 text-[var(--color-fg-1)] backdrop-blur">
              {c.seasonLabel} · {season}
            </span>
            {bestFor.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[var(--color-accent-cyan)]/60 bg-[var(--color-bg-1)]/70 px-3 py-1 text-[var(--color-accent-cyan)] backdrop-blur"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Photo attribution moved off the hero overlay (was confusing visitors —
            looked like a watermark on the image). Now lives below the hero in
            normal flow so the photo reads cleanly. License-required attributions
            (CC BY, Unsplash) are still satisfied because the credit is on the
            same page as the photo. */}
      </div>
      {photo?.attributionText && (
        <p className="mx-auto max-w-6xl px-6 pt-2 text-[10px] text-[var(--color-fg-3)]">
          <a
            href={photo.attributionUrl ?? '#'}
            target="_blank"
            rel="nofollow noopener"
            className="hover:text-[var(--color-fg-1)]"
          >
            Photo · {photo.attributionText}
          </a>
        </p>
      )}
    </section>
  );
}
