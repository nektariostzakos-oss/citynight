import Link from 'next/link';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import {
  LOCALES, LOCALE_LABELS, DEFAULT_LOCALE,
  localeFromAcceptLanguage, type Locale,
} from '@/lib/i18n';
import { siteStats } from '@/lib/queries';
import { LocaleAutoRedirect, StayHereLink } from '@/components/locale-auto-redirect';
import { HeroVideoBg } from '@/components/hero-video-bg';
import { NightDialLive } from '@/components/instrument/night-dial-live';
import { athensClock, caps, hhmm, minutesFromISO, nightReading } from '@/components/instrument/night';
import { getCityWeather } from '@/lib/weather';
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
  title: 'citynight: Greece nightlife, food & stay guide',
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
  readoutSunset: string;
  readoutSunrise: string;
  readoutNight: string;
  dialLabel: string;
};

const COPY: Record<Locale, Copy> = {
  en: {
    kicker: 'Greece · go out · eat · stay',
    title: 'Where Greece',
    titleAccent: 'comes alive',
    sub: 'Nightlife, restaurants and stays: curated across the islands and the mainland.',
    startCta: 'Enter',
    startHint: (n) => `${n} cities · in English`,
    otherLang: 'other languages',
    stayHere: 'stay on this page',
    statCities: 'cities',
    statLanguages: 'languages',
    statVerified: 'verified only',
    readoutSunset: 'Sunset',
    readoutSunrise: 'Sunrise',
    readoutNight: 'Night',
    dialLabel: 'The night over Athens. Sunset at',
  },
  el: {
    kicker: 'Ελλάδα · έξοδος · φαγητό · διαμονή',
    title: 'Όπου η Ελλάδα',
    titleAccent: 'ζει',
    sub: 'Νυχτερινή ζωή, εστιατόρια και διαμονή: επιμελημένα σε νησιά και ηπειρωτική.',
    startCta: 'Είσοδος',
    startHint: (n) => `${n} πόλεις · στα Ελληνικά`,
    otherLang: 'άλλες γλώσσες',
    stayHere: 'μείνε εδώ',
    statCities: 'πόλεις',
    statLanguages: 'γλώσσες',
    statVerified: 'επιβεβαιωμένα',
    readoutSunset: 'Δύση',
    readoutSunrise: 'Ανατολή',
    readoutNight: 'Η νύχτα',
    dialLabel: 'Η νύχτα πάνω από την Αθήνα. Δύση στις',
  },
  de: {
    kicker: 'Griechenland · Nightlife · Essen · Stay',
    title: 'Wo Griechenland',
    titleAccent: 'lebt',
    sub: 'Nightlife, Restaurants und Hotels: kuratiert auf Inseln und Festland.',
    startCta: 'Eintreten',
    startHint: (n) => `${n} Städte · auf Deutsch`,
    otherLang: 'andere Sprachen',
    stayHere: 'hier bleiben',
    statCities: 'Städte',
    statLanguages: 'Sprachen',
    statVerified: 'nur verifiziert',
    readoutSunset: 'Untergang',
    readoutSunrise: 'Aufgang',
    readoutNight: 'Nacht',
    dialLabel: 'Die Nacht über Athen. Sonnenuntergang um',
  },
  fr: {
    kicker: 'Grèce · sortir · manger · dormir',
    title: 'Là où la Grèce',
    titleAccent: 'vit',
    sub: 'Vie nocturne, restaurants et hébergement: curés à travers les îles et le continent.',
    startCta: 'Entrer',
    startHint: (n) => `${n} villes · en français`,
    otherLang: 'autres langues',
    stayHere: 'rester ici',
    statCities: 'villes',
    statLanguages: 'langues',
    statVerified: 'vérifiés',
    readoutSunset: 'Coucher',
    readoutSunrise: 'Lever',
    readoutNight: 'Nuit',
    dialLabel: 'La nuit sur Athènes. Coucher à',
  },
  it: {
    kicker: 'Grecia · uscire · mangiare · dormire',
    title: 'Dove la Grecia',
    titleAccent: 'vive',
    sub: 'Vita notturna, ristoranti e alloggi: curati tra le isole e il continente.',
    startCta: 'Entra',
    startHint: (n) => `${n} città · in italiano`,
    otherLang: 'altre lingue',
    stayHere: 'resta qui',
    statCities: 'città',
    statLanguages: 'lingue',
    statVerified: 'solo verificati',
    readoutSunset: 'Tramonto',
    readoutSunrise: 'Alba',
    readoutNight: 'Notte',
    dialLabel: 'La notte su Atene. Tramonto alle',
  },
};

