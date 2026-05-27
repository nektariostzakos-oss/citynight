// New city discovery page — replaces the old /greece/{city} surface
// (Phase H3). Lists every SaaS site in this city. Visitors click into
// a site and they're on a full website, not a directory listing.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { isLocale, LOCALES, type Locale } from '@/lib/i18n';
import { getCityBySlugForDiscovery, listSitesInCity, countSitesInCity } from '@/lib/city-sites';
import { SiteCard } from '@/components/site-card';
import { publicMetadata } from '@/lib/seo';

export const revalidate = 3600;

const COPY: Record<Locale, {
  meta: (c: string) => string;
  metaDesc: (c: string, n: number) => string;
  heading: (c: string) => string;
  sub: (c: string, n: number) => string;
  noneYet: (c: string) => string;
  ownerCta: string;
  ownerCtaSub: string;
  ownerCtaLink: string;
}> = {
  el: {
    meta: (c) => `${c} — websites επιχειρήσεων στο citynight`,
    metaDesc: (c, n) => `Έτοιμα websites επιχειρήσεων στο ${c}. ${n} ενεργές παρουσιάσεις.`,
    heading: (c) => `Επιχειρήσεις στο ${c}`,
    sub: (c, n) => `${n} ${n === 1 ? 'website' : 'websites'} στο ${c}. Κάθε καρτέλα ανοίγει την πλήρη ιστοσελίδα.`,
    noneYet: (c) => `Δεν υπάρχουν ακόμα websites στο ${c}.`,
    ownerCta: 'Είσαι ιδιοκτήτης;',
    ownerCtaSub: 'Στήσε το δικό σου website σε 60 δευτερόλεπτα. Δωρεάν για πάντα. €19/μήνα μόνο αν θες δικό σου domain.',
    ownerCtaLink: 'Φτιάξε το δικό σου →',
  },
  en: {
    meta: (c) => `${c} — business websites on citynight`,
    metaDesc: (c, n) => `Ready-made business websites in ${c}. ${n} live presences.`,
    heading: (c) => `Businesses in ${c}`,
    sub: (c, n) => `${n} ${n === 1 ? 'website' : 'websites'} in ${c}. Each card opens the full site.`,
    noneYet: (c) => `No websites in ${c} yet.`,
    ownerCta: 'Own a business?',
    ownerCtaSub: 'Get your own website in 60 seconds. Free forever. €19/mo only if you bring your own domain.',
    ownerCtaLink: 'Make yours →',
  },
  de: {
    meta: (c) => `${c} — Geschäftswebsites auf citynight`,
    metaDesc: (c, n) => `Fertige Geschäfts-Websites in ${c}. ${n} aktive Auftritte.`,
    heading: (c) => `Geschäfte in ${c}`,
    sub: (c, n) => `${n} ${n === 1 ? 'Website' : 'Websites'} in ${c}.`,
    noneYet: (c) => `Noch keine Websites in ${c}.`,
    ownerCta: 'Inhaber?', ownerCtaSub: 'Eigene Website in 60 Sekunden. Kostenlos.', ownerCtaLink: 'Erstellen →',
  },
  fr: {
    meta: (c) => `${c} — sites d'entreprises sur citynight`,
    metaDesc: (c, n) => `Sites d'entreprises clés en main à ${c}. ${n} présences actives.`,
    heading: (c) => `Entreprises à ${c}`,
    sub: (c, n) => `${n} ${n === 1 ? 'site' : 'sites'} à ${c}.`,
    noneYet: (c) => `Aucun site à ${c} pour le moment.`,
    ownerCta: 'Propriétaire ?', ownerCtaSub: 'Votre site en 60 secondes. Gratuit.', ownerCtaLink: 'Créer →',
  },
  it: {
    meta: (c) => `${c} — siti aziendali su citynight`,
    metaDesc: (c, n) => `Siti aziendali pronti a ${c}. ${n} presenze attive.`,
    heading: (c) => `Attività a ${c}`,
    sub: (c, n) => `${n} ${n === 1 ? 'sito' : 'siti'} a ${c}.`,
    noneYet: (c) => `Nessun sito a ${c} ancora.`,
    ownerCta: 'Sei proprietario?', ownerCtaSub: 'Il tuo sito in 60 secondi. Gratis.', ownerCtaLink: 'Crea →',
  },
};

type Params = Promise<{ locale: string; city: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, city } = await params;
  if (!isLocale(locale)) return {};
  const cityRow = getCityBySlugForDiscovery(city);
  if (!cityRow) return {};
  const t = COPY[locale];
  const n = countSitesInCity(cityRow.slug, cityRow.name);
  const paths: Partial<Record<Locale, string>> = {};
  for (const l of LOCALES) paths[l] = `/${l}/cities/${city}`;
  return publicMetadata({
    locale, paths,
    title: t.meta(cityRow.name),
    description: t.metaDesc(cityRow.name, n).slice(0, 160),
  });
}

export default async function CityDiscoveryPage({ params }: { params: Params }) {
  const { locale, city } = await params;
  if (!isLocale(locale)) notFound();
  const cityRow = getCityBySlugForDiscovery(city);
  if (!cityRow) notFound();
  const sites = listSitesInCity(cityRow.slug, cityRow.name);
  const t = COPY[locale];

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 md:py-16">
      <header className="mb-12">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-fg-2)]">
          {cityRow.region ?? 'Greece'}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--color-fg-0)] md:text-5xl">
          {t.heading(cityRow.name)}
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-[var(--color-fg-1)]">
          {t.sub(cityRow.name, sites.length)}
        </p>
      </header>

      {sites.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--color-bg-3)] p-8 text-center text-[var(--color-fg-2)]">
          {t.noneYet(cityRow.name)}
        </p>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((s) => (
            <li key={s.id}><SiteCard site={s} locale={locale} citySlug={cityRow.slug} /></li>
          ))}
        </ul>
      )}

      <section className="mt-20 rounded-2xl border border-[var(--color-accent-pink)]/30 bg-[var(--color-bg-1)] p-8 text-center">
        <p className="font-display text-xl font-semibold text-[var(--color-fg-0)]">{t.ownerCta}</p>
        <p className="mx-auto mt-3 max-w-2xl text-[var(--color-fg-1)]">{t.ownerCtaSub}</p>
        <Link
          href={`/${locale}/sites`}
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-[var(--color-accent-pink)] px-5 py-2.5 text-sm font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)]"
        >
          {t.ownerCtaLink}
        </Link>
      </section>
    </main>
  );
}
