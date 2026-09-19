// A venue reading inside a guide. Direction A "Αντικύθηρα".
// Prototype: products/citynight/design/2026-09-17-antikythera-prototype.html
// Tokens:    products/citynight/design/tokens.md (2026-09-17).
//
//   ┌─────────────────────────────────────────┐
//   │  [PHOTO 16:9 — swipe-snap, 1-3]          │
//   │                            ΕΠΑΛΗΘΕΥΜΕΝΟ  │
//   ├─────────────────────────────────────────┤
//   │  NAME                      ★ 4,5 (1.872) │
//   │  ● ΑΝΟΙΧΤΑ ΤΩΡΑ · ΩΣ 23:00                │
//   │  Editor blurb                            │
//   │  ΩΡΑΡΙΟ / ΑΠΟΣΤΑΣΗ / ΤΙΜΕΣ / ΤΗΛΕΦΩΝΟ    │
//   │  Address line                            │
//   │  [Κλήση] [Οδηγίες] [Facebook] [Χάρτης]   │
//   │  [────── Google Maps iframe ──────]      │
//   └─────────────────────────────────────────┘
//
// All facts (photos, rating, phone, hours, price, address) come from Places
// — see [[project-guide-businesses-verified]]. The blurb is the only editor
// copy. The live state is computed in lib/opening-hours.ts (server-rendered,
// so it is correct at page-generation time and refreshes every ISR window).
//
// Verdigris means one thing: open now. Closing soon and the arc of time that
// has passed are bronze; closed and unknown are --color-closed. Every reading
// is a .cn-readout, in Greek capitals without accents. Missing data shows as
// missing and is never guessed.

import Image from 'next/image';
import { noEmDash } from '@/lib/article-md';
import type { GuideBusiness } from '@/lib/articles';
import type { Locale } from '@/lib/i18n';
import { formatOpenState, formatPriceLevel, openStateNow } from '@/lib/opening-hours';
import { haversineKm } from '@/lib/geo-distance';

type Props = {
  business: GuideBusiness;
  locale: Locale;
  /** City centre, for the distance reading. Omitted or incomplete: the
   *  reading shows as missing. */
  origin?: { lat: number | null; lng: number | null } | null;
};

/** Greek capitals in a readout carry no accents (tokens.md, case rules). */
function caps(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().normalize('NFC');
}

/** Only 'open' is verdigris. Nothing else on the page may use it. */
const TONE: Record<'open' | 'soon' | 'closed' | 'unknown', string> = {
  open: 'var(--color-verdigris)',
  soon: 'var(--color-bronze)',
  closed: 'var(--color-closed)',
  unknown: 'var(--color-closed)',
};

const PILL =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold ' +
  'transition-transform duration-[var(--motion-fast)] ease-[var(--motion-ease)] active:scale-[0.98]';
const PILL_GHOST = `${PILL} border border-[var(--color-hair)] text-[var(--color-ink)]`;

