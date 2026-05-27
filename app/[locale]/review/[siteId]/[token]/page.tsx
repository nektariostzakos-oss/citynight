// Public token-protected review submission page.
//
// URL shape:  /{locale}/review/{siteId}/{token}
// The post-visit email contains this link; clicking it lands here.
// Server validates the token before rendering the form so a forged
// link 404s cleanly instead of revealing a working UI.

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale } from '@/lib/i18n';
import { getPublishedSiteByCityAndSlug } from '@/lib/site-queries';
import { verifyReviewToken } from '@/lib/crm';
import { db } from '@/db';
import { ReviewSubmitForm } from '@/components/review-submit-form';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

type Params = Promise<{ locale: string; siteId: string; token: string }>;

export default async function ReviewSubmitPage({ params }: { params: Params }) {
  const { locale, siteId, token } = await params;
  if (!isLocale(locale)) notFound();

  const verified = verifyReviewToken(siteId, token);
  if (!verified) notFound();

  // Pull the site so the form can show "Reviewing {siteName}".
  const site = db.$client.prepare(
    `SELECT name, city_slug, slug FROM sites WHERE id = ? AND status = 'published'`,
  ).get(siteId) as { name: string; city_slug: string | null; slug: string } | undefined;
  if (!site) notFound();

  // Confirm the booking exists + belongs to this site.
  const booking = db.$client.prepare(
    `SELECT id, status, date FROM site_bookings WHERE id = ? AND site_id = ?`,
  ).get(verified.bookingId, siteId) as { id: string; status: string; date: string } | undefined;
  if (!booking) notFound();
  void getPublishedSiteByCityAndSlug; // imported so a future "go to site" CTA can use it

  return (
    <article className="mx-auto max-w-xl px-6 py-16">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--site-primary, #888)' }}>{site.name}</p>
        <h1 className="mt-2 text-3xl font-semibold" style={{ color: 'var(--site-fg, #eee)' }}>
          How was your visit on {booking.date}?
        </h1>
        <p className="mt-3 text-sm" style={{ color: 'var(--site-muted, #aaa)' }}>
          Your review will be reviewed before it appears publicly.
        </p>
      </header>
      <ReviewSubmitForm siteId={siteId} token={token} />
    </article>
  );
}
