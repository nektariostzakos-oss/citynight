import { notFound, permanentRedirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n';
import { findMigratedSiteTarget } from '@/lib/legacy-redirect';

export default async function LegacyAboutRedirect({
  params,
}: {
  params: Promise<{ locale: string; city: string; bucket: string; venue: string }>;
}) {
  const { locale, city, bucket, venue } = await params;
  const safeLocale = isLocale(locale) ? locale : 'el';
  const target = findMigratedSiteTarget(city, bucket, venue);
  if (target) permanentRedirect(`/${safeLocale}/cities/${target.citySlug}/${target.slug}/about`);
  notFound();
}
