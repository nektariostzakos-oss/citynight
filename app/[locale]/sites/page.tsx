// Public sales landing for the SaaS website product. Sits at /{locale}/sites.
// Existing site URLs (where customers' actual sites live) are at /sites/[slug] —
// no locale prefix — so the two paths don't collide.

import Link from 'next/link';
import type { Metadata } from 'next';
import { isLocale, LOCALES, type Locale } from '@/lib/i18n';
import { publicMetadata } from '@/lib/seo';

export const revalidate = 3600; // 1h — copy stable, no per-visit data

type Params = Promise<{ locale: string }>;

const COPY: Record<Locale, {
  metaTitle: string;
  metaDesc: string;
  eyebrow: string;
  heading: string;
  headingAccent: string;
  sub: string;
  ctaPrimary: string;
  ctaSecondary: string;
  pricingHeading: string;
  monthlyName: string;
  monthlyPrice: string;
  monthlyPeriod: string;
  monthlyDesc: string;
  monthlyPoints: string[];
  zipName: string;
  zipPrice: string;
  zipPeriod: string;
  zipDesc: string;
  zipPoints: string[];
  featuresHeading: string;
  featureTitles: string[];
  featureBodies: string[];
  faqHeading: string;
  faqs: { q: string; a: string }[];
}> = {
  el: {
    metaTitle: 'Δωρεάν website για το μαγαζί σου · citynight',
    metaDesc: 'Δωρεάν έτοιμο website για ελληνικές επιχειρήσεις. Δικό σου domain για €19/μήνα. Self-host ZIP €190 μια φορά.',
    eyebrow: 'Δωρεάν websites · για ελληνικές επιχειρήσεις',
    heading: 'Το website του μαγαζιού σου,',
    headingAccent: 'δωρεάν, σε 60 δευτερόλεπτα.',
    sub: 'Συμπλήρωσε όνομα + πόλη. Το site βγαίνει live στο citynight.gr/el/cities/{πόλη}/{εσύ} — εντελώς δωρεάν, για πάντα. €19/μήνα μόνο αν θες δικό σου domain.',
    ctaPrimary: 'Φτιάξε το δωρεάν',
    ctaSecondary: 'Δες παράδειγμα',
    pricingHeading: 'Δωρεάν να ξεκινήσεις · upgrades προαιρετικά',
    monthlyName: 'Hosted (δωρεάν)',
    monthlyPrice: '€0',
    monthlyPeriod: '/για πάντα',
    monthlyDesc: 'Το site σου ζει στο citynight.gr. Δωρεάν για πάντα. Custom domain (.gr/.com) είναι +€19/μήνα όποτε θες.',
    monthlyPoints: [
      'Live URL στο citynight.gr/.../μαγαζί',
      'Hosting + SSL + auto updates',
      'Κρατήσεις, μενού, gallery, blog',
      'Stripe για πληρωμές',
      'Custom domain · +€19/μήνα όποτε θες',
      'Καμία υποχρέωση',
    ],
    zipName: 'Self-host (ZIP)',
    zipPrice: '€190',
    zipPeriod: 'μια φορά',
    zipDesc: 'Κατέβασε το πλήρες project. Τρέξε το στο δικό σου Hostinger ή όπου θες. Δικός σου ο κώδικας.',
    zipPoints: [
      'Πλήρης πηγαίος κώδικας Next.js',
      'Εγκατάσταση 5 βημάτων στο Hostinger',
      'Pre-filled με τα στοιχεία σου',
      'Χωρίς μηνιαία χρέωση',
      'Όλο το feature set του Hosted',
      'Updates: ξανά-κατέβασμα οποτεδήποτε',
    ],
    featuresHeading: 'Τι είναι μέσα',
    featureTitles: [
      'Κρατήσεις',
      'Μενού & κατάλογος',
      'Gallery',
      'Blog',
      'Stripe checkout',
      'Δίγλωσσο (EL/EN)',
      'Custom domain',
      'SEO βελτιστοποίηση',
    ],
    featureBodies: [
      'Φόρμα κράτησης, email στον ιδιοκτήτη, schema.org ReserveAction.',
      'Ενότητες + items + flags (vegan, vegetarian, gluten-free).',
      'Φωτογραφίες δικές σου, primary photo, ταξινόμηση με drag.',
      'Posts σε δύο γλώσσες, κατηγορίες, RSS, schema.org Article.',
      'Πληρωμές εδώ στο site — gift cards, retail items, υπηρεσίες.',
      'Όλο το περιεχόμενο σε δύο γλώσσες από την αρχή.',
      'Σύνδεσε δικό σου .gr / .com δωρεάν — Cloudflare τα κάνει SSL.',
      'Sitemap, structured data, hreflang, fast Core Web Vitals.',
    ],
    faqHeading: 'Συχνές ερωτήσεις',
    faqs: [
      { q: 'Πρέπει να έχω domain;', a: 'Όχι. Ξεκινάς στο citynight.gr/sites/όνομα και αν θες, αργότερα κάνεις CNAME το δικό σου domain. Δωρεάν με την συνδρομή.' },
      { q: 'Τι γίνεται αν ακυρώσω;', a: 'Το site σου παραμένει για 30 μέρες σε read-only. Μπορείς να κατεβάσεις τα data σου ή να το επανεκκινήσεις.' },
      { q: 'Μπορώ να αλλάξω template;', a: 'Ναι, από το dashboard, οποτεδήποτε. Το περιεχόμενό σου μεταφέρεται.' },
      { q: 'Δουλεύει για όλες τις επιχειρήσεις;', a: 'Επικεντρωμένο σε εστίαση & nightlife: εστιατόρια, bars, rooftops, beach clubs, μπουζούκια. Άλλα verticals (σαλόνια, ξενοδοχεία) σε beta.' },
      { q: 'Πώς γίνεται η εγκατάσταση του ZIP;', a: '5 βήματα στο Hostinger panel — όλα στο DEPLOY.md μέσα στο ZIP. Σε 15 λεπτά είναι online.' },
    ],
  },
  en: {
    metaTitle: 'Free website for your business · citynight',
    metaDesc: 'Free ready-made website for Greek SMBs. Your own domain for €19/mo. Self-host ZIP €190 once.',
    eyebrow: 'Free websites · for Greek businesses',
    heading: 'Your business website,',
    headingAccent: 'free, in 60 seconds.',
    sub: 'Fill in name + city. Your site goes live at citynight.gr/en/cities/{city}/{you} — free forever. €19/month only if you bring your own domain.',
    ctaPrimary: 'Make yours free',
    ctaSecondary: 'See an example',
    pricingHeading: 'Free to start · upgrades optional',
    monthlyName: 'Hosted (free)',
    monthlyPrice: '€0',
    monthlyPeriod: '/forever',
    monthlyDesc: 'Lives at citynight.gr. Free forever. Custom domain (.gr / .com) is +€19/mo whenever you want it.',
    monthlyPoints: [
      'Live URL at citynight.gr/.../you',
      'Hosting + SSL + automatic updates',
      'Reservations, menu, gallery, blog',
      'Stripe built in for payments',
      'Custom domain · +€19/mo when you want',
      'No commitment',
    ],
    zipName: 'Self-host (ZIP)',
    zipPrice: '€190',
    zipPeriod: 'one-time',
    zipDesc: 'Download the full project. Run it on your own Hostinger or anywhere. The code is yours.',
    zipPoints: [
      'Full Next.js source code',
      '5-step Hostinger install',
      'Pre-filled with your info',
      'No monthly fees',
      'Same feature set as Hosted',
      'Updates: redownload anytime',
    ],
    featuresHeading: 'What\'s inside',
    featureTitles: [
      'Reservations',
      'Menu & catalog',
      'Gallery',
      'Blog',
      'Stripe checkout',
      'Bilingual (EL/EN)',
      'Custom domain',
      'SEO ready',
    ],
    featureBodies: [
      'Reservation form, email to owner, schema.org ReserveAction.',
      'Sections + items + flags (vegan, vegetarian, gluten-free).',
      'Your own photos, primary photo, drag-to-order.',
      'Posts in two languages, categories, RSS, schema.org Article.',
      'Payments on the site itself — gift cards, retail, services.',
      'All content in both languages from day one.',
      'Point your own .gr / .com for free — Cloudflare handles SSL.',
      'Sitemap, structured data, hreflang, fast Core Web Vitals.',
    ],
    faqHeading: 'FAQ',
    faqs: [
      { q: 'Do I need a domain?', a: 'No. You start at citynight.gr/sites/name and later — if you want — CNAME your own domain. Free with the subscription.' },
      { q: 'What happens if I cancel?', a: 'Your site stays in read-only mode for 30 days. You can export your data or restart anytime.' },
      { q: 'Can I switch templates?', a: 'Yes, from the dashboard, anytime. Your content carries over.' },
      { q: 'Does it work for any business?', a: 'Focused on hospitality & nightlife: restaurants, bars, rooftops, beach clubs, bouzoukia. Other verticals (salons, hotels) in beta.' },
      { q: 'How does the ZIP install work?', a: '5 steps in the Hostinger panel — all documented in DEPLOY.md inside the ZIP. Online in 15 minutes.' },
    ],
  },
  de: {
    metaTitle: 'Fertige Website für dein Unternehmen · citynight',
    metaDesc: 'Fertige Website für griechische KMU. Reservierungen, Speisekarte, Galerie, Stripe — alles verkabelt. €19/Monat oder €190 ZIP.',
    eyebrow: 'Fertige Websites · für griechische Unternehmen',
    heading: 'Deine Unternehmenswebsite,',
    headingAccent: 'in 60 Sekunden.',
    sub: 'Template wählen. Name + Stadt eingeben. Bezahlen. Deine Seite ist live auf citynight.gr/sites/du — eigene Domain kostenlos.',
    ctaPrimary: 'Kostenlos starten',
    ctaSecondary: 'Beispiel ansehen',
    pricingHeading: 'Zwei Optionen',
    monthlyName: 'Hosted',
    monthlyPrice: '€19',
    monthlyPeriod: '/Monat',
    monthlyDesc: 'Wir kümmern uns um Hosting, SSL, Updates. Eigene Domain kostenlos.',
    monthlyPoints: ['Live sofort', 'Kostenlose Custom Domain', 'Hosting + SSL', 'Reservierungen, Karte, Galerie', 'Stripe integriert', 'Jederzeit kündbar'],
    zipName: 'Self-host (ZIP)',
    zipPrice: '€190',
    zipPeriod: 'einmalig',
    zipDesc: 'Lade das Projekt herunter. Auf eigenem Hostinger oder beliebig hosten.',
    zipPoints: ['Vollständiger Next.js-Quellcode', '5-Schritte-Installation', 'Vorausgefüllt', 'Keine monatliche Gebühr', 'Gleicher Funktionsumfang', 'Updates jederzeit'],
    featuresHeading: 'Inhalt',
    featureTitles: ['Reservierungen', 'Speisekarte & Katalog', 'Galerie', 'Blog', 'Stripe Checkout', 'Zweisprachig (EL/EN)', 'Eigene Domain', 'SEO-fertig'],
    featureBodies: ['Reservierungsformular, E-Mail an Inhaber.', 'Abschnitte + Items + Tags.', 'Eigene Fotos, Hauptfoto, Drag-Reihenfolge.', 'Posts zweisprachig.', 'Zahlungen direkt.', 'Beide Sprachen ab Tag eins.', 'Eigene .gr/.com kostenlos.', 'Sitemap, structured data, schnell.'],
    faqHeading: 'FAQ',
    faqs: [
      { q: 'Brauche ich eine Domain?', a: 'Nein. Start bei citynight.gr/sites/name, später CNAME zur eigenen Domain kostenlos.' },
      { q: 'Was passiert beim Kündigen?', a: 'Site bleibt 30 Tage read-only. Daten exportierbar.' },
      { q: 'Template wechselbar?', a: 'Ja, jederzeit aus dem Dashboard.' },
      { q: 'Funktioniert für jedes Unternehmen?', a: 'Fokus Gastronomie & Nightlife. Andere Branchen in Beta.' },
      { q: 'ZIP-Installation?', a: '5 Schritte im Hostinger-Panel, dokumentiert in DEPLOY.md.' },
    ],
  },
  fr: {
    metaTitle: 'Site web clé en main pour votre entreprise · citynight',
    metaDesc: 'Site web prêt à l\'emploi pour PME grecques. Réservations, carte, galerie, Stripe. €19/mois ou €190 le ZIP.',
    eyebrow: 'Sites web prêts à l\'emploi · pour entreprises grecques',
    heading: 'Le site web de votre entreprise,',
    headingAccent: 'en 60 secondes.',
    sub: 'Choisissez un template. Remplissez nom + ville. Payez. Votre site est en ligne sur citynight.gr/sites/vous — votre domaine gratuit avec l\'abonnement.',
    ctaPrimary: 'Commencer',
    ctaSecondary: 'Voir un exemple',
    pricingHeading: 'Deux options',
    monthlyName: 'Hébergé',
    monthlyPrice: '€19',
    monthlyPeriod: '/mois',
    monthlyDesc: 'On gère hébergement, SSL, mises à jour. Domaine personnalisé gratuit.',
    monthlyPoints: ['En ligne immédiatement', 'Domaine personnalisé gratuit', 'Hébergement + SSL', 'Réservations, carte, galerie', 'Stripe intégré', 'Annulation à tout moment'],
    zipName: 'Auto-hébergé (ZIP)',
    zipPrice: '€190',
    zipPeriod: 'unique',
    zipDesc: 'Téléchargez le projet. Hébergez sur votre Hostinger.',
    zipPoints: ['Code source Next.js complet', 'Installation en 5 étapes', 'Pré-rempli', 'Pas de frais mensuels', 'Mêmes fonctionnalités', 'Mises à jour à tout moment'],
    featuresHeading: 'Contenu',
    featureTitles: ['Réservations', 'Carte & catalogue', 'Galerie', 'Blog', 'Stripe', 'Bilingue (EL/EN)', 'Domaine personnalisé', 'SEO prêt'],
    featureBodies: ['Formulaire de réservation, email au propriétaire.', 'Sections + items + tags.', 'Vos photos, photo principale, glisser-déposer.', 'Articles bilingues.', 'Paiements en direct.', 'Deux langues dès le départ.', 'Votre .gr/.com gratuitement.', 'Sitemap, données structurées, rapide.'],
    faqHeading: 'FAQ',
    faqs: [
      { q: 'Ai-je besoin d\'un domaine ?', a: 'Non. Démarrage sur citynight.gr/sites/nom, plus tard CNAME vers votre domaine gratuitement.' },
      { q: 'Si j\'annule ?', a: 'Le site reste en lecture seule 30 jours.' },
      { q: 'Changer de template ?', a: 'Oui, depuis le dashboard.' },
      { q: 'Pour toute entreprise ?', a: 'Focalisé restauration & nightlife. Autres en beta.' },
      { q: 'Installation ZIP ?', a: '5 étapes dans Hostinger, documenté DEPLOY.md.' },
    ],
  },
  it: {
    metaTitle: 'Sito web pronto per la tua attività · citynight',
    metaDesc: 'Sito web pronto per PMI greche. Prenotazioni, menu, galleria, Stripe. €19/mese o €190 il ZIP.',
    eyebrow: 'Siti web pronti · per attività greche',
    heading: 'Il sito della tua attività,',
    headingAccent: 'in 60 secondi.',
    sub: 'Scegli un template. Inserisci nome + città. Paghi. Il sito è online su citynight.gr/sites/tu — dominio personalizzato gratis con l\'abbonamento.',
    ctaPrimary: 'Inizia',
    ctaSecondary: 'Vedi esempio',
    pricingHeading: 'Due opzioni',
    monthlyName: 'Ospitato',
    monthlyPrice: '€19',
    monthlyPeriod: '/mese',
    monthlyDesc: 'Gestiamo hosting, SSL, aggiornamenti. Dominio personalizzato gratis.',
    monthlyPoints: ['Online subito', 'Dominio gratuito', 'Hosting + SSL', 'Prenotazioni, menu, galleria', 'Stripe integrato', 'Cancellazione in qualsiasi momento'],
    zipName: 'Self-host (ZIP)',
    zipPrice: '€190',
    zipPeriod: 'una tantum',
    zipDesc: 'Scarica il progetto. Ospitalo sul tuo Hostinger.',
    zipPoints: ['Codice Next.js completo', 'Installazione 5 step', 'Pre-compilato', 'Nessun canone mensile', 'Stesse funzionalità', 'Aggiornamenti sempre'],
    featuresHeading: 'Cosa c\'è dentro',
    featureTitles: ['Prenotazioni', 'Menu & catalogo', 'Galleria', 'Blog', 'Stripe', 'Bilingue (EL/EN)', 'Dominio personalizzato', 'SEO pronto'],
    featureBodies: ['Form prenotazioni, email al proprietario.', 'Sezioni + voci + etichette.', 'Le tue foto, foto principale, ordina.', 'Articoli bilingue.', 'Pagamenti diretti.', 'Due lingue dal primo giorno.', 'Tuo .gr/.com gratis.', 'Sitemap, dati strutturati, veloce.'],
    faqHeading: 'FAQ',
    faqs: [
      { q: 'Mi serve un dominio?', a: 'No. Start su citynight.gr/sites/nome, poi CNAME al tuo dominio gratis.' },
      { q: 'Se cancello?', a: 'Sito in sola lettura per 30 giorni.' },
      { q: 'Posso cambiare template?', a: 'Sì, dal dashboard.' },
      { q: 'Funziona per ogni attività?', a: 'Focus ristorazione & nightlife. Altri verticali in beta.' },
      { q: 'Installazione ZIP?', a: '5 step nel pannello Hostinger, vedi DEPLOY.md.' },
    ],
  },
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = COPY[locale];
  const paths: Partial<Record<Locale, string>> = {};
  for (const l of LOCALES) paths[l] = `/${l}/sites`;
  return publicMetadata({ locale, paths, title: t.metaTitle, description: t.metaDesc });
}

