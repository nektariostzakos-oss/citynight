'use client';

// The home instrument: the dial, the readings beside it, and the cities the
// visitor can open next. One card, one hairline, no glow.
//
// It re-renders once a minute, so the needle, the percentage and the count of
// open places stay true on a tab left open. The sun for Athens comes from the
// server (Open-Meteo); every other city's sunset is computed here with the
// same maths the dial uses, which is why the rows say "sunset 19:34" and not
// something we could not verify.
//
// Once the visitor's position resolves, the shared NearbyCities context
// re-orders the rows by real distance and the heading says so. Server HTML
// stays the canonical order, so crawlers see a stable page.
//
// Direction A "Αντικύθηρα", products/citynight/design/tokens.md.

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import type { Locale } from '@/lib/i18n';
import { formatDistanceKm } from '@/lib/geo-distance';
import { NightDial } from './instrument/night-dial';
import { athensClock, caps, hhmm, minutesFromISO, moonPhase, nightReading, sunTimes } from './instrument/night';
import { countOpenAt, type OpenWindow } from './instrument/hours';
import { useNearbyCities } from './nearby-cities-context';
import { durationWords } from './hero-live-status';

type Row = InstrumentCity & { distanceKm?: number };

export type InstrumentCity = {
  slug: string;
  name: string;
  region: string | null;
  lat: number | null;
  lng: number | null;
};

export type HeroInstrumentProps = {
  locale: Locale;
  nowISO: string;
  sunsetISO: string | null;
  sunriseISO: string | null;
  windows: OpenWindow[][];
  total: number;
  cities: InstrumentCity[];
  /** Where the primary action goes when no city is nearer. */
  fallbackCitySlug: string | null;
};

