import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { isLocale } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/db';
import { VenueEditor } from '@/components/venue-editor';
import { VenueAnalytics } from '@/components/venue-analytics';
import { privateMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = privateMetadata({ title: 'Manage venue — citynight' });

export default async function VenueDashboard({ params }: { params: Promise<{ locale: string; venueId: string }> }) {
  const { locale, venueId } = await params;
  if (!isLocale(locale)) redirect('/en/sign-in');
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/sign-in`);

  const v = db.$client.prepare(`
    SELECT v.id, v.name, v.address, v.phone, v.website, v.opening_hours AS openingHours,
           v.description, v.tier, v.status, v.claim, v.field_sources AS fieldSources,
           c.name AS cityName, c.slug AS citySlug,
           COALESCE(a.slug, cat.slug) AS bucketSlug, v.slug AS slug
      FROM venues v
      JOIN cities c ON c.id = v.city_id
      LEFT JOIN areas a ON a.id = v.area_id
      LEFT JOIN categories cat ON cat.id = v.category_id
     WHERE v.id = ? AND v.owner_id = ?
  `).get(venueId, user.id) as Record<string, unknown> | undefined;

  if (!v) notFound();

  const publicHref = v.slug && v.bucketSlug
    ? `/${locale}/greece/${v.citySlug as string}/${v.bucketSlug as string}/${v.slug as string}`
    : null;

  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-12">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--color-fg-2)]">{v.cityName as string} · {v.status as string}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">{v.name as string}</h1>
        </div>
        {publicHref && (
          <Link href={publicHref} className="text-sm text-[var(--color-accent-cyan)] hover:underline">View public page →</Link>
        )}
      </div>

      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <div>
          <h2 className="font-display text-xl font-semibold">Edit listing</h2>
          <p className="mt-1 text-xs text-[var(--color-fg-3)]">
            Each change is tagged as owner-sourced. Weekly Google sync will not overwrite owner-edited fields.
          </p>
          <div className="mt-4">
            <VenueEditor
              venueId={v.id as string}
              initial={{
                phone: (v.phone as string | null) ?? '',
                website: (v.website as string | null) ?? '',
                address: (v.address as string | null) ?? '',
                description: (v.description as string | null) ?? '',
              }}
            />
          </div>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold">Analytics</h2>
          {v.tier !== 'featured' ? (
            <p className="mt-2 text-sm text-[var(--color-fg-2)]">
              Analytics are part of the Featured tier.{' '}
              <Link href={`/${locale}/dashboard/${v.id as string}/billing`} className="text-[var(--color-accent-pink)] hover:underline">Upgrade →</Link>
            </p>
          ) : (
            <div className="mt-4">
              <VenueAnalytics venueId={v.id as string} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
