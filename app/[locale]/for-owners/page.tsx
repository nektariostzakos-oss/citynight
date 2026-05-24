import type { Locale } from '@/lib/i18n';
import { isLocale } from '@/lib/i18n';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const revalidate = 86400;

type Copy = {
  kicker: string;
  h1: (cityCount: number) => string;
  lead: string;
  howHeading: string;
  steps: { n: string; title: string; body: string }[];
  tiersHeading: string;
  tiers: { name: string; price: string; period: string; features: string[]; cta: string; highlight?: boolean }[];
  faqHeading: string;
  faq: { q: string; a: string }[];
  ctaHeading: string;
  ctaBody: string;
  ctaButton: string;
};

const COPY: Record<Locale, Copy> = {
  en: {
    kicker: 'For venue owners',
    h1: () => 'Your venue. Your page. No middleman.',
    lead: 'Your venue already has a page on citynight.gr. Claim it free, fix the facts, post your events, see real traffic. Upgrade only if you want more reach.',
    howHeading: 'How it works',
    steps: [
      { n: '01', title: 'Find your venue',     body: 'Search by name or browse your city. If it isn’t listed yet, submit it — we auto-verify against Google Places.' },
      { n: '02', title: 'Verify by email',     body: 'We email a one-time link to the address on file (or any owner email). Click it, you’re in.' },
      { n: '03', title: 'Edit & post events',  body: 'Update hours, phone, photos. Featured tier adds event posts and analytics.' },
    ],
    tiersHeading: 'Tiers',
    tiers: [
      {
        name: 'Free',
        price: '€0',
        period: 'forever',
        features: [
          'Claim your page',
          'Edit facts, hours, photos',
          'Direct link to your site',
          'Your edits override the weekly Google sync',
        ],
        cta: 'Claim your venue',
      },
      {
        name: 'Featured',
        price: '€29',
        period: 'per month',
        features: [
          'Everything in Free',
          'Labeled top-of-category placement',
          'Post events (visible to all visitors)',
          'Per-venue analytics — views, directions, clicks',
          'Priority in city editorial slots',
        ],
        cta: 'Go featured',
        highlight: true,
      },
      {
        name: 'Ad inventory',
        price: 'From €99',
        period: 'per month',
        features: [
          'Site / section / category slots',
          'Geo-targeted display creative',
          'Moderation — your competitors can’t buy your category',
          'Flat monthly billing, no auction',
        ],
        cta: 'Talk to us',
      },
    ],
    faqHeading: 'Honest answers',
    faq: [
      { q: 'Can you delete my page?',                       a: 'No. We can wipe owner-uploaded data on unclaim, but the URL stays — it’s a city asset, and we don’t let competitors weaponise deletion.' },
      { q: 'Will AI write fake reviews about my venue?',    a: 'No. AI writes only the short evergreen description, and we explicitly forbid it from inventing hours, prices, events, awards, or numbers. Facts come from Google or you.' },
      { q: 'How are featured listings labelled?',           a: 'Always with a visible Featured badge. We don’t pretend it’s organic.' },
      { q: 'How do I get paid traffic from this?',          a: 'You don’t pay-per-click here. Traffic is organic — Google sees grounded content with real photos and real facts.' },
    ],
    ctaHeading: 'Ready?',
    ctaBody: 'Most claims take under two minutes.',
    ctaButton: 'Find your venue',
  },
  el: {
    kicker: 'Για ιδιοκτήτες μαγαζιών',
    h1: () => 'Το μαγαζί σου. Η σελίδα σου. Χωρίς μεσάζοντες.',
    lead: 'Το μαγαζί σου έχει ήδη σελίδα στο citynight.gr. Διεκδίκησέ την δωρεάν, κράτα τα στοιχεία σωστά, ανέβασε events, δες πραγματική επισκεψιμότητα.',
    howHeading: 'Πώς δουλεύει',
    steps: [
      { n: '01', title: 'Βρες το μαγαζί σου',  body: 'Ψάξε με το όνομα ή περιήγηση στην πόλη σου. Αν δεν υπάρχει, υπέβαλε το — επιβεβαιώνεται αυτόματα από Google Places.' },
      { n: '02', title: 'Επιβεβαίωσε με email', body: 'Σου στέλνουμε σύνδεσμο μιας χρήσης στο email σου. Κλικ και μέσα.' },
      { n: '03', title: 'Επεξεργασία & events', body: 'Άλλαξε ώρες, τηλέφωνο, φωτογραφίες. Με Featured προσθέτεις events και στατιστικά.' },
    ],
    tiersHeading: 'Πακέτα',
    tiers: [
      {
        name: 'Δωρεάν', price: '€0', period: 'για πάντα',
        features: ['Διεκδίκηση σελίδας', 'Επεξεργασία στοιχείων, ωρών, φωτογραφιών', 'Σύνδεσμος προς το site σου', 'Οι αλλαγές σου υπερισχύουν του Google sync'],
        cta: 'Διεκδίκησε',
      },
      {
        name: 'Featured', price: '€29', period: 'τον μήνα',
        features: ['Όλα του Δωρεάν', 'Σηματοδοτημένη προβολή στην κορυφή κατηγορίας', 'Πόστα events', 'Στατιστικά ανά μαγαζί', 'Προτεραιότητα σε editorial slots'],
        cta: 'Κάνε Featured', highlight: true,
      },
      {
        name: 'Διαφημίσεις', price: 'Από €99', period: 'τον μήνα',
        features: ['Slots site / section / category', 'Geo-targeted creative', 'Μοντελισμός — οι ανταγωνιστές σου δεν αγοράζουν την κατηγορία σου', 'Σταθερή μηνιαία χρέωση'],
        cta: 'Επικοινώνησε',
      },
    ],
    faqHeading: 'Ειλικρινείς απαντήσεις',
    faq: [
      { q: 'Μπορείτε να σβήσετε τη σελίδα μου;',           a: 'Όχι. Σβήνουμε τα δικά σου δεδομένα όταν αποσυνδέεσαι, αλλά το URL μένει — είναι asset της πόλης.' },
      { q: 'Η AI θα γράψει ψεύτικα reviews για το μαγαζί;', a: 'Όχι. Η AI γράφει μόνο μια σύντομη evergreen περιγραφή· απαγορεύεται να εφεύρει ώρες, τιμές, events, αριθμούς.' },
      { q: 'Πώς εμφανίζονται τα Featured;',                 a: 'Πάντα με ορατό Featured badge.' },
      { q: 'Πώς θα πάρω επισκεψιμότητα;',                   a: 'Οργανικά — Google βλέπει grounded περιεχόμενο με πραγματικά στοιχεία.' },
    ],
    ctaHeading: 'Έτοιμος;',
    ctaBody: 'Οι περισσότερες διεκδικήσεις γίνονται σε λιγότερο από δύο λεπτά.',
    ctaButton: 'Βρες το μαγαζί σου',
  },
  de: {
    kicker: 'Für Lokal-Inhaber',
    h1: () => 'Ihr Lokal. Ihre Seite. Ohne Vermittler.',
    lead: 'Ihr Lokal hat schon eine Seite auf citynight.gr. Beanspruchen Sie sie gratis, halten Sie die Fakten aktuell, posten Sie Ihre Events.',
    howHeading: 'So funktioniert es',
    steps: [
      { n: '01', title: 'Lokal finden',  body: 'Suchen oder Stadt durchblättern. Nicht gelistet? Einreichen — wir verifizieren automatisch.' },
      { n: '02', title: 'E-Mail-Verify', body: 'Wir senden einen einmaligen Link. Klicken, drin.' },
      { n: '03', title: 'Bearbeiten & Events', body: 'Öffnungszeiten, Telefon, Fotos. Featured fügt Events und Analytics hinzu.' },
    ],
    tiersHeading: 'Pakete',
    tiers: [
      { name: 'Kostenlos', price: '€0', period: 'für immer', features: ['Seite beanspruchen', 'Fakten + Fotos bearbeiten', 'Link zu Ihrer Website', 'Ihre Bearbeitungen überschreiben den Google-Sync'], cta: 'Beanspruchen' },
      { name: 'Featured',  price: '€29', period: 'pro Monat', features: ['Alles im Kostenlos', 'Top-Platzierung mit Badge', 'Events posten', 'Analytics pro Lokal', 'Editorial-Priorität'], cta: 'Featured werden', highlight: true },
      { name: 'Werbung',   price: 'Ab €99', period: 'pro Monat', features: ['Slots site / section / category', 'Geo-Targeting', 'Moderation', 'Pauschal monatlich'], cta: 'Kontakt' },
    ],
    faqHeading: 'Ehrliche Antworten',
    faq: [
      { q: 'Können Sie meine Seite löschen?', a: 'Nein. Ihre Daten werden bei Aufgabe gelöscht, die URL bleibt — sie gehört der Stadt.' },
      { q: 'Schreibt AI Fake-Reviews?',       a: 'Nein. AI schreibt nur eine kurze evergreen Beschreibung — keine Öffnungszeiten, Preise, Zahlen.' },
      { q: 'Wie werden Featured markiert?',   a: 'Immer mit sichtbarem Featured-Badge.' },
      { q: 'Wie kommt Traffic?',              a: 'Organisch — Google sieht grounded Content mit echten Fakten.' },
    ],
    ctaHeading: 'Bereit?',
    ctaBody: 'Die meisten Übernahmen dauern unter zwei Minuten.',
    ctaButton: 'Lokal finden',
  },
  fr: {
    kicker: 'Pour propriétaires',
    h1: () => 'Votre lieu. Votre page. Sans intermédiaire.',
    lead: 'Votre lieu a déjà une page sur citynight.gr. Revendiquez-la gratuitement, mettez à jour les infos, publiez vos événements.',
    howHeading: 'Comment ça marche',
    steps: [
      { n: '01', title: 'Trouvez votre lieu', body: 'Recherchez ou parcourez votre ville. Pas listé ? Soumettez — vérifié auto via Places.' },
      { n: '02', title: 'Vérif par email',   body: 'On envoie un lien à usage unique. Clic, vous êtes connecté.' },
      { n: '03', title: 'Édition & événements', body: 'Horaires, téléphone, photos. Featured ajoute événements et analytics.' },
    ],
    tiersHeading: 'Formules',
    tiers: [
      { name: 'Gratuit',  price: '€0', period: 'à vie', features: ['Revendiquer la page', 'Modifier infos & photos', 'Lien vers votre site', 'Vos modifs gagnent sur le Google sync'], cta: 'Revendiquer' },
      { name: 'Featured', price: '€29', period: '/ mois', features: ['Tout du Gratuit', 'Placement en tête avec badge', 'Publier événements', 'Analytics par lieu', 'Priorité éditoriale'], cta: 'Devenir Featured', highlight: true },
      { name: 'Pub',      price: 'Dès €99', period: '/ mois', features: ['Slots site / section / category', 'Géo-ciblage', 'Modération', 'Facturation mensuelle fixe'], cta: 'Contact' },
    ],
    faqHeading: 'Réponses honnêtes',
    faq: [
      { q: 'Pouvez-vous supprimer ma page ?', a: 'Non. Vos données partent à la résiliation, l’URL reste — c’est un actif de la ville.' },
      { q: 'L’IA écrit-elle de faux avis ?',  a: 'Non. L’IA n’écrit qu’une courte description intemporelle — pas d’horaires, prix, chiffres.' },
      { q: 'Comment Featured est-il marqué ?', a: 'Toujours avec un badge Featured visible.' },
      { q: 'D’où vient le trafic ?',           a: 'Organique — Google voit du contenu ancré, vraies infos, vraies photos.' },
    ],
    ctaHeading: 'Prêt ?',
    ctaBody: 'La plupart des revendications prennent moins de deux minutes.',
    ctaButton: 'Trouvez votre lieu',
  },
  it: {
    kicker: 'Per gestori di locali',
    h1: () => 'Il tuo locale. La tua pagina. Senza intermediari.',
    lead: 'Il tuo locale ha già una pagina su citynight.gr. Reclamala gratis, tieni le info aggiornate, pubblica gli eventi.',
    howHeading: 'Come funziona',
    steps: [
      { n: '01', title: 'Trova il locale',   body: 'Cerca o sfoglia la città. Non c’è? Inserisci — verificato auto via Places.' },
      { n: '02', title: 'Verifica via email', body: 'Inviamo un link monouso. Clicchi, sei dentro.' },
      { n: '03', title: 'Modifica & eventi', body: 'Orari, telefono, foto. Featured aggiunge eventi e analytics.' },
    ],
    tiersHeading: 'Piani',
    tiers: [
      { name: 'Gratis',   price: '€0', period: 'per sempre', features: ['Reclamare la pagina', 'Modificare info & foto', 'Link al tuo sito', 'Le tue modifiche vincono sul Google sync'], cta: 'Reclama' },
      { name: 'Featured', price: '€29', period: '/ mese',    features: ['Tutto del Gratis', 'Posizione in alto con badge', 'Pubblicare eventi', 'Analytics per locale', 'Priorità editoriale'], cta: 'Diventa Featured', highlight: true },
      { name: 'Pubblicità', price: 'Da €99', period: '/ mese', features: ['Slots site / section / category', 'Geo-targeting', 'Moderazione', 'Fatturazione mensile fissa'], cta: 'Contatti' },
    ],
    faqHeading: 'Risposte oneste',
    faq: [
      { q: 'Potete cancellare la mia pagina?', a: 'No. I tuoi dati spariscono se rinunci, l’URL resta — è un asset della città.' },
      { q: 'L’AI scrive recensioni false?',     a: 'No. L’AI scrive solo una breve descrizione evergreen — niente orari, prezzi, numeri.' },
      { q: 'Come è marcato Featured?',          a: 'Sempre con un badge Featured visibile.' },
      { q: 'Da dove arriva il traffico?',       a: 'Organico — Google vede contenuti veri con foto vere.' },
    ],
    ctaHeading: 'Pronto?',
    ctaBody: 'La maggior parte delle reclamazioni richiede meno di due minuti.',
    ctaButton: 'Trova il tuo locale',
  },
};

