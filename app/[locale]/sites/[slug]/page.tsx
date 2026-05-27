// SaaS site home — Phase K.1 URL: /{locale}/sites/{slug}.
// (Previously at /{locale}/cities/{city}/{slug}; that URL now belongs to
// the city article guide. Old URLs 301 to here via the article route's
// fallback lookup.)

import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublishedSiteBySlug, getSiteMenu, getSitePhotos } from '@/lib/site-queries';
import { publicMetadata } from '@/lib/seo';
import { isLocale } from '@/lib/i18n';
import { isBookingLedTemplate } from '@/lib/site-theme';
import { BookingHome } from '@/components/site-render/booking-home';

export const revalidate = 1800;

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const site = getPublishedSiteBySlug(slug);
  if (!site) return {};
  return publicMetadata({
    locale,
    paths: { el: `/el/sites/${slug}`, en: `/en/sites/${slug}` },
    title: site.name,
    description: site.aboutText?.slice(0, 160) ?? site.tagline ?? `${site.name}${site.city ? ` — ${site.city}` : ''}`,
  });
}

export default async function SiteHomePage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const site = getPublishedSiteBySlug(slug);
  if (!site) notFound();
  const photos = getSitePhotos(site.id);
  const base = `/${locale}/sites/${slug}`;

  // Phase I.9 — dispatch on the site's template. Booking-led industries
  // (barber/hair/clinic/nail/spa/yoga) lead with Services + Staff +
  // Reviews; hospitality verticals (restaurant/bar/...) keep the existing
  // Menu + Photos + Reservation flow below.
  if (isBookingLedTemplate(site.templateId)) {
    return (
      <BookingHome
        site={{
          id: site.id, name: site.name,
          city: site.city, country: site.country,
          tagline: site.tagline, aboutText: site.aboutText,
        }}
        photos={photos}
        locale={locale}
        base={base}
      />
    );
  }

  const menu = getSiteMenu(site.id);
  const heroPhoto = photos.find((p) => p.isPrimary) ?? photos[0];

  return (
    <>
      <section className="mx-auto grid max-w-6xl gap-10 px-6 pt-10 pb-16 md:grid-cols-[1.15fr_1fr] md:gap-16 md:pt-20">
        <div className="flex flex-col justify-center">
          <p className="site-eyebrow">{site.city ?? site.country}</p>
          <h1 className="site-h1 mt-3">{site.name}</h1>
          {site.tagline && <p className="site-body mt-5 max-w-md text-lg">{site.tagline}</p>}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`${base}/book`} className="site-cta">Reserve a table</Link>
            {menu.length > 0 && <Link href={`${base}/menu`} className="site-cta-ghost">See menu</Link>}
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

      {site.aboutText && (
        <section className="mx-auto max-w-3xl px-6 py-16">
          <p className="site-eyebrow text-center">Our story</p>
          <h2 className="site-h2 mt-3 text-center">{firstSentence(site.aboutText)}</h2>
          <div className="site-rule mx-auto mt-8 w-24" />
          <p className="site-body mt-8 whitespace-pre-line">{site.aboutText}</p>
          <p className="mt-8 text-center"><Link href={`${base}/about`} className="site-link">Read more →</Link></p>
        </section>
      )}

      {menu.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex items-baseline justify-between gap-6">
            <div>
              <p className="site-eyebrow">From the menu</p>
              <h2 className="site-h2 mt-2">A few of our favourites.</h2>
            </div>
            <Link href={`${base}/menu`} className="site-link text-sm">Full menu →</Link>
          </div>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2">
            {menu
              .flatMap((s) => s.items.map((it) => ({ ...it, section: s.name })))
              .filter((it) => it.isPopular)
              .slice(0, 6)
              .map((it) => (
                <li key={it.id} className="site-panel flex items-start justify-between gap-4 p-5">
                  <div>
                    <p className="site-display text-base font-semibold" style={{ color: 'var(--site-fg)' }}>{it.name}</p>
                    {it.description && <p className="mt-1 text-sm site-body">{it.description}</p>}
                    <p className="mt-2 text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--site-muted-2)' }}>{it.section}</p>
                  </div>
                  {it.price && <span className="site-stat shrink-0 text-sm" style={{ color: 'var(--site-fg)' }}>{it.price}</span>}
                </li>
              ))}
          </ul>
        </section>
      )}

      {photos.length > 1 && (
        <section className="mx-auto max-w-6xl px-6 py-16">
          <p className="site-eyebrow">Inside</p>
          <h2 className="site-h2 mt-2">Where good evenings happen.</h2>
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
        <p className="site-eyebrow">Take a seat</p>
        <h2 className="site-h2 mt-3">The next table has your name on it.</h2>
        <p className="site-body mx-auto mt-5 max-w-xl">
          Reserve in under a minute — we&apos;ll email a confirmation and a reminder.
        </p>
        <Link href={`${base}/book`} className="site-cta mt-8">Reserve a table</Link>
      </section>
    </>
  );
}

function firstSentence(text: string): string {
  const m = text.match(/^[^.!?\n]+[.!?]/);
  return (m ? m[0] : text.slice(0, 120)).trim();
}
