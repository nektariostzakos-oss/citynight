// Phase K.4 — per-city live weather via Open-Meteo.
//
// Open-Meteo (https://open-meteo.com) is free, no API key, no auth, no
// rate-limiting for normal traffic, and serves Europe/Athens out of the
// box. One GET per city per 15 minutes covers the entire visitor base
// because we cache in-process on the server and Next ISR caches the
// rendered fragment too.
//
// We deliberately don't surface the visitor's location here — the
// weather we show is the CITY's weather (the article guide is about
// that city). The visitor reads "Athens 22° · light wind" and that's
// useful regardless of where they are.

import 'server-only';

const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';
const CACHE_TTL_MS = 15 * 60_000;

export type CityWeather = {
  temperatureC: number;
  /** Apparent temperature (feels-like) in °C. */
  feelsLikeC: number;
  /** Wind speed in km/h. */
  windKmh: number;
  /** Wind direction in degrees from north (meteorological convention). */
  windDegrees: number;
  /** WMO weather code (0=clear, 1-3=cloudy variants, 45=fog, 51-67=rain
   * variants, 71-77=snow, 80-86=showers, 95-99=thunder). */
  weatherCode: number;
  /** 1 if Open-Meteo considers it daytime in the city's timezone. */
  isDay: boolean;
  /** ISO timestamp of the Open-Meteo "current" observation. */
  observedAt: string;
};

type CacheEntry = { value: CityWeather; expires: number };
const cache = new Map<string, CacheEntry>();

function cacheKey(lat: number, lng: number): string {
  // Round to 2 decimal places (~1.1km). Adjacent venues in the same city
  // share a cache slot — cuts redundant calls when multiple cities sit
  // close together in the table.
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

/**
 * Fetch current weather for a (lat, lng). Returns null on network /
 * parse failure — caller should render a graceful fallback rather than
 * blow up the page. Times out after 4s so a slow upstream never blocks
 * a city page beyond Open-Meteo's normal latency.
 */
export async function getCityWeather(lat: number, lng: number): Promise<CityWeather | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const key = cacheKey(lat, lng);
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) return hit.value;

  const url = `${OPEN_METEO}?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,weather_code,is_day` +
    `&wind_speed_unit=kmh&timezone=Europe%2FAthens`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  let parsed: CityWeather | null = null;
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      // Next ISR cache layer on top of our in-process cache — 15 min.
      next: { revalidate: 900 },
    });
    if (!res.ok) throw new Error(`open-meteo ${res.status}`);
    const json = await res.json() as {
      current?: {
        time?: string;
        temperature_2m?: number;
        apparent_temperature?: number;
        wind_speed_10m?: number;
        wind_direction_10m?: number;
        weather_code?: number;
        is_day?: number;
      };
    };
    const c = json.current;
    if (!c || typeof c.temperature_2m !== 'number') throw new Error('no current');
    parsed = {
      temperatureC: c.temperature_2m,
      feelsLikeC: c.apparent_temperature ?? c.temperature_2m,
      windKmh: c.wind_speed_10m ?? 0,
      windDegrees: c.wind_direction_10m ?? 0,
      weatherCode: c.weather_code ?? 0,
      isDay: c.is_day === 1,
      observedAt: c.time ?? new Date().toISOString(),
    };
    cache.set(key, { value: parsed, expires: now + CACHE_TTL_MS });
  } catch (err) {
    // Swallow — caller decides whether to retry on next render.
    void err;
  } finally {
    clearTimeout(timeout);
  }
  return parsed;
}

// ─── WMO weather code → label + emoji ────────────────────────────────
//
// Open-Meteo uses WMO 4677 weather codes. Compact mapping below covers
// the 20 codes the API actually emits in Greece (others are theoretical).
// Labels are in five locales so the strip reads natively per page.

export type WeatherLabel = { emoji: string; en: string; el: string; de: string; fr: string; it: string };

