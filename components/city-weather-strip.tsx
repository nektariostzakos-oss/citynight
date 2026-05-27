// Phase K.4 — server-rendered weather + local-time strip for city pages.
//
// Pure server component (no client JS). The Open-Meteo fetch is cached
// in-process AND wrapped in Next ISR so this strip is essentially free
// after the first request per 15-minute window.

import { getCityWeather, weatherLabel, windCompass } from '@/lib/weather';
import { formatAthensTime } from '@/lib/format-date';

type Props = {
  lat: number | null | undefined;
  lng: number | null | undefined;
  locale: string;
};

export async function CityWeatherStrip({ lat, lng, locale }: Props) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  const weather = await getCityWeather(lat, lng);
  // Show the time even if weather fetch failed — the local clock is
  // still useful information ("23:00 in Athens").
  const localTime = formatAthensTime(new Date(), locale);

  if (!weather) {
    return (
      <div className="inline-flex items-center gap-3 rounded-full border border-[var(--color-bg-2)] bg-[var(--color-bg-1)] px-4 py-2 text-sm text-[var(--color-fg-1)]">
        <span className="font-mono tabular-nums">{localTime}</span>
      </div>
    );
  }

  const { emoji, text } = weatherLabel(weather.weatherCode, locale);
  const wind = windCompass(weather.windDegrees, locale);
  const temp = Math.round(weather.temperatureC);
  const windKmh = Math.round(weather.windKmh);

  return (
    <div className="inline-flex flex-wrap items-center gap-x-4 gap-y-1 rounded-full border border-[var(--color-bg-2)] bg-[var(--color-bg-1)] px-4 py-2 text-sm text-[var(--color-fg-1)]">
      <span className="font-mono tabular-nums text-[var(--color-fg-0)]" suppressHydrationWarning>
        {localTime}
      </span>
      <span aria-hidden className="text-[var(--color-fg-3)]">·</span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="text-base leading-none">{emoji}</span>
        <span className="font-semibold text-[var(--color-fg-0)] tabular-nums">{temp}°</span>
        <span className="text-[var(--color-fg-2)]">{text}</span>
      </span>
      <span aria-hidden className="text-[var(--color-fg-3)]">·</span>
      <span className="inline-flex items-center gap-1 text-[var(--color-fg-2)]">
        <span aria-hidden>🍃</span>
        <span className="tabular-nums">{windKmh}</span>
        <span className="text-[10px] uppercase tracking-widest">km/h</span>
        <span className="text-[var(--color-fg-3)]">{wind}</span>
      </span>
    </div>
  );
}
