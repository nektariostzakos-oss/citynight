// SaaS site footer — slim, address + hours + contact + "powered by".
// Hours are stored as JSON (Atelier shape) — we render them client-side
// readable only when they parse cleanly.

import Link from 'next/link';

type DayRow = { day: string; open?: string; close?: string; closed?: boolean; open2?: string; close2?: string };

type Props = {
  slug: string;
  /** Locale + city-prefixed base path. Falls back to /sites/{slug}. */
  basePath?: string;
  name: string;
  wordmark: string | null;
  tagline: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  hours: string | null;
};

const DAY_LABEL: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
};

export function SiteFooter({ slug, basePath, name, wordmark, tagline, city, address, phone, email, hours }: Props) {
  const hoursParsed = safeParseHours(hours);
  const year = new Date().getFullYear();
  const base = basePath ?? `/sites/${slug}`;

  return (
    <footer className="border-t mt-20" style={{ borderColor: 'var(--site-border)' }}>
      <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link href={base} className="site-display text-2xl font-semibold tracking-tight">
              {(wordmark ?? name).toUpperCase()}
            </Link>
            {tagline && (
              <p className="mt-2 text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--site-muted-2)' }}>{tagline}</p>
            )}
            <p className="mt-4 max-w-md text-sm site-body">{name}{city ? ` · ${city}` : ''}.</p>
          </div>

          <div>
            <p className="site-eyebrow">Find us</p>
            <div className="mt-3 space-y-1 text-sm site-body">
              {address && <p className="whitespace-pre-line">{address}</p>}
              {phone && <p><a href={`tel:${phone.replace(/\s/g, '')}`} className="site-link">{phone}</a></p>}
              {email && <p><a href={`mailto:${email}`} className="site-link">{email}</a></p>}
            </div>
          </div>

          <div>
            <p className="site-eyebrow">Hours</p>
            <dl className="mt-3 grid grid-cols-1 gap-y-1 text-sm site-body site-stat">
              {hoursParsed.length === 0 ? (
                <p style={{ color: 'var(--site-muted-2)' }}>Hours coming soon.</p>
              ) : (
                hoursParsed.map((d) => (
                  <div key={d.day} className="flex items-baseline justify-between gap-3">
                    <dt style={{ color: 'var(--site-muted)' }}>{DAY_LABEL[d.day] ?? d.day}</dt>
                    <dd>
                      {d.closed
                        ? 'Closed'
                        : `${d.open}–${d.close}${d.open2 ? ` · ${d.open2}–${d.close2 ?? ''}` : ''}`}
                    </dd>
                  </div>
                ))
              )}
            </dl>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t pt-6 text-xs" style={{ borderColor: 'var(--site-border)', color: 'var(--site-muted-2)' }}>
          <p>© {year} {name}.</p>
          <p>
            Powered by{' '}
            <Link href="/" className="site-link">
              <span style={{ color: 'var(--site-fg)' }}>city</span>
              <span style={{ color: 'var(--site-primary)' }}>night</span>
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}

function safeParseHours(raw: string | null): DayRow[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((d): d is DayRow => d && typeof d.day === 'string');
    return [];
  } catch { return []; }
}
