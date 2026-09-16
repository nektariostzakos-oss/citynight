// Live information panel on city guide pages. Renders weather, sun
// times, sea temperature (seaside cities only), Google-Maps deep-link,
// and nearby cities — everything a visitor needs to decide "go now / wait
// / go elsewhere".
//
// Pure server component. All data ultimately comes from Open-Meteo (free,
// no key) or our own DB. Cached via Next ISR on the page route + our
// in-process caches in lib/weather.ts.

import Link from 'next/link';
import { getCityWeather, getSeaTemperature, weatherLabel, windCompass } from '@/lib/weather';
import { listNearbyCities, type City } from '@/lib/queries';
import type { Locale } from '@/lib/i18n';

type Props = {
  city: City;
  locale: Locale;
};

export async function CityLivePanel({ city, locale }: Props) {
  if (typeof city.lat !== 'number' || typeof city.lng !== 'number') return null;

  // Fetch the three live signals in parallel. Sea temp is only fetched
  // for seaside/island terrains — inland cities legitimately have no
  // marine data, and the call would just return null after a 4s timeout.
  const wantSea = city.terrain === 'seaside' || city.terrain === 'island' || city.terrain === 'island_capital';
  const [weather, sea, nearby] = await Promise.all([
    getCityWeather(city.lat, city.lng),
    wantSea ? getSeaTemperature(city.lat, city.lng) : Promise.resolve(null),
    Promise.resolve(listNearbyCities(city.id, locale, 5)),
  ]);

  const t = LABELS[locale === 'el' ? 'el' : 'en'];
  const sunsetText = formatSunEvent(weather?.sunsetIso, weather?.sunriseIso, t);
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${city.lat},${city.lng}&travelmode=driving`;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${city.lat},${city.lng}`;

  return (
    <section className="border-b border-[var(--color-bg-2)] bg-[var(--color-bg-1)]/40">
      <div className="mx-auto max-w-5xl px-6 py-6 md:px-10 md:py-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* WEATHER */}
          {weather && (
            <Tile
              icon={weatherLabel(weather.weatherCode, locale).emoji}
              label={t.weather}
              value={`${Math.round(weather.temperatureC)}°`}
              hint={`${weatherLabel(weather.weatherCode, locale).text} · 🍃 ${Math.round(weather.windKmh)} km/h ${windCompass(weather.windDegrees, locale)}`}
              extra={weather.tempMaxC != null && weather.tempMinC != null
                ? `↑${Math.round(weather.tempMaxC)}° ↓${Math.round(weather.tempMinC)}°` : undefined}
            />
          )}

          {/* SUNSET / SUNRISE */}
          {sunsetText && (
            <Tile
              icon={sunsetText.icon}
              label={sunsetText.label}
              value={sunsetText.time}
              hint={sunsetText.in}
            />
          )}

          {/* SEA TEMP (seaside only) */}
          {wantSea && (
            <Tile
              icon="🌊"
              label={t.sea}
              value={sea != null ? `${Math.round(sea)}°` : '—'}
              hint={sea != null ? t.seaHint : t.seaUnavailable}
              muted={sea == null}
            />
          )}

          {/* DIRECTIONS */}
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col rounded-2xl border border-[var(--color-bg-2)] bg-[var(--color-bg-1)] p-4 transition hover:border-[var(--color-accent-cyan)]"
          >
            <span className="text-2xl leading-none">🚗</span>
            <span className="mt-3 text-[10px] uppercase tracking-[0.15em] text-[var(--color-fg-2)]">{t.directions}</span>
            <span className="mt-1 font-medium text-[var(--color-fg-0)] group-hover:text-[var(--color-accent-cyan)]">
              {t.openInMaps}
            </span>
            <span className="mt-auto pt-2 text-xs text-[var(--color-fg-2)]">{t.directionsHint}</span>
          </a>
        </div>

        {/* NEARBY CITIES */}
        {nearby.length > 0 && (
          <div className="mt-6">
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--color-fg-2)]">{t.alsoNearby}</p>
            <ul className="flex flex-wrap gap-2">
              {nearby.map((n) => (
                <li key={n.id}>
                  <Link
                    href={`/${locale}/cities/${n.slug}`}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--color-bg-2)] bg-[var(--color-bg-1)] px-3 py-1.5 text-sm transition hover:border-[var(--color-accent-cyan)] hover:bg-[var(--color-bg-2)]"
                  >
                    <span className="text-[var(--color-fg-0)]">{n.name}</span>
                    <span className="text-xs text-[var(--color-fg-2)] tabular-nums">{Math.round(n.distanceKm)} km</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* MAP LINK — small, secondary */}
        <p className="mt-4 text-xs text-[var(--color-fg-2)]">
          <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:text-[var(--color-fg-0)] hover:underline">
            {t.viewOnMap} →
          </a>
        </p>
      </div>
    </section>
  );
}

