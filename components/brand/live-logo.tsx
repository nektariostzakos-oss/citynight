'use client';

// Header logo that tells the time. The moon of "Ζενίθ" travels the ring with the real time in Athens
// (the editorial timezone of the site) and is drawn hollow between sunrise and sunset. It moves once a
// minute and never animates, so reduced motion needs no variant. The server and the hydration pass
// render midnight; the client takes over right after.

import { useSyncExternalStore } from 'react';
import { LogoLockup, type LogoDrawing } from './logo';

const ATHENS_CLOCK = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Athens',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function subscribe(onTick: () => void) {
  const id = window.setInterval(onTick, 15_000);
  return () => window.clearInterval(id);
}
// Snapshots are whole minutes since the epoch, so React re-renders once a minute at most.
const clientMinute = () => Math.floor(Date.now() / 60_000);
const serverMinute = () => -1;

function athensMinutes(epochMinute: number): number {
  const parts = ATHENS_CLOCK.formatToParts(new Date(epochMinute * 60_000));
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

export function LiveLogo({
  sunrise,
  sunset,
  drawing = 'small',
  className,
}: {
  /** Today's sunrise and sunset in Athens, in minutes after midnight. Null keeps the moon filled. */
  sunrise: number | null;
  sunset: number | null;
  drawing?: LogoDrawing;
  className?: string;
}) {
  const epochMinute = useSyncExternalStore(subscribe, clientMinute, serverMinute);
  const live = epochMinute >= 0;
  const minutes = live ? athensMinutes(epochMinute) : 0;
  const day = live && sunrise != null && sunset != null && minutes >= sunrise && minutes < sunset;
  return <LogoLockup drawing={drawing} minutes={minutes} day={day} className={className} />;
}
