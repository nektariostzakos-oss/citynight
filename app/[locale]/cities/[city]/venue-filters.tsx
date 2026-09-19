'use client';

// The filter pills and the venue rows of the city view.
//
// Every row is computed on the server (live state included) and handed here as
// plain data, so the list renders identically in the HTML and after hydration;
// the only thing the browser does is hide rows. Two groups, the way the
// prototype has them: when you can go, and what kind of night it is.

import { useState, type ReactNode } from 'react';
import { VenueRow, type VenueState } from '@/components/venue-card';
import type { Locale } from '@/lib/i18n';

export type Vertical = 'nightlife' | 'food' | 'stay';

export type VenueRowData = {
  id: string;
  name: string;
  kind: string | null;
  rating: number | null;
  reviewCount: number | null;
  price: string | null;
  photoUrl: string | null;
  href: string;
  state: VenueState;
  vertical: Vertical;
  /** Open at 02:30 tonight. */
  late: boolean;
};

type TimeFilter = 'all' | 'open' | 'late';
type VertFilter = 'all' | Vertical;

export function VenueFilters({ rows, locale }: { rows: VenueRowData[]; locale: Locale }) {
  const [time, setTime] = useState<TimeFilter>('all');
  const [vert, setVert] = useState<VertFilter>('all');
  const t = LABELS[locale === 'el' ? 'el' : 'en'];

  const shown = rows.filter((r) => {
    if (vert !== 'all' && r.vertical !== vert) return false;
    if (time === 'open' && !r.state.open) return false;
    if (time === 'late' && !r.late) return false;
    return true;
  });

  return (
    <section aria-labelledby="venues-title">
      <h2 id="venues-title" className="sr-only">{t.title}</h2>

      <div className="grid gap-2.5">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t.whenGroup}>
          <Chip pressed={time === 'all'} onClick={() => setTime('all')}>{t.all}</Chip>
          <Chip pressed={time === 'open'} onClick={() => setTime('open')}>{t.openNow}</Chip>
          <Chip pressed={time === 'late'} onClick={() => setTime('late')}>{t.late}</Chip>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t.kindGroup}>
          <Chip pressed={vert === 'all'} onClick={() => setVert('all')}>{t.everything}</Chip>
          <Chip pressed={vert === 'nightlife'} onClick={() => setVert('nightlife')}>{t.nightlife}</Chip>
          <Chip pressed={vert === 'food'} onClick={() => setVert('food')}>{t.food}</Chip>
          <Chip pressed={vert === 'stay'} onClick={() => setVert('stay')}>{t.stay}</Chip>
        </div>
      </div>

      <p className="mt-3.5 cn-readout text-[var(--color-muted)]" aria-live="polite">
        {shown.length} {shown.length === 1 ? t.one : t.many}
      </p>

      {shown.length > 0 ? (
        <ul className="mt-2 border-t border-[var(--color-hair)]">
          {shown.map((r) => (
            <VenueRow
              key={r.id}
              href={r.href}
              name={r.name}
              kind={r.kind}
              rating={r.rating}
              reviewCount={r.reviewCount}
              price={r.price}
              photoUrl={r.photoUrl}
              state={r.state}
              locale={locale}
            />
          ))}
        </ul>
      ) : (
        <p className="mt-4 py-4 text-[var(--color-muted)]">{t.empty}</p>
      )}
    </section>
  );
}

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`min-h-11 rounded-full border px-4 text-[15px] font-semibold transition-colors ${
        pressed
          ? 'border-[var(--color-bronze)] bg-[color-mix(in_srgb,var(--color-bronze)_14%,transparent)] text-[var(--color-ink)]'
          : 'border-[var(--color-hair)] text-[var(--color-ink)] hover:border-[var(--color-bronze)]'
      }`}
    >
      {children}
    </button>
  );
}

const LABELS: Record<'el' | 'en', {
  title: string; whenGroup: string; kindGroup: string;
  all: string; openNow: string; late: string;
  everything: string; nightlife: string; food: string; stay: string;
  one: string; many: string; empty: string;
}> = {
  el: {
    title: 'Καταστήματα', whenGroup: 'Χρόνος', kindGroup: 'Κατηγορία',
    all: 'Όλα', openNow: 'Ανοιχτά τώρα', late: 'Μετά τις 02:00',
    everything: 'Όλες', nightlife: 'Νυχτερινή ζωή', food: 'Φαγητό', stay: 'Διαμονή',
    one: 'ΚΑΤΑΣΤΗΜΑ', many: 'ΚΑΤΑΣΤΗΜΑΤΑ',
    empty: 'Κανένα κατάστημα δεν ταιριάζει τώρα. Δοκίμασε «Όλα».',
  },
  en: {
    title: 'Venues', whenGroup: 'When', kindGroup: 'Kind',
    all: 'All', openNow: 'Open now', late: 'After 02:00',
    everything: 'Everything', nightlife: 'Nightlife', food: 'Food', stay: 'Stay',
    one: 'VENUE', many: 'VENUES',
    empty: 'Nothing matches right now. Try "All".',
  },
};
