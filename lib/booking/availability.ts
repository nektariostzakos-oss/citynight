// Slot-availability queries. Combines:
//   - existing live bookings (site_bookings)
//   - staff default schedule (site_staff.work_days/start_time/end_time/break_*)
//   - staff one-off availability overrides (site_availability_rules)
//   - site-wide closures (site_holidays)
//
// `date` is "YYYY-MM-DD" local to the site. Slot times are "HH:MM" local.

import 'server-only';
import { db } from '@/db';
import { isHoliday } from './holidays';
import { getStaff } from './staff';
import { isoWeekdayFromJsDay } from './tz';

const dbh = () => db.$client;

function toMinutes(hhmm: string): number {
  const seg = hhmm.split(':');
  const h = Number(seg[0] ?? 0);
  const m = Number(seg[1] ?? 0);
  return h * 60 + m;
}

function mmToHHMM(m: number): string {
  const hh = Math.floor(m / 60).toString().padStart(2, '0');
  const mm = (m % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Exact-start-time list of slots already taken (no overlap math). The
 * booking flow uses this to grey out exact times for "find another slot". */
export function getTakenSlots(siteId: string, date: string, staffId: string): string[] {
  return (dbh().prepare(`
    SELECT time FROM site_bookings
     WHERE site_id = ? AND staff_id = ? AND date = ?
       AND status NOT IN ('cancelled','no_show')
     ORDER BY time
  `).all(siteId, staffId, date) as { time: string }[]).map((r) => r.time);
}

/**
 * Every slot blocked by an in-progress booking (including its buffer
 * window). Returns "HH:MM" strings on the given step grid. Used by the
 * booking-flow UI so a 60-min booking at 10:00 also blocks the 10:30 slot.
 */
export function getOccupiedSlots(
  siteId: string,
  date: string,
  staffId: string,
  step = 30,
): string[] {
  const rows = dbh().prepare(`
    SELECT time, duration_minutes, buffer_minutes
      FROM site_bookings
     WHERE site_id = ? AND staff_id = ? AND date = ?
       AND status NOT IN ('cancelled','no_show')
  `).all(siteId, staffId, date) as {
    time: string; duration_minutes: number; buffer_minutes: number;
  }[];

  const blocked = new Set<string>();
  for (const b of rows) {
    const start = toMinutes(b.time);
    const end = start + b.duration_minutes + b.buffer_minutes;
    for (let t = start; t < end; t += step) blocked.add(mmToHHMM(t));
  }
  return Array.from(blocked).sort();
}

type RangeMin = { startMin: number; endMin: number };

/** Apply a staff's default weekly schedule for the given date.
 * Returns 0..2 open ranges (morning, optional evening if there's a break). */
function staffDefaultRanges(
  workDays: number[],
  startTime: string,
  endTime: string,
  breakStart: string | null,
  breakEnd: string | null,
  jsDayOfWeek: number,
): RangeMin[] {
  const iso = isoWeekdayFromJsDay(jsDayOfWeek);
  if (!workDays.includes(iso)) return [];
  const dayStart = toMinutes(startTime);
  const dayEnd = toMinutes(endTime);
  if (!breakStart || !breakEnd) return [{ startMin: dayStart, endMin: dayEnd }];
  const bs = toMinutes(breakStart);
  const be = toMinutes(breakEnd);
  // Two ranges: dayStart→breakStart and breakEnd→dayEnd
  return [
    { startMin: dayStart, endMin: bs },
    { startMin: be, endMin: dayEnd },
  ].filter((r) => r.endMin > r.startMin);
}

type OverrideRow = {
  kind: 'open' | 'closed';
  date: string | null;
  weekday: number | null;
  start_time: string;
  end_time: string;
};

function rulesFor(siteId: string, staffId: string, date: string, jsDayOfWeek: number): OverrideRow[] {
  const isoWeekday = isoWeekdayFromJsDay(jsDayOfWeek);
  return dbh().prepare(`
    SELECT kind, date, weekday, start_time, end_time
      FROM site_availability_rules
     WHERE site_id = ?
       AND staff_id = ?
       AND (date = ? OR (date IS NULL AND weekday = ?))
  `).all(siteId, staffId, date, isoWeekday) as OverrideRow[];
}

/** Subtract `cut` from each base range, returning the surviving ranges. */
function subtractRange(base: RangeMin[], cut: RangeMin): RangeMin[] {
  const out: RangeMin[] = [];
  for (const r of base) {
    if (cut.endMin <= r.startMin || cut.startMin >= r.endMin) {
      out.push(r);
      continue;
    }
    if (cut.startMin > r.startMin) out.push({ startMin: r.startMin, endMin: cut.startMin });
    if (cut.endMin < r.endMin)     out.push({ startMin: cut.endMin, endMin: r.endMin });
  }
  return out;
}

/**
 * The staff's effective open ranges for the given date, in local minutes.
 * Combines default schedule + site_availability_rules. CLOSED rules punch
 * holes; OPEN rules add ranges (e.g. "open Sunday 10–14 just this week").
 * Empty array = staff is unavailable that day.
 */
export function staffOpenRanges(
  siteId: string,
  staffId: string,
  date: string,
): RangeMin[] {
  // Site-wide holidays block everything.
  if (isHoliday(siteId, date)) return [];
  const staff = getStaff(siteId, staffId);
  if (!staff || !staff.enabled) return [];

  const jsDay = new Date(`${date}T12:00:00Z`).getUTCDay();
  const overrides = rulesFor(siteId, staffId, date, jsDay);
  let ranges = staffDefaultRanges(
    staff.workDays, staff.startTime, staff.endTime,
    staff.breakStart, staff.breakEnd, jsDay,
  );

  for (const rule of overrides) {
    const r = { startMin: toMinutes(rule.start_time), endMin: toMinutes(rule.end_time) };
    if (rule.kind === 'closed') {
      ranges = subtractRange(ranges, r);
    } else {
      ranges.push(r);
    }
  }

  // Merge overlapping / touching ranges
  ranges.sort((a, b) => a.startMin - b.startMin);
  const merged: RangeMin[] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.startMin <= last.endMin) {
      last.endMin = Math.max(last.endMin, r.endMin);
    } else {
      merged.push({ ...r });
    }
  }
  return merged;
}

