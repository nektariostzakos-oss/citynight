import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { Metadata } from 'next';
import { getPublishedSiteBySlug, getSitePhotos } from '@/lib/site-queries';
import { publicMetadata } from '@/lib/seo';
import { isLocale } from '@/lib/i18n';

export const revalidate = 1800;
type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const site = getPublishedSiteBySlug(slug);
  if (!site) return {};
  return publicMetadata({
    locale, paths: { [locale]: `/${locale}/sites/${slug}/gallery` },
    title: `Gallery — ${site.name}`,
    description: `Photos of ${site.name}${site.city ? `, ${site.city}` : ''}.`,
  });
}

export default async function SiteGalleryPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const site = getPublishedSiteBySlug(slug);
  if (!site) notFound();
  const photos = getSitePhotos(site.id);
  if (!photos.length) notFound();
  return (
    <article className="mx-auto max-w-6xl px-6 py-16">
      <header className="mb-10">
        <p className="site-eyebrow">{site.city ?? ''}</p>
        <h1 className="site-h1 mt-3">Gallery</h1>
      </header>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((p, i) => (
          <li key={p.id}>
            <figure className="relative aspect-[4/5] overflow-hidden rounded-xl">
              <Image src={p.url} alt={site.name} fill sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
                     priority={i === 0} loading={i < 4 ? 'eager' : 'lazy'} className="object-cover transition hover:scale-105" />
            </figure>
            {p.attribution && <figcaption className="mt-1 text-[10px]" style={{ color: 'var(--site-muted-2)' }}>Photo · {p.attribution}</figcaption>}
          </li>
        ))}
      </ul>
    </article>
  );
}
