// Phase H3 — directory city pages 308-redirect to /cities/{city}. The full
// discovery experience now lives at the new URL tree; this file exists only
// to preserve SEO equity from the original /greece/{city} URL until search
// engines re-crawl. H5 deletes the surrounding tree.

import { permanentRedirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n';

export default async function CityRedirect({
  params,
}: {
  params: Promise<{ locale: string; city: string }>;
}) {
  const { locale, city } = await params;
  const safeLocale = isLocale(locale) ? locale : 'el';
  permanentRedirect(`/${safeLocale}/cities/${city}`);
}
