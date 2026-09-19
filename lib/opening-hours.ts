// Compute "open right now" against a Places-style openingHours object.
//
// Places (New) returns `regularOpeningHours.periods[]` where each period
// is { open: {day, hour, minute}, close?: {day, hour, minute} }. `day`
// is 0..6 with 0 = Sunday (Places API convention). A period without
// `close` is 24/7 from that day onward.
//
// We evaluate "now" in Europe/Athens — every Loutraki venue is local to
// that timezone, and we serve the same chip to all visitors regardless
// of where they're browsing from. (The chip says "open NOW in Loutraki",
// not "open at your local time".)

import type { OpeningPeriod } from '@/lib/articles';

type AthensNow = { day: number; hour: number; minute: number };

function athensNow(at: Date = new Date()): AthensNow {
  // Intl.DateTimeFormat with timeZone gives us hour/minute/weekday in
  // Athens local time without pulling in a date library.
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Athens',
    weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = fmt.formatToParts(at);
  const w = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  // Places: 0 = Sunday.
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { day: dayMap[w] ?? 1, hour, minute };
}

/** Returns true if the venue is open at `at` according to its periods.
 *  Handles overnight periods (close.day > open.day) — common for bars
 *  closing at 03:00 the next morning. */
export function isOpenNow(periods: OpeningPeriod[] | null | undefined, at: Date = new Date()): boolean {
  if (!periods || periods.length === 0) return false;
  const now = athensNow(at);
  const nowMin = now.day * 1440 + now.hour * 60 + now.minute;
  for (const p of periods) {
    if (!p.open) continue;
    const openMin = p.open.day * 1440 + (p.open.hour ?? 0) * 60 + (p.open.minute ?? 0);
    if (!p.close) {
      // 24h period from open onward — open if now is at or past the open marker.
      if (nowMin >= openMin) return true;
      continue;
    }
    let closeMin = p.close.day * 1440 + (p.close.hour ?? 0) * 60 + (p.close.minute ?? 0);
    // Wrap-around (close occurs after the week ends OR on a "previous"
    // weekday number that's actually next week — e.g. open Fri 21:00 /
    // close Sat 03:00 is normal, but open Sat 21:00 / close Sun 03:00
    // crosses 0 in our absolute-minutes model; Places encodes it as
    // close.day = 0 (Sun) which would be < open.day=6. Add a week.
    if (closeMin <= openMin) closeMin += 7 * 1440;
    if (nowMin >= openMin && nowMin < closeMin) return true;
    // Also handle the "today wraps from last week" case — if now is
    // early in the week (say Mon 02:00) and a period ran Sun 21:00 -
    // Mon 03:00, evaluating with nowMin+week catches it.
    const nowMinPlusWeek = nowMin + 7 * 1440;
    if (nowMinPlusWeek >= openMin && nowMinPlusWeek < closeMin) return true;
  }
  return false;
}

/** "€" / "€€" / "€€€" / "€€€€" from Places 0..4. priceLevel 0 → "Free". */
export function formatPriceLevel(n: number | null | undefined, locale: 'el' | 'en'): string | null {
  if (n == null) return null;
  if (n === 0) return locale === 'el' ? 'Δωρεάν' : 'Free';
  return '€'.repeat(Math.min(4, Math.max(1, n)));
}

// ─── the reading behind the live state ──────────────────────────────────
//
// `isOpenNow` answers yes or no. The venue reading on a guide card needs
// more: how long the venue still has, and when it opens next. Same source
// (Places periods), same Athens clock, no new data. Direction A
// "Αντικύθηρα", products/citynight/design/tokens.md.

const WEEK_MIN = 7 * 1440;
/** Last stretch before closing. The prototype turns the reading bronze here. */
const CLOSING_SOON_MIN = 90;

/** Where a venue stands right now. `always` is a 24/7 venue. Every minute
 *  field is null when it does not apply, so the view shows missing as
 *  missing instead of guessing. */
export type OpenState = {
  key: 'open' | 'soon' | 'closed' | 'unknown';
  always: boolean;
  /** Closing time, minutes after midnight. Set while open. */
  closesAtMin: number | null;
  /** Minutes still to run. Set while open. */
  minutesToClose: number | null;
  /** Next opening, minutes after midnight. Set while closed. */
  opensAtMin: number | null;
  /** Minutes until that opening. Set while closed. */
  minutesToOpen: number | null;
  /** Weekday of that opening, 0 = Sunday (the Places convention). */
  opensWeekday: number | null;
};

const EMPTY = {
  always: false,
  closesAtMin: null, minutesToClose: null,
  opensAtMin: null, minutesToOpen: null, opensWeekday: null,
} as const;

/** Absolute minute-of-week windows for a period list. `end` may run past the
 *  week when a window crosses Saturday midnight. */
