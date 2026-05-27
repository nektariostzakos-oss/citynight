// SaaS site header — sticky, transparent-over-content, Atelier-style.
// Logo / wordmark on the left, nav in the middle, Reserve CTA on the right.

import Link from 'next/link';

type Props = {
  slug: string;
  /** Locale + city-prefixed base path, e.g. /el/cities/loutraki/el-nino.
   *  Falls back to /sites/{slug} for backward compatibility while the old
   *  routes still exist. */
  basePath?: string;
  name: string;
  wordmark: string | null;
  tagline: string | null;
  logoUrl: string | null;
  availability: { menu: boolean; about: boolean; gallery: boolean };
};

export function SiteHeader({ slug, basePath, name, wordmark, tagline, logoUrl, availability }: Props) {
  const base = basePath ?? `/sites/${slug}`;
  const NAV: { href: string; label: string; show: boolean }[] = [
    { href: `${base}/menu`,    label: 'Menu',    show: availability.menu },
    { href: `${base}/about`,   label: 'About',   show: availability.about },
    { href: `${base}/gallery`, label: 'Gallery', show: availability.gallery },
    { href: `${base}/contact`, label: 'Contact', show: true },
  ];
  const shown = NAV.filter((n) => n.show);

  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur-md"
      style={{
        borderColor: 'var(--site-border)',
        background: 'color-mix(in oklab, var(--site-bg) 78%, transparent)',
      }}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href={base} className="flex items-center gap-3 site-display text-lg font-semibold tracking-tight">
          {logoUrl ? (
            // Plain <img> — site logos are owner-uploaded SVG/small PNG; no
            // need to route through next/image for those.
            <img src={logoUrl} alt={name} className="h-7 w-auto" />
          ) : (
            <span className="leading-none" style={{ color: 'var(--site-fg)' }}>
              {(wordmark ?? name).toUpperCase()}
            </span>
          )}
          {tagline && (
            <span className="hidden text-[10px] uppercase tracking-[0.22em] sm:inline" style={{ color: 'var(--site-muted-2)' }}>
              · {tagline}
            </span>
          )}
        </Link>

        <nav className="hidden items-center gap-5 md:flex" aria-label="Primary">
          {shown.map((n) => (
            <Link key={n.href} href={n.href} className="site-nav-link">
              {n.label}
            </Link>
          ))}
        </nav>

        <Link href={`${base}/book`} className="site-cta">
          Reserve
        </Link>
      </div>
    </header>
  );
}
