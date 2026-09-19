// The city's live strip: Athens clock, temperature, sky, wind. One line of
// readings under the city name — Lilex, tabular, Greek capitals without
// accents, the way every reading is written in Direction A "Αντικύθηρα".
//
// Pure server component (no client JS). The Open-Meteo fetch is cached
// in-process AND wrapped in Next ISR, so the strip is essentially free after
// the first request per 15-minute window. Data reads are unchanged.

import { getCityWeather, weatherLabel, windCompass } from '@/lib/weather';
import { formatAthensTime } from '@/lib/format-date';

type Props = {
  lat: number | null | undefined;
  lng: number | null | undefined;
  locale: string;
};

/** Greek capitals without accents, the readout case. */
function up(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().normalize('NFC');
}

export async function CityWeatherStrip({ lat, lng, locale }: Props) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  const weather = await getCityWeather(lat, lng);
  // Show the time even if the weather fetch failed — the local clock is still
  // the first reading of the night.
  const localTime = formatAthensTime(new Date(), locale);
  const t = LABELS[locale === 'el' ? 'el' : 'en'];

  if (!weather) {
    return (
      <p className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-hair)] px-4 cn-readout text-[var(--color-muted)]">
        <span className="text-[var(--color-ink)] tabular-nums" suppressHydrationWarning>{localTime}</span>
        <span>{t.athens}</span>
      </p>
    );
  }

  const { text } = weatherLabel(weather.weatherCode, locale);

  return (
    <p className="inline-flex min-h-11 flex-wrap items-center gap-x-4 gap-y-1 rounded-full border border-[var(--color-hair)] px-4 py-2 cn-readout text-[var(--color-muted)]">
      <span className="text-[var(--color-ink)] tabular-nums" suppressHydrationWarning>
        {localTime} {t.athens}
      </span>
      <span aria-hidden className="text-[var(--color-faint)]">·</span>
      <span>
        <span className="text-[var(--color-ink)] tabular-nums">{Math.round(weather.temperatureC)}°</span>{' '}
        {up(text)}
      </span>
      <span aria-hidden className="text-[var(--color-faint)]">·</span>
      <span>
        {t.wind} <span className="text-[var(--color-ink)] tabular-nums">{Math.round(weather.windKmh)}</span>{' '}
        {t.kmh} {up(windCompass(weather.windDegrees, locale))}
      </span>
    </p>
  );
}

const LABELS: Record<'el' | 'en', { athens: string; wind: string; kmh: string }> = {
  el: { athens: 'ΑΘΗΝΑ', wind: 'ΑΝΕΜΟΣ', kmh: 'ΧΛΜ/Ω' },
  en: { athens: 'ATHENS', wind: 'WIND', kmh: 'KM/H' },
};
