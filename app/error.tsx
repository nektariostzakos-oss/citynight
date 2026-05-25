'use client';

// Top-level error boundary. Catches uncaught errors in the App Router tree
// when the user is on a route OUTSIDE /[locale]/* (e.g. the root doorway).
// Locale-aware errors live in app/[locale]/error.tsx — that one knows the
// visitor's language.

import { useEffect } from 'react';
import Link from 'next/link';
import { DEFAULT_LOCALE } from '@/lib/i18n';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('citynight global error:', error);
  }, [error]);

  return (
    <main className="relative isolate min-h-[80svh] bg-[var(--color-bg-0)] text-[var(--color-fg-0)]">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[var(--color-danger)]/10 blur-[120px]" aria-hidden />
      <div className="mx-auto flex min-h-[80svh] max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--color-danger)]">500 · SERVER ERROR</p>
        <h1 className="font-display text-5xl font-semibold tracking-tight md:text-6xl">
          Something broke on our end.
        </h1>
        <p className="max-w-md text-[var(--color-fg-1)]">
          The error was logged. Try again in a moment, or head back to the guide.
        </p>
        {error.digest && (
          <p className="text-[10px] uppercase tracking-widest text-[var(--color-fg-3)]">ref · {error.digest}</p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full border border-[var(--color-bg-3)] px-6 py-3 text-sm font-semibold text-[var(--color-fg-1)] transition hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)]"
          >
            Try again
          </button>
          <Link
            href={`/${DEFAULT_LOCALE}`}
            className="rounded-full bg-[var(--color-accent-pink)] px-6 py-3 text-sm font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)] transition hover:brightness-110"
          >
            Back to citynight →
          </Link>
        </div>
      </div>
    </main>
  );
}
