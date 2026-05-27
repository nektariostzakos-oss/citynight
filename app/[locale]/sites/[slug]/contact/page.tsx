import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublishedSiteBySlug } from '@/lib/site-queries';
import { publicMetadata } from '@/lib/seo';
import { SiteContactForm } from '@/components/site-render/site-contact-form';
import { isLocale } from '@/lib/i18n';

export const revalidate = 1800;
type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const site = getPublishedSiteBySlug(slug);
  if (!site) return {};
  return publicMetadata({
    locale, paths: { [locale]: `/${locale}/sites/${slug}/contact` },
    title: `Contact — ${site.name}`,
    description: `Get in touch with ${site.name}${site.city ? `, ${site.city}` : ''}.`,
  });
}

export default async function SiteContactPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const site = getPublishedSiteBySlug(slug);
  if (!site) notFound();

  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-10">
        <p className="site-eyebrow">{site.city ?? ''}</p>
        <h1 className="site-h1 mt-3">Contact</h1>
      </header>
      <div className="mb-12 grid gap-6 site-body">
        {site.address && (
          <div>
            <p className="site-eyebrow">Address</p>
            <p className="mt-2 whitespace-pre-line" style={{ color: 'var(--site-fg)' }}>{site.address}</p>
          </div>
        )}
        {site.phone && (
          <div>
            <p className="site-eyebrow">Phone</p>
            <p className="mt-2"><a href={`tel:${site.phone.replace(/\s/g, '')}`} className="site-link">{site.phone}</a></p>
          </div>
        )}
        {site.contactEmail && (
          <div>
            <p className="site-eyebrow">Email</p>
            <p className="mt-2"><a href={`mailto:${site.contactEmail}`} className="site-link">{site.contactEmail}</a></p>
          </div>
        )}
      </div>
      <SiteContactForm siteId={site.id} siteName={site.name} kind="contact" />
    </article>
  );
}
