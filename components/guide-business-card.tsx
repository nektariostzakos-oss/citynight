// Verified business card displayed inside a guide. Mobile-first, photo-led,
// with utility chips and tap-to-call.
//
//   ┌─────────────────────────────────────────┐
//   │  [PHOTO GALLERY 16:9 — swipe-snap, 1-3]  │
//   │                              ✓ Verified  │
//   ├─────────────────────────────────────────┤
//   │  NAME                ★ 4.5 · 1,872 · €€  │
//   │  • Ανοιχτό τώρα                          │
//   │  Address line                            │
//   │  Editor blurb (2-3 sentences)            │
//   │  [📞 Κάλεσε] [🚗 Οδηγίες] [𝙛 FB] [📍 Maps]│
//   │  [────── Google Maps iframe ──────]      │
//   └─────────────────────────────────────────┘
//
// All facts (photos, rating, phone, hours, price, address) come from
// Places — see [[project-guide-businesses-verified]]. Blurb is the only
// editor copy. The "Ανοιχτό τώρα" chip is computed from openingHours
// in lib/opening-hours.ts (server-rendered, so the chip is correct at
// page-generation time and refreshes every ISR window).

import Image from 'next/image';
import type { GuideBusiness } from '@/lib/articles';
import type { Locale } from '@/lib/i18n';
import { isOpenNow, formatPriceLevel } from '@/lib/opening-hours';

type Props = {
  business: GuideBusiness;
  locale: Locale;
};

