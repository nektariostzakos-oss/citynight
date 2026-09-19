// "Σήμερα γιορτάζει" — the Greek name day, as a reading.
//
// Two variants:
//   - `compact`: one readout, meant to sit inside another readout line (the
//     header, the date line on the home page).
//   - `card`: the same reading with room around it, for a panel.
//
// Server component (the date is computed at render, so the ISR window of
// whichever page mounts it decides how fresh it is). Returns null on days with
// no entry: the absence is the message, not "nobody celebrates today".
//
// Direction A "Αντικύθηρα", products/citynight/design/tokens.md.

import { getNameDays } from '@/lib/eortologio';
import { caps } from './instrument/night';
import type { Locale } from '@/lib/i18n';

type Props = {
  locale: Locale;
  variant?: 'compact' | 'card';
};

export function TodayNameDay({ locale, variant = 'compact' }: Props) {
  const names = getNameDays();
  if (names.length === 0) return null;

  // The names themselves are Greek (Νεκτάριος, Βασίλης) and do not translate.
  // Only the label does.
  const labels = LABELS[locale] ?? LABELS.en;

  if (variant === 'compact') {
    const shown = names.slice(0, 2);
    const extra = names.length - shown.length;
    return (
      <span
        className="cn-readout text-[var(--color-muted)]"
        aria-label={`${labels.todayCelebrates}: ${names.join(', ')}`}
        title={`${labels.todayCelebrates}: ${names.join(', ')}`}
      >
        <span aria-hidden>· </span>
        {caps(labels.short)}{' '}
        <span className="text-[var(--color-ink)]">
          {caps(shown.join(', '))}
          {extra > 0 && <span className="text-[var(--color-muted)]"> +{extra}</span>}
        </span>
      </span>
    );
  }

  return (
    <div className="inline-flex flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--color-hair)] bg-[var(--color-surface)] px-5 py-3">
      <p className="cn-readout cn-readout-s uppercase text-[var(--color-muted)]">{labels.todayCelebrates}</p>
      <p className="font-display text-lg font-semibold leading-tight text-[var(--color-ink)]">
        {names.join(' · ')}
      </p>
    </div>
  );
}

const LABELS: Record<Locale, { short: string; todayCelebrates: string }> = {
  el: { short: 'γιορτάζουν',   todayCelebrates: 'Σήμερα γιορτάζει' },
  en: { short: 'name day',     todayCelebrates: "Today's name day" },
  de: { short: 'namenstag',    todayCelebrates: 'Namenstag heute' },
  fr: { short: 'fête',         todayCelebrates: 'Fête du jour' },
  it: { short: 'onomastico',   todayCelebrates: 'Onomastico di oggi' },
};