function windowsOf(periods: readonly OpeningPeriod[]): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  for (const p of periods) {
    if (!p?.open || typeof p.open.day !== 'number' || !p.close || typeof p.close.day !== 'number') continue;
    const start = p.open.day * 1440 + (p.open.hour ?? 0) * 60 + (p.open.minute ?? 0);
    let end = p.close.day * 1440 + (p.close.hour ?? 0) * 60 + (p.close.minute ?? 0);
    if (end <= start) end += WEEK_MIN;
    out.push({ start, end });
  }
  return out;
}

export function openStateNow(
  periods: readonly OpeningPeriod[] | null | undefined,
  at: Date = new Date(),
): OpenState {
  if (!periods || periods.length === 0) return { key: 'unknown', ...EMPTY };

  // Places encodes 24/7 as a single open marker with no close.
  const first = periods[0];
  if (periods.length === 1 && first?.open && !first.close) {
    return { key: 'open', ...EMPTY, always: true };
  }

  const windows = windowsOf(periods);
  if (windows.length === 0) return { key: 'unknown', ...EMPTY };

  const now = athensNow(at);
  const nowMin = now.day * 1440 + now.hour * 60 + now.minute;

  for (const w of windows) {
    for (const n of [nowMin, nowMin + WEEK_MIN]) {
      if (n >= w.start && n < w.end) {
        const left = w.end - n;
        return {
          ...EMPTY,
          key: left <= CLOSING_SOON_MIN ? 'soon' : 'open',
          closesAtMin: w.end % 1440,
          minutesToClose: left,
        };
      }
    }
  }

  let wait = Infinity;
  let at0 = 0;
  for (const w of windows) {
    const diff = (w.start - nowMin + WEEK_MIN) % WEEK_MIN;
    if (diff < wait) { wait = diff; at0 = w.start; }
  }
  if (!Number.isFinite(wait)) return { key: 'unknown', ...EMPTY };
  return {
    ...EMPTY,
    key: 'closed',
    opensAtMin: at0 % 1440,
    minutesToOpen: wait,
    opensWeekday: Math.floor(at0 / 1440) % 7,
  };
}

const DAY_SHORT: Record<'el' | 'en', readonly string[]> = {
  el: ['Κυρ', 'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

const STATE_WORDS = {
  el: {
    openNow: 'ανοιχτα τωρα', until: (t: string) => `ως ${t}`,
    closesAt: (t: string) => `κλεινει ${t}`, allDay: '24 ωρες',
    closed: 'κλειστα', opensAt: (t: string) => `ανοιγει ${t}`,
    opensOn: (d: string, t: string) => `${d} ${t}`,
    tomorrow: (t: string) => `αυριο ${t}`, unknown: 'ωραριο αγνωστο',
  },
  en: {
    openNow: 'open now', until: (t: string) => `until ${t}`,
    closesAt: (t: string) => `closes ${t}`, allDay: '24 hours',
    closed: 'closed', opensAt: (t: string) => `opens ${t}`,
    opensOn: (d: string, t: string) => `${d} ${t}`,
    tomorrow: (t: string) => `tomorrow ${t}`, unknown: 'hours unknown',
  },
} as const;

function clock(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** The two lines a venue reading shows: the state itself and the time that
 *  qualifies it. `tone` maps to the colour: only 'open' is verdigris.
 *
 *  Between midnight and 05:00 the next opening is never written "αύριο" —
 *  the night still feels like the previous day, so the weekday is named
 *  (tokens.md, found in the prototype check on 2026-09-17). */
export function formatOpenState(
  state: OpenState,
  locale: 'el' | 'en',
  at: Date = new Date(),
): { tone: 'open' | 'soon' | 'closed' | 'unknown'; label: string; detail: string | null } {
  const w = STATE_WORDS[locale];
  if (state.key === 'unknown') return { tone: 'unknown', label: w.unknown, detail: null };
  if (state.always) return { tone: 'open', label: w.openNow, detail: w.allDay };
  if (state.key === 'soon') {
    return { tone: 'soon', label: w.closesAt(clock(state.closesAtMin ?? 0)), detail: null };
  }
  if (state.key === 'open') {
    return { tone: 'open', label: w.openNow, detail: w.until(clock(state.closesAtMin ?? 0)) };
  }

  const now = athensNow(at);
  const nowMin = now.hour * 60 + now.minute;
  const wait = state.minutesToOpen ?? 0;
  const opensAt = clock(state.opensAtMin ?? 0);
  let detail: string;
  if (nowMin + wait < 1440) detail = w.opensAt(opensAt);
  else if (nowMin + wait < 2880 && nowMin >= 300) detail = w.tomorrow(opensAt);
  else detail = w.opensOn(DAY_SHORT[locale][state.opensWeekday ?? 0] ?? '', opensAt);
  return { tone: 'closed', label: w.closed, detail };
}