export default async function RootPage() {
  const h = await headers();
  const suggested: Locale = localeFromAcceptLanguage(h.get('accept-language'));
  const c = COPY[suggested];

  const stats = siteStats();
  // The same sun the rest of the site reads, so the doorway dial and the home
  // page never disagree. Cached 15 minutes in-process.
  const athens = await getCityWeather(37.9838, 23.7275);
  const now = new Date();
  const clock = athensClock(now);
  const set = minutesFromISO(athens?.sunsetIso);
  const rise = minutesFromISO(athens?.sunriseIso);
  const night = set != null && rise != null ? nightReading(clock.min, set, rise) : null;

  return (
    <>
      {/* Organization + WebSite + SearchAction — once on the doorway. */}
      <script
        type="application/ld+json"
        {...jsonLdProps([organizationJsonLd(), websiteJsonLd(suggested)])}
      />

      <LocaleAutoRedirect suggested={suggested} />

      <main className="relative isolate flex min-h-[100svh] w-full flex-col bg-[var(--color-ground)]">
        {/* The owner can set a night video behind the doorway. It stays behind
            one flat scrim: no glass, no grain, no aurora. */}
        {process.env.NEXT_PUBLIC_HERO_YOUTUBE_ID && (
          <>
            <HeroVideoBg videoId={process.env.NEXT_PUBLIC_HERO_YOUTUBE_ID} />
            <div aria-hidden className="absolute inset-0 bg-[var(--color-ground)]/80" />
          </>
        )}

        <div className="relative z-10 mx-auto flex w-full max-w-[1180px] flex-1 flex-col justify-center gap-7 px-5 py-14 md:px-8">
          <p className="cn-readout text-[var(--color-muted)]">{caps(c.kicker)}</p>

          <h1 className="font-display text-[clamp(2.5rem,9vw,5.6rem)] font-semibold leading-none tracking-[-0.03em]">
            {c.title} {c.titleAccent}.
          </h1>

          <p className="max-w-[52ch] text-[1.0625rem] leading-relaxed text-[var(--color-muted)] md:text-[1.25rem]">
            {c.sub}
          </p>

          {/* The instrument, from the first screen: the night over Athens. */}
          <div className="flex flex-wrap items-center gap-6">
            <NightDialLive
              now={now}
              sunsetISO={athens?.sunsetIso ?? undefined}
              sunriseISO={athens?.sunriseIso ?? undefined}
              size="m"
              sub="{time}"
              label={`${c.dialLabel} ${set != null ? hhmm(set) : ''}`}
            />
            <dl className="grid gap-3">
              <Reading label={caps(c.readoutSunset)} value={set != null ? hhmm(set) : '—'} />
              <Reading label={caps(c.readoutSunrise)} value={rise != null ? hhmm(rise) : '—'} />
              <Reading
                label={caps(c.readoutNight)}
                value={night ? (night.night ? `${night.pct}%` : '—') : '—'}
              />
            </dl>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href={`/${suggested}`}
              aria-label={`${c.startCta}: ${LOCALE_LABELS[suggested]}`}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-bronze)] px-[22px] font-semibold text-[var(--color-on-bronze)] transition-transform duration-[var(--motion-fast)] active:scale-[0.98]"
            >
              {c.startCta}
            </Link>
            <p className="cn-readout text-[var(--color-muted)]">{caps(c.startHint(stats.cities))}</p>
          </div>

          <nav aria-label="Languages" className="flex flex-wrap items-center gap-2">
            <span className="cn-readout cn-readout-s uppercase text-[var(--color-muted)]">{c.otherLang}</span>
            {LOCALES.filter((l) => l !== suggested).map((l) => (
              <Link
                key={l}
                href={`/${l}`}
                hrefLang={l}
                className="inline-flex min-h-11 items-center rounded-full border border-[var(--color-hair)] px-4 text-[15px] text-[var(--color-ink)] transition-colors duration-[var(--motion-fast)] hover:text-[var(--color-bronze)]"
              >
                {LOCALE_LABELS[l]}
              </Link>
            ))}
            <StayHereLink label={c.stayHere} />
          </nav>
        </div>

        <footer className="relative z-10 mx-auto w-full max-w-[1180px] px-5 pb-6 md:px-8">
          <p className="cn-readout cn-readout-s uppercase text-[var(--color-muted)]">© citynight.gr</p>
        </footer>
      </main>
    </>
  );
}

function Reading({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="cn-readout cn-readout-s text-[var(--color-muted)]">{label}</dt>
      <dd className="cn-readout cn-readout-l mt-0.5 text-[var(--color-ink)]">{value}</dd>
    </div>
  );
}
