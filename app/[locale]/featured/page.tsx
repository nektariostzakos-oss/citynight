import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n';
import {
  publicMetadata, localizedPaths,
  jsonLdProps, breadcrumbJsonLd, faqJsonLd,
} from '@/lib/seo';

// Public-facing Featured tier landing page. SEO-load-bearing — owners
// searching "how do I claim my bar on citynight" should land here. NO
// pricing in the metadata title (Google sometimes flags landing pages
// with hard-coded prices as time-sensitive).

export const revalidate = 86400;

type Block = { q: string; a: string };

type Copy = {
  metaTitle: string;
  metaDescription: string;
  kicker: string;
  h1: string;
  sub: string;
  priceLabel: string;
  priceUnit: string;
  primaryCta: string;
  secondaryCta: string;
  comparisonHeading: string;
  free: string;
  featured: string;
  rows: { label: string; free: string | true | false; featured: string | true | false }[];
  faqHeading: string;
  faqs: Block[];
};

const COPY: Record<Locale, Copy> = {
  en: {
    metaTitle: 'Featured tier — citynight.gr for venue owners',
    metaDescription: 'Top-of-category placement, real-time analytics, and event posting for venue owners on citynight.gr.',
    kicker: 'For venue owners',
    h1: 'Show up first when locals open the guide.',
    sub: 'Featured venues sit at the top of their category in every city — labeled, capped, never algorithm-roulette. Plus analytics, event posting, and same-day edits.',
    priceLabel: '€29',
    priceUnit: '/ month per venue',
    primaryCta: 'Claim your venue →',
    secondaryCta: 'See the dashboard',
    comparisonHeading: 'Free vs Featured',
    free: 'Free',
    featured: 'Featured',
    rows: [
      { label: 'A page on citynight.gr',                     free: true,  featured: true },
      { label: 'Edit hours, phone, address, photos',          free: true,  featured: true },
      { label: 'Hidden behind regular ranking',               free: true,  featured: false },
      { label: 'Labeled top placement (capped per category)', free: false, featured: true },
      { label: 'Real-time analytics (views, directions, calls)', free: false, featured: true },
      { label: 'Post events',                                 free: false, featured: true },
      { label: 'Weekly performance digest',                   free: false, featured: true },
      { label: 'Priority editorial review for new submissions', free: false, featured: true },
    ],
    faqHeading: 'Common questions',
    faqs: [
      { q: 'How is "top placement" labeled?',
        a: 'Featured venues get a small "Featured" badge and sit above organic ranking in the same category. We cap how many Featured slots exist per category so it never becomes a wall of ads.' },
      { q: 'Can I cancel?',
        a: 'Any time, from the dashboard. The page stays — you just go back to organic ranking at the end of the current billing period.' },
      { q: 'Do you take a commission on bookings?',
        a: 'No. Featured is a flat €29/month per venue. No per-customer, per-booking, or per-reservation fees.' },
      { q: 'What happens to my page if I cancel?',
        a: 'Nothing destructive. Owner-edits stay. The page keeps its URL (SEO equity), it just no longer carries the Featured badge or top placement.' },
      { q: 'Can I claim multiple venues?',
        a: 'Yes. Each venue is billed separately at €29/month so you can mix Free + Featured across your portfolio.' },
    ],
  },
  el: {
    metaTitle: 'Featured — citynight.gr για ιδιοκτήτες μαγαζιών',
    metaDescription: 'Κορυφαία θέση στην κατηγορία, αναλυτικά στοιχεία σε πραγματικό χρόνο και ανάρτηση events για ιδιοκτήτες μαγαζιών στο citynight.gr.',
    kicker: 'Για ιδιοκτήτες μαγαζιών',
    h1: 'Βγες πρώτος όταν οι ντόπιοι ανοίγουν τον οδηγό.',
    sub: 'Τα Featured μαγαζιά κάθονται στην κορυφή της κατηγορίας τους σε κάθε πόλη — επισημασμένα, με όριο, χωρίς αλγόριθμο-λοταρία. Επιπλέον αναλυτικά στοιχεία, events, αλλαγές την ίδια μέρα.',
    priceLabel: '29€',
    priceUnit: '/ μήνα ανά μαγαζί',
    primaryCta: 'Διεκδίκησε το μαγαζί σου →',
    secondaryCta: 'Δες το dashboard',
    comparisonHeading: 'Δωρεάν vs Featured',
    free: 'Δωρεάν',
    featured: 'Featured',
    rows: [
      { label: 'Σελίδα στο citynight.gr',                              free: true,  featured: true },
      { label: 'Διόρθωση ώρας, τηλεφώνου, διεύθυνσης, φωτογραφιών',     free: true,  featured: true },
      { label: 'Κρυμμένο πίσω από κανονική κατάταξη',                   free: true,  featured: false },
      { label: 'Επισημασμένη κορυφή (όριο ανά κατηγορία)',              free: false, featured: true },
      { label: 'Αναλυτικά σε πραγματικό χρόνο (views, οδηγίες, κλήσεις)', free: false, featured: true },
      { label: 'Ανάρτηση events',                                      free: false, featured: true },
      { label: 'Εβδομαδιαία αναφορά απόδοσης',                          free: false, featured: true },
      { label: 'Προτεραιότητα στον έλεγχο για νέες καταχωρήσεις',        free: false, featured: true },
    ],
    faqHeading: 'Συχνές ερωτήσεις',
    faqs: [
      { q: 'Πώς επισημαίνεται η "κορυφαία θέση";',
        a: 'Τα Featured μαγαζιά παίρνουν ένα μικρό σήμα "Featured" και κάθονται πάνω από την οργανική κατάταξη στην ίδια κατηγορία. Βάζουμε όριο στα Featured slots ώστε να μη γίνεται τοίχος από διαφημίσεις.' },
      { q: 'Μπορώ να ακυρώσω;',
        a: 'Όποτε θέλεις, από το dashboard. Η σελίδα μένει — απλά επιστρέφεις στην οργανική κατάταξη στο τέλος του τρέχοντος κύκλου χρέωσης.' },
      { q: 'Παίρνετε προμήθεια από κρατήσεις;',
        a: 'Όχι. Το Featured είναι σταθερά 29€/μήνα ανά μαγαζί. Καμία προμήθεια ανά πελάτη ή κράτηση.' },
      { q: 'Τι γίνεται η σελίδα μου αν ακυρώσω;',
        a: 'Τίποτα καταστροφικό. Οι owner-edits μένουν. Η σελίδα κρατάει το URL της (SEO), απλά δεν έχει πια το σήμα Featured ή την κορυφαία θέση.' },
      { q: 'Μπορώ να κάνω claim πολλά μαγαζιά;',
        a: 'Ναι. Κάθε μαγαζί χρεώνεται ξεχωριστά 29€/μήνα — μπορείς να συνδυάζεις Δωρεάν + Featured στα μαγαζιά σου.' },
    ],
  },
  de: {
    metaTitle: 'Featured — citynight.gr für Location-Inhaber',
    metaDescription: 'Top-Platzierung in der Kategorie, Echtzeit-Analytics und Event-Posting für Location-Inhaber auf citynight.gr.',
    kicker: 'Für Location-Inhaber',
    h1: 'Erscheine zuerst, wenn Einheimische den Guide öffnen.',
    sub: 'Featured-Locations stehen in jeder Stadt oben in ihrer Kategorie — gekennzeichnet, gedeckelt, kein Algorithmus-Roulette. Plus Analytics, Event-Posting und Same-Day-Edits.',
    priceLabel: '€29',
    priceUnit: '/ Monat pro Location',
    primaryCta: 'Location übernehmen →',
    secondaryCta: 'Zum Dashboard',
    comparisonHeading: 'Free vs Featured',
    free: 'Free', featured: 'Featured',
    rows: [
      { label: 'Eine Seite auf citynight.gr',                          free: true,  featured: true },
      { label: 'Öffnungszeiten, Telefon, Adresse, Fotos bearbeiten',    free: true,  featured: true },
      { label: 'In der regulären Reihenfolge versteckt',                free: true,  featured: false },
      { label: 'Gekennzeichnete Top-Platzierung (pro Kategorie gedeckelt)', free: false, featured: true },
      { label: 'Echtzeit-Analytics (Views, Wegbeschreibungen, Anrufe)',  free: false, featured: true },
      { label: 'Events posten',                                        free: false, featured: true },
      { label: 'Wöchentlicher Performance-Digest',                      free: false, featured: true },
      { label: 'Priorität bei neuer Einreichungs-Prüfung',              free: false, featured: true },
    ],
    faqHeading: 'Häufige Fragen',
    faqs: [
      { q: 'Wie ist "Top-Platzierung" gekennzeichnet?',
        a: 'Featured-Locations erhalten ein kleines "Featured"-Badge und stehen über der organischen Reihenfolge derselben Kategorie. Wir deckeln Featured-Slots pro Kategorie, damit es nie zur Werbewand wird.' },
      { q: 'Kann ich kündigen?',
        a: 'Jederzeit aus dem Dashboard. Die Seite bleibt — du fällst am Ende des aktuellen Abrechnungszeitraums in die organische Reihenfolge zurück.' },
      { q: 'Nehmt ihr Provision auf Buchungen?',
        a: 'Nein. Featured ist eine Pauschale von €29/Monat pro Location. Keine Gebühren pro Kunde, Buchung oder Reservierung.' },
      { q: 'Was passiert mit meiner Seite bei Kündigung?',
        a: 'Nichts Destruktives. Owner-Edits bleiben. Die Seite behält ihre URL (SEO), trägt nur kein Featured-Badge und keine Top-Platzierung mehr.' },
      { q: 'Kann ich mehrere Locations beanspruchen?',
        a: 'Ja. Jede Location wird separat mit €29/Monat abgerechnet — du kannst Free + Featured in deinem Portfolio mischen.' },
    ],
  },
  fr: {
    metaTitle: 'Featured — citynight.gr pour les exploitants',
    metaDescription: 'Placement en haut de catégorie, analytics en temps réel et publication d\'événements pour les exploitants sur citynight.gr.',
    kicker: 'Pour les exploitants',
    h1: 'Apparaissez en premier quand les locaux ouvrent le guide.',
    sub: 'Les lieux Featured occupent le haut de leur catégorie dans chaque ville — étiquetés, plafonnés, jamais de loterie algorithmique. Plus analytics, événements, et modifications le jour même.',
    priceLabel: '29 €',
    priceUnit: '/ mois par lieu',
    primaryCta: 'Revendiquer votre lieu →',
    secondaryCta: 'Voir le dashboard',
    comparisonHeading: 'Gratuit vs Featured',
    free: 'Gratuit', featured: 'Featured',
    rows: [
      { label: 'Une page sur citynight.gr',                            free: true,  featured: true },
      { label: 'Modifier horaires, téléphone, adresse, photos',         free: true,  featured: true },
      { label: 'Caché derrière le classement standard',                 free: true,  featured: false },
      { label: 'Placement en tête étiqueté (plafonné par catégorie)',    free: false, featured: true },
      { label: 'Analytics temps réel (vues, itinéraires, appels)',      free: false, featured: true },
      { label: 'Publier des événements',                                free: false, featured: true },
      { label: 'Résumé hebdomadaire de performance',                    free: false, featured: true },
      { label: 'Revue éditoriale prioritaire des nouvelles soumissions', free: false, featured: true },
    ],
    faqHeading: 'Questions fréquentes',
    faqs: [
      { q: 'Comment le "placement en tête" est-il étiqueté ?',
        a: 'Les lieux Featured reçoivent un petit badge "Featured" et passent au-dessus du classement organique dans la même catégorie. Nous plafonnons le nombre de slots Featured par catégorie pour ne jamais devenir un mur de publicité.' },
      { q: 'Puis-je annuler ?',
        a: 'À tout moment, depuis le dashboard. La page reste — vous revenez simplement au classement organique à la fin de la période de facturation en cours.' },
      { q: 'Prenez-vous une commission sur les réservations ?',
        a: 'Non. Featured est forfaitaire à 29 €/mois par lieu. Pas de frais par client, par réservation, ou par couvert.' },
      { q: 'Que devient ma page si j\'annule ?',
        a: 'Rien de destructif. Les modifications restent. La page conserve son URL (équité SEO), elle ne porte simplement plus le badge Featured ni le placement en tête.' },
      { q: 'Puis-je revendiquer plusieurs lieux ?',
        a: 'Oui. Chaque lieu est facturé séparément à 29 €/mois — vous pouvez mélanger Gratuit + Featured dans votre portefeuille.' },
    ],
  },
  it: {
    metaTitle: 'Featured — citynight.gr per i proprietari di locali',
    metaDescription: 'Posizione in cima alla categoria, analytics in tempo reale e pubblicazione di eventi per i proprietari di locali su citynight.gr.',
    kicker: 'Per i proprietari',
    h1: 'Compari per primo quando i locali aprono la guida.',
    sub: 'I locali Featured stanno in cima alla loro categoria in ogni città — etichettati, limitati, mai roulette di algoritmi. Più analytics, pubblicazione eventi e modifiche in giornata.',
    priceLabel: '€29',
    priceUnit: '/ mese per locale',
    primaryCta: 'Rivendica il tuo locale →',
    secondaryCta: 'Vedi il dashboard',
    comparisonHeading: 'Gratis vs Featured',
    free: 'Gratis', featured: 'Featured',
    rows: [
      { label: 'Una pagina su citynight.gr',                           free: true,  featured: true },
      { label: 'Modifica orari, telefono, indirizzo, foto',             free: true,  featured: true },
      { label: 'Nascosto dietro alla classifica normale',               free: true,  featured: false },
      { label: 'Posizione in cima etichettata (limitata per categoria)', free: false, featured: true },
      { label: 'Analytics in tempo reale (visualizzazioni, indicazioni, chiamate)', free: false, featured: true },
      { label: 'Pubblica eventi',                                       free: false, featured: true },
      { label: 'Riepilogo settimanale di performance',                  free: false, featured: true },
      { label: 'Revisione editoriale prioritaria per nuove proposte',    free: false, featured: true },
    ],
    faqHeading: 'Domande comuni',
    faqs: [
      { q: 'Come è etichettata la "posizione in cima"?',
        a: 'I locali Featured ricevono un piccolo badge "Featured" e stanno sopra la classifica organica della stessa categoria. Limitiamo gli slot Featured per categoria così non diventa mai un muro pubblicitario.' },
      { q: 'Posso annullare?',
        a: 'In qualsiasi momento, dal dashboard. La pagina rimane — torni semplicemente alla classifica organica alla fine del periodo di fatturazione in corso.' },
      { q: 'Prendete una commissione sulle prenotazioni?',
        a: 'No. Featured è una tariffa fissa di €29/mese per locale. Nessuna commissione per cliente, prenotazione o coperto.' },
      { q: 'Cosa succede alla mia pagina se annullo?',
        a: 'Niente di distruttivo. Le modifiche del proprietario restano. La pagina mantiene il suo URL (SEO), semplicemente non ha più il badge Featured né la posizione in cima.' },
      { q: 'Posso rivendicare più locali?',
        a: 'Sì. Ogni locale è fatturato separatamente a €29/mese — puoi mescolare Gratis + Featured nel tuo portafoglio.' },
    ],
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const c = COPY[locale];
  return publicMetadata({
    locale,
    paths: localizedPaths('/featured'),
    title: c.metaTitle,
    description: c.metaDescription,
  });
}

export default async function FeaturedPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const c = COPY[locale];

  const homeLabel: Record<Locale, string> = { en: 'Home', el: 'Αρχική', de: 'Start', fr: 'Accueil', it: 'Home' };

  return (
    <>
      <script
        type="application/ld+json"
        {...jsonLdProps([
          breadcrumbJsonLd([
            { name: homeLabel[locale], path: `/${locale}` },
            { name: c.kicker, path: `/${locale}/featured` },
          ]),
          faqJsonLd(c.faqs.map((f) => ({ q: f.q, a: f.a }))),
        ])}
      />

      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-[var(--color-bg-2)] bg-gradient-to-b from-[var(--color-bg-1)] to-[var(--color-bg-0)]">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[var(--color-accent-pink)]/12 blur-[120px]" aria-hidden />
        <div className="mx-auto max-w-4xl px-6 py-20 text-center md:py-28">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--color-accent-pink)]">{c.kicker}</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.02em] md:text-6xl">{c.h1}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-[var(--color-fg-1)]">{c.sub}</p>

          <div className="mt-8 inline-flex items-baseline gap-2 rounded-full border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-5 py-2">
            <span className="font-display text-2xl font-semibold text-[var(--color-fg-0)]">{c.priceLabel}</span>
            <span className="text-sm text-[var(--color-fg-2)]">{c.priceUnit}</span>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href={`/${locale}/for-owners`}
              className="rounded-full bg-[var(--color-accent-pink)] px-6 py-3 text-sm font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)] transition hover:brightness-110"
            >
              {c.primaryCta}
            </Link>
            <Link
              href={`/${locale}/dashboard`}
              className="rounded-full border border-[var(--color-bg-3)] px-6 py-3 text-sm font-semibold text-[var(--color-fg-1)] transition hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)]"
            >
              {c.secondaryCta}
            </Link>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="mx-auto w-full max-w-4xl px-6 py-16">
        <h2 className="font-display text-3xl font-semibold tracking-tight">{c.comparisonHeading}</h2>
        <div className="mt-8 overflow-hidden rounded-xl border border-[var(--color-bg-3)] bg-[var(--color-bg-1)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-bg-2)] text-left text-[10px] uppercase tracking-[0.18em] text-[var(--color-fg-2)]">
                <th className="px-5 py-3"></th>
                <th className="px-5 py-3 text-center">{c.free}</th>
                <th className="px-5 py-3 text-center text-[var(--color-accent-pink)]">{c.featured}</th>
              </tr>
            </thead>
            <tbody>
              {c.rows.map((row, i) => (
                <tr key={i} className="border-b border-[var(--color-bg-2)] last:border-0">
                  <td className="px-5 py-3 text-[var(--color-fg-1)]">{row.label}</td>
                  <td className="px-5 py-3 text-center"><Mark v={row.free} /></td>
                  <td className="px-5 py-3 text-center"><Mark v={row.featured} accent /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-[var(--color-bg-2)] bg-[var(--color-bg-1)]/40">
        <div className="mx-auto w-full max-w-3xl px-6 py-16">
          <h2 className="font-display text-3xl font-semibold tracking-tight">{c.faqHeading}</h2>
          <dl className="mt-8 divide-y divide-[var(--color-bg-2)]">
            {c.faqs.map((f) => (
              <div key={f.q} className="py-5">
                <dt className="font-display text-lg font-semibold text-[var(--color-fg-0)]">{f.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-[var(--color-fg-1)]">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-[var(--color-bg-2)]">
        <div className="mx-auto w-full max-w-3xl px-6 py-16 text-center">
          <Link
            href={`/${locale}/for-owners`}
            className="inline-flex rounded-full bg-[var(--color-accent-pink)] px-6 py-3 text-sm font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)] transition hover:brightness-110"
          >
            {c.primaryCta}
          </Link>
        </div>
      </section>
    </>
  );
}

function Mark({ v, accent = false }: { v: string | true | false; accent?: boolean }) {
  if (v === true) {
    return (
      <span aria-label="yes" className={accent ? 'text-[var(--color-accent-pink)]' : 'text-[var(--color-success)]'}>
        ●
      </span>
    );
  }
  if (v === false) {
    return <span aria-label="no" className="text-[var(--color-fg-3)]">—</span>;
  }
  return <span className="text-[var(--color-fg-1)]">{v}</span>;
}
