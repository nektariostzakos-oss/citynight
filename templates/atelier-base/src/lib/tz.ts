/**
 * Timezone-aware date helpers for server-rendered slot / booking logic.
 *
 * On Hostinger (and most cloud hosts) the Node process runs in UTC, but the
 * shop is in Europe/Athens. `new Date().getHours()` returns UTC — which made
 * "now" calculations jump by 2–3 hours in production.
 *
 * These helpers always work in the business timezone (falling back to
 * Europe/Athens if the caller hasn't threaded one through yet).
 */

const DEFAULT_TZ = "Europe/Athens";

function parts(tz: string, now = new Date()): Record<string, string> {
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hour12: false,
    });
    const out: Record<string, string> = {};
    for (const p of fmt.formatToParts(now)) {
      if (p.type !== "literal") out[p.type] = p.value;
    }
    return out;
  } catch {
    // Unknown timezone → fall back to default
    if (tz !== DEFAULT_TZ) return parts(DEFAULT_TZ, now);
    // Even default broken (shouldn't happen) → use UTC
    const d = now;
    return {
      year: String(d.getUTCFullYear()),
      month: String(d.getUTCMonth() + 1).padStart(2, "0"),
      day: String(d.getUTCDate()).padStart(2, "0"),
      hour: String(d.getUTCHours()).padStart(2, "0"),
      minute: String(d.getUTCMinutes()).padStart(2, "0"),
      weekday: "Mon",
    };
  }
}

export function todayIsoInTz(tz: string = DEFAULT_TZ, now = new Date()): string {
  const p = parts(tz, now);
  return `${p.year}-${p.month}-${p.day}`;
}

export function nowMinutesInTz(tz: string = DEFAULT_TZ, now = new Date()): number {
  const p = parts(tz, now);
  return parseInt(p.hour, 10) * 60 + parseInt(p.minute, 10);
}

// 0 = Sun, 1 = Mon … 6 = Sat — matches JS Date.getDay() semantics
const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

export function dayOfWeekInTz(tz: string = DEFAULT_TZ, now = new Date()): number {
  const p = parts(tz, now);
  return WEEKDAY_MAP[p.weekday] ?? 0;
}

export function dateAtOffsetInTz(offsetDays: number, tz: string = DEFAULT_TZ, now = new Date()): { iso: string; dayOfWeek: number } {
  // Build a Date anchored on the TZ's local date at 12:00 (avoids DST edges), then shift.
  const p = parts(tz, now);
  // Compose a local wall-clock date at midday and shift by offsetDays
  const anchor = new Date(`${p.year}-${p.month}-${p.day}T12:00:00Z`);
  anchor.setUTCDate(anchor.getUTCDate() + offsetDays);
  const futurePart = parts(tz, anchor);
  return {
    iso: `${futurePart.year}-${futurePart.month}-${futurePart.day}`,
    dayOfWeek: WEEKDAY_MAP[futurePart.weekday] ?? 0,
  };
}

/**
 * Convert a wall-clock date+time that is *local to a given IANA timezone*
 * into a UTC ms timestamp. Correctly handles DST boundaries.
 *
 * e.g. wallClockInTzToUtc("2026-04-21", "14:30", "Europe/Athens") returns
 * the UTC ms for 11:30 UTC on that day (Athens was +3 in summer).
 */
export function wallClockInTzToUtc(dateIso: string, time: string, tz: string = DEFAULT_TZ): number {
  const [y, m, d] = dateIso.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  if (![y, m, d, hh, mm].every(Number.isFinite)) return NaN;
  // First guess: treat the wall clock as if it were UTC
  const guessUtc = Date.UTC(y, m - 1, d, hh, mm);
  // Ask Intl what wall clock that UTC instant shows in the target TZ
  let seen: number;
  try {
    const p = parts(tz, new Date(guessUtc));
    const seenH = parseInt(p.hour, 10) === 24 ? 0 : parseInt(p.hour, 10);
    seen = Date.UTC(
      parseInt(p.year, 10),
      parseInt(p.month, 10) - 1,
      parseInt(p.day, 10),
      seenH,
      parseInt(p.minute, 10)
    );
  } catch {
    return guessUtc;
  }
  // The TZ offset at that instant = seen - guessUtc
  // The *intended* UTC instant = guess shifted back by that offset
  return guessUtc - (seen - guessUtc);
}
