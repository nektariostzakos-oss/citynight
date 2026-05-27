// Athens-pinned date + time formatters.
//
// The site is single-timezone (Greek nightlife audience, Greek tenants),
// so every date/time displayed to a visitor is normalised to
// Europe/Athens regardless of where the server or the visitor sits.
//
// Time uses 24-hour form ("23:00", not "11:00 PM") — convention in Greek
// hospitality and matches the booking schema's HH:MM slot format.

export const ATHENS_TZ = 'Europe/Athens';

/** "23:00" in Europe/Athens. Accepts unix-seconds or a Date. */
export function formatAthensTime(d: Date | number, locale: string = 'el'): string {
  const date = typeof d === 'number' ? new Date(d * 1000) : d;
  return new Intl.DateTimeFormat(locale, {
    timeZone: ATHENS_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/** "12 Aug 2026" (or locale equivalent) in Europe/Athens. */
export function formatAthensDate(d: Date | number, locale: string = 'el'): string {
  const date = typeof d === 'number' ? new Date(d * 1000) : d;
  return new Intl.DateTimeFormat(locale, {
    timeZone: ATHENS_TZ,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}

/** "12 Aug 2026, 23:00" — full Athens-timezone date+time with 24h clock. */
export function formatAthensDateTime(d: Date | number, locale: string = 'el'): string {
  const date = typeof d === 'number' ? new Date(d * 1000) : d;
  return new Intl.DateTimeFormat(locale, {
    timeZone: ATHENS_TZ,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}
