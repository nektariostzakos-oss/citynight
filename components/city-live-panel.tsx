// The city instrument. Direction A "Αντικύθηρα" — every city opens on a
// reading of the night: how far it has gone, when the sun set and will rise,
// how many places are open right now.
//
// Pure server component. The dial is drawn from a timestamp passed in, so the
// server and the client draw the same picture; the numbers are written out
// beside it, which is also what a screen reader gets (the SVG itself is
// labelled once and otherwise silent).
//
// Data is unchanged from the previous panel: Open-Meteo for weather, sun and
// sea (lib/weather.ts, in-process cache + ISR), nearby cities from our own DB.

import Link from 'next/link';
import { getCityWeather, getSeaTemperature, weatherLabel } from '@/lib/weather';
import { listNearbyCities, type City } from '@/lib/queries';
import type { Locale } from '@/lib/i18n';
import { stateColor, type VenueState } from '@/components/venue-card';
import {
  athensClock, hhmm, minutesFromISO, moonPhase, nightReading, sunTimes,
} from '@/components/instrument/night';
// The one dial of the product, built by the home stream. The live wrapper
// re-renders it once a minute so the needle keeps real Athens time; nothing
// here draws a second dial.
import { NightDialLive } from '@/components/instrument/night-dial-live';

/** One ring of the dial: a venue, its state, and today's opening windows. */
export type DialRing = {
  name: string;
  state: VenueState;
  hours: { open: string; close: string }[];
};

type Props = {
  city: City;
  locale: Locale;
  /** Venues open right now, out of the verified venues we hold for the city. */
  openNow?: number;
  total?: number;
  rings?: DialRing[];
  /** Render timestamp. Passed in so every reading on the page agrees. */
  now?: Date;
};

