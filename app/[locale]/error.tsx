'use client';

// Locale-scoped error boundary. App Router gives us access to the locale
// via useParams (the segment is named [locale]). Falls back to EN if for
// some reason the param is missing (shouldn't happen).

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type C = { kicker: string; h1: string; sub: string; tryAgain: string; back: string };
const COPY: Record<string, C> = {
  en: { kicker: '500 · Server error', h1: 'Something broke on our end.', sub: 'The error was logged. Try again in a moment.',                  tryAgain: 'Try again',     back: 'Back to citynight' },
  el: { kicker: '500 · Σφάλμα',        h1: 'Κάτι έσπασε από τη μεριά μας.', sub: 'Το σφάλμα καταγράφηκε. Δοκίμασε ξανά σε λίγο.',                tryAgain: 'Δοκίμασε ξανά',  back: 'Πίσω στο citynight' },
  de: { kicker: '500 · Serverfehler',  h1: 'Bei uns ist etwas kaputtgegangen.', sub: 'Der Fehler wurde geloggt. Versuche es gleich erneut.',     tryAgain: 'Erneut versuchen', back: 'Zurück zu citynight' },
  fr: { kicker: '500 · Erreur serveur', h1: "Quelque chose a cassé chez nous.", sub: "L'erreur a été enregistrée. Réessayez dans un instant.", tryAgain: 'Réessayer',     back: 'Retour à citynight' },
  it: { kicker: '500 · Errore server',  h1: 'Qualcosa si è rotto da noi.',     sub: "L'errore è stato registrato. Riprova tra poco.",          tryAgain: 'Riprova',       back: 'Torna a citynight' },
};

export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const params = useParams();
  const localeParam = typeof params?.locale === 'string' && params.locale in COPY ? params.locale : 'en';
  const c = COPY[localeParam]!;

  useEffect(() => {
    console.error('citynight error:', error);
  }, [error]);

  return (
    <main className="relative isolate">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[var(--color-danger)]/10 blur-[120px]" aria-hidden />
      <div className="mx-auto flex min-h-[70svh] max-w-2xl flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--color-danger)]">{c.kicker}</p>
        <h1 className="font-display text-5xl font-semibold tracking-tight md:text-6xl">{c.h1}</h1>
        <p className="max-w-md text-[var(--color-fg-1)]">{c.sub}</p>
        {error.digest && (
          <p className="text-[10px] uppercase tracking-widest text-[var(--color-fg-3)]">ref · {error.digest}</p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full border border-[var(--color-bg-3)] px-6 py-3 text-sm font-semibold text-[var(--color-fg-1)] transition hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)]"
          >
            {c.tryAgain}
          </button>
          <Link
            href={`/${localeParam}`}
            className="rounded-full bg-[var(--color-accent-pink)] px-6 py-3 text-sm font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)] transition hover:brightness-110"
          >
            {c.back} →
          </Link>
        </div>
      </div>
    </main>
  );
}
