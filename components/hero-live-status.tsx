'use client';

import { useEffect, useMemo, useState } from 'react';
import { useVisitorLocation } from './visitor-location-provider';
import type { Locale } from '@/lib/i18n';

// Hero live-status strip. Phase K.13 rewrite.
//
// What changed since the original pill:
//   1. Shows date + time + weather emoji + temperature in addition to
//      the LIVE dot.
//   2. Weather is the VISITOR'S local weather (via GPS → /api/weather)
//      instead of national Athens weather, when GPS is available. Falls
//      back to Athens when GPS is off / visitor is outside Greece.
//   3. A friendly, time-aware message rotates with the hour ("Slow
//      start, coffee first?" / "The terraces are warming up" / "Athens
//      is still going strong"). Saturday and Friday night get bespoke
//      lines. The message reads like a chat note from a local friend.
//
// All client-side, with a 30s tick. SSR renders a stable skeleton
// (LIVE pill only) so hydration stays safe.

type WeatherSnap = {
  emoji: string;
  label: string;
  tempC: number;
  /** WMO code so the message picker can branch on rain/storm/etc.
   *  See lib/weather.ts for the code → label mapping. */
  weatherCode: number;
};

export function HeroLiveStatus({ locale }: { locale: Locale }) {
  const t = TONE[locale];
  const { visitor } = useVisitorLocation();

  const [now, setNow] = useState<Date | null>(null);
  const [weather, setWeather] = useState<WeatherSnap | null>(null);

  // Pin date/time to Europe/Athens — the editorial timezone for the
  // whole site, regardless of where the visitor's browser is set.
  const timeStr = useMemo(() => {
    if (!now) return '··:··';
    return new Intl.DateTimeFormat(locale === 'el' ? 'el-GR' : locale, {
      timeZone: 'Europe/Athens', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(now);
  }, [now, locale]);

  const dateStr = useMemo(() => {
    if (!now) return '';
    return new Intl.DateTimeFormat(locale === 'el' ? 'el-GR' : locale, {
      timeZone: 'Europe/Athens', weekday: 'short', day: 'numeric', month: 'short',
    }).format(now);
  }, [now, locale]);

  // Friendly time-aware message. Recomputes on every tick so as the
  // hour rolls over from 22 → 23 the line moves with it.
  const message = useMemo(() => {
    if (!now) return t.openNow;
    const athensHour = parseInt(
      new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', hour: '2-digit', hour12: false }).format(now),
      10,
    );
    const athensDow = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', weekday: 'short' }).format(now);
    // Weather + city are smart inputs ([[project-smart-homepage-tagline]]).
    // Severe weather overrides time-of-day; the message picker decides
    // which dimension wins for the current moment.
    return friendlyMessage(athensHour, athensDow, weather?.weatherCode ?? null, weather?.tempC ?? null, visitor.city, t);
  }, [now, t, weather?.weatherCode, weather?.tempC, visitor.city]);

  // ─── ticking clock ───────────────────────────────────────────────
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // ─── weather fetch (visitor GPS preferred, Athens fallback) ─────
  useEffect(() => {
    const ac = new AbortController();
    const lat = visitor.lat;
    const lng = visitor.lng;
    const query = lat != null && lng != null
      ? `?lat=${lat.toFixed(3)}&lng=${lng.toFixed(3)}&locale=${locale}`
      : `?locale=${locale}`;
    fetch(`/api/weather${query}`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j && j.ok) setWeather({ emoji: j.emoji, label: j.label, tempC: j.tempC, weatherCode: j.weatherCode });
      })
      .catch(() => { /* swallow — UI just hides the weather chunk */ });
    return () => ac.abort();
  }, [visitor.lat, visitor.lng, locale]);

  return (
    <div className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-[var(--color-accent-cyan)]/40 bg-[var(--color-accent-cyan)]/8 px-3 py-1.5 text-[11px] font-medium uppercase tracking-widest text-[var(--color-accent-cyan)] backdrop-blur">
      <span className="relative inline-flex h-2 w-2 items-center justify-center" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-accent-cyan)] opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-accent-cyan)]" />
      </span>
      <span>{t.live}</span>

      {dateStr && (
        <>
          <span aria-hidden className="text-[var(--color-fg-3)]">·</span>
          <span suppressHydrationWarning className="font-mono text-[var(--color-fg-1)] normal-case tracking-normal">
            {dateStr}
          </span>
        </>
      )}

      <span aria-hidden className="text-[var(--color-fg-3)]">·</span>
      <span suppressHydrationWarning className="font-mono text-[var(--color-fg-0)] normal-case tracking-normal">
        {timeStr}
      </span>

      {weather && (
        <>
          <span aria-hidden className="text-[var(--color-fg-3)]">·</span>
          <span className="inline-flex items-center gap-1 normal-case tracking-normal text-[var(--color-fg-1)]">
            <span aria-hidden>{weather.emoji}</span>
            <span className="font-mono text-[var(--color-fg-0)]">{weather.tempC}°</span>
          </span>
        </>
      )}

      <span aria-hidden className="text-[var(--color-fg-3)]">·</span>
      <span className="normal-case tracking-normal text-[var(--color-fg-1)]" suppressHydrationWarning>
        {message}
      </span>
    </div>
  );
}

