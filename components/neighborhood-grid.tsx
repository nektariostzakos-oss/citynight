import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import type { Neighborhood } from '@/content/cities';

export function NeighborhoodGrid({
  locale,
  citySlug,
  heading,
  neighborhoods,
}: {
  locale: Locale;
  citySlug: string;
  heading: string;
  neighborhoods: Neighborhood[];
}) {
  if (!neighborhoods.length) return null;
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-12">
      <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">{heading}</h2>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {neighborhoods.map((n) => (
          <li key={n.slug}>
            <Link
              href={`/${locale}/greece/${citySlug}/${n.slug}`}
              className="group block h-full rounded-lg border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] p-5 transition hover:border-[var(--color-accent-pink)] hover:bg-[var(--color-bg-2)]"
            >
              <p className="font-display text-lg font-semibold text-[var(--color-fg-0)]">{n.name[locale]}</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-fg-1)]">{n.blurb[locale]}</p>
              <p className="mt-3 text-xs text-[var(--color-accent-cyan)] opacity-0 transition group-hover:opacity-100">
                Explore →
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
