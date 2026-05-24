import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { LOCALES, HREFLANG, isLocale, type Locale } from '@/lib/i18n';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { CmpInit } from '@/components/cmp';
import { AdsenseInit } from '@/components/adsense-init';
import { VisitorLocationProvider } from '@/components/visitor-location-provider';
import { NearbyCitiesProvider } from '@/components/nearby-cities-context';
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

  return (
    <div lang={HREFLANG[typedLocale]} className="flex min-h-screen flex-col">
      <CmpInit />
      <AdsenseInit />
      <VisitorLocationProvider>
        <NearbyCitiesProvider cities={cities}>
          <SiteHeader locale={typedLocale} />
          <main className="flex-1">{children}</main>
          <SiteFooter locale={typedLocale} />
        </NearbyCitiesProvider>
      </VisitorLocationProvider>
    </div>
  );
}
