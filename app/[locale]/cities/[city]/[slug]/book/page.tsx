import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublishedSiteByCityAndSlug } from '@/lib/site-queries';
import { publicMetadata, jsonLdProps } from '@/lib/seo';
import { SiteContactForm } from '@/components/site-render/site-contact-form';
import { isLocale } from '@/lib/i18n';
import { listEnabledServices } from '@/lib/booking';
import { BookingFlow } from '@/components/booking-flow';

export const revalidate = 1800;

type Params = Promise<{ locale: string; city: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, city, slug } = await params;
  if (!isLocale(locale)) return {};
  const site = getPublishedSiteByCityAndSlug(city, slug);
  if (!site) return {};
  return publicMetadata({
    locale, paths: { [locale]: `/${locale}/cities/${city}/${slug}/book` },
    title: `Reserve — ${site.name}`,
    description: `Reserve a table at ${site.name}${site.city ? `, ${site.city}` : ''}.`,
  });
}

export default async function SiteBookPage({ params }: { params: Params }) {
  const { locale, city, slug } = await params;
  if (!isLocale(locale)) notFound();
  const site = getPublishedSiteByCityAndSlug(city, slug);
  if (!site) notFound();

  // Sites with at least one enabled service get the booking calendar flow.
  // The rest (restaurants / bars / hotels without a services catalogue) keep
  // the existing reservation-channels page below.
  const services = listEnabledServices(site.id).map((s) => ({
    id: s.id, slug: s.slug, name: s.name,
    description: s.description, category: s.category,
    durationMinutes: s.durationMinutes, priceCents: s.priceCents,
  }));
  const hasBookableServices = services.length > 0;

  const phoneToCall = site.reservationPhone ?? site.phone;
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://citynight.gr';

  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <script type="application/ld+json" {...jsonLdProps([{
        '@context': 'https://schema.org', '@type': 'ReserveAction',
        name: `Reserve at ${site.name}`,
        target: {
          '@type': 'EntryPoint',
          urlTemplate: site.reservationUrl ?? `${base}/${locale}/cities/${city}/${slug}/book`,
          inLanguage: locale,
        },
        ...(site.reservationEmail ? { recipient: { '@type': 'Organization', name: site.name, email: site.reservationEmail } } : {}),
      }])} />

      <header className="mb-10">
        <p className="site-eyebrow">{site.city ?? ''}</p>
        <h1 className="site-h1 mt-3">{hasBookableServices ? `Book at ${site.name}` : 'Reserve a table'}</h1>
        {site.reservationNotes && <p className="site-body mt-5 max-w-2xl whitespace-pre-line">{site.reservationNotes}</p>}
      </header>

      {hasBookableServices ? (
        <BookingFlow
          siteId={site.id}
          siteName={site.name}
          initialServices={services}
          locale={locale}
        />
      ) : (
        <>
          {(site.reservationUrl || phoneToCall || site.reservationEmail) && (
            <div className="grid gap-3 mb-12">
              {site.reservationUrl && (
                <Channel href={site.reservationUrl} external title={`Book at ${site.name}`} hint="Opens the venue's booking page." />
              )}
              {site.reservationEmail && (
                <Channel
                  href={`mailto:${site.reservationEmail}?subject=${encodeURIComponent(`Reservation — ${site.name}`)}`}
                  title={`Email ${site.name}`} hint="Direct to the reservations inbox."
                />
              )}
              {phoneToCall && (
                <Channel href={`tel:${phoneToCall.replace(/\s/g, '')}`} title={`Call · ${phoneToCall}`} hint="Speak to us directly." />
              )}
            </div>
          )}
          <SiteContactForm siteId={site.id} siteName={site.name} />
        </>
      )}
    </article>
  );
}

function Channel({ href, title, hint, external }: { href: string; title: string; hint: string; external?: boolean }) {
  return (
    <a href={href} {...(external ? { target: '_blank', rel: 'sponsored nofollow noopener' } : {})}
       className="site-panel group flex items-center justify-between gap-6 p-5 transition">
      <span>
        <span className="block site-display text-xl font-semibold" style={{ color: 'var(--site-fg)' }}>{title}</span>
        <span className="mt-1 block text-sm site-body">{hint}</span>
      </span>
      <span aria-hidden className="text-2xl transition group-hover:translate-x-0.5" style={{ color: 'var(--site-primary)' }}>→</span>
    </a>
  );
}
