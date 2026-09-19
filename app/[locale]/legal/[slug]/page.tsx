import { notFound } from 'next/navigation';
import fs from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import { isLocale, LOCALES, type Locale } from '@/lib/i18n';
import { publicMetadata } from '@/lib/seo';

type Params = Promise<{ locale: string; slug: string }>;

export const revalidate = 86400;

function readLegal(locale: Locale, slug: string) {
  const candidates = [
    path.join(process.cwd(), 'content', 'legal', locale, `${slug}.mdx`),
    path.join(process.cwd(), 'content', 'legal', 'en', `${slug}.mdx`),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf8');
      const m = /^---\s*([\s\S]*?)---\s*([\s\S]*)$/.exec(raw);
      if (!m?.[1] || !m[2]) continue;
      const titleLine = /title:\s*(.+)/.exec(m[1]);
      return { title: titleLine?.[1] ? titleLine[1].trim() : slug, body: m[2].trim() };
    }
  }
  return null;
}

// Its own title and canonical. Without them the layout's metadata applied and
// every legal page told Google it was the home page (found live 2026-09-19).
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const doc = readLegal(locale, slug);
  if (!doc) return {};
  const paths: Partial<Record<Locale, string>> = {};
  for (const l of LOCALES) paths[l] = `/${l}/legal/${slug}`;
  return publicMetadata({
    locale,
    paths,
    title: doc.title,
    description: doc.body.replace(/[#*_>`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 160),
  });
}

export default async function LegalPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const doc = readLegal(locale, slug);
  if (!doc) notFound();

  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{doc.title}</h1>
      <div className="mt-8 space-y-4 text-[var(--color-muted)]">
        {doc.body.split(/\n\n+/).map((para, i) => (
          <p key={i} className="leading-relaxed">{para}</p>
        ))}
      </div>
    </article>
  );
}
