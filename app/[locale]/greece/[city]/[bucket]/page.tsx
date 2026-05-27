// Phase J.4 — old /greece/{city}/{bucket} URL collapses upward to
// the city's article index at /{city}. Buckets (category listings) no
// longer exist as a URL surface; the article-led model exposes
// categories via individual articles ("Top 10 Rooftop Bars in {city}").

import { permanentRedirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n';

export default async function CityBucketRedirect({
  params,
}: {
  params: Promise<{ locale: string; city: string; bucket: string }>;
}) {
  const { locale, city } = await params;
  const safeLocale = isLocale(locale) ? locale : 'el';
  permanentRedirect(`/${safeLocale}/${city}`);
}