export async function CityLivePanel({ city, locale, openNow, total, rings = [], now = new Date() }: Props) {
  if (typeof city.lat !== 'number' || typeof city.lng !== 'number') return null;

  const wantSea = city.terrain === 'seaside' || city.terrain === 'island' || city.terrain === 'island_capital';
  const [weather, sea, nearby] = await Promise.all([
    getCityWeather(city.lat, city.lng),
    wantSea ? getSeaTemperature(city.lat, city.lng) : Promise.resolve(null),
    Promise.resolve(listNearbyCities(city.id, locale, 5)),
  ]);

  const t = LABELS[locale === 'el' ? 'el' : 'en'];
  const clock = athensClock(now);
  // A measured sunset always wins; the NOAA approximation only fills in when
  // Open-Meteo is unreachable.
  const approx = sunTimes(city.lat, city.lng, clock);
  const set = minutesFromISO(weather?.sunsetIso) ?? approx?.set ?? null;
  const rise = minutesFromISO(weather?.sunriseIso) ?? approx?.rise ?? null;
  const night = set != null && rise != null ? nightReading(clock.min, set, rise) : null;
  const moon = moonPhase(now);

  const big = night
    ? night.night ? t.nightPct(night.pct ?? 0) : t.sunsetIn(inWords(night.toSunset ?? 0, t))
    : t.sunUnknown;
  const label = [
    `${city.name}, ${hhmm(clock.min)}.`,
    night ? (night.night ? `${t.nightPct(night.pct ?? 0)}.` : `${t.sunsetIn(inWords(night.toSunset ?? 0, t))}.`) : '',
    set != null && rise != null ? `${t.sunset} ${hhmm(set)}, ${t.sunrise} ${hhmm(rise)}.` : '',
    openNow != null && total != null ? `${t.openNow} ${openNow}/${total}.` : '',
  ].filter(Boolean).join(' ');

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${city.lat},${city.lng}&travelmode=driving`;

  return (
    <section className="rounded-[20px] border border-[var(--color-hair)] bg-[var(--color-surface)] p-[18px]">
      <NightDialLive
        now={now}
        sunsetISO={weather?.sunsetIso ?? undefined}
        sunriseISO={weather?.sunriseIso ?? undefined}
        rings={rings.map((r) => r.hours)}
        size="l"
        label={label}
        sub={night?.night ? t.dialSubNight : set != null ? t.dialSubDay(hhmm(set)) : undefined}
      />

      <p className="mt-4 cn-readout cn-readout-s text-[var(--color-muted)]">{t.tonight}</p>
      <p className="mt-2 text-[clamp(1.8rem,5vw,2.6rem)] leading-none font-semibold tabular-nums">{big}</p>

      <dl className="mt-3.5 grid grid-cols-2 gap-x-[18px] gap-y-3 border-t border-[var(--color-hair)] pt-3.5">
        <Reading label={t.sunset} value={set != null ? hhmm(set) : t.unknown} />
        <Reading label={t.sunrise} value={rise != null ? hhmm(rise) : t.unknown} />
        <Reading label={t.moon} value={`${Math.round(moon.illum * 100)}%`} />
        {openNow != null && total != null && (
          <Reading label={t.openNow} value={`${openNow} ${t.outOf} ${total}`} tone="open" />
        )}
        {weather && (
          <Reading label={t.weather} value={`${Math.round(weather.temperatureC)}°`} hint={weatherLabel(weather.weatherCode, locale).text} />
        )}
        {wantSea && (
          <Reading label={t.sea} value={sea != null ? `${Math.round(sea)}°` : t.unknown} hint={sea == null ? t.noData : undefined} />
        )}
      </dl>

      {rings.length > 0 && (
        <ul className="mt-3 grid gap-2 border-t border-[var(--color-hair)] pt-3 text-[14px]">
          {rings.map((r, i) => (
            <li key={`${r.name}-${i}`} className="grid grid-cols-[34px_1fr_auto] items-center gap-2.5">
              <span className="cn-readout cn-readout-s text-[var(--color-muted)]">R{i + 1}</span>
              <span className="truncate text-[var(--color-ink)]">{r.name}</span>
              <span className={`cn-readout cn-readout-s ${stateColor(r.state.key)}`}>
                {r.state.text}
              </span>
            </li>
          ))}
        </ul>
      )}

      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--color-hair)] px-5 text-[15px] font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-bronze)] hover:text-[var(--color-bronze)]"
      >
        {t.directions}
      </a>

      {nearby.length > 0 && (
        <div className="mt-4 border-t border-[var(--color-hair)] pt-4">
          <p className="cn-readout cn-readout-s text-[var(--color-muted)]">{t.alsoNearby}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {nearby.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/${locale}/cities/${n.slug}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-hair)] px-4 text-[15px] text-[var(--color-ink)] transition-colors hover:border-[var(--color-bronze)]"
                >
                  {n.name}
                  <span className="cn-readout cn-readout-s text-[var(--color-muted)]">
                    {Math.round(n.distanceKm)} {t.km}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Reading({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'open' }) {
  return (
    <div>
      <dt className="cn-readout cn-readout-s text-[var(--color-muted)]">{label}</dt>
      <dd className={`mt-0.5 cn-readout cn-readout-l ${tone === 'open' ? 'text-[var(--color-verdigris)]' : 'text-[var(--color-ink)]'}`}>
        {value}
      </dd>
      {hint && <dd className="text-[13px] text-[var(--color-muted)]">{hint}</dd>}
    </div>
  );
}

/** "2 ώρες 10′" — how long until the sun goes down. */
function inWords(mins: number, t: LabelPack): string {
  if (mins <= 0) return t.now;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hours = h ? `${h} ${h === 1 ? t.hour : t.hours}` : '';
  const minutes = m ? `${m}′` : '';
  return [hours, minutes].filter(Boolean).join(' ');
}

type LabelPack = {
  tonight: string; sunset: string; sunrise: string; moon: string;
  openNow: string; outOf: string; weather: string; sea: string; noData: string; unknown: string;
  directions: string; alsoNearby: string; km: string;
  now: string; hour: string; hours: string; sunUnknown: string;
  dialSubNight: string;
  dialSubDay: (time: string) => string;
  nightPct: (pct: number) => string;
  sunsetIn: (words: string) => string;
};

// Readouts are Greek capitals without accents; the big line is a sentence.
const LABELS: Record<'el' | 'en', LabelPack> = {
  el: {
    tonight: 'ΑΠΟΨΕ ΕΔΩ', sunset: 'ΔΥΣΗ', sunrise: 'ΑΝΑΤΟΛΗ', moon: 'ΣΕΛΗΝΗ',
    openNow: 'ΑΝΟΙΧΤΑ ΤΩΡΑ', outOf: 'από', weather: 'ΚΑΙΡΟΣ', sea: 'ΘΑΛΑΣΣΑ', noData: 'χωρίς δεδομένα', unknown: 'ΑΓΝΩΣΤΟ',
    directions: 'Οδηγίες προς την πόλη', alsoNearby: 'ΕΠΙΣΗΣ ΚΟΝΤΑ', km: 'ΧΛΜ',
    now: 'τώρα', hour: 'ώρα', hours: 'ώρες', sunUnknown: 'ο ήλιος δεν υπολογίζεται εδώ',
    nightPct: (pct) => `η νύχτα ${pct}%`,
    sunsetIn: (words) => `δύση σε ${words}`,
    dialSubNight: 'Η ΝΥΧΤΑ {pct}%',
    dialSubDay: (time) => `ΔΥΣΗ ΣΤΙΣ ${time}`,
  },
  en: {
    tonight: 'TONIGHT HERE', sunset: 'SUNSET', sunrise: 'SUNRISE', moon: 'MOON',
    openNow: 'OPEN NOW', outOf: 'of', weather: 'WEATHER', sea: 'SEA', noData: 'no data', unknown: 'UNKNOWN',
    directions: 'Directions to the city', alsoNearby: 'ALSO NEARBY', km: 'KM',
    now: 'now', hour: 'hour', hours: 'hours', sunUnknown: 'the sun cannot be computed here',
    nightPct: (pct) => `the night ${pct}%`,
    sunsetIn: (words) => `sunset in ${words}`,
    dialSubNight: 'THE NIGHT {pct}%',
    dialSubDay: (time) => `SUNSET AT ${time}`,
  },
};