const WMO: Record<number, WeatherLabel> = {
  0:  { emoji: '☀️', en: 'Clear',          el: 'Αίθριος',       de: 'Klar',           fr: 'Ciel clair',     it: 'Sereno' },
  1:  { emoji: '🌤️', en: 'Mostly clear',   el: 'Σχεδόν αίθριος', de: 'Heiter',         fr: 'Peu nuageux',    it: 'Quasi sereno' },
  2:  { emoji: '⛅', en: 'Partly cloudy',  el: 'Λίγες νεφώσεις', de: 'Teils bewölkt',  fr: 'Partiellement nuageux', it: 'Parz. nuvoloso' },
  3:  { emoji: '☁️', en: 'Overcast',       el: 'Συννεφιά',       de: 'Bedeckt',        fr: 'Couvert',        it: 'Nuvoloso' },
  45: { emoji: '🌫️', en: 'Fog',             el: 'Ομίχλη',         de: 'Nebel',          fr: 'Brouillard',     it: 'Nebbia' },
  48: { emoji: '🌫️', en: 'Icy fog',         el: 'Παγωμένη ομίχλη',de: 'Reifnebel',      fr: 'Brouillard givrant', it: 'Nebbia gelata' },
  51: { emoji: '🌦️', en: 'Light drizzle',   el: 'Ελαφρύ ψιλόβροχο', de: 'Leichter Sprühregen', fr: 'Bruine légère', it: 'Pioviggine leggera' },
  53: { emoji: '🌦️', en: 'Drizzle',         el: 'Ψιλόβροχο',      de: 'Sprühregen',     fr: 'Bruine',         it: 'Pioviggine' },
  55: { emoji: '🌧️', en: 'Heavy drizzle',   el: 'Δυνατό ψιλόβροχο', de: 'Starker Sprühregen', fr: 'Bruine dense', it: 'Pioviggine forte' },
  61: { emoji: '🌧️', en: 'Light rain',      el: 'Ελαφριά βροχή',  de: 'Leichter Regen', fr: 'Pluie légère',   it: 'Pioggia leggera' },
  63: { emoji: '🌧️', en: 'Rain',            el: 'Βροχή',          de: 'Regen',          fr: 'Pluie',          it: 'Pioggia' },
  65: { emoji: '🌧️', en: 'Heavy rain',      el: 'Δυνατή βροχή',   de: 'Starker Regen',  fr: 'Forte pluie',    it: 'Pioggia forte' },
  71: { emoji: '🌨️', en: 'Light snow',      el: 'Ελαφρύ χιόνι',   de: 'Leichter Schnee', fr: 'Neige légère',  it: 'Neve leggera' },
  73: { emoji: '🌨️', en: 'Snow',            el: 'Χιόνι',          de: 'Schnee',         fr: 'Neige',          it: 'Neve' },
  75: { emoji: '❄️', en: 'Heavy snow',      el: 'Δυνατό χιόνι',   de: 'Starker Schnee', fr: 'Forte neige',    it: 'Neve forte' },
  80: { emoji: '🌦️', en: 'Showers',         el: 'Σποραδικές βροχές', de: 'Schauer',     fr: 'Averses',        it: 'Rovesci' },
  81: { emoji: '🌧️', en: 'Strong showers',  el: 'Δυνατές μπόρες', de: 'Starker Schauer', fr: 'Averses fortes',it: 'Rovesci forti' },
  82: { emoji: '⛈️', en: 'Violent showers', el: 'Καταιγίδες',     de: 'Heftige Schauer', fr: 'Averses violentes', it: 'Rovesci violenti' },
  95: { emoji: '⛈️', en: 'Thunderstorm',    el: 'Καταιγίδα',      de: 'Gewitter',       fr: 'Orage',          it: 'Temporale' },
  96: { emoji: '⛈️', en: 'Storm + hail',    el: 'Καταιγ. & χαλάζι', de: 'Gewitter & Hagel', fr: 'Orage + grêle', it: 'Temp. + grandine' },
  99: { emoji: '⛈️', en: 'Severe storm',    el: 'Σφοδρή καταιγίδα', de: 'Schweres Gewitter', fr: 'Orage violent', it: 'Temporale violento' },
};

export function weatherLabel(code: number, locale: string): { emoji: string; text: string } {
  const entry = WMO[code] ?? WMO[3]!; // unknown code → 'Overcast' fallback
  const text = (entry as unknown as Record<string, string>)[locale] ?? entry.en;
  return { emoji: entry.emoji, text };
}

/** "ΒΑ" / "NE" — compass abbreviation from degrees. 16-point rose. */
export function windCompass(degrees: number, locale: string): string {
  const idx = Math.round(((degrees % 360) + 360) % 360 / 22.5) % 16;
  const EN = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  const EL = ['Β','ΒΒΑ','ΒΑ','ΑΒΑ','Α','ΑΝΑ','ΝΑ','ΝΝΑ','Ν','ΝΝΔ','ΝΔ','ΔΝΔ','Δ','ΔΒΔ','ΒΔ','ΒΒΔ'];
  return locale === 'el' ? EL[idx]! : EN[idx]!;
}