function Tile({ icon, label, value, hint, extra, muted }: {
  icon: string; label: string; value: string; hint?: string; extra?: string; muted?: boolean;
}) {
  return (
    <div className={`flex flex-col rounded-2xl border border-[var(--color-bg-2)] bg-[var(--color-bg-1)] p-4 ${muted ? 'opacity-60' : ''}`}>
      <span className="text-2xl leading-none">{icon}</span>
      <span className="mt-3 text-[10px] uppercase tracking-[0.15em] text-[var(--color-fg-2)]">{label}</span>
      <span className="mt-1 font-display text-2xl font-semibold text-[var(--color-fg-0)] tabular-nums">{value}</span>
      {hint && <span className="mt-1 text-xs text-[var(--color-fg-2)]">{hint}</span>}
      {extra && <span className="mt-auto pt-2 text-xs text-[var(--color-fg-2)] tabular-nums">{extra}</span>}
    </div>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────

/** Pick the next sun event (sunset if still ahead today, otherwise next
 *  sunrise). Returns label + clock time + relative hint ("σε 3h 14min"). */
function formatSunEvent(
  sunsetIso: string | null | undefined,
  sunriseIso: string | null | undefined,
  t: LabelPack,
): { icon: string; label: string; time: string; in: string } | null {
  if (!sunsetIso && !sunriseIso) return null;
  const now = new Date();
  const sunset = sunsetIso ? new Date(sunsetIso) : null;
  const sunrise = sunriseIso ? new Date(sunriseIso) : null;

  // After today's sunset → show tomorrow's sunrise (which Open-Meteo
  // returns when forecast_days=2; we only fetch 1 day for now so we just
  // fall back to "today's sunrise" — readable even if past).
  if (sunset && sunset.getTime() > now.getTime()) {
    return {
      icon: '🌅',
      label: t.sunset,
      time: clock(sunset),
      in: relative(sunset, now, t),
    };
  }
  if (sunrise) {
    return {
      icon: '🌄',
      label: t.sunrise,
      time: clock(sunrise),
      in: sunrise.getTime() > now.getTime() ? relative(sunrise, now, t) : t.alreadyPast,
    };
  }
  return null;
}

function clock(d: Date): string {
  return new Intl.DateTimeFormat('el-GR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Athens' }).format(d);
}

function relative(target: Date, now: Date, t: LabelPack): string {
  const mins = Math.max(0, Math.round((target.getTime() - now.getTime()) / 60_000));
  if (mins < 60) return `${t.in} ${mins} ${t.min}`;
  const h = Math.floor(mins / 60); const m = mins % 60;
  return `${t.in} ${h}${t.hour} ${m}${t.min}`;
}

type LabelPack = {
  weather: string; sea: string; seaHint: string; seaUnavailable: string;
  directions: string; openInMaps: string; directionsHint: string;
  alsoNearby: string; viewOnMap: string;
  sunset: string; sunrise: string;
  in: string; min: string; hour: string; alreadyPast: string;
};

const LABELS: Record<'el' | 'en', LabelPack> = {
  el: {
    weather: 'Καιρός', sea: 'Θάλασσα', seaHint: 'θερμοκρασία τώρα', seaUnavailable: 'χωρίς δεδομένα',
    directions: 'Πώς πας', openInMaps: 'Άνοιξε στο Maps', directionsHint: 'οδηγίες με αυτοκίνητο',
    alsoNearby: 'Επίσης κοντά', viewOnMap: 'Δες την περιοχή στον χάρτη',
    sunset: 'Δύση ηλίου', sunrise: 'Ανατολή ηλίου',
    in: 'σε', min: 'λ', hour: 'ω', alreadyPast: 'πέρασε',
  },
  en: {
    weather: 'Weather', sea: 'Sea', seaHint: 'temp right now', seaUnavailable: 'no data',
    directions: 'Get there', openInMaps: 'Open in Maps', directionsHint: 'driving directions',
    alsoNearby: 'Also nearby', viewOnMap: 'See the area on the map',
    sunset: 'Sunset', sunrise: 'Sunrise',
    in: 'in', min: 'min', hour: 'h', alreadyPast: 'already past',
  },
};
