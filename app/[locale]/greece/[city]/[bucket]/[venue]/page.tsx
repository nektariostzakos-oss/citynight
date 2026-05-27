// Phase H5 — legacy directory venue URL exists only as a redirect to the
// canonical SaaS site at /{locale}/cities/{citySlug}/{slug}. The full
// venue renderer was deleted; every published venue has a migrated `sites`
// row (Phase H1) so the redirect resolves. Unmatched URLs 404 naturally.

import { notFound, permanentRedirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n';
import { findMigratedSiteTarget } from '@/lib/legacy-redirect';

export default async function LegacyVenueRedirect({
  params,
}: {
  params: Promise<{ locale: string; city: string; bucket: string; venue: string }>;
}) {
  const { locale, city, bucket, venue } = await params;
  const safeLocale = isLocale(locale) ? locale : 'el';
  const target = findMigratedSiteTarget(city, bucket, venue);
  if (target) permanentRedirect(`/${safeLocale}/cities/${target.citySlug}/${target.slug}`);
  notFound();
}
