// Today's opening windows, from the Places-style periods our data carries.
//
// The dial draws windows, not periods: one pair of clock times per stretch the
// place is open today, wrapping past midnight when it closes after 00:00. The
// same windows also answer "how many are open right now", which the live strip
// recounts in the browser every minute from a tiny array of minutes.
//
// Structural types on purpose: nothing here imports from lib/, so a client
// component can use it without dragging a server module into the bundle.

import type { AthensClock } from './night';
import { hhmm } from './night';

export type PlacesPeriod = {
  open: { day: number; hour: number; minute?: number };
  close?: { day: number; hour: number; minute?: number } | null;
};

/** A window in minutes after today's midnight in Athens. `close` may run past
 *  1440 when the place shuts after midnight (a bar closing at 04:00). */
export type OpenWindow = [open: number, close: number];

const WEEK = 10080;

/** Every window that overlaps today, clipped to today's midnight-to-midnight
 *  span except for the closing time, which is allowed to run into tomorrow. */
export function todayWindows(
  periods: PlacesPeriod[] | null | undefined,
  clock: Pick<AthensClock, 'wd'>,
): OpenWindow[] {
  if (!periods || periods.length === 0) return [];
  // A single period with an open and no close is the Places way of saying
  // "open 24 hours, every day".
  if (periods.length === 1 && periods[0]?.open && !periods[0].close) return [[0, 1440]];

  const dayStart = clock.wd * 1440;
  const out: OpenWindow[] = [];
  for (const p of periods) {
    if (!p?.open || !p.close) continue;
    const open = p.open.day * 1440 + p.open.hour * 60 + (p.open.minute ?? 0);
    let close = p.close.day * 1440 + p.close.hour * 60 + (p.close.minute ?? 0);
    if (close <= open) close += WEEK;
    // The same week repeats, so check the window shifted one week each way.
    for (const shift of [-WEEK, 0, WEEK]) {
      const s = open + shift;
      const e = close + shift;
      if (e <= dayStart || s >= dayStart + 1440) continue;
      out.push([Math.max(s, dayStart) - dayStart, e - dayStart]);
    }
  }
  return out.sort((a, b) => a[0] - b[0]);
}

/** The same windows as "HH:MM" pairs, which is what the dial takes. */
export function windowsForDial(windows: OpenWindow[]): { open: string; close: string }[] {
  return windows.map(([open, close]) => ({ open: hhmm(open), close: hhmm(close) }));
}

/** True when the Athens clock stands inside one of the windows. */
export function isOpenAt(windows: OpenWindow[], minute: number): boolean {
  return windows.some(([open, close]) => minute >= open && minute < close);
}

/** How many of the places are open at `minute`. One flat array keeps the
 *  payload to a couple of numbers per place. */
export function countOpenAt(all: OpenWindow[][], minute: number): number {
  return all.reduce((n, windows) => n + (isOpenAt(windows, minute) ? 1 : 0), 0);
}
