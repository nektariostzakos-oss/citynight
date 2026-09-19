import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import { MoonIcon, MapPinIcon, StoreIcon } from './nav-icons';
import { LogoLockup } from './brand/logo';

// The footer: one hairline across the top, the ground colour behind it, the
// Ζενίθ lockup with the domain, and the columns. No grid pattern, no haze, no
// scanline: the page ends on a line, the way the instrument ends on a tick.
//
// Direction A "Αντικύθηρα", products/citynight/design/tokens.md.

type Copy = {
  manifesto: string;
  exploreHeading: string;
  ownersHeading: string;
  legalHeading: string;
  followHeading: string;
  newsletterHeading: string;
  newsletterSub: string;
  newsletterPlaceholder: string;
  newsletterCta: string;
  rightsLine: string;
  /** Where the readings come from. Named, not implied. */
  sources: string;
  // Link labels — must localise, were hardcoded English before.
  linkCities: string;
  linkNightlife: string;
  linkFood: string;
  linkStay: string;
  linkGuides: string;
  linkSearch: string;
  linkClaim: string;
  linkPricing: string;
  linkSignIn: string;
  linkDashboard: string;
  linkTerms: string;
  linkPrivacy: string;
  linkCookies: string;
  linkSitemap: string;
};

const COPY: Record<Locale, Copy> = {
  en: {
    manifesto: 'Greece, told the right way. Nightlife, food and stay: curated by people who know the streets.',
    exploreHeading: 'Explore',
    ownersHeading: 'Owners',
    legalHeading: 'Legal',
    followHeading: 'Follow',
    newsletterHeading: 'Get the drop',
    newsletterSub: 'Monthly. New openings, weekly picks. No spam.',
    newsletterPlaceholder: 'your@email',
    newsletterCta: 'Subscribe',
    rightsLine: 'All rights reserved. Affiliate links carry rel="sponsored".',
    sources: 'Data: published guides, business websites and Google Places. Sun and moon computed for Athens.',
    linkCities: 'Cities', linkNightlife: 'Nightlife', linkFood: 'Food', linkStay: 'Stay', linkGuides: 'Guides',
    linkSearch: 'Search',
    linkClaim: 'Make your site', linkPricing: 'Pricing', linkSignIn: 'Sign in', linkDashboard: 'Dashboard',
    linkTerms: 'Terms', linkPrivacy: 'Privacy', linkCookies: 'Cookies', linkSitemap: 'Sitemap',
  },
  el: {
    manifesto: 'Η Ελλάδα, με τον σωστό τρόπο. Νυχτερινή ζωή, φαγητό, διαμονή: επιμελημένα από ανθρώπους που ξέρουν.',
    exploreHeading: 'Εξερεύνηση',
    ownersHeading: 'Ιδιοκτήτες',
    legalHeading: 'Νομικά',
    followHeading: 'Δίκτυα',
    newsletterHeading: 'Πάρε ενημέρωση',
    newsletterSub: 'Μηνιαία. Νέα μαγαζιά, εβδομαδιαία picks. Χωρίς spam.',
    newsletterPlaceholder: 'your@email',
    newsletterCta: 'Εγγραφή',
    rightsLine: 'Με επιφύλαξη παντός δικαιώματος. Affiliate links με rel="sponsored".',
    sources: 'Δεδομένα: οι οδηγοί μας, οι ιστότοποι των καταστημάτων και το Google Places. Ήλιος και σελήνη υπολογισμένα για την Αθήνα.',
    linkCities: 'Πόλεις', linkNightlife: 'Νυχτερινή ζωή', linkFood: 'Φαγητό', linkStay: 'Διαμονή', linkGuides: 'Οδηγοί',
    linkSearch: 'Αναζήτηση',
    linkClaim: 'Φτιάξε το site σου', linkPricing: 'Τιμές', linkSignIn: 'Είσοδος', linkDashboard: 'Πίνακας ελέγχου',
    linkTerms: 'Όροι', linkPrivacy: 'Απόρρητο', linkCookies: 'Cookies', linkSitemap: 'Χάρτης σελίδας',
  },
  de: {
    manifesto: 'Griechenland, richtig erzählt. Nightlife, Essen, Unterkunft: kuratiert von Menschen, die die Straßen kennen.',
    exploreHeading: 'Entdecken',
    ownersHeading: 'Inhaber',
    legalHeading: 'Rechtliches',
    followHeading: 'Folgen',
    newsletterHeading: 'Bleib informiert',
    newsletterSub: 'Monatlich. Neueröffnungen, wöchentliche Picks. Kein Spam.',
    newsletterPlaceholder: 'deine@email',
    newsletterCta: 'Abonnieren',
    rightsLine: 'Alle Rechte vorbehalten. Affiliate-Links tragen rel="sponsored".',
    sources: 'Daten: unsere Guides, die Websites der Betriebe und Google Places. Sonne und Mond für Athen berechnet.',
    linkCities: 'Städte', linkNightlife: 'Nightlife', linkFood: 'Essen', linkStay: 'Übernachten', linkGuides: 'Guides',
    linkSearch: 'Suche',
    linkClaim: 'Website erstellen', linkPricing: 'Preise', linkSignIn: 'Anmelden', linkDashboard: 'Dashboard',
    linkTerms: 'AGB', linkPrivacy: 'Datenschutz', linkCookies: 'Cookies', linkSitemap: 'Sitemap',
  },
  fr: {
    manifesto: 'La Grèce, racontée comme il faut. Vie nocturne, table, hôtel: sélectionnés par des gens qui connaissent.',
    exploreHeading: 'Explorer',
    ownersHeading: 'Propriétaires',
    legalHeading: 'Légal',
    followHeading: 'Suivez',
    newsletterHeading: 'Recevez les bons plans',
    newsletterSub: 'Mensuel. Nouveautés, sélection hebdo. Pas de spam.',
    newsletterPlaceholder: 'votre@email',
    newsletterCta: "S'abonner",
    rightsLine: 'Tous droits réservés. Liens d’affiliation avec rel="sponsored".',
    sources: 'Données : nos guides, les sites des établissements et Google Places. Soleil et lune calculés pour Athènes.',
    linkCities: 'Villes', linkNightlife: 'Vie nocturne', linkFood: 'Cuisine', linkStay: 'Hébergement', linkGuides: 'Guides',
    linkSearch: 'Recherche',
    linkClaim: 'Créer mon site', linkPricing: 'Tarifs', linkSignIn: 'Connexion', linkDashboard: 'Tableau de bord',
    linkTerms: 'Conditions', linkPrivacy: 'Confidentialité', linkCookies: 'Cookies', linkSitemap: 'Plan du site',
  },
  it: {
    manifesto: 'La Grecia, raccontata bene. Vita notturna, cibo, alloggio: selezionati da chi conosce le strade.',
    exploreHeading: 'Esplora',
    ownersHeading: 'Proprietari',
    legalHeading: 'Legale',
    followHeading: 'Seguici',
    newsletterHeading: 'Resta aggiornato',
    newsletterSub: 'Mensile. Nuove aperture, selezione settimanale. Niente spam.',
    newsletterPlaceholder: 'tua@email',
    newsletterCta: 'Iscriviti',
    rightsLine: 'Tutti i diritti riservati. Link di affiliazione con rel="sponsored".',
    sources: 'Dati: le nostre guide, i siti dei locali e Google Places. Sole e luna calcolati per Atene.',
    linkCities: 'Città', linkNightlife: 'Vita notturna', linkFood: 'Cucina', linkStay: 'Alloggio', linkGuides: 'Guide',
    linkSearch: 'Ricerca',
    linkClaim: 'Crea il tuo sito', linkPricing: 'Prezzi', linkSignIn: 'Accedi', linkDashboard: 'Dashboard',
    linkTerms: 'Termini', linkPrivacy: 'Privacy', linkCookies: 'Cookies', linkSitemap: 'Mappa del sito',
  },
};

