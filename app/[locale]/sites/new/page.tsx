// Signup form for the SaaS website product (Phase H4 — free hosted).
// Auth-gated. Submission creates the site free and lands the owner on
// their dashboard. Plan upgrades (custom domain / ZIP) happen later.

import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth/session';
import { privateMetadata } from '@/lib/seo';
import { SiteSignupForm, type SiteSignupLabels } from '@/components/site-signup-form';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = privateMetadata({ title: 'New site — citynight' });

const COPY: Record<Locale, SiteSignupLabels & { metaTitle: string; verticals: Record<string, string> }> = {
  el: {
    metaTitle: 'Νέο website · citynight',
    heading: 'Στήσε το website σου',
    sub: 'Λίγα στοιχεία και το site σου είναι online. Δωρεάν για πάντα — €19/μήνα μόνο αν θες δικό σου domain.',
    nameLabel: 'Όνομα επιχείρησης', namePlaceholder: 'π.χ. Lemoni Taverna',
    verticalLabel: 'Τι είναι το μαγαζί',
    cityLabel: 'Πόλη', cityPlaceholder: 'π.χ. Χώρα Νάξου',
    freeNotice: 'Το hosted website σου είναι δωρεάν για πάντα. Custom domain (€19/μήνα) και αυτόνομο ZIP (€190 μια φορά) είναι προαιρετικά upgrades από το dashboard.',
    submit: 'Δημιουργία site', submitting: 'Δημιουργία…',
    error: 'Κάτι δεν πήγε καλά. Δοκίμασε ξανά.',
    verticals: {
      restaurant: 'Εστιατόριο', bar: 'Bar', rooftop: 'Rooftop bar', nightclub: 'Night club',
      beach_club: 'Beach club', hotel: 'Ξενοδοχείο', cafe: 'Café', salon: 'Salon / beauty', other: 'Άλλο',
    },
  },
  en: {
    metaTitle: 'New site · citynight',
    heading: 'Set up your website',
    sub: 'A few details and your site is online. Free forever — €19/month only if you bring your own domain.',
    nameLabel: 'Business name', namePlaceholder: 'e.g. Lemoni Taverna',
    verticalLabel: 'What kind of business',
    cityLabel: 'City', cityPlaceholder: 'e.g. Naxos Town',
    freeNotice: 'Your hosted website is free forever. Custom domain (€19/mo) and standalone ZIP (€190 once) are optional upgrades from the dashboard.',
    submit: 'Create site', submitting: 'Creating…',
    error: 'Something went wrong. Try again.',
    verticals: {
      restaurant: 'Restaurant', bar: 'Bar', rooftop: 'Rooftop bar', nightclub: 'Night club',
      beach_club: 'Beach club', hotel: 'Hotel', cafe: 'Café', salon: 'Salon / beauty', other: 'Other',
    },
  },
  de: {
    metaTitle: 'Neue Site · citynight',
    heading: 'Richte deine Website ein',
    sub: 'Ein paar Angaben und deine Seite ist online. Kostenlos — €19/Monat nur für eigene Domain.',
    nameLabel: 'Geschäftsname', namePlaceholder: 'z. B. Lemoni Taverna',
    verticalLabel: 'Welche Art Geschäft',
    cityLabel: 'Stadt', cityPlaceholder: 'z. B. Naxos',
    freeNotice: 'Die gehostete Website ist dauerhaft kostenlos. Eigene Domain (€19/Mo) und ZIP (€190 einmalig) sind optionale Upgrades.',
    submit: 'Site erstellen', submitting: 'Erstelle…',
    error: 'Etwas ist schiefgelaufen.',
    verticals: {
      restaurant: 'Restaurant', bar: 'Bar', rooftop: 'Rooftop-Bar', nightclub: 'Nachtclub',
      beach_club: 'Beach Club', hotel: 'Hotel', cafe: 'Café', salon: 'Salon', other: 'Andere',
    },
  },
  fr: {
    metaTitle: 'Nouveau site · citynight',
    heading: 'Configurez votre site',
    sub: 'Quelques infos et votre site est en ligne. Gratuit — €19/mois seulement si vous apportez votre domaine.',
    nameLabel: 'Nom de l\'entreprise', namePlaceholder: 'ex. Lemoni Taverna',
    verticalLabel: 'Type d\'activité',
    cityLabel: 'Ville', cityPlaceholder: 'ex. Naxos',
    freeNotice: 'Le site hébergé est gratuit. Domaine personnalisé (€19/mois) et ZIP (€190 unique) sont des upgrades.',
    submit: 'Créer le site', submitting: 'Création…',
    error: 'Erreur. Réessayez.',
    verticals: {
      restaurant: 'Restaurant', bar: 'Bar', rooftop: 'Bar rooftop', nightclub: 'Night club',
      beach_club: 'Beach club', hotel: 'Hôtel', cafe: 'Café', salon: 'Salon', other: 'Autre',
    },
  },
  it: {
    metaTitle: 'Nuovo sito · citynight',
    heading: 'Configura il tuo sito',
    sub: 'Pochi dati e il sito è online. Gratis — €19/mese solo se porti il tuo dominio.',
    nameLabel: 'Nome attività', namePlaceholder: 'es. Lemoni Taverna',
    verticalLabel: 'Tipo di attività',
    cityLabel: 'Città', cityPlaceholder: 'es. Naxos',
    freeNotice: 'Il sito ospitato è gratis. Dominio personalizzato (€19/mese) e ZIP (€190 una tantum) sono upgrade opzionali.',
    submit: 'Crea sito', submitting: 'Creazione…',
    error: 'Errore. Riprova.',
    verticals: {
      restaurant: 'Ristorante', bar: 'Bar', rooftop: 'Bar rooftop', nightclub: 'Night club',
      beach_club: 'Beach club', hotel: 'Hotel', cafe: 'Café', salon: 'Salone', other: 'Altro',
    },
  },
};

export default async function SiteSignupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) redirect('/el/sites');
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/sites/new`)}`);
  }
  const t = COPY[locale];

  return (
    <main className="mx-auto max-w-2xl px-6 py-12 md:py-16">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--color-fg-0)] md:text-4xl">
          {t.heading}
        </h1>
        <p className="mt-3 text-[var(--color-fg-1)]">{t.sub}</p>
      </header>
      <div className="mt-8">
        <SiteSignupForm
          locale={locale}
          labels={t}
          verticals={t.verticals as Record<string, string>}
        />
      </div>
    </main>
  );
}
