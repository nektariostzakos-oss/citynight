// Dashboard root — lists the owner's SaaS sites (Phase H). The old
// per-venue dashboard was deleted; this page links straight into
// /[locale]/dashboard/sites/{siteId} for each site the user owns.

import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/db';
import { privateMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = privateMetadata({ title: 'Dashboard — citynight' });

const COPY: Record<Locale, {
  heading: string;
  newSite: string;
  empty: string;
  emptyCta: string;
  free: string;
  paidDomain: string;
}> = {
  el: { heading: 'Τα websites σου', newSite: '+ νέο website', empty: 'Δεν έχεις ακόμα κανένα site. Δημιούργησέ το δωρεάν.', emptyCta: 'Φτιάξε website', free: 'Δωρεάν', paidDomain: 'Custom domain' },
  en: { heading: 'Your websites',  newSite: '+ new website', empty: "You haven't built any sites yet. The first one is free.", emptyCta: 'Build a site', free: 'Free', paidDomain: 'Custom domain' },
  de: { heading: 'Deine Websites', newSite: '+ neue Website', empty: 'Noch keine Sites. Die erste ist kostenlos.', emptyCta: 'Site erstellen', free: 'Kostenlos', paidDomain: 'Eigene Domain' },
  fr: { heading: 'Vos sites',      newSite: '+ nouveau site', empty: 'Aucun site pour l\'instant. Le premier est gratuit.', emptyCta: 'Créer un site', free: 'Gratuit', paidDomain: 'Domaine perso' },
  it: { heading: 'I tuoi siti',    newSite: '+ nuovo sito',   empty: 'Nessun sito ancora. Il primo è gratis.', emptyCta: 'Crea un sito', free: 'Gratis', paidDomain: 'Dominio personalizzato' },
};

export default async function Dashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) redirect('/en/sign-in');
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/dashboard`)}`);

  const sites = db.$client.prepare(`
    SELECT id, name, slug, city, city_slug AS citySlug,
           saas_status AS saasStatus, status,
           custom_domain AS customDomain,
           stripe_subscription_id IS NOT NULL AS isPaidMonthly
      FROM sites
     WHERE owner_id = ?
     ORDER BY published_at DESC, created_at DESC
  `).all(user.id) as Array<{
    id: string; name: string; slug: string; city: string | null;
    citySlug: string | null; saasStatus: string; status: string;
    customDomain: string | null; isPaidMonthly: number;
  }>;

  const t = COPY[locale];

  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-12">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t.heading}</h1>
        <Link
          href={`/${locale}/sites/new`}
          className="text-sm text-[var(--color-accent-pink)] hover:underline"
        >
          {t.newSite}
        </Link>
      </div>

      {sites.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-[var(--color-bg-3)] p-8 text-center">
          <p className="text-[var(--color-fg-1)]">{t.empty}</p>
          <Link
            href={`/${locale}/sites/new`}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-[var(--color-accent-pink)] px-4 py-2 text-sm font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)]"
          >
            {t.emptyCta}
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {sites.map((s) => {
            const publicHref = s.citySlug ? `/${locale}/cities/${s.citySlug}/${s.slug}` : null;
            return (
              <li key={s.id}>
                <Link
                  href={`/${locale}/dashboard/sites/${s.id}`}
                  className="block rounded-lg border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] p-4 hover:border-[var(--color-accent-cyan)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-display text-lg font-semibold">{s.name}</p>
                      <p className="mt-0.5 text-xs text-[var(--color-fg-2)]">
                        {s.city ?? '—'} · {s.status} · {s.saasStatus}
                        {s.customDomain && ` · ${s.customDomain}`}
                      </p>
                    </div>
                    <span
                      className={
                        s.isPaidMonthly
                          ? 'shrink-0 rounded-full bg-[var(--color-accent-pink)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--color-bg-0)]'
                          : 'shrink-0 rounded-full border border-[var(--color-bg-3)] px-2 py-0.5 text-[10px] uppercase text-[var(--color-fg-2)]'
                      }
                    >
                      {s.isPaidMonthly ? t.paidDomain : t.free}
                    </span>
                  </div>
                  {publicHref && (
                    <p className="mt-2 truncate text-xs text-[var(--color-fg-3)]">
                      citynight.gr{publicHref}
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
