// Public blog listing for a site.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getPublishedSiteByCityAndSlug } from '@/lib/site-queries';
import { publicMetadata } from '@/lib/seo';
import { isLocale } from '@/lib/i18n';
import { listPublishedPosts } from '@/lib/blog/posts';

export const revalidate = 600;

type Params = Promise<{ locale: string; city: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, city, slug } = await params;
  if (!isLocale(locale)) return {};
  const site = getPublishedSiteByCityAndSlug(city, slug);
  if (!site) return {};
  return publicMetadata({
    locale, paths: { [locale]: `/${locale}/cities/${city}/${slug}/blog` },
    title: `Journal — ${site.name}`,
    description: `Latest posts from ${site.name}.`,
  });
}

export default async function SiteBlogIndex({ params }: { params: Params }) {
  const { locale, city, slug } = await params;
  if (!isLocale(locale)) notFound();
  const site = getPublishedSiteByCityAndSlug(city, slug);
  if (!site) notFound();

  const posts = listPublishedPosts(site.id);

  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-10">
        <p className="site-eyebrow">{site.city ?? ''}</p>
        <h1 className="site-h1 mt-3">Journal</h1>
      </header>

      {posts.length === 0 ? (
        <p className="site-body">No posts yet.</p>
      ) : (
        <ul className="space-y-6">
          {posts.map((p) => (
            <li key={p.id} className="site-panel p-5">
              <Link href={`/${locale}/cities/${city}/${slug}/blog/${p.slug}`} className="block">
                {p.category && (
                  <span className="site-eyebrow">{p.category}</span>
                )}
                <h2 className="site-display mt-2 text-2xl font-semibold" style={{ color: 'var(--site-fg)' }}>
                  {p.title}
                </h2>
                {p.excerpt && <p className="mt-2 site-body text-sm">{p.excerpt}</p>}
                {p.publishedAt && (
                  <p className="mt-3 text-xs" style={{ color: 'var(--site-muted)' }}>
                    {new Date(p.publishedAt * 1000).toLocaleDateString(locale)}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
