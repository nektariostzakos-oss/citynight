import { notFound } from 'next/navigation';
import Link from 'next/link';
import fs from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import { isLocale, LOCALES, type Locale } from '@/lib/i18n';
import { publicMetadata } from '@/lib/seo';

export const revalidate = 86400;

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
  const paths: Partial<Record<Locale, string>> = {};
  for (const l of LOCALES) paths[l] = `/${l}/guides`;
  return publicMetadata({
    locale,
    paths,
    title: 'Guides — citynight',
    description: 'Editorial guides to Greek nightlife, food and stay.',
  });
}

export default async function GuidesIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  // Fall back to English guides if the locale doesn't have any yet.
  const guides = listGuides(locale).length ? listGuides(locale) : listGuides('en');

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">Guides</h1>
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
