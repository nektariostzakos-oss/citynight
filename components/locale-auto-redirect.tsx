'use client';

import { useEffect, useState } from 'react';
import { LOCALE_LABELS, type Locale } from '@/lib/i18n';

// Visible top-of-page countdown banner. Tells the visitor in their own language
// that we'll send them to /{locale} in N seconds, with a "Stay here" escape.
//
// Cookie-remembered: if they pick "Stay here" we set cn_stay_root for 30 days
// and never auto-redirect them again from this device.
//
// SEO note (§10): the redirect is client-side post-hydration; crawlers without
// JS see the full root page with hreflang and never get bounced.

const COOKIE = 'cn_stay_root';
const COOKIE_MAX_AGE_DAYS = 30;
const DEFAULT_DELAY_MS = 8000;

type Copy = { redirecting: string; in: string; sec: string; goNow: string; stay: string };

const COPY: Record<Locale, Copy> = {
  en: { redirecting: 'Taking you to',             in: 'in',   sec: 's', goNow: 'Go now',     stay: 'Stay here' },
  el: { redirecting: 'Σε μεταφέρουμε στα',         in: 'σε',   sec: 'δ', goNow: 'Πάμε τώρα',  stay: 'Μείνε εδώ' },
  de: { redirecting: 'Weiterleitung nach',         in: 'in',   sec: 's', goNow: 'Jetzt los',  stay: 'Hier bleiben' },
  fr: { redirecting: 'Redirection vers',           in: 'dans', sec: 's', goNow: 'Y aller',    stay: 'Rester ici' },
  it: { redirecting: 'Ti portiamo alla versione',  in: 'tra',  sec: 's', goNow: 'Vai ora',    stay: 'Resta qui' },
};

function hasStayCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').some((c) => c.startsWith(`${COOKIE}=`));
}

function setStayCookie() {
  if (typeof document === 'undefined') return;
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${COOKIE}=1; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function LocaleAutoRedirect({
  suggested,
  delayMs = DEFAULT_DELAY_MS,
}: {
  suggested: Locale;
  delayMs?: number;
}) {
  const [secondsLeft, setSecondsLeft] = useState(Math.round(delayMs / 1000));
  const [canceled, setCanceled] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (hasStayCookie()) return;
    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled || canceled) return;
    if (secondsLeft <= 0) {
      window.location.href = `/${suggested}`;
      return;
    }
    const t = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [enabled, canceled, secondsLeft, suggested]);

  if (!enabled || canceled) return null;

  const t = COPY[suggested];
  const label = LOCALE_LABELS[suggested];

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-50 border-b border-[var(--color-accent-pink)]/40 bg-[var(--color-bg-0)]/90 backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-2.5 text-sm sm:flex-row">
        <div className="flex items-center gap-3 text-[var(--color-fg-1)]">
          {/* Big animated countdown number */}
          <span
            aria-hidden
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-accent-pink)] bg-[var(--color-bg-1)] font-display text-lg font-semibold text-[var(--color-accent-pink)]"
          >
            {secondsLeft}
            <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[var(--color-accent-pink)]/40" />
          </span>
          <p>
            {t.redirecting} <span className="font-semibold text-[var(--color-fg-0)]">{label}</span>{' '}
            <span className="text-[var(--color-fg-2)]">{t.in} {secondsLeft}{t.sec}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/${suggested}`}
            className="rounded-md bg-[var(--color-accent-pink)] px-3 py-1.5 text-xs font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)] hover:brightness-110"
          >
            {t.goNow} →
          </a>
          <button
            type="button"
            onClick={() => { setCanceled(true); setStayCookie(); }}
            className="rounded-md border border-[var(--color-bg-3)] px-3 py-1.5 text-xs font-semibold text-[var(--color-fg-1)] hover:border-[var(--color-fg-1)]"
          >
            {t.stay}
          </button>
        </div>
      </div>
    </div>
  );
}

// Kept for the hero's secondary picker — sets the cookie + soft reload.
export function StayHereLink({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
        document.cookie = `${COOKIE}=1; path=/; max-age=${maxAge}; SameSite=Lax`;
        window.location.reload();
      }}
      className="text-xs text-[var(--color-fg-3)] underline-offset-4 hover:text-[var(--color-fg-1)] hover:underline"
    >
      {label}
    </button>
  );
}
