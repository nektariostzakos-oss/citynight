'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { Locale } from '@/lib/i18n';

type Labels = {
  dashboard: string;
  newSite: string;
  signOut: string;
  signingOut: string;
  admin: string;
};

const LABELS: Record<Locale, Labels> = {
  en: { dashboard: 'Dashboard', newSite: 'Make a site', signOut: 'Sign out',   signingOut: 'Signing out…', admin: 'Admin' },
  el: { dashboard: 'Dashboard', newSite: 'Νέο site',    signOut: 'Αποσύνδεση', signingOut: 'Αποσύνδεση…',  admin: 'Admin' },
  de: { dashboard: 'Dashboard', newSite: 'Neue Site',   signOut: 'Abmelden',   signingOut: 'Abmelden…',    admin: 'Admin' },
  fr: { dashboard: 'Dashboard', newSite: 'Nouveau site', signOut: 'Déconnexion', signingOut: 'Déconnexion…', admin: 'Admin' },
  it: { dashboard: 'Dashboard', newSite: 'Nuovo sito',  signOut: 'Esci',        signingOut: 'Disconnessione…', admin: 'Admin' },
};

export function AccountMenu({
  locale, email, name, role,
}: {
  locale: Locale;
  email: string;
  name: string | null;
  role: 'owner' | 'admin';
}) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const t = LABELS[locale];

  // Close on outside click and Escape — standard popover hygiene.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function onSignOut() {
    setSigningOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = `/${locale}`;
  }

  // Avatar: first letter of name, else first letter of email-local part.
  const avatar = (name?.[0] ?? email.split('@')[0]?.[0] ?? '?').toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] py-1 pl-1 pr-3 text-sm text-[var(--color-fg-1)] transition hover:border-[var(--color-accent-cyan)]"
      >
        <span
          aria-hidden
          className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-[var(--color-accent-pink)] to-[var(--color-accent-violet)] text-xs font-semibold text-[var(--color-bg-0)]"
        >
          {avatar}
        </span>
        <span className="hidden max-w-[140px] truncate sm:inline">
          {name ?? email.split('@')[0]}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 overflow-hidden rounded-xl border border-[var(--color-bg-2)] bg-[var(--color-bg-1)] shadow-2xl"
        >
          <div className="border-b border-[var(--color-bg-2)] px-4 py-3">
            <p className="truncate text-sm font-semibold text-[var(--color-fg-0)]">
              {name ?? email.split('@')[0]}
            </p>
            <p className="mt-0.5 truncate text-xs text-[var(--color-fg-2)]">{email}</p>
            {role === 'admin' && (
              <span className="mt-2 inline-block rounded-full bg-[var(--color-accent-pink)]/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-accent-pink)]">
                {t.admin}
              </span>
            )}
          </div>
          <nav className="flex flex-col py-1" role="none">
            <Link
              href={`/${locale}/dashboard`}
              role="menuitem"
              className="px-4 py-2 text-sm text-[var(--color-fg-1)] hover:bg-[var(--color-bg-2)] hover:text-[var(--color-fg-0)]"
              onClick={() => setOpen(false)}
            >
              {t.dashboard}
            </Link>
            <Link
              href={`/${locale}/sites/new`}
              role="menuitem"
              className="px-4 py-2 text-sm text-[var(--color-fg-1)] hover:bg-[var(--color-bg-2)] hover:text-[var(--color-fg-0)]"
              onClick={() => setOpen(false)}
            >
              {t.newSite}
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={onSignOut}
              disabled={signingOut}
              className="border-t border-[var(--color-bg-2)] px-4 py-2 text-left text-sm text-[var(--color-fg-1)] hover:bg-[var(--color-bg-2)] hover:text-[var(--color-fg-0)] disabled:opacity-60"
            >
              {signingOut ? t.signingOut : t.signOut}
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
