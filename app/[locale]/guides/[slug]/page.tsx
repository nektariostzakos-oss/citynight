import { notFound } from 'next/navigation';
import fs from 'node:fs';
import path from 'node:path';
import { isLocale, LOCALES, type Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import {
  publicMetadata, jsonLdProps,
  articleJsonLd, breadcrumbJsonLd, faqJsonLd,
} from '@/lib/seo';
import { AdSlot } from '@/components/ad-slot';

export const revalidate = 86400;

type Guide = {
  title: string;
  description: string | null;
  body: string;
  /** mtime of the source MDX — used as dateModified for JSON-LD. */
  mtime: Date;
  /** Heading: 'What you'll learn' style FAQ block extracted from the body. */
  faqs: { q: string; a: string }[];
};

// Lightweight FAQ extractor: collects `## Question?` / `### Question?` blocks
// followed by 1+ paragraphs. Anything else stays in the rendered body.
function extractFaqs(body: string): { q: string; a: string }[] {
  const lines = body.split(/\r?\n/);
  const out: { q: string; a: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const m = /^(##|###)\s+(.+\?)\s*$/.exec(line);
    if (!m) continue;
    const q = m[2]!.trim();
    // Collect paragraphs until the next heading or end.
    const buf: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j] ?? '';
      if (/^#/.test(next)) break;
      buf.push(next);
    }
    const a = buf.join('\n').trim();
    if (a) out.push({ q, a });
  }
  return out;
}

function readGuide(locale: Locale, slug: string): Guide | null {
  const candidates = [
    path.join(process.cwd(), 'content', 'guides', locale, `${slug}.mdx`),
    path.join(process.cwd(), 'content', 'guides', 'en', `${slug}.mdx`),
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    const raw = fs.readFileSync(p, 'utf8');
    const m = /^---\s*([\s\S]*?)---\s*([\s\S]*)$/.exec(raw);
    if (!m?.[1] || !m[2]) continue;
    const front = m[1];
    const body = m[2].trim();
    const titleLine = /title:\s*(.+)/.exec(front);
    const descLine = /description:\s*(.+)/.exec(front);
    const stat = fs.statSync(p);
    return {
      title: titleLine?.[1] ? titleLine[1].trim() : slug,
      description: descLine?.[1] ? descLine[1].trim() : null,
      body,
      mtime: stat.mtime,
      faqs: extractFaqs(body),
    };
  }
  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const guide = readGuide(locale, slug);
  if (!guide) return {};
  const paths: Partial<Record<Locale, string>> = {};
  for (const l of LOCALES) paths[l] = `/${l}/guides/${slug}`;
  return publicMetadata({
    locale,
    paths,
    title: guide.title,
    description: guide.description ?? guide.body.replace(/\s+/g, ' ').slice(0, 160),
    ogType: 'article',
  });
}

export default async function GuidePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const guide = readGuide(locale, slug);
  if (!guide) notFound();

  const guidePath = `/${locale}/guides/${slug}`;
  const homeLabel: Record<Locale, string> = { en: 'Home', el: 'Αρχική', de: 'Start', fr: 'Accueil', it: 'Home' };
  const guidesLabel: Record<Locale, string> = { en: 'Guides', el: 'Οδηγοί', de: 'Guides', fr: 'Guides', it: 'Guide' };

  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-12">
      {/* JSON-LD: Article + Breadcrumb + (FAQPage only if the MDX has ## Q? blocks) */}
      <script
        type="application/ld+json"
        {...jsonLdProps([
          articleJsonLd({
            locale,
            path: guidePath,
            headline: guide.title,
            description: guide.description,
            datePublished: guide.mtime,
            dateModified: guide.mtime,
          }),
          breadcrumbJsonLd([
            { name: homeLabel[locale], path: `/${locale}` },
            { name: guidesLabel[locale], path: `/${locale}/guides` },
            { name: guide.title, path: guidePath },
          ]),
          faqJsonLd(guide.faqs),
        ])}
      />

      <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">{guide.title}</h1>
      <div className="prose prose-invert mt-8 max-w-none text-[var(--color-fg-1)]">
        {guide.body.split(/\n\n+/).map((para, i) => (
          <p key={i} className="mb-4 leading-relaxed">{para}</p>
        ))}
      </div>
      <div className="mt-10">
        <AdSlot id={`guide-${slug}`} scope="section" />
      </div>
    </article>
  );
}