export function SiteFooter({ locale }: { locale: Locale }) {
  const c = COPY[locale];

  return (
    <footer data-site-chrome="footer" className="relative isolate overflow-hidden border-t border-[var(--color-hair)] bg-[var(--color-ground)]">
      <div className="relative mx-auto w-full max-w-[1180px] px-5 py-16 md:px-8">
        {/* HERO BRAND ROW */}
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            {/* Logo "Ζενίθ" with the domain: the name in the text colour, .gr muted. */}
            <p className="text-[var(--color-ink)]">
              <LogoLockup
                withDomain
                label="citynight.gr"
                domainColour="var(--color-muted)"
                className="h-12 w-auto max-w-full sm:h-14 md:h-[68px]"
              />
            </p>

            <p className="mt-5 max-w-md text-sm leading-relaxed text-[var(--color-muted)]">{c.manifesto}</p>

            {/* Where the readings come from. Verdigris is not used here: it
                means one thing on this site, open now. */}
            <p className="mt-6 max-w-md cn-readout cn-readout-s uppercase leading-relaxed text-[var(--color-muted)]">
              {c.sources}
            </p>
          </div>

          {/* NEWSLETTER PANEL — glassmorphic */}
          <form
            action="/api/newsletter"
            method="POST"
            className="relative overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-hair)] bg-[var(--color-surface)] p-6"
          >
            <p className="font-display text-xl font-semibold">{c.newsletterHeading}</p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">{c.newsletterSub}</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                name="email"
                required
                placeholder={c.newsletterPlaceholder}
                className="flex-1 rounded-[var(--radius-sm)] border border-[var(--color-hair)] bg-[var(--color-ground)] px-3 text-[15px] min-h-11 text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-bronze)] focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-bronze)] px-5 text-[15px] font-semibold text-[var(--color-on-bronze)] transition-transform duration-[var(--motion-fast)] active:scale-[0.98]"
              >
                {c.newsletterCta} →
              </button>
            </div>
          </form>
        </div>

        {/* DIVIDER */}
        <div className="my-12 h-px w-full bg-[var(--color-hair)]" />

        {/* LINK GRID */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* The three verticals have no page of their own after the
              editorial pivot, so the column lists what exists: the cities
              grid, the guides, and the search. No link that scrolls nowhere. */}
          <FooterColumn heading={c.exploreHeading}>
            <FooterLink href={`/${locale}#cities`} icon={<MapPinIcon />}>{c.linkCities}</FooterLink>
            <FooterLink href={`/${locale}/guides`} icon={<MoonIcon />}>{c.linkGuides}</FooterLink>
            <FooterLink href={`/${locale}/search`}>{c.linkSearch}</FooterLink>
          </FooterColumn>

          <FooterColumn heading={c.ownersHeading}>
            <FooterLink href={`/${locale}/for-owners`} icon={<StoreIcon />}>{c.linkClaim}</FooterLink>
            <FooterLink href={`/${locale}/for-owners`}>{c.linkPricing}</FooterLink>
            <FooterLink href={`/${locale}/sign-in`}>{c.linkSignIn}</FooterLink>
            <FooterLink href={`/${locale}/dashboard`}>{c.linkDashboard}</FooterLink>
          </FooterColumn>

          <FooterColumn heading={c.legalHeading}>
            <FooterLink href={`/${locale}/legal/terms`}>{c.linkTerms}</FooterLink>
            <FooterLink href={`/${locale}/legal/privacy`}>{c.linkPrivacy}</FooterLink>
            <FooterLink href={`/${locale}/legal/cookies`}>{c.linkCookies}</FooterLink>
            <FooterLink href="/sitemap.xml">{c.linkSitemap}</FooterLink>
          </FooterColumn>

          <FooterColumn heading={c.followHeading}>
            <FooterSocial href="https://instagram.com/citynight.gr" label="Instagram">
              <InstagramIcon />
            </FooterSocial>
            <FooterSocial href="https://twitter.com/citynightgr" label="X / Twitter">
              <XIcon />
            </FooterSocial>
            <FooterSocial href="https://tiktok.com/@citynight.gr" label="TikTok">
              <TikTokIcon />
            </FooterSocial>
            <FooterSocial href="https://facebook.com/citynight.gr" label="Facebook">
              <FacebookIcon />
            </FooterSocial>
          </FooterColumn>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="relative border-t border-[var(--color-hair)] bg-[var(--color-surface)]">
        <div className="mx-auto flex max-w-[1180px] flex-col items-center justify-between gap-3 px-5 py-4 text-[13px] text-[var(--color-muted)] sm:flex-row md:px-8">
          <p>© {new Date().getFullYear()} citynight.gr · {c.rightsLine}</p>
          <p className="cn-readout cn-readout-s uppercase">made in Athens</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="cn-readout cn-readout-s font-semibold uppercase text-[var(--color-muted)]">
        {heading}
      </p>
      <ul className="mt-4 space-y-2.5 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({ href, icon, children }: { href: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="group inline-flex min-h-11 items-center gap-2 text-[var(--color-muted)] transition-colors duration-[var(--motion-fast)] hover:text-[var(--color-bronze)]"
      >
        {icon && (
          <span className="text-[var(--color-muted)] transition-colors duration-[var(--motion-fast)] group-hover:text-[var(--color-bronze)]">{icon}</span>
        )}
        <span>{children}</span>
      </Link>
    </li>
  );
}

function FooterSocial({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className="group inline-flex min-h-11 items-center gap-3 text-[15px] text-[var(--color-muted)] transition-colors duration-[var(--motion-fast)] hover:text-[var(--color-bronze)]"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-hair)] bg-[var(--color-surface)] text-[var(--color-muted)] transition group-hover:border-[var(--color-bronze)] group-hover:text-[var(--color-bronze)]">
          {children}
        </span>
        <span>{label}</span>
      </a>
    </li>
  );
}

// Inline social icons — no external library, 1.5px strokes / monoline.

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <path d="M4 4l16 16" />
      <path d="M20 4L4 20" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 4v10a4 4 0 1 1-4-4" />
      <path d="M14 4a4 4 0 0 0 4 4" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 4h-2a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8a1 1 0 0 1 1-1h2V4z" />
    </svg>
  );
}
