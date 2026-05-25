import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { consumeMagicToken, findOrCreateUser } from '@/lib/auth/magic-link';
import { createSession } from '@/lib/auth/session';
import { db } from '@/db';
import { isLocale } from '@/lib/i18n';
import { privateMetadata, SITE_URL } from '@/lib/seo';
import { sendEmail, welcomeOnFirstClaimEmail } from '@/lib/email';

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

    // Was this the user's first verified claim? Used to gate the welcome email
    // (we don't want to re-spam on every subsequent claim).
    const otherVerified = (sqlite.prepare(
      `SELECT COUNT(*) AS n FROM venues WHERE owner_id = ? AND claim = 'verified' AND id != ?`,
    ).get(userId, consumed.venueId) as { n: number }).n;
    const isFirstClaim = otherVerified === 0;

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

    // Welcome email — fire-and-forget, never block the redirect. Only send on
    // the visitor's first verified claim so subsequent claims don't re-spam.
    if (isFirstClaim) {
      const venue = sqlite.prepare(`SELECT name FROM venues WHERE id = ?`).get(consumed.venueId) as { name: string } | undefined;
      if (venue) {
        const tmpl = welcomeOnFirstClaimEmail({
          venueName: venue.name,
          manageUrl: `${SITE_URL}/${locale}/dashboard/${consumed.venueId}`,
          dashboardUrl: `${SITE_URL}/${locale}/dashboard`,
        });
        sendEmail({ to: consumed.email, subject: tmpl.subject, html: tmpl.html, text: tmpl.text })
          .catch((err) => { console.error('welcome email failed:', err); });
      }
    }

    redirect(`/${locale}/dashboard/${consumed.venueId}?welcome=1`);
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
