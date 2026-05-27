'use client';

import { useEffect, useState } from 'react';
import type { Locale } from '@/lib/i18n';

// Tiny live-status pill. Shows a pulsing dot + the current time in Athens
// (Europe/Athens — Greece's only timezone) + a label that hints at how busy
// the night is right now ("Open now", "Νυχτερινή ώρα", etc.).
//
// Everything's client-side: SSR/crawler sees a stable hardcoded label so
// the markup is hydration-safe.

const COPY: Record<Locale, { liveLabel: string; openNow: string; rush: string; afterMidnight: string; morningQuiet: string }> = {
  en: { liveLabel: 'Live',  openNow: 'Open now',          rush: 'Night rush',     afterMidnight: 'After midnight', morningQuiet: 'Morning quiet' },
  el: { liveLabel: 'Live',  openNow: 'Ανοιχτά τώρα',       rush: 'Αιχμή της βραδιάς', afterMidnight: 'Μετά τα μεσάνυχτα', morningQuiet: 'Πρωινή ησυχία' },
  de: { liveLabel: 'Live',  openNow: 'Jetzt offen',       rush: 'Hauptzeit',      afterMidnight: 'Nach Mitternacht', morningQuiet: 'Morgenruhe' },
  fr: { liveLabel: 'Live',  openNow: 'Ouvert maintenant', rush: 'Heure de pointe', afterMidnight: 'Après minuit',   morningQuiet: 'Calme matinal' },
  it: { liveLabel: 'Live',  openNow: 'Aperti ora',        rush: 'Ora di punta',   afterMidnight: 'Dopo mezzanotte',  morningQuiet: 'Quiete mattutina' },
};

function nightStateForHour(h: number, c: typeof COPY[Locale]): string {
  // 21:00–01:59 = night rush; 02:00–05:59 = after midnight; 06:00–11:59 = morning quiet; rest = open now
  if (h >= 21 || h < 2) return c.rush;
  if (h >= 2 && h < 6) return c.afterMidnight;
  if (h >= 6 && h < 12) return c.morningQuiet;
  return c.openNow;
}

export function HeroLiveStatus({ locale }: { locale: Locale }) {
  const c = COPY[locale];
  const [now, setNow] = useState<string>('');
  const [state, setState] = useState<string>(c.openNow);

  useEffect(() => {
    function tick() {
      const fmt = new Intl.DateTimeFormat(locale === 'el' ? 'el-GR' : locale, {
        timeZone: 'Europe/Athens', hour: '2-digit', minute: '2-digit', hour12: false,
      });
      const parts = fmt.formatToParts(new Date());
      const hh = parts.find((p) => p.type === 'hour')?.value ?? '00';
      const mm = parts.find((p) => p.type === 'minute')?.value ?? '00';
      setNow(`${hh}:${mm}`);
      setState(nightStateForHour(parseInt(hh, 10), c));
    }
    tick();
    const t = window.setInterval(tick, 30_000);
    return () => window.clearInterval(t);
  }, [locale, c]);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-accent-cyan)]/40 bg-[var(--color-accent-cyan)]/8 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-[var(--color-accent-cyan)] backdrop-blur">
      <span className="relative inline-flex h-2 w-2 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-accent-cyan)] opacity-75" aria-hidden />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-accent-cyan)]" />
      </span>
      <span>{c.liveLabel}</span>
      <span aria-hidden className="text-[var(--color-fg-3)]">·</span>
      <span suppressHydrationWarning className="font-mono text-[var(--color-fg-0)]">{now || '··:··'}</span>
      <span aria-hidden className="text-[var(--color-fg-3)]">·</span>
      <span className="text-[var(--color-fg-1)]">{state}</span>
    </div>
  );
}
