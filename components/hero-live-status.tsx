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
    return friendlyMessage(athensHour, athensDow, t);
  }, [now, t]);

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
        if (j && j.ok) setWeather({ emoji: j.emoji, label: j.label, tempC: j.tempC });
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
  },
};

function friendlyMessage(hour: number, dow: string, t: Tone): string {
  // Day-of-week overrides only apply inside their natural window so we
  // don't say "Friday energy" at 09:00.
  if (dow === 'Sun' && hour >= 7 && hour < 12) return t.sunMorning;
  if (dow === 'Fri' && hour >= 20 && hour <= 23) return t.friNight;
  if (dow === 'Sat' && hour >= 20 && hour <= 23) return t.satNight;

  if (hour >= 23 || hour < 2) return t.peak;
  if (hour >= 2 && hour < 5)  return t.late;
  if (hour >= 5 && hour < 7)  return t.dawn;
  if (hour >= 7 && hour < 11) return t.morning;
  if (hour >= 11 && hour < 17) return t.openNow;
  if (hour >= 17 && hour < 20) return t.prePeak;
  return t.prime;                                 // 20 – 22
}
