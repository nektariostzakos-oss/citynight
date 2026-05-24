import type { Locale } from '@/lib/i18n';

// Commercial-intent surface on venue pages (§11). Outbound links go through
// the `/go/{slug}` router so geo-routing happens server-side at click time.
// EVERY outbound link carries rel="sponsored nofollow" + visible disclosure.

const COPY: Record<Locale, { heading: string; disc: string; cta: string }> = {
  en: { heading: 'Plan your night', disc: 'Affiliate links — we may earn a commission.', cta: 'Book a tour or transfer' },
  el: { heading: 'Σχεδίασε τη βραδιά σου', disc: 'Affiliate σύνδεσμοι — μπορεί να λάβουμε προμήθεια.', cta: 'Κράτηση tour ή μεταφοράς' },
  de: { heading: 'Den Abend planen', disc: 'Affiliate-Links — wir können eine Provision erhalten.', cta: 'Tour oder Transfer buchen' },
  fr: { heading: 'Préparez votre soirée', disc: 'Liens d’affiliation — nous pouvons recevoir une commission.', cta: 'Réserver un tour ou un transfert' },
  it: { heading: 'Pianifica la serata', disc: 'Link di affiliazione — possiamo ricevere una commissione.', cta: 'Prenota tour o transfer' },
};

export function AffiliateBlock({ venueId, locale }: { venueId: string; locale: Locale }) {
  const c = COPY[locale];
  // We use a stable slug pattern; the destinations table is owned by ops.
  const slug = 'nightlife-experiences';

  return (
    <aside className="rounded-lg border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] p-5">
      <p className="text-xs uppercase tracking-widest text-[var(--color-fg-2)]">{c.heading}</p>
      <a
        href={`/${locale}/go/${slug}?ref=${venueId}`}
        rel="sponsored nofollow"
        className="mt-3 inline-block rounded-md bg-[var(--color-accent-pink)] px-4 py-2 text-sm font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)] transition hover:brightness-110"
      >
        {c.cta} →
      </a>
      <p className="mt-3 text-xs text-[var(--color-fg-3)]">{c.disc}</p>
    </aside>
  );
}
