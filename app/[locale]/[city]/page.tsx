// Phase K.1 — the article guide moved from /{locale}/{city} to
// /{locale}/cities/{city}. This file remains as a 301 redirect so any
// old links / SERPs already pointing here keep working.

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
