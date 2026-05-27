import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublishedSiteBySlug, getSiteMenu, type SiteMenuSection } from '@/lib/site-queries';
import { publicMetadata, jsonLdProps } from '@/lib/seo';
import { isLocale } from '@/lib/i18n';

export const revalidate = 1800;

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const site = getPublishedSiteBySlug(slug);
  if (!site) return {};
  return publicMetadata({
    locale, paths: { [locale]: `/${locale}/sites/${slug}/menu` },
    title: `Menu — ${site.name}`,
    description: `${site.name}${site.city ? `, ${site.city}` : ''}.`,
  });
}

export default async function SiteMenuPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const site = getPublishedSiteBySlug(slug);
  if (!site) notFound();
  const sections = getSiteMenu(site.id);
  if (!sections.length) notFound();

  return (
    <article className="mx-auto max-w-5xl px-6 py-16">
      <script type="application/ld+json" {...jsonLdProps([menuJsonLd(site.name, sections)])} />
      <header className="mb-12">
        <p className="site-eyebrow">{site.city ?? ''}</p>
        <h1 className="site-h1 mt-3">Menu</h1>
      </header>
      <div className="grid gap-12 md:grid-cols-[1fr_2.2fr]">
        <aside className="md:sticky md:top-24 md:self-start">
          <ol className="space-y-2 text-sm">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${anchorFor(s)}`} className="site-link">
                  {s.name}
                  <span className="ml-2" style={{ color: 'var(--site-muted-2)' }}>{s.items.length}</span>
                </a>
              </li>
            ))}
          </ol>
        </aside>
        <div className="space-y-16">
          {sections.map((s) => (
            <section key={s.id} id={anchorFor(s)}>
              <h2 className="site-h2">{s.name}</h2>
              {s.description && <p className="site-body mt-2 max-w-prose text-sm">{s.description}</p>}
              <ul className="mt-6 divide-y" style={{ borderColor: 'var(--site-border)' }}>
                {s.items.map((it) => {
                  const flags: string[] = [];
                  if (it.isPopular) flags.push('Popular');
                  if (it.isVegan) flags.push('Vegan'); else if (it.isVegetarian) flags.push('Vegetarian');
                  if (it.isGlutenFree) flags.push('Gluten-free');
                  return (
                    <li key={it.id} className="flex items-start gap-6 py-5">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <h3 className="site-display text-base font-semibold" style={{ color: 'var(--site-fg)' }}>{it.name}</h3>
                          {flags.length > 0 && (
                            <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--site-primary)' }}>
                              {flags.join(' · ')}
                            </span>
                          )}
                        </div>
                        {it.description && <p className="mt-1 text-sm site-body">{it.description}</p>}
                      </div>
                      {it.price && <span className="site-stat shrink-0 text-sm" style={{ color: 'var(--site-fg)' }}>{it.price}</span>}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}

function anchorFor(s: SiteMenuSection) { return `s-${s.id.slice(0, 8)}`; }
function menuJsonLd(name: string, sections: SiteMenuSection[]) {
  return {
    '@context': 'https://schema.org', '@type': 'Menu', name: `${name} menu`,
    hasMenuSection: sections.map((s) => ({
      '@type': 'MenuSection', name: s.name,
      ...(s.description ? { description: s.description } : {}),
      hasMenuItem: s.items.map((i) => ({
        '@type': 'MenuItem', name: i.name,
        ...(i.description ? { description: i.description } : {}),
        ...(i.price ? { offers: { '@type': 'Offer', price: i.price, priceCurrency: 'EUR' } } : {}),
      })),
    })),
  };
}