export default async function ForOwners({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const c = COPY[locale];

  return (
    <>
      {/* HERO */}
      <section className="border-b border-[var(--color-bg-2)] bg-gradient-to-b from-[var(--color-bg-1)] to-[var(--color-bg-0)]">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center md:py-28">
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--color-fg-2)]">{c.kicker}</p>
          <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight md:text-7xl">{c.h1(10)}</h1>
          <p className="mt-6 text-lg text-[var(--color-fg-1)] md:text-xl">{c.lead}</p>
          <Link
            href={`/${locale}/greece`}
            className="mt-8 inline-flex items-center rounded-md bg-[var(--color-accent-pink)] px-6 py-3 text-sm font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)] transition hover:brightness-110"
          >
            {c.ctaButton} →
          </Link>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{c.howHeading}</h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {c.steps.map((s) => (
            <li key={s.n} className="relative rounded-lg border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] p-6">
              <span className="absolute -top-3 left-6 rounded bg-[var(--color-accent-cyan)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-bg-0)]">{s.n}</span>
              <p className="mt-2 font-display text-xl font-semibold">{s.title}</p>
              <p className="mt-2 text-sm text-[var(--color-fg-1)]">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* TIERS */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{c.tiersHeading}</h2>
        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {c.tiers.map((t) => (
            <li
              key={t.name}
              className={
                'relative flex h-full flex-col rounded-2xl p-6 ' +
                (t.highlight
                  ? 'border border-[var(--color-accent-pink)] bg-[color-mix(in_oklab,var(--color-accent-pink)_8%,var(--color-bg-1))] shadow-[var(--shadow-glow-pink)]'
                  : 'border border-[var(--color-bg-3)] bg-[var(--color-bg-1)]')
              }
            >
              {t.highlight && (
                <span className="absolute -top-3 left-6 rounded-full bg-[var(--color-accent-pink)] px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-bg-0)]">
                  most popular
                </span>
              )}
              <p className="font-display text-2xl font-semibold">{t.name}</p>
              <p className="mt-2">
                <span className="font-display text-4xl font-semibold">{t.price}</span>{' '}
                <span className="text-sm text-[var(--color-fg-2)]">{t.period}</span>
              </p>
              <ul className="mt-6 flex-1 space-y-2 text-sm">
                {t.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span aria-hidden className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-accent-cyan)]" />
                    <span className="text-[var(--color-fg-1)]">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/${locale}/greece`}
                className={
                  'mt-6 inline-flex items-center justify-center rounded-md px-4 py-2.5 text-sm font-semibold transition ' +
                  (t.highlight
                    ? 'bg-[var(--color-accent-pink)] text-[var(--color-bg-0)] hover:brightness-110'
                    : 'border border-[var(--color-bg-3)] text-[var(--color-fg-0)] hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)]')
                }
              >
                {t.cta} →
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* FAQ */}
      <section className="mx-auto w-full max-w-3xl px-6 py-16">
        <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{c.faqHeading}</h2>
        <dl className="mt-8 space-y-6">
          {c.faq.map((item, i) => (
            <div key={i} className="border-b border-[var(--color-bg-2)] pb-6">
              <dt className="font-display text-lg font-semibold text-[var(--color-fg-0)]">{item.q}</dt>
              <dd className="mt-2 text-[var(--color-fg-1)]">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* CLOSING CTA */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-2xl border border-[var(--color-accent-pink)]/40 bg-gradient-to-br from-[var(--color-bg-1)] via-[var(--color-bg-2)] to-[var(--color-bg-1)] p-10 text-center">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[var(--color-accent-pink)]/20 blur-3xl" aria-hidden />
          <h2 className="relative font-display text-3xl font-semibold tracking-tight md:text-5xl">{c.ctaHeading}</h2>
          <p className="relative mt-3 text-[var(--color-fg-1)]">{c.ctaBody}</p>
          <Link
            href={`/${locale}/greece`}
            className="relative mt-6 inline-flex items-center rounded-md bg-[var(--color-accent-pink)] px-6 py-3 text-sm font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)] transition hover:brightness-110"
          >
            {c.ctaButton} →
          </Link>
        </div>
      </section>
    </>
  );
}
