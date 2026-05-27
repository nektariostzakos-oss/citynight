// Public blog post detail page.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getPublishedSiteBySlug } from '@/lib/site-queries';
import { publicMetadata, jsonLdProps } from '@/lib/seo';
import { isLocale } from '@/lib/i18n';
import { getPostBySlug } from '@/lib/blog/posts';

export const revalidate = 600;

type Params = Promise<{ locale: string; slug: string; postSlug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug, postSlug } = await params;
  if (!isLocale(locale)) return {};
  const site = getPublishedSiteBySlug(slug);
  if (!site) return {};
  const post = getPostBySlug(site.id, postSlug);
  if (!post) return {};
  return publicMetadata({
    locale, paths: { [locale]: `/${locale}/sites/${slug}/blog/${postSlug}` },
    title: `${post.title} — ${site.name}`,
    description: post.excerpt ?? `Read ${post.title} on the ${site.name} journal.`,
  });
}

export default async function SiteBlogPost({ params }: { params: Params }) {
  const { locale, slug, postSlug } = await params;
  if (!isLocale(locale)) notFound();
  const site = getPublishedSiteBySlug(slug);
  if (!site) notFound();
  const post = getPostBySlug(site.id, postSlug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <script type="application/ld+json" {...jsonLdProps([{
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        datePublished: post.publishedAt ? new Date(post.publishedAt * 1000).toISOString() : undefined,
        author: { '@type': 'Organization', name: site.name },
        image: post.coverUrl ?? undefined,
      }])} />

      <nav className="mb-6 text-sm">
        <Link href={`/${locale}/sites/${slug}/blog`} style={{ color: 'var(--site-muted)' }}>
          ← Journal
        </Link>
      </nav>

      <header className="mb-10">
        {post.category && <p className="site-eyebrow">{post.category}</p>}
        <h1 className="site-h1 mt-3">{post.title}</h1>
        {post.publishedAt && (
          <p className="mt-4 text-sm" style={{ color: 'var(--site-muted)' }}>
            {new Date(post.publishedAt * 1000).toLocaleDateString(locale)}
          </p>
        )}
      </header>

      {post.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.coverUrl} alt={post.title} className="mb-10 w-full rounded-lg" />
      )}

      {post.body && (
        // Body is owner-supplied markdown / HTML; current implementation
        // treats it as plain text with paragraph breaks preserved. When
        // we add a markdown renderer this becomes a proper render step.
        <div className="prose-site whitespace-pre-line site-body">
          {post.body}
        </div>
      )}
    </article>
  );
}
