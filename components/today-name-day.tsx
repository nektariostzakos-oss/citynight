// "Σήμερα γιορτάζει" chip — name-day announcement.
//
// Two render variants:
//   - `compact`: inline pill for the site header. Small, dense, max
//     two names shown ("+N more" otherwise).
//   - default: larger card for the homepage hero. All names listed,
//     with "Χρόνια πολλά!" wish.
//
// Server component (date computed at render time → ISR refresh window
// matches the cache TTL of whichever page mounts it). Returns null on
// days that have no entry, so the chip never reads as "no one celebrates
// today" — the absence IS the message.

import { getNameDays } from '@/lib/eortologio';
import type { Locale } from '@/lib/i18n';

type Props = {
  locale: Locale;
  variant?: 'compact' | 'card';
};

export function TodayNameDay({ locale, variant = 'compact' }: Props) {
  const names = getNameDays();
  if (names.length === 0) return null;

  // Translation strategy: the names themselves are Greek (Νεκτάριος,
  // Βασίλης…) and don't translate — Greek visitors recognise them, and
  // foreign visitors get to learn the Greek name-day tradition. We only
  // translate the LABEL ("Σήμερα γιορτάζει" / "Today's name day").
  const labels = LABELS[locale] ?? LABELS.en;

  if (variant === 'compact') {
    // Show up to two names inline, rest collapsed to "+N".
    const shown = names.slice(0, 2);
    const extra = names.length - shown.length;
    return (
      <span
        aria-label={`${labels.todayCelebrates}: ${names.join(', ')}`}
        title={`${labels.todayCelebrates}: ${names.join(', ')}`}
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-bg-3)] bg-[var(--color-bg-1)]/60 px-3 py-1 text-xs text-[var(--color-fg-1)] backdrop-blur"
      >
        <span aria-hidden>🎉</span>
        <span className="text-[var(--color-fg-2)]">{labels.today}</span>
        <span className="font-medium text-[var(--color-fg-0)]">
          {shown.join(' · ')}
          {extra > 0 && <span className="text-[var(--color-fg-2)]"> +{extra}</span>}
        </span>
      </span>
    );
  }

  // Card variant for the homepage hero. Reads like a poster.
  return (
    <div className="inline-flex flex-col gap-1 rounded-2xl border border-[var(--color-bg-2)] bg-[var(--color-bg-1)]/60 px-5 py-3 backdrop-blur">
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--color-fg-2)]">
        {labels.todayCelebrates}
      </p>
      <p className="font-display text-lg font-semibold leading-tight text-[var(--color-fg-0)]">
        {names.join(' · ')}
      </p>
      <p className="text-xs text-[var(--color-accent-pink)]">{labels.wish}</p>
    </div>
  );
}

const LABELS: Record<Locale, { today: string; todayCelebrates: string; wish: string }> = {
  el: { today: 'Σήμερα γιορτάζει',     todayCelebrates: 'Σήμερα γιορτάζει',     wish: 'Χρόνια πολλά!' },
  en: { today: 'Today celebrates',     todayCelebrates: "Today's name day",     wish: 'Many years!' },
  de: { today: 'Namenstag heute',      todayCelebrates: 'Namenstag heute',      wish: 'Herzlichen Glückwunsch!' },
  fr: { today: 'Fête du jour',         todayCelebrates: 'Fête du jour',         wish: 'Bonne fête !' },
  it: { today: 'Onomastico di oggi',   todayCelebrates: 'Onomastico di oggi',   wish: 'Tanti auguri!' },
};
