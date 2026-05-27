// Phase H3 — old /greece/{city}/{bucket} URL collapses upward to
// /cities/{city}. The new discovery model is one page per city, with
// filtering/categorisation visual rather than URL-based.

import { permanentRedirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n';

export default async function CityBucketRedirect({
  params,
}: {
  params: Promise<{ locale: string; city: string; bucket: string }>;
}) {
  const { locale, city } = await params;
  const safeLocale = isLocale(locale) ? locale : 'el';
  permanentRedirect(`/${safeLocale}/cities/${city}`);
}
