// Phase I.9 — booking-led home layout for service-based industries
// (barber / hair / clinic / nail / spa / yoga).
//
// Section order favours the conversion path: Hero → Services → Staff →
// Approved reviews → Gallery. CTAs lead to /book rather than /menu.

import Image from 'next/image';
import Link from 'next/link';
import { listEnabledServices, listEnabledStaff, type SiteService, type SiteStaff } from '@/lib/booking';
import { listApprovedReviews, type SiteReview } from '@/lib/crm';

type SitePhoto = { id: string; url: string; isPrimary: boolean };

export function BookingHome({
  site, photos, locale, base,
}: {
  site: { id: string; name: string; city: string | null; country: string; tagline: string | null; aboutText: string | null };
  photos: SitePhoto[];
  locale: string;
  base: string;
}) {
  const services = listEnabledServices(site.id).slice(0, 6);
  const staff = listEnabledStaff(site.id);
  const reviews = listApprovedReviews(site.id, 3);
  const heroPhoto = photos.find((p) => p.isPrimary) ?? photos[0];

  return (
    <>
      <section className="mx-auto grid max-w-6xl gap-10 px-6 pt-10 pb-16 md:grid-cols-[1.15fr_1fr] md:gap-16 md:pt-20">
        <div className="flex flex-col justify-center">
          <p className="site-eyebrow">{site.city ?? site.country}</p>
          <h1 className="site-h1 mt-3">{site.name}</h1>
          {site.tagline && <p className="site-body mt-5 max-w-md text-lg">{site.tagline}</p>}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`${base}/book`} className="site-cta">Book an appointment</Link>
            {services.length > 0 && <Link href={`${base}/book`} className="site-cta-ghost">See services</Link>}
          </div>
        </div>
        <div>
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl md:aspect-[4/5]">
            {heroPhoto ? (
              <Image src={heroPhoto.url} alt={site.name} fill sizes="(min-width:1024px) 560px, 100vw" priority className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center" style={{ background: 'var(--site-surface)' }}>
                <span className="site-eyebrow">Add a hero photo</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {services.length > 0 && (
        <ServicesSection services={services} base={base} />
      )}

      {staff.length > 0 && (
        <StaffSection staff={staff} />
      )}

      {reviews.length > 0 && (
        <ReviewsSection reviews={reviews} />
      )}

      {site.aboutText && (
        <section className="mx-auto max-w-3xl px-6 py-16">
          <p className="site-eyebrow text-center">Our story</p>
          <h2 className="site-h2 mt-3 text-center">{firstSentence(site.aboutText)}</h2>
          <div className="site-rule mx-auto mt-8 w-24" />
          <p className="site-body mt-8 whitespace-pre-line">{site.aboutText}</p>
          <p className="mt-8 text-center"><Link href={`${base}/about`} className="site-link">Read more →</Link></p>
        </section>
      )}

      {photos.length > 1 && (
        <section className="mx-auto max-w-6xl px-6 py-16">
          <p className="site-eyebrow">Inside</p>
          <h2 className="site-h2 mt-2">A look around.</h2>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos.slice(0, 4).map((p) => (
              <li key={p.id} className="relative aspect-[4/5] overflow-hidden rounded-xl">
                <Image src={p.url} alt={site.name} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover" />
              </li>
            ))}
          </ul>
          {photos.length > 4 && (
            <p className="mt-6 text-center"><Link href={`${base}/gallery`} className="site-link text-sm">See gallery →</Link></p>
          )}
        </section>
      )}

      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <p className="site-eyebrow">Take a seat in the chair</p>
        <h2 className="site-h2 mt-3">We have an opening this week.</h2>
        <p className="site-body mx-auto mt-5 max-w-xl">
          Book in under a minute — we&apos;ll email a confirmation and a reminder.
        </p>
        <Link href={`${base}/book`} className="site-cta mt-8">Book an appointment</Link>
      </section>
    </>
  );
}

// ─── sub-sections ────────────────────────────────────────────────────

function formatPrice(cents: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100);
}

function ServicesSection({ services, base }: { services: SiteService[]; base: string }) {
  // Services don't carry a currency column (atelier-style sites are
  // single-currency by convention); we default to EUR for the Greek
  // market. When per-site currency lands, thread it through here.
  const currency = 'EUR';
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex items-baseline justify-between gap-6">
        <div>
          <p className="site-eyebrow">What we do</p>
          <h2 className="site-h2 mt-2">Services.</h2>
        </div>
        <Link href={`${base}/book`} className="site-link text-sm">Book one →</Link>
      </div>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <li key={s.id} className="site-panel flex flex-col gap-2 p-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="site-display text-base font-semibold" style={{ color: 'var(--site-fg)' }}>{s.name}</p>
              <span className="site-stat shrink-0 text-sm" style={{ color: 'var(--site-fg)' }}>{formatPrice(s.priceCents, currency, 'en')}</span>
            </div>
            {s.description && <p className="text-sm site-body">{s.description}</p>}
            <p className="mt-1 text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--site-muted-2)' }}>
              {s.durationMinutes} min{s.category ? ` · ${s.category}` : ''}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StaffSection({ staff }: { staff: SiteStaff[] }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <p className="site-eyebrow">Who we are</p>
      <h2 className="site-h2 mt-2">The team.</h2>
      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {staff.map((p) => (
          <li key={p.id} className="site-panel p-5">
            {p.photoUrl && (
              <div className="relative mb-4 aspect-[4/5] overflow-hidden rounded-xl">
                <Image src={p.photoUrl} alt={p.name} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover" />
              </div>
            )}
            <p className="site-display text-lg font-semibold" style={{ color: 'var(--site-fg)' }}>{p.name}</p>
            {p.role && <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--site-muted-2)' }}>{p.role}</p>}
            {p.bio && <p className="mt-3 text-sm site-body">{p.bio}</p>}
            {p.specialties.length > 0 && (
              <p className="mt-3 text-xs" style={{ color: 'var(--site-muted)' }}>{p.specialties.join(' · ')}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReviewsSection({ reviews }: { reviews: SiteReview[] }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <p className="site-eyebrow text-center">What clients say</p>
      <h2 className="site-h2 mt-2 text-center">Words from the chair.</h2>
      <ul className="mt-10 grid gap-6 md:grid-cols-3">
        {reviews.map((r) => (
          <li key={r.id} className="site-panel p-5">
            <p style={{ color: 'var(--site-primary)' }}>{'★'.repeat(r.rating)}<span style={{ color: 'var(--site-muted-2)' }}>{'★'.repeat(5 - r.rating)}</span></p>
            {r.title && <p className="mt-3 site-display text-base font-semibold" style={{ color: 'var(--site-fg)' }}>{r.title}</p>}
            {r.body && <p className="mt-2 site-body text-sm">{r.body}</p>}
            {r.authorName && <p className="mt-3 text-xs" style={{ color: 'var(--site-muted)' }}>— {r.authorName}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function firstSentence(text: string): string {
  const m = text.match(/^[^.!?\n]+[.!?]/);
  return (m ? m[0] : text.slice(0, 120)).trim();
}