// ─── tone / message bank ──────────────────────────────────────────

type Tone = {
  live: string;
  // Default by-hour bucket lines.
  openNow: string;          // 11–16  (afternoon idle)
  prePeak: string;          // 17–19  (terrace warm-up)
  prime: string;            // 20–22  (going-out window)
  peak: string;             // 23–01  (clubs packed)
  late: string;             // 02–04  (last drinks)
  dawn: string;             // 05–06  (sunrise)
  morning: string;          // 07–10  (coffee slow start)
  // Day-of-week overrides — only used in the prime/peak window.
  friNight: string;
  satNight: string;
  sunMorning: string;
  // Weather-condition overrides (any time of day). Picked when the
  // current Open-Meteo code maps to that bucket; takes precedence over
  // the time-of-day default because a thunderstorm is a bigger plan
  // disruptor than the hour.
  storm: string;            // WMO 95, 96, 99 — thunder/hail
  heavyRain: string;        // 65, 81, 82
  drizzle: string;          // 51–63, 80 (in afternoon/evening only)
  fog: string;              // 45, 48
  snow: string;             // 71–75
  heatWave: string;         // tempC >= 32 in 12–22 window
  coldNight: string;        // tempC <= 7 in 20+ window
};

const TONE: Record<Locale, Tone> = {
  en: {
    live: 'Live',
    openNow: 'Time to scout tonight',
    prePeak: 'The terraces are warming up',
    prime: 'Greece is going out right now',
    peak: 'Clubs are packed — find one',
    late: 'Last drinks somewhere',
    dawn: 'Watch the sunrise from a rooftop',
    morning: 'Slow start. Coffee first?',
    friNight: 'Friday energy — pick a city',
    satNight: 'Saturday peak — make it count',
    sunMorning: 'Sunday slow-roll',
    storm: 'Storm out — covered bars only',
    heavyRain: 'Rain hard — find an indoor table',
    drizzle: 'Drizzle — pubs feel right',
    fog: 'Fog over the city — wine bars open',
    snow: 'Snow falling — warm fires inside',
    heatWave: 'Heat wave — beach bars till sunset',
    coldNight: 'Cold night — cocktail bar weather',
  },
  el: {
    live: 'Live',
    openNow: 'Ώρα να σχεδιάσεις τη βραδιά',
    prePeak: 'Οι ταράτσες ζεσταίνονται',
    prime: 'Η Ελλάδα βγαίνει τώρα',
    peak: 'Τα κλαμπ γεμίζουν — διάλεξε',
    late: 'Ένα τελευταίο ποτό κάπου',
    dawn: 'Δες την ανατολή από ταράτσα',
    morning: 'Ξεκίνα ήρεμα. Καφές πρώτα;',
    friNight: 'Παρασκευή — διάλεξε πόλη',
    satNight: 'Σάββατο peak — βγες σωστά',
    sunMorning: 'Κυριακάτικη χαλάρα',
    storm: 'Καταιγίδα — μόνο στεγασμένα μπαρ',
    heavyRain: 'Βρέχει δυνατά — βρες τραπέζι μέσα',
    drizzle: 'Ψιλόβροχο — pubs έχουν νόημα',
    fog: 'Ομίχλη πάνω από την πόλη — wine bars',
    snow: 'Χιόνι — τζάκι και ζεστό ποτό',
    heatWave: 'Καύσωνας — beach bars μέχρι το σούρουπο',
    coldNight: 'Κρύα νύχτα — cocktail bar καιρός',
  },
  de: {
    live: 'Live',
    openNow: 'Plant den Abend',
    prePeak: 'Die Rooftops wärmen sich auf',
    prime: 'Griechenland geht jetzt aus',
    peak: 'Clubs sind voll — wählt eine',
    late: 'Ein letzter Drink',
    dawn: 'Sonnenaufgang vom Rooftop',
    morning: 'Sanfter Start. Erst Kaffee?',
    friNight: 'Freitagsenergie — Stadt wählen',
    satNight: 'Samstagspeak — macht was draus',
    sunMorning: 'Sonntags-Slow-Mode',
    storm: 'Gewitter — nur überdachte Bars',
    heavyRain: 'Starkregen — drinnen bleiben',
    drizzle: 'Nieselregen — Pubs passen jetzt',
    fog: 'Nebel — Weinbar-Wetter',
    snow: 'Schnee — Kamin und Drink',
    heatWave: 'Hitze — Beach Bars bis Sonnenuntergang',
    coldNight: 'Kalte Nacht — Cocktailbar-Wetter',
  },
  fr: {
    live: 'Live',
    openNow: 'Préparez la soirée',
    prePeak: 'Les terrasses chauffent',
    prime: 'La Grèce sort maintenant',
    peak: 'Les clubs sont pleins — choisis',
    late: 'Un dernier verre',
    dawn: 'Lever du soleil en rooftop',
    morning: 'Démarrage lent. Café d\'abord ?',
    friNight: 'Énergie du vendredi — choisis',
    satNight: 'Samedi peak — saisis-le',
    sunMorning: 'Dimanche tranquille',
    storm: 'Orage — bars couverts uniquement',
    heavyRain: 'Pluie battante — table à l\'intérieur',
    drizzle: 'Bruine — les pubs vont bien',
    fog: 'Brouillard — soirée bar à vin',
    snow: 'Neige — cheminée et verre chaud',
    heatWave: 'Canicule — beach bars jusqu\'au coucher',
    coldNight: 'Nuit froide — temps à cocktails',
  },
  it: {
    live: 'Live',
    openNow: 'Programma la serata',
    prePeak: 'Le terrazze si scaldano',
    prime: 'La Grecia esce adesso',
    peak: 'I club sono pieni — scegli',
    late: 'Un ultimo drink',
    dawn: 'Alba dal rooftop',
    morning: 'Partenza lenta. Prima un caffè?',
    friNight: 'Energia del venerdì — scegli',
    satNight: 'Sabato peak — vivilo',
    sunMorning: 'Domenica slow',
    storm: 'Temporale — solo locali al coperto',
    heavyRain: 'Pioggia forte — tavolo al chiuso',
    drizzle: 'Pioviggine — i pub vanno bene',
    fog: 'Nebbia — serata da wine bar',
    snow: 'Neve — camino e drink caldo',
    heatWave: 'Ondata di caldo — beach bar fino al tramonto',
    coldNight: 'Notte fredda — tempo da cocktail bar',
  },
};

