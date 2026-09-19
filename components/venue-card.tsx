// The venue row of the city view, and the live state behind it.
//
// Direction A "Αντικύθηρα" (products/citynight/design/tokens.md, approved
// 2026-09-17). A row is a reading, not a poster: 64 px photo, name, one meta
// line, and the live state on the right. Verdigris says one thing only — open
// now. Bronze says the night is closing in ("ΚΛΕΙΝΕΙ 23:00"). Everything else
// is --color-closed.
//
// `venueState()` runs on the server, in Europe/Athens, off the Places
// `openingHours.periods` shape we already store (lib/articles). It is passed
// to the row as a plain object so the client filter list can re-render it
// without a second clock.

import Link from 'next/link';
import Image from 'next/image';
import type { Locale } from '@/lib/i18n';
import type { OpeningPeriod } from '@/lib/articles';
import type { VenueListItem } from '@/lib/queries';
import { athensClock, hhmm } from '@/components/instrument/night';
import { isOpenAt, todayWindows } from '@/components/instrument/hours';

// ─── live state ───────────────────────────────────────────────────────

export type VenueStateKey = 'open' | 'soon' | 'closed' | 'unknown';

export type VenueState = {
  key: VenueStateKey;
  /** Readout text, Greek capitals without accents. */
  text: string;
  open: boolean;
  /** Minutes left while open, minutes until the next opening while closed. */
  inMinutes: number | null;
};

const WEEK = 7 * 1440;

type Window = [start: number, end: number];

/** Places periods → absolute minutes inside the week. `null` when the venue
 *  never declared hours, `'always'` for a 24/7 marker (an `open` with no
 *  `close`, exactly as Places encodes it). */
function weekWindows(periods: OpeningPeriod[] | null | undefined): Window[] | 'always' | null {
  if (!periods || periods.length === 0) return null;
  if (periods.length === 1 && periods[0]?.open && !periods[0]?.close) return 'always';
  const out: Window[] = [];
  for (const p of periods) {
    if (!p.open || !p.close) continue;
    const open = p.open.day * 1440 + (p.open.hour ?? 0) * 60 + (p.open.minute ?? 0);
    let close = p.close.day * 1440 + (p.close.hour ?? 0) * 60 + (p.close.minute ?? 0);
    if (close <= open) close += WEEK; // Fri 21:00 → Sat 03:00, and Sat → Sun.
    out.push([open, close]);
  }
  return out.length ? out : null;
}

/** The state of a venue at `now`, read in Athens. Nothing here reads the
 *  clock on its own: pass the same Date you passed to the dial. */
export function venueState(
  periods: OpeningPeriod[] | null | undefined,
  locale: Locale,
  now: Date = new Date(),
): VenueState {
  const t = STATE_LABELS[locale === 'el' ? 'el' : 'en'];
  const windows = weekWindows(periods);
  if (windows === null) return { key: 'unknown', text: t.unknown, open: false, inMinutes: null };
  if (windows === 'always') return { key: 'open', text: t.always, open: true, inMinutes: null };

  const c = athensClock(now);
  const nowMin = c.wd * 1440 + c.min;

  for (const [open, close] of windows) {
    for (const n of [nowMin, nowMin + WEEK]) {
      if (n >= open && n < close) {
        const left = close - n;
        // The last 90 minutes are the ones worth acting on, so they get bronze
        // and the closing time instead of the open-until reading.
        return left <= 90
          ? { key: 'soon', text: t.closing(hhmm(close)), open: true, inMinutes: left }
          : { key: 'open', text: t.openUntil(hhmm(close)), open: true, inMinutes: left };
      }
    }
  }

  let best = Infinity;
  let at = 0;
  for (const [open] of windows) {
    const diff = (open - nowMin + WEEK) % WEEK;
    if (diff < best) { best = diff; at = open; }
  }
  if (!Number.isFinite(best)) return { key: 'unknown', text: t.unknown, open: false, inMinutes: null };

  const dayDiff = Math.floor((c.min + best) / 1440);
  const time = hhmm(at % 1440);
  // Voice rule (tokens.md): after midnight and until 05:00 "αύριο" is
  // ambiguous — the night still feels like the previous day — so the weekday
  // is named instead.
  const text =
    dayDiff === 0 ? t.opens(time)
      : dayDiff === 1 && c.min >= 300 ? t.tomorrow(time)
        : `${t.weekday[Math.floor(at / 1440) % 7] ?? ''} ${time}`.trim();
  return { key: 'closed', text, open: false, inMinutes: best };
}

/** Open at 02:30 of the coming night — the "μετά τις 02:00" filter. Today's
 *  windows come from the shared instrument maths, so the filter and the dial
 *  always agree about what a window is. */
export function opensLateTonight(
  periods: OpeningPeriod[] | null | undefined,
  now: Date = new Date(),
): boolean {
  const c = athensClock(now);
  // Past 02:30 already, so the question is about the night that follows.
  const wd = c.min >= 150 ? (c.wd + 1) % 7 : c.wd;
  return isOpenAt(todayWindows(periods, { wd }), 150);
}

/** Tailwind text colour per state. Verdigris is the one signal colour. */
export function stateColor(key: VenueStateKey): string {
  if (key === 'open') return 'text-[var(--color-verdigris)]';
  if (key === 'soon') return 'text-[var(--color-bronze)]';
  return 'text-[var(--color-closed)]';
}

