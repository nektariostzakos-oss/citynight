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
      className="fixed inset-x-0 top-0 z-50 border-b border-[var(--color-hair)] bg-[var(--color-ground)]"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-2.5 text-sm sm:flex-row">
        <div className="flex items-center gap-3 text-[var(--color-muted)]">
          {/* Big animated countdown number */}
          <span
            aria-hidden
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-bronze)] bg-[var(--color-surface)] font-display text-lg font-semibold text-[var(--color-bronze)]"
          >
            {secondsLeft}
          </span>
          <p>
            {t.redirecting} <span className="font-semibold text-[var(--color-ink)]">{label}</span>{' '}
            <span className="text-[var(--color-muted)]">{t.in} {secondsLeft}{t.sec}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/${suggested}`}
            className="inline-flex min-h-11 items-center rounded-full bg-[var(--color-bronze)] px-4 text-[15px] font-semibold text-[var(--color-on-bronze)] transition-transform duration-[var(--motion-fast)] active:scale-[0.98]"
          >
            {t.goNow} →
          </a>
          <button
            type="button"
            onClick={() => { setCanceled(true); setStayCookie(); }}
            className="rounded-[var(--radius-sm)] border border-[var(--color-hair)] px-3 py-1.5 text-xs font-semibold text-[var(--color-muted)] hover:border-[var(--color-muted)]"
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
      className="text-xs text-[var(--color-muted)] underline-offset-4 hover:text-[var(--color-muted)] hover:underline"
    >
      {label}
    </button>
  );
}
