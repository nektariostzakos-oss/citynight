import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/db';
import { VenueEditor } from '@/components/venue-editor';
import { VenueAnalytics } from '@/components/venue-analytics';
import { privateMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = privateMetadata({ title: 'Manage venue — citynight' });

const WELCOME_COPY: Record<Locale, { title: string; body: string; cta: string }> = {
  en: { title: 'Welcome — you own this page now.', body: 'Edits go live within seconds. Hours, phone, address come from Google by default; anything you change here overrides the next sync.', cta: 'Got it' },
  el: { title: 'Καλώς ήρθες — η σελίδα είναι δική σου.', body: 'Οι αλλαγές πάνε live σε δευτερόλεπτα. Ώρες, τηλέφωνο και διεύθυνση έρχονται από Google· ό,τι αλλάξεις εδώ υπερισχύει στο επόμενο sync.', cta: 'Εντάξει' },
  de: { title: 'Willkommen — die Seite gehört dir.', body: 'Änderungen werden in Sekunden live. Öffnungszeiten, Telefon, Adresse kommen standardmäßig aus Google; was du hier änderst, überschreibt den nächsten Sync.', cta: 'Verstanden' },
  fr: { title: 'Bienvenue — cette page est à vous.', body: 'Les modifications passent en ligne en quelques secondes. Horaires, téléphone, adresse viennent de Google par défaut ; ce que vous modifiez ici prend le pas sur la prochaine sync.', cta: 'Compris' },
  it: { title: 'Benvenuto — la pagina è tua.', body: 'Le modifiche vanno online in secondi. Orari, telefono, indirizzo arrivano da Google; quello che modifichi qui sovrascrive la prossima sync.', cta: 'OK' },
};

const UPGRADED_COPY: Record<Locale, { title: string; body: string }> = {
  en: { title: 'Featured is live.', body: 'Your venue now sits at the top of its category and analytics start collecting tonight. Stripe will email the receipt.' },
  el: { title: 'Το Featured ενεργοποιήθηκε.', body: 'Το μαγαζί σου είναι στην κορυφή της κατηγορίας του και τα analytics ξεκινούν να μαζεύονται απόψε. Η Stripe θα στείλει την απόδειξη.' },
  de: { title: 'Featured ist aktiv.', body: 'Deine Location steht jetzt oben in ihrer Kategorie und Analytics starten heute Nacht. Stripe schickt die Rechnung.' },
  fr: { title: 'Featured est actif.', body: 'Votre lieu est désormais en tête de sa catégorie et les analytics commencent ce soir. Stripe enverra la facture.' },
  it: { title: 'Featured è attivo.', body: 'Il tuo locale è ora in cima alla sua categoria e gli analytics partono stanotte. Stripe invia la ricevuta.' },
};
const CANCELED_COPY: Record<Locale, { title: string; body: string }> = {
  en: { title: 'Upgrade canceled.', body: 'No charge made. You can still upgrade any time from the billing page.' },
  el: { title: 'Η αναβάθμιση ακυρώθηκε.', body: 'Δεν υπήρξε χρέωση. Μπορείς πάντα να κάνεις upgrade από τη σελίδα χρεώσεων.' },
  de: { title: 'Upgrade abgebrochen.', body: 'Keine Abbuchung. Du kannst jederzeit von der Abrechnungsseite upgraden.' },
  fr: { title: 'Mise à niveau annulée.', body: 'Aucun débit. Vous pouvez passer à Featured à tout moment depuis la facturation.' },
  it: { title: 'Aggiornamento annullato.', body: 'Nessun addebito. Puoi sempre passare a Featured dalla pagina di fatturazione.' },
};

export default async function VenueDashboard({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; venueId: string }>;
  searchParams: Promise<{ welcome?: string; upgraded?: string; canceled?: string }>;
}) {
  const { locale, venueId } = await params;
  const { welcome, upgraded, canceled } = await searchParams;
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

  const wc = WELCOME_COPY[locale];

  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-12">
      {welcome === '1' && (
        <div className="mb-8 rounded-xl border border-[var(--color-accent-pink)]/40 bg-[var(--color-accent-pink)]/8 p-4">
          <div className="flex items-start gap-3">
            <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--color-accent-pink)]/15 text-[var(--color-accent-pink)]">✨</span>
            <div className="flex-1">
              <p className="font-semibold text-[var(--color-fg-0)]">{wc.title}</p>
              <p className="mt-1 text-sm text-[var(--color-fg-1)]">{wc.body}</p>
            </div>
            <Link
              href={publicHref ?? `/${locale}/dashboard/${v.id as string}`}
              className="shrink-0 rounded-full bg-[var(--color-accent-pink)] px-3 py-1.5 text-xs font-semibold text-[var(--color-bg-0)] transition hover:brightness-110"
            >
              {wc.cta}
            </Link>
          </div>
        </div>
      )}

      {upgraded === '1' && (
        <div className="mb-8 rounded-xl border border-[var(--color-success)]/40 bg-[var(--color-success)]/10 p-4">
          <div className="flex items-start gap-3">
            <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--color-success)]/15 text-[var(--color-success)]">✓</span>
            <div className="flex-1">
              <p className="font-semibold text-[var(--color-fg-0)]">{UPGRADED_COPY[locale].title}</p>
              <p className="mt-1 text-sm text-[var(--color-fg-1)]">{UPGRADED_COPY[locale].body}</p>
            </div>
          </div>
        </div>
      )}

      {canceled === '1' && (
        <div className="mb-8 rounded-xl border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] p-4">
          <div className="flex items-start gap-3">
            <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--color-bg-2)] text-[var(--color-fg-2)]">×</span>
            <div className="flex-1">
              <p className="font-semibold text-[var(--color-fg-0)]">{CANCELED_COPY[locale].title}</p>
              <p className="mt-1 text-sm text-[var(--color-fg-1)]">{CANCELED_COPY[locale].body}</p>
            </div>
          </div>
        </div>
      )}

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
