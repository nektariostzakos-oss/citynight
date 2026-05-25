import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n';
import { db } from '@/db';
import { SignInForm } from '@/components/sign-in-form';
import { privateMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = privateMetadata({ title: 'Claim venue — citynight' });

type Step = { label: string; sub: string };
const COPY: Record<Locale, {
  kicker: string;
  h1: (n: string) => string;
  lead: string;
  verify: string;
  alreadyClaimed: string;
  alreadyLink: string;
  steps: [Step, Step, Step];
}> = {
  en: {
    kicker: 'Claim your venue',
    h1: (n) => `Take ownership of ${n}`,
    lead: 'We email you a one-time link. Click it, and the page is yours to edit.',
    verify: 'The link expires in 15 minutes. No password — ever.',
    alreadyClaimed: 'This venue is already claimed. If you are the owner and lost access,',
    alreadyLink: 'sign in with the email on file.',
    steps: [
      { label: 'Verify email',    sub: 'one-time link, no password' },
      { label: 'Confirm details', sub: 'address + hours from Google' },
      { label: 'You\'re in',       sub: 'edit + post events live' },
    ],
  },
  el: {
    kicker: 'Διεκδίκησε το μαγαζί σου',
    h1: (n) => `Πάρε στα χέρια σου το ${n}`,
    lead: 'Σου στέλνουμε link μιας χρήσης. Κάνεις κλικ και η σελίδα είναι δική σου.',
    verify: 'Το link λήγει σε 15 λεπτά. Χωρίς password — ποτέ.',
    alreadyClaimed: 'Το μαγαζί έχει ήδη γίνει claim. Αν είσαι ο ιδιοκτήτης κι έχασες πρόσβαση,',
    alreadyLink: 'σύνδεση με το email που χρησιμοποιείς.',
    steps: [
      { label: 'Επιβεβαίωση email',  sub: 'link μιας χρήσης, χωρίς password' },
      { label: 'Επιβεβαίωση στοιχείων', sub: 'διεύθυνση + ώρες από Google' },
      { label: 'Είσαι μέσα',          sub: 'άλλαξε + ανέβασε events live' },
    ],
  },
  de: {
    kicker: 'Location übernehmen',
    h1: (n) => `Übernimm ${n}`,
    lead: 'Wir senden dir einen Einmal-Link. Klick — und die Seite gehört dir.',
    verify: 'Der Link läuft in 15 Minuten ab. Niemals ein Passwort.',
    alreadyClaimed: 'Diese Location ist bereits beansprucht. Wenn du der Inhaber bist und keinen Zugriff mehr hast,',
    alreadyLink: 'mit der hinterlegten E-Mail anmelden.',
    steps: [
      { label: 'E-Mail bestätigen',  sub: 'Einmal-Link, kein Passwort' },
      { label: 'Daten prüfen',        sub: 'Adresse + Zeiten via Google' },
      { label: 'Drin',                sub: 'editieren + Events live' },
    ],
  },
  fr: {
    kicker: 'Revendiquer votre lieu',
    h1: (n) => `Reprenez ${n}`,
    lead: 'Nous vous envoyons un lien unique. Cliquez et la page est à vous.',
    verify: 'Le lien expire dans 15 minutes. Jamais de mot de passe.',
    alreadyClaimed: 'Ce lieu est déjà revendiqué. Si vous êtes l\'exploitant et avez perdu l\'accès,',
    alreadyLink: 'connectez-vous avec l\'email enregistré.',
    steps: [
      { label: 'Vérifier l\'email',   sub: 'lien unique, sans mot de passe' },
      { label: 'Vérifier les infos',  sub: 'adresse + horaires via Google' },
      { label: 'C\'est à vous',       sub: 'modifier + publier en direct' },
    ],
  },
  it: {
    kicker: 'Rivendica il tuo locale',
    h1: (n) => `Prendi in mano ${n}`,
    lead: 'Ti inviamo un link monouso. Cliccalo e la pagina è tua.',
    verify: 'Il link scade in 15 minuti. Mai una password.',
    alreadyClaimed: 'Questo locale è già stato rivendicato. Se sei il proprietario e hai perso l\'accesso,',
    alreadyLink: 'accedi con l\'email registrata.',
    steps: [
      { label: 'Verifica email',     sub: 'link monouso, senza password' },
      { label: 'Verifica dati',      sub: 'indirizzo + orari da Google' },
      { label: 'Sei dentro',         sub: 'modifica + pubblica eventi' },
    ],
  },
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
    <section className="mx-auto w-full max-w-lg px-6 py-12">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-accent-pink)]">{c.kicker}</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">{c.h1(venue.name)}</h1>

      {/* Progress: 3 numbered steps with the current one highlighted. */}
      <ol className="mt-7 grid grid-cols-3 gap-2" aria-label="Claim steps">
        {c.steps.map((s, i) => (
          <li
            key={s.label}
            aria-current={i === 0 ? 'step' : undefined}
            className={`relative rounded-lg border p-3 transition ${
              i === 0
                ? 'border-[var(--color-accent-pink)]/50 bg-[var(--color-accent-pink)]/8'
                : 'border-[var(--color-bg-3)] bg-[var(--color-bg-1)]'
            }`}
          >
            <span
              className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
                i === 0
                  ? 'bg-[var(--color-accent-pink)] text-[var(--color-bg-0)]'
                  : 'border border-[var(--color-bg-3)] text-[var(--color-fg-2)]'
              }`}
            >
              {i + 1}
            </span>
            <p className={`mt-2 text-xs font-semibold ${i === 0 ? 'text-[var(--color-fg-0)]' : 'text-[var(--color-fg-1)]'}`}>
              {s.label}
            </p>
            <p className="mt-0.5 text-[10px] leading-snug text-[var(--color-fg-3)]">{s.sub}</p>
          </li>
        ))}
      </ol>

      {already ? (
        <p className="mt-6 rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 p-4 text-sm text-[var(--color-warning)]">
          {c.alreadyClaimed}{' '}
          <Link href={`/${locale}/sign-in`} className="underline underline-offset-4">{c.alreadyLink}</Link>
        </p>
      ) : (
        <div className="mt-6 rounded-lg border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] p-5">
          <p className="text-[var(--color-fg-1)]">{c.lead}</p>
          <div className="mt-5">
            <SignInForm locale={locale} purpose="claim" venueId={venue.id} />
          </div>
          <p className="mt-3 text-xs text-[var(--color-fg-3)]">{c.verify}</p>
        </div>
      )}
    </section>
  );
}
