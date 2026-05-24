import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import {
  LOCALES, LOCALE_LABELS, DEFAULT_LOCALE,
  localeFromAcceptLanguage, type Locale,
} from '@/lib/i18n';
import { listCitiesWithHero, siteStats } from '@/lib/queries';
import { LocaleAutoRedirect, StayHereLink } from '@/components/locale-auto-redirect';
import { HeroVideoBg } from '@/components/hero-video-bg';
import {
  publicMetadata, localizedPaths, jsonLdProps,
  organizationJsonLd, websiteJsonLd,
} from '@/lib/seo';

// '/' is the soft doorway (§10, [[feedback_root_doorway]]).
// Single-screen cinematic entry — NO marketing sections (those live on
// /{locale}). Locale comes from Accept-Language only; we never read IP.
// If we can't tell, we default to Greek. A short countdown silently redirects
// the visitor to /{locale}; clicking "Stay here" sets cn_stay_root for 30d.
// Crawlers see this static page with hreflang alternates — no redirect fires.

export const dynamic = 'force-dynamic'; // Accept-Language varies per visitor

// Root doorway metadata: canonical points at the English locale (per
// alternatesFor). Hreflang spans every supported locale + x-default → en.
export const metadata: Metadata = publicMetadata({
  locale: DEFAULT_LOCALE,
  paths: localizedPaths(''),
  title: 'citynight — Greece nightlife, food & stay guide',
  description:
    'The curated guide to going out, eating and staying across Greece. Real venues, real photos, five languages.',
});

type Copy = {
  kicker: string;
  title: string;
  titleAccent: string;
  sub: string;
  startCta: string;
  startHint: (cities: number) => string;
  otherLang: string;
  stayHere: string;
  statCities: string;
  statLanguages: string;
  statVerified: string;
};

const COPY: Record<Locale, Copy> = {
  en: {
    kicker: 'Greece · go out · eat · stay',
    title: 'Where Greece',
    titleAccent: 'comes alive',
    sub: 'Nightlife, restaurants and stays — curated across the islands and the mainland.',
    startCta: 'Enter',
    startHint: (n) => `${n} cities · in English`,
    otherLang: 'other languages',
    stayHere: 'stay on this page',
    statCities: 'cities',
    statLanguages: 'languages',
    statVerified: 'verified only',
  },
  el: {
    kicker: 'Ελλάδα · έξοδος · φαγητό · διαμονή',
    title: 'Όπου η Ελλάδα',
    titleAccent: 'ζει',
    sub: 'Νυχτερινή ζωή, εστιατόρια και διαμονή — επιμελημένα σε νησιά και ηπειρωτική.',
    startCta: 'Είσοδος',
    startHint: (n) => `${n} πόλεις · στα Ελληνικά`,
    otherLang: 'άλλες γλώσσες',
    stayHere: 'μείνε εδώ',
    statCities: 'πόλεις',
    statLanguages: 'γλώσσες',
    statVerified: 'επιβεβαιωμένα',
  },
  de: {
    kicker: 'Griechenland · Nightlife · Essen · Stay',
    title: 'Wo Griechenland',
    titleAccent: 'lebt',
    sub: 'Nightlife, Restaurants und Hotels — kuratiert auf Inseln und Festland.',
    startCta: 'Eintreten',
    startHint: (n) => `${n} Städte · auf Deutsch`,
    otherLang: 'andere Sprachen',
    stayHere: 'hier bleiben',
    statCities: 'Städte',
    statLanguages: 'Sprachen',
    statVerified: 'nur verifiziert',
  },
  fr: {
    kicker: 'Grèce · sortir · manger · dormir',
    title: 'Là où la Grèce',
    titleAccent: 'vit',
    sub: 'Vie nocturne, restaurants et hébergement — curés à travers les îles et le continent.',
    startCta: 'Entrer',
    startHint: (n) => `${n} villes · en français`,
    otherLang: 'autres langues',
    stayHere: 'rester ici',
    statCities: 'villes',
    statLanguages: 'langues',
    statVerified: 'vérifiés',
  },
  it: {
    kicker: 'Grecia · uscire · mangiare · dormire',
    title: 'Dove la Grecia',
    titleAccent: 'vive',
    sub: 'Vita notturna, ristoranti e alloggi — curati tra le isole e il continente.',
    startCta: 'Entra',
    startHint: (n) => `${n} città · in italiano`,
    otherLang: 'altre lingue',
    stayHere: 'resta qui',
    statCities: 'città',
    statLanguages: 'lingue',
    statVerified: 'solo verificati',
  },
};