export function GuideBusinessCard({ business: b, locale }: Props) {
  const t = LABELS[locale === 'el' ? 'el' : 'en'];

  const embedSrc = b.lat != null && b.lng != null
    ? `https://www.google.com/maps?q=${b.lat},${b.lng}&z=17&output=embed`
    : `https://www.google.com/maps?q=${encodeURIComponent(b.name + ' ' + (b.address ?? ''))}&output=embed`;
  const directionsUrl = b.googlePlaceId
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(b.name)}&destination_place_id=${b.googlePlaceId}&travelmode=driving`
    : b.lat != null && b.lng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(b.name + ' ' + (b.address ?? ''))}`;
  const telUrl = b.phone ? `tel:${b.phone.replace(/\s+/g, '')}` : null;

  // Photo gallery — cover first, then extras. Skip when there's only one
  // photo (or none) so the layout stays consistent (single image vs scroll).
  const gallery = [
    ...(b.coverPhotoUrl ? [{ url: b.coverPhotoUrl, attribution: b.coverPhotoAttribution }] : []),
    ...(b.extraPhotos ?? []),
  ];
  const open = isOpenNow(b.openingHours?.periods);
  const price = formatPriceLevel(b.priceLevel, locale === 'el' ? 'el' : 'en');

  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--color-bg-2)] bg-[var(--color-bg-1)] transition hover:border-[var(--color-bg-3)]">
      {/* ── Photo gallery (swipe-snap on mobile, single image otherwise) ─── */}
      {gallery.length > 0 && (
        <div className="relative">
          {gallery.length === 1 ? (
            <div className="relative aspect-[16/9] w-full overflow-hidden">
              <Image
                src={gallery[0]!.url}
                alt={b.name}
                fill
                sizes="(min-width: 768px) 768px, 100vw"
                className="object-cover"
              />
              {gallery[0]!.attribution && (
                <p className="absolute bottom-2 right-3 text-[10px] text-white/65">
                  {gallery[0]!.attribution}
                </p>
              )}
            </div>
          ) : (
            // Horizontal scroll-snap gallery — native + accessible, no JS.
            // Each slide is 100% wide; the user swipes to the next photo.
            <ul className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth">
              {gallery.map((p, i) => (
                <li key={i} className="relative aspect-[16/9] w-full shrink-0 snap-center">
                  <Image
                    src={p.url}
                    alt={`${b.name} — ${i + 1}/${gallery.length}`}
                    fill
                    sizes="(min-width: 768px) 768px, 100vw"
                    className="object-cover"
                    priority={i === 0}
                  />
                  {p.attribution && (
                    <p className="absolute bottom-2 right-3 text-[10px] text-white/65">
                      {p.attribution}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
          {/* Photo count chip — only when there's more than 1, so visitors
              know the gallery is swipeable. */}
          {gallery.length > 1 && (
            <span className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
              <svg viewBox="0 0 16 16" aria-hidden className="h-3 w-3 fill-current">
                <path d="M2 4a1 1 0 011-1h10a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V4zm2 0v8h8V4H4zm2 5l1.5-2 1.5 2 1-1.3L12 11H4l2-2z" />
              </svg>
              {gallery.length}
            </span>
          )}
          {/* Verified badge — top right of the gallery. */}
          <span
            title={b.fbPageTitle ? `${t.verifiedBy} ${b.fbPageTitle}` : t.verified}
            className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-black/55 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-emerald-300 backdrop-blur"
          >
            <svg viewBox="0 0 16 16" aria-hidden className="h-3 w-3 fill-current">
              <path d="M6.5 11.2 3.4 8.1l1.1-1.1 2 2 4.9-4.9 1.1 1.1z" />
            </svg>
            {t.verified}
          </span>
        </div>
      )}

      <div className="p-5 md:p-6">
        {/* ── Header: name + (no-photo verified badge fallback) ───── */}
        <header className="flex items-start justify-between gap-3">
          <h3 className="font-display text-xl font-semibold text-[var(--color-fg-0)] md:text-2xl">
            {b.name}
          </h3>
          {gallery.length === 0 && (
            <span
              title={b.fbPageTitle ? `${t.verifiedBy} ${b.fbPageTitle}` : t.verified}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-700/40 bg-emerald-900/30 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-300"
            >
              <svg viewBox="0 0 16 16" aria-hidden className="h-3 w-3 fill-current">
                <path d="M6.5 11.2 3.4 8.1l1.1-1.1 2 2 4.9-4.9 1.1 1.1z" />
              </svg>
              {t.verified}
            </span>
          )}
        </header>

        {/* ── Meta row: rating + price + address ──────────────────── */}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          {b.rating != null && (
            <span className="inline-flex items-center gap-1 tabular-nums text-[var(--color-fg-1)]">
              <span className="text-[var(--color-accent-amber)]">★</span>
              <span className="font-semibold text-[var(--color-fg-0)]">{b.rating.toFixed(1)}</span>
              {b.reviewCount != null && b.reviewCount > 0 && (
                <span className="text-[var(--color-fg-2)]">· {formatCount(b.reviewCount, locale)} {t.reviews}</span>
              )}
            </span>
          )}
          {price && (
            <span className="font-medium text-[var(--color-fg-1)]" title={t.priceTier}>{price}</span>
          )}
          {b.address && (
            <span className="text-[var(--color-fg-2)]">{b.address}</span>
          )}
        </div>

        {/* ── Open-now chip — only renders when computable. ─────── */}
        {b.openingHours && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs">
            <span aria-hidden className={`inline-block h-2 w-2 rounded-full ${open ? 'bg-emerald-400' : 'bg-[var(--color-fg-3)]'}`} />
            <span className={open ? 'font-medium text-emerald-300' : 'text-[var(--color-fg-2)]'}>
              {open ? t.openNow : t.closedNow}
            </span>
          </p>
        )}

        {/* ── Blurb ───────────────────────────────────────────────── */}
        <p className="mt-4 text-sm leading-relaxed text-[var(--color-fg-1)] md:text-base">
          {b.blurb}
        </p>

        {/* ── Action buttons (tap-to-call first on mobile) ───────── */}
        <div className="mt-5 flex flex-wrap gap-2">
          {telUrl && (
            <a
              href={telUrl}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20"
            >
              <span aria-hidden>📞</span> {t.call}
            </a>
          )}
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-accent-cyan)] bg-[var(--color-accent-cyan)]/10 px-3.5 py-1.5 text-xs font-medium text-[var(--color-accent-cyan)] transition hover:bg-[var(--color-accent-cyan)]/20"
          >
            <span aria-hidden>🚗</span> {t.directions}
          </a>
          <a
            href={b.fbUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-bg-2)] bg-[var(--color-bg-2)] px-3.5 py-1.5 text-xs font-medium text-[var(--color-fg-1)] transition hover:text-[var(--color-fg-0)]"
          >
            <span aria-hidden>𝙛</span> Facebook
          </a>
          <a
            href={b.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-bg-2)] bg-[var(--color-bg-2)] px-3.5 py-1.5 text-xs font-medium text-[var(--color-fg-1)] transition hover:text-[var(--color-fg-0)]"
          >
            <span aria-hidden>📍</span> Google Maps
          </a>
        </div>

        {/* ── Map iframe (collapsible, compact 16:6 strip) ───────── */}
        <details className="group mt-5 overflow-hidden rounded-xl border border-[var(--color-bg-2)]">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-xs font-medium text-[var(--color-fg-1)] hover:bg-[var(--color-bg-2)]/40">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden>🗺</span>
              <span>{t.showMap}</span>
            </span>
            <span aria-hidden className="text-[var(--color-fg-2)] group-open:rotate-90 transition">▸</span>
          </summary>
          <div className="relative aspect-[16/6] w-full">
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

function formatCount(n: number, locale: Locale): string {
  try { return new Intl.NumberFormat(locale === 'el' ? 'el-GR' : locale).format(n); }
  catch { return String(n); }
}

const LABELS: Record<'el' | 'en', {
  verified: string; verifiedBy: string;
  directions: string; call: string;
  onMap: string; showMap: string;
  reviews: string; priceTier: string;
  openNow: string; closedNow: string;
}> = {
  el: {
    verified: 'Επαληθευμένο', verifiedBy: 'Επαληθεύτηκε μέσω',
    directions: 'Οδηγίες', call: 'Κάλεσε',
    onMap: 'στον χάρτη', showMap: 'Δες στον χάρτη',
    reviews: 'κριτικές', priceTier: 'Εύρος τιμής',
    openNow: 'Ανοιχτό τώρα', closedNow: 'Κλειστό τώρα',
  },
  en: {
    verified: 'Verified', verifiedBy: 'Verified via',
    directions: 'Directions', call: 'Call',
    onMap: 'on map', showMap: 'Show on map',
    reviews: 'reviews', priceTier: 'Price tier',
    openNow: 'Open now', closedNow: 'Closed now',
  },
};
