import Link from 'next/link';

// Locale-aware 404. Next renders this for not-found segments inside
// /[locale]/* — we don't know which exact locale the visitor came from
// (the params aren't passed to not-found.tsx in App Router), so we offer
// the 5 supported locales as quick links + headline copy in EN as the
// safest "international" default.

const COPY = [
  { locale: 'en', kicker: '404 · Not found',            heading: "We can't find that page.",                  cta: 'Back to the guide' },
  { locale: 'el', kicker: '404 · Δεν βρέθηκε',          heading: 'Δεν βρίσκουμε αυτή τη σελίδα.',             cta: 'Πίσω στον οδηγό' },
  { locale: 'de', kicker: '404 · Nicht gefunden',       heading: 'Diese Seite finden wir nicht.',              cta: 'Zurück zum Guide' },
  { locale: 'fr', kicker: '404 · Introuvable',          heading: "Nous ne trouvons pas cette page.",           cta: 'Retour au guide' },
  { locale: 'it', kicker: '404 · Non trovato',          heading: 'Non troviamo quella pagina.',                cta: 'Torna alla guida' },
] as const;

export default function LocaleNotFound() {
  // Headline / CTA in EN; the language quick-links beneath cover everyone else
  // (we can't read the [locale] param from this file).
  return (
    <main className="relative isolate">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[var(--color-accent-pink)]/8 blur-[120px]" aria-hidden />
      <div className="mx-auto flex min-h-[70svh] max-w-2xl flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--color-fg-3)]">{COPY[0].kicker}</p>
        <h1 className="font-display text-5xl font-semibold tracking-tight md:text-6xl">{COPY[0].heading}</h1>

        {/* 5-locale escape grid */}
        <ul className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {COPY.map((c) => (
            <li key={c.locale}>
              <Link
                href={`/${c.locale}`}
                hrefLang={c.locale}
                className="rounded-full border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-4 py-2 text-sm font-semibold text-[var(--color-fg-1)] transition hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)]"
              >
                {c.cta} <span className="ml-1.5 text-[10px] uppercase tracking-widest text-[var(--color-fg-3)]">{c.locale}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
