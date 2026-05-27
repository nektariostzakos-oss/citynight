// Timezone-aware date helpers for server-rendered slot / booking logic.
// Ported from templates/atelier-base/src/lib/tz.ts — pure utility, no
// JSON I/O or atelier dependencies.
//
// On Hostinger (and most cloud hosts) the Node process runs in UTC, but a
// booking site is in (usually) Europe/Athens. `new Date().getHours()`
// returns UTC, which would make "now" calculations jump by 2–3 hours in
// production. Every callsite that touches a wall-clock date+time threads
// the site's timezone through here.

const DEFAULT_TZ = 'Europe/Athens';

/** Internal: split "HH:MM" into a non-undefined [hours, minutes] tuple. */
function parseHHMM(hhmm: string): [number, number] {
  const seg = hhmm.split(':');
  const h = Number(seg[0] ?? 0);
  const m = Number(seg[1] ?? 0);
  return [Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0];
}

function parts(tz: string, now = new Date()): Record<string, string> {
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
      hour12: false,
    });
    const out: Record<string, string> = {};
    for (const p of fmt.formatToParts(now)) {
      if (p.type !== 'literal') out[p.type] = p.value;
    }
    return out;
  } catch {
    if (tz !== DEFAULT_TZ) return parts(DEFAULT_TZ, now);
    const d = now;
    return {
      year: String(d.getUTCFullYear()),
      month: String(d.getUTCMonth() + 1).padStart(2, '0'),
      day: String(d.getUTCDate()).padStart(2, '0'),
      hour: String(d.getUTCHours()).padStart(2, '0'),
      minute: String(d.getUTCMinutes()).padStart(2, '0'),
      weekday: 'Mon',
    };
  }
}

export function todayIsoInTz(tz: string = DEFAULT_TZ, now = new Date()): string {
  const p = parts(tz, now);
  return `${p.year ?? '1970'}-${p.month ?? '01'}-${p.day ?? '01'}`;
}

export function nowMinutesInTz(tz: string = DEFAULT_TZ, now = new Date()): number {
  const p = parts(tz, now);
  return parseInt(p.hour ?? '0', 10) * 60 + parseInt(p.minute ?? '0', 10);
}

// 0 = Sun, 1 = Mon … 6 = Sat — matches JS Date.getDay() semantics. NOTE:
// the booking DB stores weekday as 1..7 ISO (1=Mon … 7=Sun) — convert at
// the boundary with `isoWeekdayFromJsDay()`.
const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

export function dayOfWeekInTz(tz: string = DEFAULT_TZ, now = new Date()): number {
  const p = parts(tz, now);
  return WEEKDAY_MAP[p.weekday ?? 'Mon'] ?? 0;
}

/** JS day (0=Sun..6=Sat) → ISO weekday (1=Mon..7=Sun). */
export function isoWeekdayFromJsDay(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay;
}

export function dateAtOffsetInTz(
  offsetDays: number,
  tz: string = DEFAULT_TZ,
  now = new Date(),
): { iso: string; dayOfWeek: number } {
  const p = parts(tz, now);
  const anchor = new Date(`${p.year ?? '1970'}-${p.month ?? '01'}-${p.day ?? '01'}T12:00:00Z`);
  anchor.setUTCDate(anchor.getUTCDate() + offsetDays);
  const futurePart = parts(tz, anchor);
  return {
    iso: `${futurePart.year ?? '1970'}-${futurePart.month ?? '01'}-${futurePart.day ?? '01'}`,
    dayOfWeek: WEEKDAY_MAP[futurePart.weekday ?? 'Mon'] ?? 0,
  };
}

/**
 * Convert a wall-clock date+time that is local to a given IANA timezone
 * into a UTC ms timestamp. Correctly handles DST boundaries by reading the
 * TZ offset back from Intl rather than assuming a fixed offset.
 */
export function wallClockInTzToUtc(
  dateIso: string,
  time: string,
  tz: string = DEFAULT_TZ,
): number {
  const dseg = dateIso.split('-');
  const y = Number(dseg[0]); const m = Number(dseg[1]); const d = Number(dseg[2]);
  const [hh, mm] = parseHHMM(time);
  if (![y, m, d, hh, mm].every(Number.isFinite)) return NaN;
  const guessUtc = Date.UTC(y, m - 1, d, hh, mm);
  try {
    const p = parts(tz, new Date(guessUtc));
    const seenHRaw = parseInt(p.hour ?? '0', 10);
    const seenH = seenHRaw === 24 ? 0 : seenHRaw;
    const seen = Date.UTC(
      parseInt(p.year ?? '1970', 10),
      parseInt(p.month ?? '1', 10) - 1,
      parseInt(p.day ?? '1', 10),
      seenH,
      parseInt(p.minute ?? '0', 10),
    );
    return guessUtc - (seen - guessUtc);
  } catch {
    return guessUtc;
  }
}
