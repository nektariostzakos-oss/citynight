'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/lib/i18n';
import { CloseIcon, MenuIcon, MoonIcon, ForkKnifeIcon, BedIcon, MapPinIcon, StoreIcon } from './nav-icons';
import { SearchBox } from './search-box';

// App-feel slide-in drawer. Trigger is a hamburger that opens a full-screen
// glassmorphic overlay. Big tappable rows + icons + integrated search +
// language picker. Locks body scroll while open.

export function MobileMenu({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] text-[var(--color-fg-0)] transition hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)] md:hidden"
      >
        <MenuIcon />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true">
          {/* backdrop */}
          <div
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[var(--color-bg-0)]/70 backdrop-blur-md"
            aria-hidden
          />
          {/* panel */}
          <div className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-[var(--color-bg-1)] shadow-2xl">
            {/* header row */}
            <div className="flex items-center justify-between border-b border-[var(--color-bg-2)] px-5 py-4">
              <Link
                href={`/${locale}`}
                onClick={() => setOpen(false)}
                className="font-display text-lg font-semibold"
              >
                <span className="text-[var(--color-fg-0)]">city</span>
                <span className="text-[var(--color-accent-pink)]">night</span>
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-bg-3)] text-[var(--color-fg-0)] hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)]"
              >
                <CloseIcon />
              </button>
            </div>

            {/* search */}
            <div className="border-b border-[var(--color-bg-2)] px-5 py-4">
              <SearchBox locale={locale} />
            </div>

            {/* main nav rows */}
            <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-3 py-4">
              <Row href={`/${locale}/greece`} onClick={() => setOpen(false)} icon={<MapPinIcon className="h-5 w-5" />} accent="cyan">
                Cities
              </Row>
              <Row href={`/${locale}/greece?kind=nightlife`} onClick={() => setOpen(false)} icon={<MoonIcon className="h-5 w-5" />} accent="pink">
                Nightlife
              </Row>
              <Row href={`/${locale}/greece?kind=food`} onClick={() => setOpen(false)} icon={<ForkKnifeIcon className="h-5 w-5" />} accent="cyan">
                Food
              </Row>
              <Row href={`/${locale}/greece?kind=stay`} onClick={() => setOpen(false)} icon={<BedIcon className="h-5 w-5" />} accent="violet">
                Stay
              </Row>
              <div className="my-3 h-px bg-[var(--color-bg-2)]" />
              <Row href={`/${locale}/guides`} onClick={() => setOpen(false)} icon={<StoreIcon className="h-5 w-5" />} accent="cyan">
                Guides
              </Row>
              <Row href={`/${locale}/for-owners`} onClick={() => setOpen(false)} icon={<StoreIcon className="h-5 w-5" />} accent="pink">
                For owners
              </Row>
            </nav>

            {/* language picker */}
            <div className="border-t border-[var(--color-bg-2)] px-5 py-4">
              <p className="text-[10px] uppercase tracking-widest text-[var(--color-fg-2)]">Language</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {LOCALES.map((l) => (
                  <Link
                    key={l}
                    href={`/${l}`}
                    onClick={() => setOpen(false)}
                    hrefLang={l}
                    className={
                      l === locale
                        ? 'rounded-full bg-[var(--color-accent-cyan)] px-3 py-1.5 text-xs font-semibold text-[var(--color-bg-0)]'
                        : 'rounded-full border border-[var(--color-bg-3)] px-3 py-1.5 text-xs font-semibold text-[var(--color-fg-1)] hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)]'
                    }
                  >
                    {LOCALE_LABELS[l]}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Row({
  href,
  onClick,
  icon,
  accent,
  children,
}: {
  href: string;
  onClick: () => void;
  icon: React.ReactNode;
  accent: 'pink' | 'cyan' | 'violet';
  children: React.ReactNode;
}) {
  const accentClass = accent === 'pink'
    ? 'group-hover:text-[var(--color-accent-pink)]'
    : accent === 'violet'
      ? 'group-hover:text-[var(--color-accent-violet)]'
      : 'group-hover:text-[var(--color-accent-cyan)]';
  const dotClass = accent === 'pink'
    ? 'bg-[var(--color-accent-pink)]'
    : accent === 'violet'
      ? 'bg-[var(--color-accent-violet)]'
      : 'bg-[var(--color-accent-cyan)]';

  return (
    <Link
      href={href}
      onClick={onClick}
      className="group flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-base font-semibold text-[var(--color-fg-0)] transition hover:bg-[var(--color-bg-2)]"
    >
      <span className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-bg-2)] text-[var(--color-fg-1)] transition ${accentClass}`}>
          {icon}
        </span>
        <span>{children}</span>
      </span>
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full opacity-0 transition group-hover:opacity-100 ${dotClass}`} />
    </Link>
  );
}
