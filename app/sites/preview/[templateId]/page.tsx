// Public personalised preview — anyone can see what their site would look
// like before signing up. Reads ?name= and ?city= from the query string,
// renders the template's hero + a demo menu/about/gallery with the user's
// name substituted. Sticky CTA at the bottom: "Get yours →" links to the
// signup wizard with the same query string carried over.

import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Fraunces, Inter } from 'next/font/google';
import type { Metadata } from 'next';
import { siteStyleVars, themeForTemplate } from '@/lib/site-theme';

const fraunces = Fraunces({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-site-display' });
const inter = Inter({ subsets: ['latin', 'latin-ext', 'greek'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-site-body' });

const TEMPLATES: Record<string, { defaults: { name: string; city: string; tagline: string }; preview: 'restaurant' | 'bar' }> = {
  restaurant: {
    defaults: { name: 'Your restaurant', city: 'Naxos Town', tagline: 'An island taverna, the modern way.' },
    preview: 'restaurant',
  },
  bar: {
    defaults: { name: 'Your bar', city: 'Athens', tagline: 'Cocktails, music, late nights.' },
    preview: 'bar',
  },
};

type Params = Promise<{ templateId: string }>;
type Search = Promise<{ name?: string; city?: string }>;

export const revalidate = false; // query-string driven; never cache

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { templateId } = await params;
  const cfg = TEMPLATES[templateId];
  if (!cfg) return {};
  return {
    title: `Preview · ${cfg.preview} template — citynight`,
    description: 'A live preview of the citynight SaaS website template.',
    robots: { index: false, follow: true },
  };
}

export default async function PreviewPage({
  params, searchParams,
}: {
  params: Params; searchParams: Search;
}) {
  const { templateId } = await params;
  const sp = await searchParams;
  const cfg = TEMPLATES[templateId];
  if (!cfg) notFound();

  const name = (sp.name?.trim() || cfg.defaults.name).slice(0, 120);
  const city = (sp.city?.trim() || cfg.defaults.city).slice(0, 80);
  const tagline = cfg.defaults.tagline;
  const theme = themeForTemplate(cfg.preview);

  // Synthetic demo menu — illustrative, not editable. Customer gets a
  // proper editor after signup.
  const menuItems = templateId === 'bar'
    ? [
        { name: 'Loutraki Spritz',  desc: 'Greek bitters, frizzante, grapefruit oil.',         price: '€11', popular: true },
        { name: 'Negroni · aged',   desc: 'Six weeks in an ex-Mavrodaphne cask.',              price: '€12', popular: true },
        { name: 'Mastiha Sour',     desc: 'Mastiha, lemon, orange-blossom water.',             price: '€11', popular: false },
        { name: 'Cortado after dark', desc: 'Single espresso, scalded milk, cocoa rim.',       price: '€6',  popular: false },
      ]
    : [
        { name: 'Whipped feta',     desc: 'Naxian feta, tomatoes, oregano oil, sourdough.',   price: '€8',  popular: true },
        { name: 'Charred octopus',  desc: 'Slow-braised, finished over coals. Lemon, capers.', price: '€14', popular: true },
        { name: 'Lemon-roast lamb', desc: 'Four hours, covered. With lemon and garlic.',      price: '€26', popular: true },
        { name: 'Honey-walnut tart', desc: 'Thyme honey, kourabies crumb.',                   price: '€8',  popular: false },
      ];
  const heroImage = templateId === 'bar'
    ? 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=1400&q=70'
    : 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1400&q=70';
  const galleryImages = templateId === 'bar'
    ? [
        'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=900&q=70',
        'https://images.unsplash.com/photo-1525268771113-32d9e9021a97?w=900&q=70',
        'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=900&q=70',
        'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=900&q=70',
      ]
    : [
        'https://images.unsplash.com/photo-1432139509613-5c4255815697?w=900&q=70',
        'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=900&q=70',
        'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=900&q=70',
        'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=900&q=70',
      ];

  const signupHref = `/el/sites/new?plan=monthly${sp.name ? `&name=${encodeURIComponent(sp.name)}` : ''}${sp.city ? `&city=${encodeURIComponent(sp.city)}` : ''}`;

  return (
    <div
      className={`site-root flex min-h-screen flex-col ${fraunces.variable} ${inter.variable}`}
      style={{ ...siteStyleVars(cfg.preview) }}
    >
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-md"
        style={{ borderColor: 'var(--site-border)', background: 'color-mix(in oklab, var(--site-bg) 78%, transparent)' }}
      >
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <span className="site-display text-lg font-semibold tracking-tight" style={{ color: 'var(--site-fg)' }}>
            {name.toUpperCase().slice(0, 20)}
          </span>
          <span className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.22em]" style={{ borderColor: theme.tokens.borderStrong, border: '1px solid', color: 'var(--site-muted)' }}>
            Preview · not live
          </span>
          <Link href={signupHref} className="site-cta">Get yours</Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl gap-10 px-6 pt-10 pb-16 md:grid-cols-[1.15fr_1fr] md:gap-16 md:pt-20">
          <div className="flex flex-col justify-center">
            <p className="site-eyebrow">{city}</p>
            <h1 className="site-h1 mt-3">{name}</h1>
            <p className="site-body mt-5 max-w-md text-lg">{tagline}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={signupHref} className="site-cta">Reserve a table</Link>
              <a href="#menu" className="site-cta-ghost">See menu</a>
            </div>
          </div>
          <div>
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl md:aspect-[4/5]">
              <Image src={heroImage} alt={name} fill priority sizes="(min-width:1024px) 560px, 100vw" className="object-cover" />
            </div>
          </div>
        </section>

        <section id="menu" className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex items-baseline justify-between gap-6">
            <div>
              <p className="site-eyebrow">From the menu</p>
              <h2 className="site-h2 mt-2">A few of our favourites.</h2>
            </div>
          </div>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2">
            {menuItems.map((it) => (
              <li key={it.name} className="site-panel flex items-start justify-between gap-4 p-5">
                <div>
                  <p className="site-display text-base font-semibold" style={{ color: 'var(--site-fg)' }}>{it.name}</p>
                  <p className="mt-1 text-sm site-body">{it.desc}</p>
                  {it.popular && (
                    <p className="mt-2 text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--site-primary)' }}>Popular</p>
                  )}
                </div>
                <span className="site-stat shrink-0 text-sm" style={{ color: 'var(--site-fg)' }}>{it.price}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <p className="site-eyebrow">Inside</p>
          <h2 className="site-h2 mt-2">Where good evenings happen.</h2>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {galleryImages.map((src, i) => (
              <li key={src} className="relative aspect-[4/5] overflow-hidden rounded-xl">
                <Image src={src} alt={name} fill sizes="(min-width:1024px) 25vw, 50vw" loading={i < 2 ? 'eager' : 'lazy'} className="object-cover" />
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-20 text-center">
          <p className="site-eyebrow">Get this site for {name}</p>
          <h2 className="site-h2 mt-3">€19/month. Live in 60 seconds.</h2>
          <p className="site-body mx-auto mt-5 max-w-xl">
            Hosting, SSL, custom domain — all included. Edit anything from a dashboard.
            Cancel anytime.
          </p>
          <Link href={signupHref} className="site-cta mt-8">Get yours →</Link>
        </section>
      </main>

      <footer className="border-t mt-8" style={{ borderColor: 'var(--site-border)' }}>
        <div className="mx-auto max-w-6xl px-6 py-8 text-xs" style={{ color: 'var(--site-muted-2)' }}>
          <p>Preview only — this site isn&apos;t live yet. <Link href={signupHref} className="site-link">Subscribe to publish it →</Link></p>
        </div>
      </footer>
    </div>
  );
}
