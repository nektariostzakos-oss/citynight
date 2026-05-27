// Phase J.4 — /greece root collapses to the locale homepage. The old
// "browse all Greek cities" surface gets repurposed onto /{locale} in
// J.3 (the home doorway).

import { permanentRedirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n';

export default async function GreeceRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale = isLocale(locale) ? locale : 'el';
  permanentRedirect(`/${safeLocale}`);
}
