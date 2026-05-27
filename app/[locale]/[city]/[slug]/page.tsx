// Phase K.1 — article detail moved from /{locale}/{city}/{slug} to
// /{locale}/cities/{city}/{slug}. 301 redirect preserves any inbound
// links.

import { permanentRedirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n';

export default async function ArticleRedirect({
  params,
}: {
  params: Promise<{ locale: string; city: string; slug: string }>;
}) {
  const { locale, city, slug } = await params;
  const safeLocale = isLocale(locale) ? locale : 'el';
  permanentRedirect(`/${safeLocale}/cities/${city}/${slug}`);
}
