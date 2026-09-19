'use client';

// The live strip under the statement: the time in Athens, how far the night
// has gone, and how many of the places in our guides are open right now.
//
// Three readings, one line, no decoration. It re-reads the clock once a minute
// and recounts the open places from a compact array of today's windows, so the
// number stays true between ISR renders instead of ageing on the page.
// Verdigris appears here and nowhere else: it means open now.
//
// Direction A "Αντικύθηρα", products/citynight/design/tokens.md.

import { useSyncExternalStore } from 'react';
import type { Locale } from '@/lib/i18n';
import { athensClock, hhmm, minutesFromISO, nightReading } from './instrument/night';
import { countOpenAt, type OpenWindow } from './instrument/hours';

export type HeroLiveStatusProps = {
  locale: Locale;
  /** The moment the server rendered, so hydration matches. */
  nowISO: string;
  /** Today's sun in Athens, local ISO from Open-Meteo. */
  sunsetISO: string | null;
  sunriseISO: string | null;
  /** Today's opening windows per place, in minutes after Athens midnight. */
  windows: OpenWindow[][];
  /** How many places those windows describe. */
  total: number;
};

const COPY: Record<Locale, {
  city: string; night: string; sunsetIn: string; openNow: string; of: string;
  hour: (n: number) => string; minute: (n: number) => string;
}> = {
  el: {
    city: 'ΑΘΗΝΑ', night: 'Η ΝΥΧΤΑ', sunsetIn: 'ΔΥΣΗ ΣΕ', openNow: 'ΑΝΟΙΧΤΑ ΤΩΡΑ', of: 'ΑΠΟ',
    hour: (n) => (n === 1 ? '1 ΩΡΑ' : `${n} ΩΡΕΣ`), minute: (n) => `${n}′`,
  },
  en: {
    city: 'ATHENS', night: 'NIGHT', sunsetIn: 'SUNSET IN', openNow: 'OPEN NOW', of: 'OF',
    hour: (n) => (n === 1 ? '1 HOUR' : `${n} HOURS`), minute: (n) => `${n} MIN`,
  },
  de: {
    city: 'ATHEN', night: 'NACHT', sunsetIn: 'SONNENUNTERGANG IN', openNow: 'JETZT OFFEN', of: 'VON',
    hour: (n) => (n === 1 ? '1 STUNDE' : `${n} STUNDEN`), minute: (n) => `${n} MIN`,
  },
  fr: {
    city: 'ATHÈNES', night: 'NUIT', sunsetIn: 'COUCHER DANS', openNow: 'OUVERT MAINTENANT', of: 'SUR',
    hour: (n) => (n === 1 ? '1 HEURE' : `${n} HEURES`), minute: (n) => `${n} MIN`,
  },
  it: {
    city: 'ATENE', night: 'NOTTE', sunsetIn: 'TRAMONTO TRA', openNow: 'APERTI ORA', of: 'SU',
    hour: (n) => (n === 1 ? '1 ORA' : `${n} ORE`), minute: (n) => `${n} MIN`,
  },
};

function subscribe(onTick: () => void) {
  const id = window.setInterval(onTick, 15_000);
  return () => window.clearInterval(id);
}
const clientMinute = () => Math.floor(Date.now() / 60_000);
const serverMinute = () => -1;

/** How a duration is written in each language. Kept structural so any caller
 *  can pass its own two strings without importing this file's copy table. */
export type DurationWords = { hour: (n: number) => string; minute: (n: number) => string };

/** "1 ΩΡΑ 20′" — the same shape the prototype uses, per locale. */
export function durationWords(minutes: number, t: DurationWords): string {
  if (minutes <= 0) return t.minute(0);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? t.hour(h) : '', m ? t.minute(m) : ''].filter(Boolean).join(' ');
}

export function HeroLiveStatus({
  locale, nowISO, sunsetISO, sunriseISO, windows, total,
}: HeroLiveStatusProps) {
  const t = COPY[locale] ?? COPY.el;
  const epochMinute = useSyncExternalStore(subscribe, clientMinute, serverMinute);
  const now = epochMinute >= 0 ? new Date(epochMinute * 60_000) : new Date(nowISO);

  const clock = athensClock(now);
  const set = minutesFromISO(sunsetISO);
  const rise = minutesFromISO(sunriseISO);
  const night = set != null && rise != null ? nightReading(clock.min, set, rise) : null;
  const open = countOpenAt(windows, clock.min);

  return (
    <p className="cn-readout flex flex-wrap items-center gap-x-3 gap-y-1 text-[var(--color-muted)]">
      <span>
        {t.city} <span className="text-[var(--color-ink)]">{hhmm(clock.min)}</span>
      </span>
      {night && (
        <>
          <span aria-hidden>·</span>
          <span>
            {night.night
              ? <>{t.night} <span className="text-[var(--color-ink)]">{night.pct}%</span></>
              : <>{t.sunsetIn} <span className="text-[var(--color-ink)]">{durationWords(night.toSunset ?? 0, t)}</span></>}
          </span>
        </>
      )}
      {total > 0 && (
        <>
          <span aria-hidden>·</span>
          <span>
            {t.openNow}{' '}
            <span className="text-[var(--color-verdigris)]">{open}</span>{' '}
            {t.of} <span className="text-[var(--color-ink)]">{total}</span>
          </span>
        </>
      )}
    </p>
  );
}
