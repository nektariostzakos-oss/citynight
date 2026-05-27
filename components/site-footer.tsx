import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import { MoonIcon, ForkKnifeIcon, BedIcon, MapPinIcon, StoreIcon } from './nav-icons';

// Futuristic footer:
//   - Neon grid pattern background (pure CSS, no image)
//   - Huge stylized wordmark with gradient fill + glow
//   - Glassmorphic link columns with thin neon dividers
//   - Animated scanline accent line at the top
//   - Compact social row + legal microcopy at the bottom

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
  // Link labels — must localise, were hardcoded English before.
  linkCities: string;
  linkNightlife: string;
  linkFood: string;
  linkStay: string;
  linkGuides: string;
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
    manifesto: 'Greece, told the right way. Nightlife, food and stay — curated by people who know the streets.',
    exploreHeading: 'Explore',
    ownersHeading: 'Owners',
    legalHeading: 'Legal',
    followHeading: 'Follow',
    newsletterHeading: 'Get the drop',
    newsletterSub: 'Monthly. New openings, weekly picks. No spam.',
    newsletterPlaceholder: 'your@email',
    newsletterCta: 'Subscribe',
    rightsLine: 'All rights reserved. Affiliate links carry rel="sponsored".',
    linkCities: 'Cities', linkNightlife: 'Nightlife', linkFood: 'Food', linkStay: 'Stay', linkGuides: 'Guides',
    linkClaim: 'Claim your venue', linkPricing: 'Pricing', linkSignIn: 'Sign in', linkDashboard: 'Dashboard',
    linkTerms: 'Terms', linkPrivacy: 'Privacy', linkCookies: 'Cookies', linkSitemap: 'Sitemap',
  },
  el: {
    manifesto: 'Η Ελλάδα, με τον σωστό τρόπο. Νυχτερινή ζωή, φαγητό, διαμονή — επιμελημένα από ανθρώπους που ξέρουν.',
    exploreHeading: 'Εξερεύνηση',
    ownersHeading: 'Ιδιοκτήτες',
    legalHeading: 'Νομικά',
    followHeading: 'Δίκτυα',
    newsletterHeading: 'Πάρε ενημέρωση',
    newsletterSub: 'Μηνιαία. Νέα μαγαζιά, εβδομαδιαία picks. Χωρίς spam.',
    newsletterPlaceholder: 'your@email',
    newsletterCta: 'Εγγραφή',
    rightsLine: 'Με επιφύλαξη παντός δικαιώματος. Affiliate links με rel="sponsored".',
    linkCities: 'Πόλεις', linkNightlife: 'Νυχτερινή ζωή', linkFood: 'Φαγητό', linkStay: 'Διαμονή', linkGuides: 'Οδηγοί',
    linkClaim: 'Κάνε claim το μαγαζί σου', linkPricing: 'Τιμές', linkSignIn: 'Είσοδος', linkDashboard: 'Πίνακας ελέγχου',
    linkTerms: 'Όροι', linkPrivacy: 'Απόρρητο', linkCookies: 'Cookies', linkSitemap: 'Χάρτης σελίδας',
  },
  de: {
    manifesto: 'Griechenland, richtig erzählt. Nightlife, Essen, Unterkunft — kuratiert von Menschen, die die Straßen kennen.',
    exploreHeading: 'Entdecken',
    ownersHeading: 'Inhaber',
    legalHeading: 'Rechtliches',
    followHeading: 'Folgen',
    newsletterHeading: 'Bleib informiert',
    newsletterSub: 'Monatlich. Neueröffnungen, wöchentliche Picks. Kein Spam.',
    newsletterPlaceholder: 'deine@email',
    newsletterCta: 'Abonnieren',
    rightsLine: 'Alle Rechte vorbehalten. Affiliate-Links tragen rel="sponsored".',
    linkCities: 'Städte', linkNightlife: 'Nightlife', linkFood: 'Essen', linkStay: 'Übernachten', linkGuides: 'Guides',
    linkClaim: 'Location beanspruchen', linkPricing: 'Preise', linkSignIn: 'Anmelden', linkDashboard: 'Dashboard',
    linkTerms: 'AGB', linkPrivacy: 'Datenschutz', linkCookies: 'Cookies', linkSitemap: 'Sitemap',
  },
  fr: {
    manifesto: 'La Grèce, racontée comme il faut. Vie nocturne, table, hôtel — sélectionnés par des gens qui connaissent.',
    exploreHeading: 'Explorer',
    ownersHeading: 'Propriétaires',
    legalHeading: 'Légal',
    followHeading: 'Suivez',
    newsletterHeading: 'Recevez les bons plans',
    newsletterSub: 'Mensuel. Nouveautés, sélection hebdo. Pas de spam.',
    newsletterPlaceholder: 'votre@email',
    newsletterCta: "S'abonner",
    rightsLine: 'Tous droits réservés. Liens d’affiliation avec rel="sponsored".',
    linkCities: 'Villes', linkNightlife: 'Vie nocturne', linkFood: 'Cuisine', linkStay: 'Hébergement', linkGuides: 'Guides',
    linkClaim: 'Revendiquer votre lieu', linkPricing: 'Tarifs', linkSignIn: 'Connexion', linkDashboard: 'Tableau de bord',
    linkTerms: 'Conditions', linkPrivacy: 'Confidentialité', linkCookies: 'Cookies', linkSitemap: 'Plan du site',
  },
  it: {
    manifesto: 'La Grecia, raccontata bene. Vita notturna, cibo, alloggio — selezionati da chi conosce le strade.',
    exploreHeading: 'Esplora',
    ownersHeading: 'Proprietari',
    legalHeading: 'Legale',
    followHeading: 'Seguici',
    newsletterHeading: 'Resta aggiornato',
    newsletterSub: 'Mensile. Nuove aperture, selezione settimanale. Niente spam.',
    newsletterPlaceholder: 'tua@email',
    newsletterCta: 'Iscriviti',
    rightsLine: 'Tutti i diritti riservati. Link di affiliazione con rel="sponsored".',
    linkCities: 'Città', linkNightlife: 'Vita notturna', linkFood: 'Cucina', linkStay: 'Alloggio', linkGuides: 'Guide',
    linkClaim: 'Rivendica il locale', linkPricing: 'Prezzi', linkSignIn: 'Accedi', linkDashboard: 'Dashboard',
    linkTerms: 'Termini', linkPrivacy: 'Privacy', linkCookies: 'Cookies', linkSitemap: 'Mappa del sito',
  },
};

