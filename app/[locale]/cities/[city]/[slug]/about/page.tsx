import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublishedSiteByCityAndSlug } from '@/lib/site-queries';
import { publicMetadata } from '@/lib/seo';
import { isLocale } from '@/lib/i18n';

export const revalidate = 1800;

type Params = Promise<{ locale: string; city: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, city, slug } = await params;
  if (!isLocale(locale)) return {};
  const site = getPublishedSiteByCityAndSlug(city, slug);
  if (!site?.aboutText) return { robots: { index: false, follow: true } };
  return publicMetadata({
    locale, paths: { [locale]: `/${locale}/cities/${city}/${slug}/about` },
    title: `About — ${site.name}`,
    description: site.aboutText.slice(0, 160),
  });
}

export default async function SiteAboutPage({ params }: { params: Params }) {
  const { locale, city, slug } = await params;
  if (!isLocale(locale)) notFound();
  const site = getPublishedSiteByCityAndSlug(city, slug);
  if (!site?.aboutText) notFound();
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-10">
        <p className="site-eyebrow">{site.city ?? ''}</p>
        <h1 className="site-h1 mt-3">About</h1>
      </header>
      <div className="site-rule mb-10 w-24" />
      <div className="site-body whitespace-pre-line text-lg leading-relaxed">{site.aboutText}</div>
    </article>
  );
}