export default async function RootPage() {
  const h = await headers();
  const suggested: Locale = localeFromAcceptLanguage(h.get('accept-language'));
  const c = COPY[suggested];

  const cities = listCitiesWithHero();
  const stats = siteStats();
  const heroBackdrop = cities.find((x) => x.heroPhotoUrl)?.heroPhotoUrl ?? null;

  return (
    <>
      {/* Organization + WebSite + SearchAction — once on the doorway. */}
      <script
        type="application/ld+json"
        {...jsonLdProps([organizationJsonLd(), websiteJsonLd(suggested)])}
      />

      <LocaleAutoRedirect suggested={suggested} />

      <main className="relative isolate h-[100svh] w-full overflow-hidden bg-[var(--color-bg-0)]">
        {/* ──────────────── BACKDROP LAYERS ──────────────── */}
        {heroBackdrop && (
          <Image
            src={heroBackdrop}
            alt=""
            fill
            sizes="100vw"
            priority
            className="object-cover opacity-50"
          />
        )}
        {process.env.NEXT_PUBLIC_HERO_YOUTUBE_ID && (
          <HeroVideoBg videoId={process.env.NEXT_PUBLIC_HERO_YOUTUBE_ID} />
        )}

        {/* Heavy multi-stop darken so the type always reads */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(7,7,11,0.35)_0%,rgba(7,7,11,0.85)_55%,rgba(7,7,11,1)_100%)]"
        />

        {/* Holo grid floor */}
        <div aria-hidden className="cn-grid" />

        {/* Aurora blobs — slow drift, soft + saturated */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="cn-aurora-a absolute left-[8%] top-[12%] h-[34rem] w-[34rem] rounded-full bg-[var(--color-accent-pink)]/25 blur-[130px]" />
          <div className="cn-aurora-b absolute right-[6%] top-[20%] h-[30rem] w-[30rem] rounded-full bg-[var(--color-accent-violet)]/22 blur-[130px]" />
          <div className="cn-aurora-c absolute left-1/2 bottom-[-8%] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[var(--color-accent-cyan)]/20 blur-[120px]" />
        </div>

        {/* Slow scan line */}
        <div
          aria-hidden
          className="cn-scan pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-accent-cyan)]/70 to-transparent"
        />

        {/* Film grain */}
        <div aria-hidden className="cn-grain" />

        {/* HUD corner brackets */}
        <span aria-hidden className="cn-corner tl" />
        <span aria-hidden className="cn-corner tr" />
        <span aria-hidden className="cn-corner bl" />
        <span aria-hidden className="cn-corner br" />

        {/* ──────────────── HUD TOP STRIP ──────────────── */}
        <header className="absolute inset-x-0 top-0 z-20 px-6 pt-6 sm:px-10">
          <div className="mx-auto flex max-w-6xl items-center justify-between text-[10px] uppercase tracking-[0.32em] text-[var(--color-fg-2)]">
            <p className="cn-tab">
              <span className="text-[var(--color-fg-0)]">CITYNIGHT</span>
              <span className="mx-2 text-[var(--color-fg-3)]">//</span>
              <span>GR · v1</span>
            </p>
            <p className="hidden cn-tab sm:block">
              38.04°N · 23.72°E
              <span className="mx-2 text-[var(--color-fg-3)]">//</span>
              {new Date().getUTCFullYear()}
            </p>
          </div>
        </header>

        {/* ──────────────── CENTER STACK ──────────────── */}
        <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col items-center justify-center px-6 text-center">
          {/* Kicker */}
          <p className="inline-flex items-center gap-2.5 rounded-full border border-[var(--color-bg-3)] bg-[var(--color-bg-1)]/40 px-3.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.3em] text-[var(--color-fg-1)] backdrop-blur-md">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-accent-pink)] opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-accent-pink)]" />
            </span>
            {c.kicker}
          </p>

          {/* Headline */}
          <h1 className="mt-7 font-display font-semibold leading-[0.9] tracking-[-0.03em] text-[clamp(3rem,11vw,9rem)]">
            <span className="block text-[var(--color-fg-0)]">{c.title}</span>
            <span
              className="block bg-gradient-to-br from-[var(--color-accent-pink)] via-[var(--color-accent-violet)] to-[var(--color-accent-cyan)] bg-clip-text text-transparent"
              style={{ WebkitBackgroundClip: 'text' }}
            >
              {c.titleAccent}.
            </span>
          </h1>

          {/* Sub */}
          <p className="mt-7 max-w-xl text-balance text-base text-[var(--color-fg-1)] sm:text-lg">
            {c.sub}
          </p>

          {/* CTA */}
          <div className="mt-10 flex flex-col items-center gap-4">
            {/* Outer aurora ring with rotating gradient + glow */}
            <Link
              href={`/${suggested}`}
              aria-label={`${c.startCta} — ${LOCALE_LABELS[suggested]}`}
              className="group relative inline-flex"
            >
              {/* Gradient border via padding trick */}
              <span
                aria-hidden
                className="absolute -inset-[1.5px] rounded-full bg-[conic-gradient(from_140deg,var(--color-accent-pink),var(--color-accent-violet),var(--color-accent-cyan),var(--color-accent-pink))] opacity-90 blur-[0.5px] transition group-hover:opacity-100"
              />
              {/* Outer glow */}
              <span
                aria-hidden
                className="absolute -inset-6 -z-10 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,45,149,0.55),transparent_60%)] opacity-70 blur-2xl transition group-hover:opacity-100"
              />
              {/* Inner button face */}
              <span className="relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-[var(--color-bg-0)] px-10 py-5 text-base font-semibold uppercase tracking-[0.18em] text-[var(--color-fg-0)] transition group-hover:bg-[var(--color-bg-1)] sm:text-lg">
                {/* Inner subtle radial tint */}
                <span
                  aria-hidden
                  className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,45,149,0.18),transparent_60%)]"
                />
                {/* Shimmer sweep */}
                <span
                  aria-hidden
                  className="cn-shimmer pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                />
                <span className="relative">{c.startCta}</span>
                <span
                  aria-hidden
                  className="relative ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent-pink)] to-[var(--color-accent-violet)] text-[var(--color-bg-0)] transition group-hover:translate-x-1"
                >
                  →
                </span>
              </span>
            </Link>

            <p className="cn-tab text-[10px] uppercase tracking-[0.32em] text-[var(--color-fg-2)]">
              {c.startHint(stats.cities)}
            </p>
          </div>

          {/* Stats strip — thin HUD style */}
          <div className="mt-12 flex items-center gap-6 text-[10px] uppercase tracking-[0.3em] text-[var(--color-fg-2)] sm:gap-10">
            <Stat n={stats.cities} label={c.statCities} />
            <Divider />
            <Stat n={stats.locales} label={c.statLanguages} />
            <Divider />
            <Stat label={c.statVerified} mark />
          </div>

          {/* Language picker */}
          <nav
            aria-label="Languages"
            className="mt-12 flex flex-wrap items-center justify-center gap-1.5"
          >
            <span className="mr-2 text-[10px] uppercase tracking-[0.32em] text-[var(--color-fg-3)]">
              {c.otherLang}
            </span>
            {LOCALES.filter((l) => l !== suggested).map((l) => (
              <Link
                key={l}
                href={`/${l}`}
                hrefLang={l}
                className="rounded-full border border-[var(--color-bg-3)] bg-[var(--color-bg-1)]/50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-[var(--color-fg-1)] backdrop-blur-md transition hover:border-[var(--color-accent-cyan)]/60 hover:text-[var(--color-accent-cyan)]"
              >
                {LOCALE_LABELS[l]}
              </Link>
            ))}
            <span className="mx-1 text-[var(--color-fg-3)]">·</span>
            <StayHereLink label={c.stayHere} />
          </nav>
        </div>

        {/* ──────────────── HUD BOTTOM STRIP ──────────────── */}
        <footer className="absolute inset-x-0 bottom-0 z-20 px-6 pb-6 sm:px-10">
          <div className="mx-auto flex max-w-6xl items-center justify-between text-[10px] uppercase tracking-[0.32em] text-[var(--color-fg-3)]">
            <p>© citynight.gr</p>
            <p className="hidden sm:block">
              <span className="text-[var(--color-fg-2)]">AUTH</span>
              <span className="mx-2 text-[var(--color-fg-3)]">·</span>
              <span className="text-[var(--color-fg-2)]">{LOCALE_LABELS[suggested]}</span>
              <span className="mx-2 text-[var(--color-fg-3)]">·</span>
              <span className="inline-flex items-center gap-1.5 text-[var(--color-accent-cyan)]">
                <span className="inline-block h-1 w-1 rounded-full bg-[var(--color-accent-cyan)]" />
                ONLINE
              </span>
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}

function Stat({ n, label, mark = false }: { n?: number; label: string; mark?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      {typeof n === 'number' ? (
        <span className="cn-tab font-display text-xl font-semibold tracking-tight text-[var(--color-fg-0)] sm:text-2xl">
          {n}
        </span>
      ) : (
        <span
          aria-hidden
          className={`mb-1 inline-flex h-2 w-2 rounded-full ${mark ? 'bg-[var(--color-success)]' : 'bg-[var(--color-fg-2)]'}`}
        />
      )}
      <span className="mt-1">{label}</span>
    </div>
  );
}

function Divider() {
  return <span aria-hidden className="h-6 w-px bg-[var(--color-bg-3)]" />;
}
