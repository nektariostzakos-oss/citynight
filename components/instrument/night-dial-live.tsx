'use client';

// The thin client wrapper around the dial. It re-renders once a minute so the
// needle keeps the real time in Athens, and nothing else.
//
// Hydration: the first client render uses the server snapshot (the `now` the
// server drew), so the markup matches; React takes over on the next tick.
// Same pattern as components/brand/live-logo.tsx.
//
// The caption goes stale as the night moves, so `sub` may carry two tokens the
// wrapper substitutes from the live clock:
//   {time} → 21:40 (Athens)     {pct} → 41  (how far the night has gone)
// e.g. sub="Η ΝΥΧΤΑ {pct}%". Text stays with the caller, so it stays localized.

import { useSyncExternalStore } from 'react';
import { NightDial, type NightDialProps } from './night-dial';
import { athensClock, hhmm, minutesFromISO, nightReading } from './night';

function subscribe(onTick: () => void) {
  const id = window.setInterval(onTick, 15_000);
  return () => window.clearInterval(id);
}
const clientMinute = () => Math.floor(Date.now() / 60_000);
const serverMinute = () => -1;

export function NightDialLive(props: NightDialProps) {
  const epochMinute = useSyncExternalStore(subscribe, clientMinute, serverMinute);
  const now = epochMinute >= 0 ? new Date(epochMinute * 60_000) : props.now;

  let sub = props.sub;
  if (sub && (sub.includes('{time}') || sub.includes('{pct}'))) {
    const clock = athensClock(now);
    const set = minutesFromISO(props.sunsetISO);
    const rise = minutesFromISO(props.sunriseISO);
    const pct = set != null && rise != null ? nightReading(clock.min, set, rise).pct : null;
    sub = sub
      .replace('{time}', hhmm(clock.min))
      .replace('{pct}', pct == null ? '—' : String(pct));
  }

  return <NightDial {...props} now={now} sub={sub} />;
}