export function GuideBusinessCard({ business: b, locale, origin }: Props) {
  const lang: 'el' | 'en' = locale === 'el' ? 'el' : 'en';
  const t = LABELS[lang];

  const embedSrc = b.lat != null && b.lng != null
    ? `https://www.google.com/maps?q=${b.lat},${b.lng}&z=17&output=embed`
    : `https://www.google.com/maps?q=${encodeURIComponent(b.name + ' ' + (b.address ?? ''))}&output=embed`;
  const directionsUrl = b.googlePlaceId
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(b.name)}&destination_place_id=${b.googlePlaceId}&travelmode=driving`
    : b.lat != null && b.lng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(b.name + ' ' + (b.address ?? ''))}`;
  const telUrl = b.phone ? `tel:${b.phone.replace(/\s+/g, '')}` : null;

  // Photo gallery — cover first, then extras. Attribution unchanged.
  const gallery = [
    ...(b.coverPhotoUrl ? [{ url: b.coverPhotoUrl, attribution: b.coverPhotoAttribution }] : []),
    ...(b.extraPhotos ?? []),
  ];

  const state = openStateNow(b.openingHours?.periods);
  const reading = formatOpenState(state, lang);
  const price = formatPriceLevel(b.priceLevel, lang);

  const km = origin?.lat != null && origin.lng != null && b.lat != null && b.lng != null
    ? haversineKm({ lat: b.lat, lng: b.lng }, { lat: origin.lat, lng: origin.lng })
    : null;
  const distance = km != null
    ? `${new Intl.NumberFormat(lang === 'el' ? 'el-GR' : 'en-GB', { maximumFractionDigits: km < 10 ? 1 : 0 }).format(km)} ${t.kmUnit}`
    : null;

  return (
    <article className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-hair)] bg-[var(--color-surface)]">
      {/* ── Photos. Every image carries width and height, and each slide box
             holds its aspect ratio, so nothing below moves after first paint. */}
      {gallery.length > 0 && (
        <div className="relative">
          {gallery.length === 1 ? (
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--color-raise)]">
              <Image
                src={gallery[0]!.url}
                alt={b.name}
                width={1280}
                height={720}
                sizes="(min-width: 768px) 768px, 100vw"
                loading="lazy"
                className="h-full w-full object-cover"
              />
              {gallery[0]!.attribution && (
                <p className="cn-readout cn-readout-s absolute bottom-2 right-3 text-[var(--color-muted)]">
                  {gallery[0]!.attribution}
                </p>
              )}
            </div>
          ) : (
            // Horizontal scroll-snap gallery — native + accessible, no JS.
            <ul className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth">
              {gallery.map((p, i) => (
                <li key={i} className="relative aspect-[16/9] w-full shrink-0 snap-center bg-[var(--color-raise)]">
                  <Image
                    src={p.url}
                    alt={`${b.name} · ${i + 1}/${gallery.length}`}
                    width={1280}
                    height={720}
                    sizes="(min-width: 768px) 768px, 100vw"
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  {p.attribution && (
                    <p className="cn-readout cn-readout-s absolute bottom-2 right-3 text-[var(--color-muted)]">
                      {p.attribution}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
          {gallery.length > 1 && (
            <span
              className="cn-readout cn-readout-s pointer-events-none absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-[var(--color-ink)]"
              style={{ background: 'color-mix(in srgb, var(--color-ground) 72%, transparent)' }}
            >
              {gallery.length}
            </span>
          )}
          <VerifiedMark label={t.verified} title={b.fbPageTitle ? `${t.verifiedBy} ${b.fbPageTitle}` : t.verified} floating />
        </div>
      )}

      <div className="p-5 md:p-6">
        {/* ── The statement: the name, and the rating as a readout ── */}
        <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <h3
            className="text-[22px] font-semibold leading-[1.15] tracking-[-0.015em] text-[var(--color-ink)] md:text-[26px]"
            style={{ fontVariationSettings: '"FLAR" 100, "VOLM" 20' }}
          >
            {b.name}
          </h3>
          {b.rating != null ? (
            <span className="cn-readout text-[var(--color-muted)]">
              <span className="text-[var(--color-bronze)]">★</span> {formatCount(b.rating, lang, 1)}
              {b.reviewCount != null && b.reviewCount > 0 ? ` (${formatCount(b.reviewCount, lang)})` : ''}
            </span>
          ) : (
            gallery.length === 0 && <VerifiedMark label={t.verified} title={t.verified} />
          )}
        </header>

        {/* ── The live state. Verdigris only when it is open right now. ── */}
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: TONE[reading.tone] }}
          />
          <span className="cn-readout" style={{ color: TONE[reading.tone] }}>{caps(reading.label)}</span>
          {reading.detail && (
            <span className="cn-readout text-[var(--color-muted)]">· {caps(reading.detail)}</span>
          )}
        </p>

        {b.blurb && (
          <p className="mt-4 max-w-[60ch] text-[16px] leading-[1.55] text-[var(--color-muted)] md:text-[17px]">
            {noEmDash(b.blurb)}
          </p>
        )}

        {/* ── The readings. Missing data reads as missing. ── */}
        <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 border-t border-[var(--color-hair)] pt-4 sm:grid-cols-4">
          <Reading label={t.hours} value={caps(reading.detail ?? reading.label)} colour={TONE[reading.tone]} missing={t.notStated} />
          <Reading label={t.distance} value={distance ? caps(distance) : null} missing={t.notStated} />
          <Reading label={t.price} value={price} missing={t.notStated} />
          <Reading label={t.phone} value={b.phone} missing={t.notStated} />
        </dl>

        {b.address && <p className="mt-4 text-[15px] text-[var(--color-muted)]">{b.address}</p>}

        {/* ── The actions. Bronze means yours to act on; 44 px targets. ── */}
        <div className="mt-5 flex flex-wrap gap-2.5">
          {telUrl && (
            <a
              href={telUrl}
              className={PILL}
              style={{ background: 'var(--color-bronze)', color: 'var(--color-on-bronze)' }}
            >
              {t.call}
            </a>
          )}
          <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className={PILL_GHOST}>
            {t.directions}
          </a>
          <a href={b.fbUrl} target="_blank" rel="noopener noreferrer" className={PILL_GHOST}>
            Facebook
          </a>
          <a href={b.googleMapsUrl} target="_blank" rel="noopener noreferrer" className={PILL_GHOST}>
            {t.maps}
          </a>
        </div>

        {/* ── Map, on demand. The box holds its ratio, so opening it pushes
               only what is below it, never the page around it. ── */}
        <details className="group mt-5 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-hair)]">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between px-4 text-[15px] text-[var(--color-ink)]">
            <span>{t.showMap}</span>
            <span aria-hidden="true" className="text-[var(--color-muted)] transition group-open:rotate-90">▸</span>
          </summary>
          <div className="relative aspect-[16/6] w-full border-t border-[var(--color-hair)]">
            <iframe
              src={embedSrc}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`${b.name} ${t.onMap}`}
              className="h-full w-full border-0"
            />
          </div>
        </details>
      </div>
    </article>
  );
}

