import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublishedSiteByCityAndSlug } from '@/lib/site-queries';
import { publicMetadata } from '@/lib/seo';
import { isLocale } from '@/lib/i18n';
import { listEnabledProducts } from '@/lib/shop';
import { ShopFlow } from '@/components/shop-flow';

export const revalidate = 1800;

type Params = Promise<{ locale: string; city: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, city, slug } = await params;
  if (!isLocale(locale)) return {};
  const site = getPublishedSiteByCityAndSlug(city, slug);
  if (!site) return {};
  return publicMetadata({
    locale, paths: { [locale]: `/${locale}/cities/${city}/${slug}/shop` },
    title: `Shop — ${site.name}`,
    description: `Shop at ${site.name}${site.city ? `, ${site.city}` : ''}.`,
  });
}

export default async function SiteShopPage({ params }: { params: Params }) {
  const { locale, city, slug } = await params;
  if (!isLocale(locale)) notFound();
  const site = getPublishedSiteByCityAndSlug(city, slug);
  if (!site) notFound();

  const products = listEnabledProducts(site.id).map((p) => ({
    id: p.id, slug: p.slug, name: p.name,
    category: p.category, shortDesc: p.shortDesc, longDesc: p.longDesc,
    priceCents: p.priceCents, currency: p.currency,
    imageUrl: p.imageUrl, stock: p.stock, featured: p.featured,
  }));

  if (products.length === 0) {
    // Sites without a shop catalogue 404 — the nav doesn't surface /shop
    // for them anyway, but a direct URL should fail cleanly.
    notFound();
  }

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null;

  return (
    <article className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-10">
        <p className="site-eyebrow">{site.city ?? ''}</p>
        <h1 className="site-h1 mt-3">Shop at {site.name}</h1>
      </header>
      <ShopFlow
        siteId={site.id}
        siteName={site.name}
        initialProducts={products}
        locale={locale}
        publishableKey={publishableKey}
      />
    </article>
  );
}