const COPY: Record<Locale, {
  heading: string; headingNear: (city: string) => string;
  night: string; sunsetIn: string;
  sunset: string; sunrise: string; moon: string; openNow: string; of: string;
  cities: string; sunsetAt: string; cta: (city: string) => string; ctaAll: string;
  hour: (n: number) => string; minute: (n: number) => string;
  dialLabel: (a: { time: string; night: string; sunset: string; sunrise: string; open: number; total: number }) => string;
}> = {
  el: {
    heading: 'Η ΝΥΧΤΑ ΣΤΗΝ ΑΘΗΝΑ',
    headingNear: (city) => `ΚΟΝΤΑ ΣΟΥ ΤΩΡΑ · ${city}`,
    night: 'η νύχτα', sunsetIn: 'δύση σε',
    sunset: 'ΔΥΣΗ', sunrise: 'ΑΝΑΤΟΛΗ', moon: 'ΣΕΛΗΝΗ', openNow: 'ΑΝΟΙΧΤΑ ΤΩΡΑ', of: 'ΑΠΟ',
    cities: 'ΠΟΛΕΙΣ', sunsetAt: 'ΔΥΣΗ',
    cta: (city) => `Δες τον οδηγό: ${city}`, ctaAll: 'Δες όλες τις πόλεις',
    hour: (n) => (n === 1 ? '1 ώρα' : `${n} ώρες`), minute: (n) => `${n}′`,
    dialLabel: (a) => `Αθήνα, ${a.time}. ${a.night}. Δύση ${a.sunset}, ανατολή ${a.sunrise}. Ανοιχτά τώρα ${a.open} από ${a.total}.`,
  },
  en: {
    heading: 'THE NIGHT IN ATHENS',
    headingNear: (city) => `NEAR YOU NOW · ${city}`,
    night: 'the night', sunsetIn: 'sunset in',
    sunset: 'SUNSET', sunrise: 'SUNRISE', moon: 'MOON', openNow: 'OPEN NOW', of: 'OF',
    cities: 'CITIES', sunsetAt: 'SUNSET',
    cta: (city) => `Open the ${city} guide`, ctaAll: 'See every city',
    hour: (n) => (n === 1 ? '1 hour' : `${n} hours`), minute: (n) => `${n} min`,
    dialLabel: (a) => `Athens, ${a.time}. ${a.night}. Sunset ${a.sunset}, sunrise ${a.sunrise}. Open now ${a.open} of ${a.total}.`,
  },
  de: {
    heading: 'DIE NACHT IN ATHEN',
    headingNear: (city) => `IN IHRER NÄHE · ${city}`,
    night: 'die Nacht', sunsetIn: 'Sonnenuntergang in',
    sunset: 'UNTERGANG', sunrise: 'AUFGANG', moon: 'MOND', openNow: 'JETZT OFFEN', of: 'VON',
    cities: 'STÄDTE', sunsetAt: 'UNTERGANG',
    cta: (city) => `Guide für ${city} öffnen`, ctaAll: 'Alle Städte ansehen',
    hour: (n) => (n === 1 ? '1 Stunde' : `${n} Stunden`), minute: (n) => `${n} Min`,
    dialLabel: (a) => `Athen, ${a.time}. ${a.night}. Untergang ${a.sunset}, Aufgang ${a.sunrise}. Jetzt offen ${a.open} von ${a.total}.`,
  },
  fr: {
    heading: 'LA NUIT À ATHÈNES',
    headingNear: (city) => `PRÈS DE VOUS · ${city}`,
    night: 'la nuit', sunsetIn: 'coucher dans',
    sunset: 'COUCHER', sunrise: 'LEVER', moon: 'LUNE', openNow: 'OUVERT MAINTENANT', of: 'SUR',
    cities: 'VILLES', sunsetAt: 'COUCHER',
    cta: (city) => `Ouvrir le guide de ${city}`, ctaAll: 'Voir toutes les villes',
    hour: (n) => (n === 1 ? '1 heure' : `${n} heures`), minute: (n) => `${n} min`,
    dialLabel: (a) => `Athènes, ${a.time}. ${a.night}. Coucher ${a.sunset}, lever ${a.sunrise}. Ouvert maintenant ${a.open} sur ${a.total}.`,
  },
  it: {
    heading: 'LA NOTTE AD ATENE',
    headingNear: (city) => `VICINO A TE · ${city}`,
    night: 'la notte', sunsetIn: 'tramonto tra',
    sunset: 'TRAMONTO', sunrise: 'ALBA', moon: 'LUNA', openNow: 'APERTI ORA', of: 'SU',
    cities: 'CITTÀ', sunsetAt: 'TRAMONTO',
    cta: (city) => `Apri la guida di ${city}`, ctaAll: 'Vedi tutte le città',
    hour: (n) => (n === 1 ? '1 ora' : `${n} ore`), minute: (n) => `${n} min`,
    dialLabel: (a) => `Atene, ${a.time}. ${a.night}. Tramonto ${a.sunset}, alba ${a.sunrise}. Aperti ora ${a.open} su ${a.total}.`,
  },
};

function subscribe(onTick: () => void) {
  const id = window.setInterval(onTick, 15_000);
  return () => window.clearInterval(id);
}
const clientMinute = () => Math.floor(Date.now() / 60_000);
const serverMinute = () => -1;