export function SiteFooter({ locale }: { locale: Locale }) {
  const c = COPY[locale];

  return (
    <footer data-site-chrome="footer" className="relative isolate overflow-hidden border-t border-[var(--color-bg-2)] bg-[var(--color-bg-0)]">
      {/* Neon-haze background blobs */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[var(--color-accent-pink)]/12 blur-[120px]" aria-hidden />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-[var(--color-accent-cyan)]/10 blur-[140px]" aria-hidden />

      {/* Grid pattern overlay (pure CSS) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        aria-hidden
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
        }}
      />

      {/* Scanline accent at the very top */}
      <div className="relative">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[var(--color-accent-pink)] to-transparent" />
        <div className="absolute inset-x-0 top-0 h-px w-1/3 animate-[pulse_4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-[var(--color-accent-cyan)] to-transparent" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-6 py-16">
        {/* HERO BRAND ROW */}
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            {/* HUGE wordmark with gradient */}
            <p className="font-display text-6xl font-semibold tracking-tight md:text-7xl">
              <span className="bg-gradient-to-r from-[var(--color-fg-0)] via-[var(--color-fg-1)] to-[var(--color-fg-2)] bg-clip-text text-transparent">city</span>
              <span className="bg-gradient-to-br from-[var(--color-accent-pink)] via-[var(--color-accent-pink)] to-[var(--color-accent-violet)] bg-clip-text text-transparent">night</span>
              <span className="text-[var(--color-fg-3)]">.gr</span>
            </p>

            <p className="mt-5 max-w-md text-sm leading-relaxed text-[var(--color-fg-1)]">{c.manifesto}</p>

            {/* Status pill — "online" indicator, app-feel */}
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[var(--color-bg-3)] bg-[var(--color-bg-1)]/60 px-3 py-1 text-xs uppercase tracking-widest text-[var(--color-fg-2)] backdrop-blur">
              <span aria-hidden className="relative inline-flex h-2 w-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-[var(--color-success)] opacity-75" />
                <span className="relative inline-block h-2 w-2 rounded-full bg-[var(--color-success)]" />
              </span>
              <span>system online · v0.1</span>
            </div>
          </div>

          {/* NEWSLETTER PANEL — glassmorphic */}
          <form
            action="/api/newsletter"
            method="POST"
            className="relative overflow-hidden rounded-2xl border border-[var(--color-bg-3)] bg-[var(--color-bg-1)]/60 p-6 backdrop-blur"
          >
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[var(--color-accent-pink)]/15 blur-2xl" aria-hidden />
            <p className="font-display text-xl font-semibold">{c.newsletterHeading}</p>
            <p className="mt-1 text-sm text-[var(--color-fg-2)]">{c.newsletterSub}</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                name="email"
                required
                placeholder={c.newsletterPlaceholder}
                className="flex-1 rounded-md border border-[var(--color-bg-3)] bg-[var(--color-bg-0)]/70 px-3 py-2 text-sm text-[var(--color-fg-0)] placeholder:text-[var(--color-fg-3)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-md bg-[var(--color-accent-pink)] px-4 py-2 text-sm font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)] transition hover:brightness-110"
              >
                {c.newsletterCta} →
              </button>
            </div>
          </form>
        </div>

        {/* DIVIDER */}
        <div className="my-12 h-px w-full bg-gradient-to-r from-transparent via-[var(--color-bg-3)] to-transparent" />

        {/* LINK GRID */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <FooterColumn heading={c.exploreHeading} accent="cyan">
            <FooterLink href={`/${locale}`} icon={<MapPinIcon />}>{c.linkCities}</FooterLink>
            <FooterLink href={`/${locale}#nightlife`} icon={<MoonIcon />}>{c.linkNightlife}</FooterLink>
            <FooterLink href={`/${locale}#food`} icon={<ForkKnifeIcon />}>{c.linkFood}</FooterLink>
            <FooterLink href={`/${locale}#stay`} icon={<BedIcon />}>{c.linkStay}</FooterLink>
            <FooterLink href={`/${locale}/guides`}>{c.linkGuides}</FooterLink>
          </FooterColumn>

          <FooterColumn heading={c.ownersHeading} accent="pink">
            <FooterLink href={`/${locale}/for-owners`} icon={<StoreIcon />}>{c.linkClaim}</FooterLink>
            <FooterLink href={`/${locale}/for-owners`}>{c.linkPricing}</FooterLink>
            <FooterLink href={`/${locale}/sign-in`}>{c.linkSignIn}</FooterLink>
            <FooterLink href={`/${locale}/dashboard`}>{c.linkDashboard}</FooterLink>
          </FooterColumn>

          <FooterColumn heading={c.legalHeading} accent="violet">
            <FooterLink href={`/${locale}/legal/terms`}>{c.linkTerms}</FooterLink>
            <FooterLink href={`/${locale}/legal/privacy`}>{c.linkPrivacy}</FooterLink>
            <FooterLink href={`/${locale}/legal/cookies`}>{c.linkCookies}</FooterLink>
            <FooterLink href="/sitemap.xml">{c.linkSitemap}</FooterLink>
          </FooterColumn>

          <FooterColumn heading={c.followHeading} accent="pink">
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
      <div className="relative border-t border-[var(--color-bg-2)] bg-[var(--color-bg-1)]/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-4 text-xs text-[var(--color-fg-3)] sm:flex-row">
          <p>© {new Date().getFullYear()} citynight.gr — {c.rightsLine}</p>
          <p className="font-mono">
            <span className="text-[var(--color-fg-2)]">{'> '}</span>
            <span className="text-[var(--color-accent-cyan)]">made in Athens</span>
            <span className="ml-1 animate-pulse">▋</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  heading,
  accent,
  children,
}: {
  heading: string;
  accent: 'pink' | 'cyan' | 'violet';
  children: React.ReactNode;
}) {
  const dotClass = accent === 'pink'
    ? 'bg-[var(--color-accent-pink)]'
    : accent === 'violet'
      ? 'bg-[var(--color-accent-violet)]'
      : 'bg-[var(--color-accent-cyan)]';

  return (
    <div>
      <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--color-fg-2)]">
        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
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
        className="group inline-flex items-center gap-2 text-[var(--color-fg-1)] transition hover:text-[var(--color-accent-cyan)]"
      >
        {icon && (
          <span className="text-[var(--color-fg-3)] transition group-hover:text-[var(--color-accent-cyan)]">{icon}</span>
        )}
        <span>{children}</span>
        <span aria-hidden className="opacity-0 transition group-hover:opacity-100">→</span>
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
        className="group inline-flex items-center gap-3 text-sm text-[var(--color-fg-1)] transition hover:text-[var(--color-accent-pink)]"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] text-[var(--color-fg-2)] transition group-hover:border-[var(--color-accent-pink)] group-hover:text-[var(--color-accent-pink)]">
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
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
      <path d="M4 4l16 16" />
      <path d="M20 4L4 20" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 4v10a4 4 0 1 1-4-4" />
      <path d="M14 4a4 4 0 0 0 4 4" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 4h-2a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8a1 1 0 0 1 1-1h2V4z" />
    </svg>
  );
}
