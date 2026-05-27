// Phase J.4 — legacy /greece/{city} permanent-redirects to /{city},
// the canonical article-index URL after the editorial pivot. Preserves
// any inbound link equity from the old directory URLs.

import { permanentRedirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n';

export default async function CityRedirect({
  params,
}: {
  params: Promise<{ locale: string; city: string }>;
}) {
  const { locale, city } = await params;
  const safeLocale = isLocale(locale) ? locale : 'el';
  permanentRedirect(`/${safeLocale}/${city}`);
}
