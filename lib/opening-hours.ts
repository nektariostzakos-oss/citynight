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
