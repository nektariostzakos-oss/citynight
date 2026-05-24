import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/db';
import { privateMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = privateMetadata({ title: 'Dashboard — citynight' });

export default async function Dashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) redirect('/en/sign-in');
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/sign-in`);

  const venues = db.$client.prepare(`
    SELECT v.id, v.name, v.status, v.claim, v.tier, c.slug AS citySlug, c.name AS cityName
      FROM venues v JOIN cities c ON c.id = v.city_id
     WHERE v.owner_id = ? ORDER BY v.name
  `).all(user.id) as { id: string; name: string; status: string; claim: string; tier: string; citySlug: string; cityName: string }[];

  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-12">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Your venues</h1>
        <Link href={`/${locale}/dashboard/new`} className="text-sm text-[var(--color-accent-cyan)] hover:underline">+ submit new venue</Link>
      </div>

      {venues.length === 0 ? (
        <p className="mt-8 text-[var(--color-fg-1)]">
          You haven&apos;t claimed any venues yet. Find your listing on the site and click &quot;Claim&quot;.
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {venues.map((v) => (
            <li key={v.id}>
              <Link
                href={`/${locale}/dashboard/${v.id}`}
                className="block rounded-lg border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] p-4 hover:border-[var(--color-accent-cyan)]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display text-lg font-semibold">{v.name}</p>
                    <p className="mt-0.5 text-xs text-[var(--color-fg-2)]">{v.cityName} · {v.status} · {v.claim}</p>
                  </div>
                  <span
                    className={
                      v.tier === 'featured'
                        ? 'rounded-full bg-[var(--color-accent-pink)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--color-bg-0)]'
                        : 'rounded-full border border-[var(--color-bg-3)] px-2 py-0.5 text-[10px] uppercase text-[var(--color-fg-2)]'
                    }
                  >
                    {v.tier}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
