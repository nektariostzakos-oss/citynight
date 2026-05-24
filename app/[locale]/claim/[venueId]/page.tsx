import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n';
import { db } from '@/db';
import { SignInForm } from '@/components/sign-in-form';
import { privateMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = privateMetadata({ title: 'Claim venue — citynight' });

const COPY: Record<Locale, { h1: (n: string) => string; lead: string; verify: string }> = {
  en: {
    h1: (n) => `Claim ${n}`,
    lead: 'Enter the email on file (or any email — we will email a verification link).',
    verify: 'Verification link will be sent to your email.',
  },
  el: {
    h1: (n) => `Διεκδίκησε ${n}`,
    lead: 'Δώσε email — θα σου στείλουμε σύνδεσμο επιβεβαίωσης.',
    verify: 'Σύνδεσμος επιβεβαίωσης θα σταλεί στο email σου.',
  },
  de: { h1: (n) => `${n} beanspruchen`, lead: 'Geben Sie eine E-Mail ein — wir senden einen Bestätigungslink.', verify: 'Bestätigungslink wird gesendet.' },
  fr: { h1: (n) => `Revendiquer ${n}`, lead: 'Entrez un email — nous enverrons un lien de vérification.', verify: 'Lien de vérification envoyé.' },
  it: { h1: (n) => `Reclama ${n}`, lead: 'Inserisci un email — invieremo un link di verifica.', verify: 'Link di verifica inviato.' },
};

export default async function ClaimPage({ params }: { params: Promise<{ locale: string; venueId: string }> }) {
  const { locale, venueId } = await params;
  if (!isLocale(locale)) notFound();

  const venue = db.$client.prepare(
    `SELECT id, name, claim FROM venues WHERE id = ? AND status = 'published'`,
  ).get(venueId) as { id: string; name: string; claim: 'unclaimed' | 'pending' | 'verified' } | undefined;
  if (!venue) notFound();

  const c = COPY[locale];
  const already = venue.claim === 'verified';

  return (
    <section className="mx-auto w-full max-w-md px-6 py-16">
      <p className="text-xs uppercase tracking-widest text-[var(--color-fg-2)]">claim</p>
      <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">{c.h1(venue.name)}</h1>

      {already ? (
        <p className="mt-4 rounded-md border border-[var(--color-warning)] bg-[var(--color-bg-1)] p-4 text-sm text-[var(--color-warning)]">
          This venue is already claimed. If you are the owner and lost access,{' '}
          <Link href={`/${locale}/sign-in`} className="underline">sign in</Link> with the email on file.
        </p>
      ) : (
        <>
          <p className="mt-4 text-[var(--color-fg-1)]">{c.lead}</p>
          <div className="mt-8">
            <SignInForm locale={locale} purpose="claim" venueId={venue.id} />
          </div>
          <p className="mt-4 text-xs text-[var(--color-fg-3)]">{c.verify}</p>
        </>
      )}
    </section>
  );
}