// ─── the row ──────────────────────────────────────────────────────────

export type VenueRowProps = {
  href: string;
  name: string;
  /** "Ψαροταβέρνα", "Καζίνο" — what the place is, in one or two words. */
  kind?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  /** Already formatted price band ("€€"), from lib/opening-hours. */
  price?: string | null;
  photoUrl?: string | null;
  state?: VenueState | null;
  locale: Locale;
};

export function VenueRow({ href, name, kind, rating, reviewCount, price, photoUrl, state, locale }: VenueRowProps) {
  const t = ROW_LABELS[locale === 'el' ? 'el' : 'en'];
  const nf = locale === 'el' ? 'el-GR' : locale;
  // One readout for the figures: rating, how many reviews it rests on, the
  // price band. Capitals without accents, tabular, so rows line up.
  const figures = [
    rating != null
      ? `★ ${new Intl.NumberFormat(nf, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(rating)}`
      : null,
    reviewCount != null && reviewCount > 0
      ? `${new Intl.NumberFormat(nf).format(reviewCount)} ${t.reviews}`
      : null,
    price ?? null,
  ].filter(Boolean).join(' · ');
  return (
    <li>
      <Link
        href={href}
        className="group grid min-h-16 grid-cols-[auto_1fr] items-center gap-x-3.5 gap-y-1 border-b border-[var(--color-hair)] py-3.5 pr-0.5 pl-0.5 transition-colors sm:grid-cols-[auto_1fr_auto]"
      >
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt=""
            width={64}
            height={64}
            sizes="64px"
            className="h-16 w-16 rounded-[12px] bg-[var(--color-raise)] object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="grid h-16 w-16 place-items-center rounded-[12px] bg-[var(--color-raise)] text-[22px] font-semibold text-[var(--color-bronze)]"
          >
            {name.trim().charAt(0)}
          </span>
        )}

        <span className="min-w-0">
          <span className="block text-[17px] leading-tight font-semibold text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-bronze)]">
            {name}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[14px] text-[var(--color-muted)]">
            {kind && <span>{kind}</span>}
            {figures && <span className="cn-readout text-[var(--color-muted)]">{figures}</span>}
          </span>
        </span>

        {state && (
          <span
            className={`col-start-2 flex items-center gap-2 cn-readout sm:col-start-3 sm:justify-end ${stateColor(state.key)}`}
          >
            <span aria-hidden className={dotClass(state.key)} />
            {state.text}
          </span>
        )}
      </Link>
    </li>
  );
}

function dotClass(key: VenueStateKey): string {
  const base = 'inline-block h-2.5 w-2.5 shrink-0 rounded-full';
  if (key === 'open') return `${base} bg-[var(--color-verdigris)]`;
  if (key === 'soon') return `${base} border-2 border-[var(--color-bronze)]`;
  if (key === 'unknown') return `${base} border-2 border-dashed border-[var(--color-closed)]`;
  return `${base} bg-[var(--color-closed)]`;
}

/** Legacy caller shape: a `venues` row, which carries no opening hours, so it
 *  renders without a live state rather than guessing one. */
export function VenueCard({ venue, locale }: { venue: VenueListItem; locale: Locale }) {
  const href = venue.slug
    ? `/${locale}/cities/${venue.citySlug}/${venue.slug}`
    : `/${locale}/cities/${venue.citySlug}`;
  return (
    <VenueRow
      href={href}
      name={venue.name}
      kind={venue.categoryName ?? venue.areaName}
      rating={venue.rating}
      reviewCount={venue.reviewCount}
      photoUrl={venue.photoUrl}
      locale={locale}
    />
  );
}

// ─── copy ─────────────────────────────────────────────────────────────

type StateLabels = {
  unknown: string;
  always: string;
  openUntil: (time: string) => string;
  closing: (time: string) => string;
  opens: (time: string) => string;
  tomorrow: (time: string) => string;
  weekday: string[];
};

// Readouts are Greek capitals without accents (tokens.md, case rules).
const STATE_LABELS: Record<'el' | 'en', StateLabels> = {
  el: {
    unknown: 'ΩΡΑΡΙΟ ΑΓΝΩΣΤΟ',
    always: 'ΑΝΟΙΧΤΑ 24 ΩΡΕΣ',
    openUntil: (time) => `ΑΝΟΙΧΤΑ ΩΣ ${time}`,
    closing: (time) => `ΚΛΕΙΝΕΙ ${time}`,
    opens: (time) => `ΑΝΟΙΓΕΙ ${time}`,
    tomorrow: (time) => `ΑΥΡΙΟ ${time}`,
    weekday: ['ΚΥΡ', 'ΔΕΥ', 'ΤΡΙ', 'ΤΕΤ', 'ΠΕΜ', 'ΠΑΡ', 'ΣΑΒ'],
  },
  en: {
    unknown: 'HOURS UNKNOWN',
    always: 'OPEN 24H',
    openUntil: (time) => `OPEN UNTIL ${time}`,
    closing: (time) => `CLOSING ${time}`,
    opens: (time) => `OPENS ${time}`,
    tomorrow: (time) => `TOMORROW ${time}`,
    weekday: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  },
};

const ROW_LABELS: Record<'el' | 'en', { reviews: string }> = {
  el: { reviews: 'ΚΡΙΤΙΚΕΣ' },
  en: { reviews: 'REVIEWS' },
};
