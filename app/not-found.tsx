import Link from 'next/link';
import { DEFAULT_LOCALE } from '@/lib/i18n';

// Top-level (non-localized) 404. Hit when the URL has no /[locale]/ prefix
// — typical for old GoogleBot crawls of pre-launch paths or hand-typed
// URLs. We redirect cosmetically to the locale-prefixed home rather than
// 404-and-die.

export default function NotFound() {
  return (
    <main className="relative isolate min-h-[80svh] bg-[var(--color-bg-0)] text-[var(--color-fg-0)]">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[var(--color-accent-pink)]/8 blur-[120px]" aria-hidden />
      <div className="mx-auto flex min-h-[80svh] max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--color-fg-3)]">404 · NOT FOUND</p>
        <h1 className="font-display text-5xl font-semibold tracking-tight md:text-6xl">
          We can&apos;t find that page.
        </h1>
        <p className="max-w-md text-[var(--color-fg-1)]">
          The URL might be old or mistyped. Head back to the guide and we&apos;ll get you there.
        </p>
        <Link
          href={`/${DEFAULT_LOCALE}`}
          className="inline-flex rounded-full bg-[var(--color-accent-pink)] px-6 py-3 text-sm font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)] transition hover:brightness-110"
        >
          Back to citynight →
        </Link>
      </div>
    </main>
  );
}