/**
 * The bookable slot grid for a given staff + date. Generates "HH:MM" times
 * every `step` minutes inside each open range, then filters out occupied
 * slots. Caller is expected to also check that the slot+service fits
 * within the open range (the booking flow does this).
 */
export function getSlotsForStaff(
  siteId: string,
  staffId: string,
  date: string,
  step = 30,
): string[] {
  const ranges = staffOpenRanges(siteId, staffId, date);
  if (ranges.length === 0) return [];
  const occupied = new Set(getOccupiedSlots(siteId, date, staffId, step));
  const slots: string[] = [];
  for (const r of ranges) {
    for (let m = r.startMin; m < r.endMin; m += step) {
      const t = mmToHHMM(m);
      if (!occupied.has(t)) slots.push(t);
    }
  }
  return slots;
}

/**
 * Slots available for a given service, considering the service's duration
 * + buffer: a slot is bookable only if the entire (duration + buffer)
 * window fits inside one of the staff's open ranges AND doesn't collide
 * with any existing booking.
 */
export function getSlotsForService(
  siteId: string,
  staffId: string,
  serviceId: string,
  date: string,
  durationMinutes: number,
  bufferMinutes: number,
  step = 30,
): string[] {
  const ranges = staffOpenRanges(siteId, staffId, date);
  if (ranges.length === 0) return [];

  const rows = dbh().prepare(`
    SELECT time, duration_minutes, buffer_minutes
      FROM site_bookings
     WHERE site_id = ? AND staff_id = ? AND date = ?
       AND status NOT IN ('cancelled','no_show')
  `).all(siteId, staffId, date) as {
    time: string; duration_minutes: number; buffer_minutes: number;
  }[];
  // `serviceId` isn't currently used for capacity / group-class logic — kept
  // in the signature so future class-pack support can read it without a
  // breaking change.
  void serviceId;
  const intervals = rows.map((b) => {
    const s = toMinutes(b.time);
    return { startMin: s, endMin: s + b.duration_minutes + b.buffer_minutes };
  });

  const need = durationMinutes + bufferMinutes;
  const out: string[] = [];
  for (const r of ranges) {
    for (let m = r.startMin; m + need <= r.endMin; m += step) {
      const slotEnd = m + need;
      const overlaps = intervals.some((iv) => m < iv.endMin && iv.startMin < slotEnd);
      if (!overlaps) out.push(mmToHHMM(m));
    }
  }
  return out;
}
