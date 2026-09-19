// Time, sun and moon maths for the night instrument.
//
// Pure functions, no React and no `server-only` import, so the same code runs
// in a server component, inside the client wrapper that re-renders the dial
// once a minute, and in the city and venue streams.
//
// Everything is computed from a passed-in Date. Nothing here reads the clock,
// so the server and the client always draw the same picture for the same
// timestamp. Direction A "Αντικύθηρα", products/citynight/design/tokens.md.

/** Athens wall clock for a timestamp. `min` is minutes after midnight, `wd`
 *  is 0 = Sunday (the Places convention lib/opening-hours.ts also uses),
 *  `tz` is the Athens UTC offset in hours at that moment (2 or 3). */
export type AthensClock = {
  y: number; mo: number; d: number;
  hh: number; mm: number; min: number;
  wd: number; tz: number;
};

const ATHENS_PARTS = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Athens',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', weekday: 'short',
  hourCycle: 'h23',
});

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function athensClock(now: Date): AthensClock {
  const p = Object.fromEntries(
    ATHENS_PARTS.formatToParts(now).map((x) => [x.type, x.value]),
  ) as Record<string, string>;
  const y = Number(p.year);
  const mo = Number(p.month);
  const d = Number(p.day);
  const hh = Number(p.hour);
  const mm = Number(p.minute);
  // Athens wall clock minus UTC, rounded to whole hours: 2 in winter, 3 in
  // summer. Derived instead of hard-coded so DST needs no maintenance.
  const tz = Math.round(
    (Date.UTC(y, mo - 1, d, hh, mm) - Math.floor(now.getTime() / 60_000) * 60_000) / 3_600_000,
  );
  return { y, mo, d, hh, mm, min: hh * 60 + mm, wd: WEEKDAYS.indexOf(p.weekday ?? 'Sun'), tz };
}

/** Sunrise and sunset in minutes after local midnight, for a place and a day.
 *  The classic NOAA approximation (±2 min for Greek latitudes). Use it only
 *  where a live source is too expensive: a real sunset from Open-Meteo
 *  (lib/weather.ts) always wins, and the dial takes that one as an ISO prop. */
export function sunTimes(
  lat: number, lng: number,
  { y, mo, d, tz }: { y: number; mo: number; d: number; tz: number },
): { rise: number; set: number } | null {
  const rad = (x: number) => (x * Math.PI) / 180;
  const deg = (x: number) => (x * 180) / Math.PI;
  const N =
    Math.floor((275 * mo) / 9) -
    Math.floor((mo + 9) / 12) * (1 + Math.floor((y - 4 * Math.floor(y / 4) + 2) / 3)) +
    d - 30;
  const lngHour = lng / 15;
  const calc = (rising: boolean): number => {
    const t = N + ((rising ? 6 : 18) - lngHour) / 24;
    const M = 0.9856 * t - 3.289;
    const L = (M + 1.916 * Math.sin(rad(M)) + 0.02 * Math.sin(rad(2 * M)) + 282.634 + 360) % 360;
    let RA = (deg(Math.atan(0.91764 * Math.tan(rad(L)))) + 360) % 360;
    RA = (RA + (Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90)) / 15;
    const sinDec = 0.39782 * Math.sin(rad(L));
    const cosDec = Math.cos(Math.asin(sinDec));
    const cosH = (Math.cos(rad(90.833)) - sinDec * Math.sin(rad(lat))) / (cosDec * Math.cos(rad(lat)));
    if (cosH > 1 || cosH < -1) return NaN; // no sunrise or no sunset that day
    const H = (rising ? 360 - deg(Math.acos(cosH)) : deg(Math.acos(cosH))) / 15;
    const T = H + RA - 0.06571 * t - 6.622;
    return ((((T - lngHour + tz) % 24) + 24) % 24) * 60;
  };
  const rise = calc(true);
  const set = calc(false);
  if (Number.isNaN(rise) || Number.isNaN(set)) return null;
  return { rise: Math.round(rise), set: Math.round(set) };
}

const SYNODIC = 29.530588853;

/** Illuminated fraction of the moon and whether it is waxing. */
export function moonPhase(now: Date): { illum: number; waxing: boolean } {
  const age = ((((now.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 86_400_000) % SYNODIC) + SYNODIC) % SYNODIC;
  const frac = age / SYNODIC;
  return { illum: (1 - Math.cos(2 * Math.PI * frac)) / 2, waxing: frac < 0.5 };
}

export type NightReading = {
  /** True between sunset and sunrise. */
  night: boolean;
  /** How far the night has gone, 0 to 100. Null while the sun is up. */
  pct: number | null;
  /** Minutes until sunset. Null once the night has started. */
  toSunset: number | null;
  /** Minutes from sunset to sunrise. */
  length: number;
  /** Minutes since sunset. 0 while the sun is up. */
  elapsed: number;
};

export function nightReading(min: number, set: number, rise: number): NightReading {
  const night = min >= set || min < rise;
  const length = ((rise - set + 1440) % 1440) || 1440;
  const elapsed = night ? (min - set + 1440) % 1440 : 0;
  return {
    night,
    pct: night ? Math.min(100, Math.round((elapsed / length) * 100)) : null,
    toSunset: night ? null : set - min,
    length,
    elapsed,
  };
}

/** "07:08" from minutes after midnight, wrapping past 24 h. */
export function hhmm(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Minutes after midnight from "HH:MM". Null when the string is not a time. */
export function parseHhmm(value: string | null | undefined): number | null {
  const m = value ? /^(\d{1,2}):(\d{2})$/.exec(value.trim()) : null;
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Minutes after midnight from a local ISO timestamp such as Open-Meteo's
 *  "2026-09-19T19:34" (already in the city's own timezone). A trailing Z or
 *  an offset is ignored on purpose: our sources return local time. */
export function minutesFromISO(iso: string | null | undefined): number | null {
  const m = iso ? /T(\d{2}):(\d{2})/.exec(iso) : null;
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Upper case for a readout. Greek capitals are written without accents
 *  (ΑΝΟΙΧΤΑ ΤΩΡΑ, not ΑΝΟΙΧΤΆ ΤΏΡΑ), so the marks are stripped first. */
export function caps(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().normalize('NFC');
}

/** Length in minutes of an opening window, wrapping past midnight. */
export function windowSpan(open: number, close: number): number {
  const span = (close - open + 1440) % 1440;
  return span === 0 ? 1440 : span;
}

/** True when `min` falls inside the window [open, close), wrapping midnight. */
export function inWindow(min: number, open: number, close: number): boolean {
  const span = windowSpan(open, close);
  return ((min - open + 1440) % 1440) < span;
}