// WMO weather-code buckets (see lib/weather.ts for the full mapping).
const STORM_CODES = new Set([95, 96, 99]);
const HEAVY_RAIN_CODES = new Set([65, 81, 82]);
const DRIZZLE_CODES = new Set([51, 53, 55, 61, 63, 80]);
const FOG_CODES = new Set([45, 48]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);

function friendlyMessage(
  hour: number,
  dow: string,
  weatherCode: number | null,
  tempC: number | null,
  cityName: string | null,
  t: Tone,
): string {
  // Severe weather overrides time-of-day. A thunderstorm is a bigger plan
  // disruptor than which hour it is — we want to redirect visitors to
  // covered spots immediately. Drizzle is gentler: only override during
  // afternoon/evening "going out" hours, not during morning coffee.
  if (weatherCode != null) {
    if (STORM_CODES.has(weatherCode)) return appendCity(t.storm, cityName);
    if (HEAVY_RAIN_CODES.has(weatherCode)) return appendCity(t.heavyRain, cityName);
    if (SNOW_CODES.has(weatherCode)) return appendCity(t.snow, cityName);
    if (FOG_CODES.has(weatherCode) && hour >= 18) return appendCity(t.fog, cityName);
    if (DRIZZLE_CODES.has(weatherCode) && hour >= 15) return appendCity(t.drizzle, cityName);
  }

  // Temperature extremes nudge the message too.
  if (tempC != null) {
    if (tempC >= 32 && hour >= 12 && hour < 22) return appendCity(t.heatWave, cityName);
    if (tempC <= 7 && (hour >= 20 || hour < 2)) return appendCity(t.coldNight, cityName);
  }

  // Day-of-week overrides — only inside their natural window.
  if (dow === 'Sun' && hour >= 7 && hour < 12) return appendCity(t.sunMorning, cityName);
  if (dow === 'Fri' && hour >= 20 && hour <= 23) return appendCity(t.friNight, cityName);
  if (dow === 'Sat' && hour >= 20 && hour <= 23) return appendCity(t.satNight, cityName);

  // Default by-hour bucket.
  if (hour >= 23 || hour < 2) return appendCity(t.peak, cityName);
  if (hour >= 2 && hour < 5)  return appendCity(t.late, cityName);
  if (hour >= 5 && hour < 7)  return appendCity(t.dawn, cityName);
  if (hour >= 7 && hour < 11) return appendCity(t.morning, cityName);
  if (hour >= 11 && hour < 17) return appendCity(t.openNow, cityName);
  if (hour >= 17 && hour < 20) return appendCity(t.prePeak, cityName);
  return appendCity(t.prime, cityName);          // 20 – 22
}

/** Tag the message with the visitor's city when GPS resolved it. Kept
 *  as a simple " · {city}" suffix so we don't have to worry about Greek
 *  preposition / gender agreement (στην/στο/στη) per city name. */
function appendCity(msg: string, city: string | null): string {
  if (!city) return msg;
  return `${msg} · ${city}`;
}
