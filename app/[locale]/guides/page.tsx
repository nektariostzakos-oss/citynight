import { notFound } from 'next/navigation';
import Link from 'next/link';
import fs from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import { isLocale, LOCALES, type Locale } from '@/lib/i18n';
import { publicMetadata } from '@/lib/seo';

export const revalidate = 86400;

const COPY: Record<Locale, { metaTitle: string; metaDesc: string; h1: string; sub: string }> = {
  en: {
    metaTitle: 'Editorial guides to Greek nightlife, food & stay',
    metaDesc: 'Long-form guides to Greek nightlife, restaurants and hotels — city scenes, neighborhoods, what to skip.',
    h1: 'Guides',
    sub: 'Long-form guides — city scenes, neighborhoods, the places worth going to and the ones you can skip.',
  },
  el: {
    metaTitle: 'Επιμελημένοι οδηγοί για νυχτερινή ζωή, φαγητό & διαμονή στην Ελλάδα',
    metaDesc: 'Αναλυτικοί οδηγοί για νυχτερινή ζωή, εστιατόρια και ξενοδοχεία στην Ελλάδα — σκηνές πόλεων, γειτονιές, τι να αποφύγεις.',
    h1: 'Οδηγοί',
    sub: 'Αναλυτικοί οδηγοί — σκηνές πόλεων, γειτονιές, μέρη που αξίζουν και όσα μπορείς να προσπεράσεις.',
  },
  de: {
    metaTitle: 'Redaktionelle Guides für Nightlife, Essen & Übernachten in Griechenland',
    metaDesc: 'Ausführliche Guides für Nachtleben, Restaurants und Hotels in Griechenland — Szenen, Viertel, was man auslassen kann.',
    h1: 'Guides',
    sub: 'Ausführliche Guides — Szenen, Viertel, die wichtigen Orte und die, die du dir sparen kannst.',
  },
  fr: {
    metaTitle: 'Guides éditoriaux pour la vie nocturne, la cuisine & l\'hébergement en Grèce',
    metaDesc: 'Guides longs pour la vie nocturne, les restaurants et les hôtels en Grèce — scènes, quartiers, ce qu\'on peut éviter.',
    h1: 'Guides',
    sub: 'Guides longs — scènes des villes, quartiers, les lieux à voir et ceux qu\'on peut zapper.',
  },
  it: {
    metaTitle: 'Guide editoriali alla vita notturna, cucina e alloggi in Grecia',
    metaDesc: 'Guide lunghe alla vita notturna, ristoranti e hotel in Grecia — scene, quartieri, cosa saltare.',
    h1: 'Guide',
    sub: 'Guide lunghe — scene delle città, quartieri, posti che vale la pena e quelli da saltare.',
  },
};

function listGuides(locale: Locale): { slug: string; title: string }[] {
  const dir = path.join(process.cwd(), 'content', 'guides', locale);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => {
      const content = fs.readFileSync(path.join(dir, f), 'utf8');
      const m = /^---\s*([\s\S]*?)---/.exec(content);
      const titleLine = m?.[1] ? /title:\s*(.+)/.exec(m[1]) : null;
      return { slug: f.replace(/\.mdx$/, ''), title: titleLine?.[1] ? titleLine[1].trim() : f };
    });
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const c = COPY[locale];
  const paths: Partial<Record<Locale, string>> = {};
  for (const l of LOCALES) paths[l] = `/${l}/guides`;
  return publicMetadata({
    locale,
    paths,
    title: c.metaTitle,
    description: c.metaDesc,
  });
}

export default async function GuidesIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const c = COPY[locale];
  // Fall back to English guides if the locale doesn't have any yet.
  const guides = listGuides(locale).length ? listGuides(locale) : listGuides('en');

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">{c.h1}</h1>
      <p className="mt-3 max-w-2xl text-[var(--color-fg-1)]">{c.sub}</p>
      <ul className="mt-8 space-y-3">
        {guides.map((g) => (
          <li key={g.slug}>
            <Link
              href={`/${locale}/guides/${g.slug}`}
              className="block rounded-lg border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] p-4 hover:border-[var(--color-accent-cyan)]"
            >
              <p className="font-display text-lg">{g.title}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