function Reading({
  label, value, missing, colour,
}: { label: string; value: string | null; missing: string; colour?: string }) {
  return (
    <div>
      <dt className="cn-readout cn-readout-s text-[var(--color-muted)]">{label}</dt>
      <dd
        className="cn-readout cn-readout-l mt-1"
        style={{ color: value ? (colour ?? 'var(--color-ink)') : 'var(--color-closed)' }}
      >
        {value ?? missing}
      </dd>
    </div>
  );
}

/** Verified is a fact, not a live state: it stays hairline and bronze so the
 *  one signal colour keeps meaning "open now". */
function VerifiedMark({ label, title, floating }: { label: string; title: string; floating?: boolean }) {
  return (
    <span
      title={title}
      className={`cn-readout cn-readout-s inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--color-hair)] px-2.5 py-1 text-[var(--color-ink)] ${
        floating ? 'absolute right-3 top-3' : ''
      }`}
      style={floating ? { background: 'color-mix(in srgb, var(--color-ground) 72%, transparent)' } : undefined}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3 w-3 fill-[var(--color-bronze)]">
        <path d="M6.5 11.2 3.4 8.1l1.1-1.1 2 2 4.9-4.9 1.1 1.1z" />
      </svg>
      {label}
    </span>
  );
}

function formatCount(n: number, lang: 'el' | 'en', decimals = 0): string {
  try {
    return new Intl.NumberFormat(lang === 'el' ? 'el-GR' : 'en-GB', {
      minimumFractionDigits: decimals, maximumFractionDigits: decimals,
    }).format(n);
  } catch { return String(n); }
}

const LABELS: Record<'el' | 'en', {
  verified: string; verifiedBy: string;
  directions: string; call: string; maps: string;
  onMap: string; showMap: string;
  hours: string; distance: string; price: string; phone: string;
  kmUnit: string; notStated: string;
}> = {
  el: {
    verified: 'ΕΠΑΛΗΘΕΥΜΕΝΟ', verifiedBy: 'Επαληθεύτηκε μέσω',
    directions: 'Οδηγίες', call: 'Κλήση', maps: 'Χάρτης',
    onMap: 'στον χάρτη', showMap: 'Δες στον χάρτη',
    hours: 'ΩΡΑΡΙΟ', distance: 'ΑΠΟΣΤΑΣΗ', price: 'ΤΙΜΕΣ', phone: 'ΤΗΛΕΦΩΝΟ',
    kmUnit: 'χλμ', notStated: 'ΔΕΝ ΕΧΕΙ ΔΗΛΩΘΕΙ',
  },
  en: {
    verified: 'VERIFIED', verifiedBy: 'Verified via',
    directions: 'Directions', call: 'Call', maps: 'Maps',
    onMap: 'on map', showMap: 'Show on map',
    hours: 'HOURS', distance: 'DISTANCE', price: 'PRICE', phone: 'PHONE',
    kmUnit: 'km', notStated: 'NOT STATED',
  },
};