export function HeroInstrument({
  locale, nowISO, sunsetISO, sunriseISO, windows, total, cities, fallbackCitySlug,
}: HeroInstrumentProps) {
  const t = COPY[locale] ?? COPY.el;
  const epochMinute = useSyncExternalStore(subscribe, clientMinute, serverMinute);
  const live = epochMinute >= 0;
  const now = live ? new Date(epochMinute * 60_000) : new Date(nowISO);

  const clock = athensClock(now);
  const set = minutesFromISO(sunsetISO);
  const rise = minutesFromISO(sunriseISO);
  const night = set != null && rise != null ? nightReading(clock.min, set, rise) : null;
  const moon = moonPhase(now);
  const open = countOpenAt(windows, clock.min);

  // The rows: canonical order on the server, by distance once the visitor's
  // position is known. Same list either way, so nothing appears or vanishes.
  const { hasLocation, nearestCities, visitor } = useNearbyCities();
  const bySlug = new Map(cities.map((c) => [c.slug, c]));
  const ordered: Row[] = live && hasLocation
    ? nearestCities
        .flatMap((c): Row[] => {
          const known = bySlug.get(c.slug);
          return known ? [{ ...known, distanceKm: c.distanceKm }] : [];
        })
        .slice(0, 5)
    : cities.slice(0, 5);
  const rows: Row[] = ordered.length > 0 ? ordered : cities.slice(0, 5);

  const bigReading = night
    ? night.night
      ? `${t.night} ${night.pct}%`
      : `${t.sunsetIn} ${durationWords(night.toSunset ?? 0, t)}`
    : null;

  const target = rows[0]?.slug ?? fallbackCitySlug;
  const targetName = rows[0]?.name ?? null;

  return (
    <section
      aria-labelledby="instrument-heading"
      className="grid items-center gap-5 rounded-[var(--radius-md)] border border-[var(--color-hair)] bg-[var(--color-surface)] p-[18px] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-9 md:p-7"
    >
      <NightDial
        now={now}
        sunsetISO={sunsetISO ?? undefined}
        sunriseISO={sunriseISO ?? undefined}
        size="l"
        sub={bigReading ? caps(bigReading) : undefined}
        label={t.dialLabel({
          time: hhmm(clock.min),
          night: bigReading ?? '',
          sunset: set != null ? hhmm(set) : '—',
          sunrise: rise != null ? hhmm(rise) : '—',
          open,
          total,
        })}
      />

      <div className="grid gap-3.5">
        <p id="instrument-heading" className="cn-readout text-[var(--color-muted)]">
          {live && hasLocation && visitor?.city ? t.headingNear(caps(visitor.city)) : t.heading}
        </p>

        {bigReading && (
          <p className="font-display text-[clamp(2.4rem,6vw,3.6rem)] font-semibold leading-none tracking-[-0.02em] tabular-nums">
            {bigReading}
          </p>
        )}

        <dl className="grid grid-cols-2 gap-x-[18px] gap-y-3 border-t border-[var(--color-hair)] pt-3.5">
          <Reading label={t.sunset} value={set != null ? hhmm(set) : '—'} />
          <Reading label={t.sunrise} value={rise != null ? hhmm(rise) : '—'} />
          <Reading label={t.moon} value={`${Math.round(moon.illum * 100)}%`} />
          <Reading
            label={t.openNow}
            value={total > 0 ? `${open} ${t.of} ${total}` : '—'}
            tone={total > 0 && open > 0 ? 'open' : 'default'}
          />
        </dl>

        {rows.length > 0 && (
          <ul className="border-t border-[var(--color-hair)]">
            {rows.map((city) => {
              const sun = city.lat != null && city.lng != null
                ? sunTimes(city.lat, city.lng, clock)
                : null;
              return (
                <li key={city.slug}>
                  <Link
                    href={`/${locale}/cities/${city.slug}`}
                    className="flex min-h-11 items-center justify-between gap-4 border-b border-[var(--color-hair)] py-3 transition-colors duration-[var(--motion-fast)] hover:text-[var(--color-bronze)]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold leading-tight">{city.name}</span>
                      <span className="cn-readout cn-readout-s block truncate text-[var(--color-muted)]">
                        {[city.region, city.distanceKm != null ? formatDistanceKm(city.distanceKm) : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    <span className="cn-readout shrink-0 text-[var(--color-muted)]">
                      {sun ? `${t.sunsetAt} ${hhmm(sun.set)}` : '—'}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {target && (
          <div>
            <Link
              href={`/${locale}/cities/${target}`}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-bronze)] px-[22px] font-semibold text-[var(--color-on-bronze)] transition-transform duration-[var(--motion-fast)] active:scale-[0.98]"
            >
              {targetName ? t.cta(targetName) : t.ctaAll}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function Reading({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'open' }) {
  return (
    <div>
      <dt className="cn-readout cn-readout-s text-[var(--color-muted)]">{label}</dt>
      <dd className={`cn-readout cn-readout-l mt-0.5 ${tone === 'open' ? 'text-[var(--color-verdigris)]' : 'text-[var(--color-ink)]'}`}>
        {value}
      </dd>
    </div>
  );
}
