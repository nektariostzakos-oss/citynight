// Phase H — the directory "submit a new venue" form was superseded by the
// SaaS signup wizard at /[locale]/sites/new. We keep this stub as a 308
// so any in-the-wild link lands on the right page.

import { permanentRedirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n';

export default async function LegacySubmitRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale = isLocale(locale) ? locale : 'el';
  permanentRedirect(`/${safeLocale}/sites/new`);
}
