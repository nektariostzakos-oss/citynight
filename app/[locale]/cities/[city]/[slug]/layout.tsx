// SaaS site layout — locale-prefixed + city-prefixed URL shape.
// Marker `.venue-as-website` hides the citynight global header/footer via
// the existing CSS :has() rule, so the customer's site presents
// privately-labeled even though it lives under the citynight locale tree.

import { notFound, permanentRedirect } from 'next/navigation';
import { Fraunces, Inter } from 'next/font/google';
import { getPublishedSiteByCityAndSlug, getPublishedSiteBySlug, getSiteAvailability } from '@/lib/site-queries';
import { siteStyleVars, themeForTemplate } from '@/lib/site-theme';
import { SiteHeader } from '@/components/site-render/site-header';
import { SiteFooter } from '@/components/site-render/site-footer';
import { CitynightStrip } from '@/components/site-render/citynight-strip';
import { isLocale, type Locale } from '@/lib/i18n';

const fraunces = Fraunces({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-site-display',
});
const inter = Inter({
  subsets: ['latin', 'latin-ext', 'greek'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-site-body',
});

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; city: string; slug: string }>;
}) {
  const { locale, city, slug } = await params;
  if (!isLocale(locale)) notFound();

  // Look up site by (city, slug). Two failure modes:
  //   • Slug doesn't exist anywhere → 404
  //   • Slug exists but in a different city → redirect to its canonical city
  let site = getPublishedSiteByCityAndSlug(city, slug);
  if (!site) {
    const orphan = getPublishedSiteBySlug(slug);
    if (orphan?.citySlug && orphan.citySlug !== city) {
      permanentRedirect(`/${locale}/cities/${orphan.citySlug}/${slug}`);
    }
    notFound();
  }

  const theme = themeForTemplate(site.templateId);
  const availability = getSiteAvailability(site.id);
  const basePath = `/${locale}/cities/${city}/${slug}`;
  const displayVar =
    theme.fontHeading === 'fraunces' ? fraunces.variable :
    theme.fontHeading === 'inter'    ? inter.variable    :
                                       '';

  return (
    <div
      className={`site-root venue-as-website flex min-h-screen flex-col ${fraunces.variable} ${inter.variable} ${displayVar}`}
      style={siteStyleVars(site.templateId)}
    >
      {/* Slim "← back to {city}" strip at the very top so visitors can
          return to the discovery surface + citynight home without losing
          context. Mirrors the old directory chrome but on the new URLs. */}
      <CitynightStrip
        locale={locale as Locale}
        citySlug={site.citySlug ?? city}
        cityName={site.city ?? city}
        siteId={site.id}
        unclaimed={!site.isClaimed}
      />
      <SiteHeader
        slug={site.slug}
        name={site.name}
        wordmark={site.wordmark}
        tagline={site.tagline}
        logoUrl={site.logoUrl}
        availability={availability}
        basePath={basePath}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter
        slug={site.slug}
        basePath={basePath}
        name={site.name}
        wordmark={site.wordmark}
        tagline={site.tagline}
        city={site.city}
        address={site.address}
        phone={site.phone}
        email={site.contactEmail}
        hours={site.hours}
      />
    </div>
  );
}
