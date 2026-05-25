import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LOCALES, HREFLANG, isLocale, type Locale } from '@/lib/i18n';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { CmpInit } from '@/components/cmp';
import { Ga4 } from '@/components/ga4';
import { AdsenseInit } from '@/components/adsense-init';
import { VisitorLocationProvider } from '@/components/visitor-location-provider';
import { NearbyCitiesProvider } from '@/components/nearby-cities-context';
import { GeoEnhancer } from '@/components/geo-enhancer';
import { listPublishedCities } from '@/lib/queries';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://citynight.gr';

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

// Default hreflang alternates for any page under [locale]/ that doesn't emit its own.
// Pages with concrete paths (city / area / venue / guide / legal) override via their
// own generateMetadata + lib/seo.ts alternatesFor(). Next 15 deep-merges alternates,
// so the page-level canonical wins while locale roots fall back to these defaults.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[HREFLANG[l]] = `${siteUrl}/${l}`;
  languages['x-default'] = `${siteUrl}/en`;
  return { alternates: { canonical: `${siteUrl}/${locale}`, languages } };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const typedLocale: Locale = locale;
  // Server-rendered, identical for every visitor (preserves SEO). The client-
  // side NearbyCitiesProvider reorders these by distance to the visitor IP
  // once hydration completes — no per-visitor server personalisation.
  const cities = listPublishedCities(typedLocale);

  // Mobile menu's "Popular" preview fallback (used when precise location
  // isn't available). Iconic-first, then any other published city.
  const ICONIC_SLUGS = ['athens', 'mykonos', 'santorini', 'thessaloniki', 'corfu', 'rhodes'];
  const popularCities = [
    ...ICONIC_SLUGS.map((s) => cities.find((c) => c.slug === s)).filter((x): x is typeof cities[number] => !!x),
    ...cities.filter((c) => !ICONIC_SLUGS.includes(c.slug)),
  ]
    .slice(0, 6)
    .map((c) => ({ slug: c.slug, name: c.name, region: c.region }));

  return (
    <div lang={HREFLANG[typedLocale]} className="flex min-h-screen flex-col">
      {/* Strict loading order for Consent Mode v2 compliance:
            CmpInit (beforeInteractive defaults) → Ga4 (afterInteractive,
            queues events until consent grants) → AdsenseInit (lazyOnload,
            after LCP). */}
      <CmpInit />
      <Ga4 />
      <AdsenseInit />
      <VisitorLocationProvider>
        <NearbyCitiesProvider cities={cities}>
          <SiteHeader locale={typedLocale} popularCities={popularCities} />
          <main className="flex-1">{children}</main>
          <SiteFooter locale={typedLocale} />
          {/* Auto-redirect on precise location lock + iOS tap fallback CTA.
              Wrapped in Suspense because it reads useSearchParams() (for the
              ?debug=geo overlay); Next 15 requires a boundary or the SSG
              prerender bails to CSR for any page that mounts the layout. */}
          <Suspense fallback={null}>
            <GeoEnhancer locale={typedLocale} fallbackCities={popularCities} />
          </Suspense>
        </NearbyCitiesProvider>
      </VisitorLocationProvider>
    </div>
  );
}
