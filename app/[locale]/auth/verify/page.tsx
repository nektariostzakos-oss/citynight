import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { consumeMagicToken, findOrCreateUser } from '@/lib/auth/magic-link';
import { createSession } from '@/lib/auth/session';
import { db } from '@/db';
import { isLocale } from '@/lib/i18n';
import { privateMetadata } from '@/lib/seo';

// Magic-link landing page. Reads ?token=&purpose=. On success:
//  - login  → create session, redirect to dashboard
//  - claim  → mark claim verified for the linked venue, create session, redirect to claim flow

export const dynamic = 'force-dynamic';
export const metadata: Metadata = privateMetadata({ title: 'Verify sign-in — citynight' });

export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string; purpose?: string }>;
}) {
  const { locale } = await params;
  const { token, purpose: purposeParam } = await searchParams;
  const purpose = purposeParam === 'claim' ? 'claim' : 'login';
  if (!isLocale(locale) || !token) return failure(locale, 'Missing or invalid link.');

  const consumed = consumeMagicToken(token, purpose);
  if (!consumed) return failure(locale, 'This link has expired or already been used.');

  const userId = findOrCreateUser(consumed.email, locale);
  await createSession(userId);

  if (purpose === 'claim' && consumed.venueId) {
    // Verify the claim row. If none exists, create one (user could have come straight from email).
    const sqlite = db.$client;
    const existing = sqlite.prepare(
      `SELECT id FROM claims WHERE venue_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1`,
    ).get(consumed.venueId, userId) as { id: string } | undefined;

    const claimTx = sqlite.transaction((claimId: string | null) => {
      if (claimId) {
        sqlite.prepare(`UPDATE claims SET status = 'verified', verified_at = unixepoch() WHERE id = ?`).run(claimId);
      } else {
        sqlite.prepare(`
          INSERT INTO claims (id, venue_id, user_id, method, status, verified_at)
          VALUES (?, ?, ?, 'email', 'verified', unixepoch())
        `).run(crypto.randomUUID(), consumed.venueId, userId);
      }
      sqlite.prepare(
        `UPDATE venues SET claim = 'verified', owner_id = ? WHERE id = ? AND (owner_id IS NULL OR owner_id = ?)`,
      ).run(userId, consumed.venueId, userId);
    });
    claimTx(existing?.id ?? null);

    redirect(`/${locale}/dashboard/${consumed.venueId}`);
  }

  redirect(`/${locale}/dashboard`);
}

function failure(locale: string, message: string) {
  return (
    <section className="mx-auto w-full max-w-md px-6 py-20 text-center">
      <h1 className="font-display text-2xl font-semibold">Sign-in failed</h1>
      <p className="mt-3 text-[var(--color-fg-1)]">{message}</p>
      <Link href={`/${locale}/sign-in`} className="mt-6 inline-block rounded-md border border-[var(--color-accent-cyan)] px-4 py-2 text-sm text-[var(--color-accent-cyan)] hover:bg-[var(--color-accent-cyan)] hover:text-[var(--color-bg-0)]">
        Request a new link
      </Link>
    </section>
  );
}