export default async function SitesLandingPage({ params }: { params: Params }) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const t = COPY[locale];

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 md:py-20">
      <header className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--color-accent-pink)]">{t.eyebrow}</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--color-fg-0)] md:text-6xl">
          {t.heading}{' '}
          <span className="bg-gradient-to-r from-[var(--color-accent-pink)] to-[var(--color-accent-violet)] bg-clip-text text-transparent">
            {t.headingAccent}
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-[var(--color-fg-1)]">{t.sub}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/${locale}/sites/new`}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--color-accent-pink)] px-5 py-2.5 text-sm font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)]"
          >
            {t.ctaPrimary}
          </Link>
          <Link
            href={`/${locale}/sites/preview/restaurant`}
            className="inline-flex items-center gap-2 rounded-md border border-[var(--color-bg-3)] px-5 py-2.5 text-sm font-semibold text-[var(--color-fg-1)] hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)]"
          >
            {t.ctaSecondary}
          </Link>
        </div>
      </header>

      <section className="mt-20" aria-labelledby="pricing-h">
        <h2 id="pricing-h" className="text-center font-display text-2xl font-semibold tracking-tight text-[var(--color-fg-0)] md:text-3xl">
          {t.pricingHeading}
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <PricingCard
            highlighted
            name={t.monthlyName}
            price={t.monthlyPrice}
            period={t.monthlyPeriod}
            desc={t.monthlyDesc}
            points={t.monthlyPoints}
            ctaHref={`/${locale}/sites/new?plan=monthly`}
            ctaLabel={t.ctaPrimary}
          />
          <PricingCard
            name={t.zipName}
            price={t.zipPrice}
            period={t.zipPeriod}
            desc={t.zipDesc}
            points={t.zipPoints}
            ctaHref={`/${locale}/sites/new?plan=zip`}
            ctaLabel={t.ctaPrimary}
          />
        </div>
      </section>

      <section className="mt-24" aria-labelledby="features-h">
        <h2 id="features-h" className="text-center font-display text-2xl font-semibold tracking-tight text-[var(--color-fg-0)] md:text-3xl">
          {t.featuresHeading}
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {t.featureTitles.map((title, i) => (
            <article key={title} className="rounded-xl border border-[var(--color-bg-2)] bg-[var(--color-bg-1)] p-5">
              <p className="font-display text-base font-semibold text-[var(--color-fg-0)]">{title}</p>
              <p className="mt-2 text-sm text-[var(--color-fg-2)]">{t.featureBodies[i]}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-24 border-t border-[var(--color-bg-2)] pt-12" aria-labelledby="faq-h">
        <h2 id="faq-h" className="font-display text-2xl font-semibold tracking-tight text-[var(--color-fg-0)] md:text-3xl">
          {t.faqHeading}
        </h2>
        <dl className="mt-8 divide-y divide-[var(--color-bg-2)]">
          {t.faqs.map((f) => (
            <div key={f.q} className="py-5">
              <dt className="font-semibold text-[var(--color-fg-0)]">{f.q}</dt>
              <dd className="mt-2 text-[var(--color-fg-1)]">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-20 rounded-2xl border border-[var(--color-accent-pink)]/30 bg-[var(--color-bg-1)] p-8 text-center">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--color-fg-0)] md:text-3xl">
          {t.heading} {t.headingAccent}
        </h2>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/${locale}/sites/new`}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--color-accent-pink)] px-5 py-2.5 text-sm font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)]"
          >
            {t.ctaPrimary}
          </Link>
        </div>
      </section>
    </main>
  );
}

function PricingCard({
  highlighted, name, price, period, desc, points, ctaHref, ctaLabel,
}: {
  highlighted?: boolean;
  name: string; price: string; period: string; desc: string;
  points: readonly string[];
  ctaHref: string; ctaLabel: string;
}) {
  return (
    <article
      className={`flex flex-col rounded-2xl p-6 ${
        highlighted
          ? 'border border-[var(--color-accent-pink)]/40 bg-gradient-to-b from-[color-mix(in_oklab,var(--color-accent-pink)_6%,var(--color-bg-1))] to-[var(--color-bg-1)] shadow-[var(--shadow-glow-pink)]'
          : 'border border-[var(--color-bg-2)] bg-[var(--color-bg-1)]'
      }`}
    >
      <header>
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-fg-2)]">{name}</p>
        <p className="mt-2 font-display text-4xl font-semibold tracking-tight text-[var(--color-fg-0)]">
          {price}
          <span className="ml-1 text-base font-normal text-[var(--color-fg-2)]">{period}</span>
        </p>
        <p className="mt-2 text-sm text-[var(--color-fg-1)]">{desc}</p>
      </header>
      <ul className="mt-5 flex-1 space-y-2 text-sm text-[var(--color-fg-1)]">
        {points.map((p) => (
          <li key={p} className="flex gap-2">
            <span aria-hidden className="mt-0.5 text-[var(--color-accent-pink)]">✓</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <Link
        href={ctaHref}
        className={`mt-6 inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold ${
          highlighted
            ? 'bg-[var(--color-accent-pink)] text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)]'
            : 'border border-[var(--color-bg-3)] text-[var(--color-fg-1)] hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)]'
        }`}
      >
        {ctaLabel}
      </Link>
    </article>
  );
}
