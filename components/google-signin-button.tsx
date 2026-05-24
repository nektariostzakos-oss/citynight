import Link from 'next/link';
import type { Locale } from '@/lib/i18n';

const COPY: Record<Locale, { cta: string; or: string }> = {
  en: { cta: 'Continue with Google', or: 'or' },
  el: { cta: 'Συνέχεια με Google', or: 'ή' },
  de: { cta: 'Mit Google fortfahren', or: 'oder' },
  fr: { cta: 'Continuer avec Google', or: 'ou' },
  it: { cta: 'Continua con Google', or: 'o' },
};

export function GoogleSignInButton({ locale, next }: { locale: Locale; next?: string }) {
  const c = COPY[locale];
  const href = next ? `/api/auth/google/start?next=${encodeURIComponent(next)}` : '/api/auth/google/start';
  return (
    <div className="space-y-3">
      <a
        href={href}
        className="flex w-full items-center justify-center gap-3 rounded-md border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-4 py-2.5 text-sm font-medium text-[var(--color-fg-0)] transition hover:border-[var(--color-fg-2)] hover:bg-[var(--color-bg-2)]"
      >
        <GoogleGlyph />
        <span>{c.cta}</span>
      </a>
      <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-[var(--color-fg-3)]">
        <span className="h-px flex-1 bg-[var(--color-bg-3)]" />
        {c.or}
        <span className="h-px flex-1 bg-[var(--color-bg-3)]" />
      </div>
    </div>
  );
}

function GoogleGlyph() {
  // Official Google "G" mark in brand colours. Inline SVG so it tints correctly
  // and there's no external request to google.com on every sign-in page render.
  return (
    <svg viewBox="0 0 18 18" className="h-4 w-4" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.34A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.96 10.71A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3-2.34z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .96 4.95l3 2.34A5.36 5.36 0 0 1 9 3.58z" />
    </svg>
  );
}
