import { notFound, redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/db';
import { UpgradeButton } from '@/components/upgrade-button';
import { ManageSubscriptionButton } from '@/components/manage-subscription-button';

export const dynamic = 'force-dynamic';

const COPY: Record<Locale, {
  heading: (name: string) => string;
  currentTier: string;
  free: string;
  featured: string;
  status: (s: string) => string;
  renews: (date: string) => string;
  featuredPitch: string;
  pricing: string;
  manage: string;
  back: string;
}> = {
  en: {
    heading: (n) => `Billing — ${n}`,
    currentTier: 'Current tier', free: 'Free', featured: 'Featured',
    status: (s) => `Status: ${s}`,
    renews: (d) => `· renews ${d}`,
    featuredPitch: 'Featured includes top-of-category labeled placement, event posting, and per-venue analytics.',
    pricing: '€29 / month per venue',
    manage: 'Manage subscription',
    back: '← Back to dashboard',
  },
  el: {
    heading: (n) => `Χρεώσεις — ${n}`,
    currentTier: 'Τρέχουσα συνδρομή', free: 'Δωρεάν', featured: 'Featured',
    status: (s) => `Κατάσταση: ${s}`,
    renews: (d) => `· ανανεώνεται ${d}`,
    featuredPitch: 'Featured: επισημασμένη θέση στην κορυφή της κατηγορίας, ανάρτηση events, αναλυτικά στοιχεία.',
    pricing: '29€ / μήνα ανά μαγαζί',
    manage: 'Διαχείριση συνδρομής',
    back: '← Πίσω στο dashboard',
  },
  de: {
    heading: (n) => `Abrechnung — ${n}`,
    currentTier: 'Aktueller Tarif', free: 'Kostenlos', featured: 'Featured',
    status: (s) => `Status: ${s}`,
    renews: (d) => `· verlängert am ${d}`,
    featuredPitch: 'Featured: gekennzeichnete Top-of-Category-Platzierung, Event-Posting, Analytics pro Location.',
    pricing: '29 € / Monat pro Location',
    manage: 'Abo verwalten',
    back: '← Zurück zum Dashboard',
  },
  fr: {
    heading: (n) => `Facturation — ${n}`,
    currentTier: 'Formule actuelle', free: 'Gratuit', featured: 'Featured',
    status: (s) => `Statut : ${s}`,
    renews: (d) => `· renouvelé le ${d}`,
    featuredPitch: 'Featured : placement en tête de catégorie (étiqueté), publication d\'événements, analytics par lieu.',
    pricing: '29 € / mois par lieu',
    manage: "Gérer l'abonnement",
    back: '← Retour au dashboard',
  },
  it: {
    heading: (n) => `Fatturazione — ${n}`,
    currentTier: 'Piano attuale', free: 'Gratuito', featured: 'Featured',
    status: (s) => `Stato: ${s}`,
    renews: (d) => `· rinnovo ${d}`,
    featuredPitch: 'Featured: posizione in cima alla categoria (etichettata), pubblicazione eventi, analytics per locale.',
    pricing: '29 € / mese per locale',
    manage: 'Gestisci abbonamento',
    back: '← Torna alla dashboard',
  },
};

export default async function BillingPage({ params }: { params: Promise<{ locale: string; venueId: string }> }) {
  const { locale, venueId } = await params;
  if (!isLocale(locale)) redirect('/en/sign-in');
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/sign-in`);

  const c = COPY[locale];

  const v = db.$client.prepare(
    `SELECT id, name, tier FROM venues WHERE id = ? AND owner_id = ?`,
  ).get(venueId, user.id) as { id: string; name: string; tier: 'free' | 'featured' } | undefined;
  if (!v) notFound();

  const sub = db.$client.prepare(
    `SELECT status, current_period_end, stripe_customer_id FROM subscriptions WHERE venue_id = ? ORDER BY created_at DESC LIMIT 1`,
  ).get(v.id) as { status: string; current_period_end: number | null; stripe_customer_id: string } | undefined;

  const isActive = v.tier === 'featured' && sub?.status === 'active';
  const hasCustomer = Boolean(sub?.stripe_customer_id);

  return (
    <section className="mx-auto w-full max-w-2xl px-6 py-12">
      <a href={`/${locale}/dashboard/${v.id}`} className="text-xs text-[var(--color-fg-2)] hover:text-[var(--color-accent-cyan)]">
        {c.back}
      </a>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">{c.heading(v.name)}</h1>

      <div className="mt-8 rounded-lg border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] p-6">
        <p className="text-xs uppercase tracking-widest text-[var(--color-fg-2)]">{c.currentTier}</p>
        <p className="mt-1 font-display text-2xl font-semibold">
          {v.tier === 'featured' ? c.featured : c.free}
        </p>
        {sub && (
          <p className="mt-2 text-sm text-[var(--color-fg-2)]">
            {c.status(sub.status)}
            {sub.current_period_end && ` ${c.renews(new Date(sub.current_period_end * 1000).toLocaleDateString(locale))}`}
          </p>
        )}

        {v.tier === 'free' ? (
          <div className="mt-6">
            <UpgradeButton venueId={v.id} />
            <p className="mt-3 text-xs text-[var(--color-fg-3)]">
              {c.featuredPitch} <span className="text-[var(--color-fg-2)]">{c.pricing}</span>
            </p>
          </div>
        ) : isActive && hasCustomer ? (
          <div className="mt-6">
            <ManageSubscriptionButton venueId={v.id} label={c.manage} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
