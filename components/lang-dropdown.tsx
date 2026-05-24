'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/lib/i18n';

// Compact language switcher — shows ONLY the visitor's current locale as a
// chip; the other four hide in a dropdown that opens on click. Closes on
// outside-click, ESC, or any other locale being chosen.

export function LangDropdown({ current }: { current: Locale }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const others = LOCALES.filter((l) => l !== current);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${LOCALE_LABELS[current]}. Click to change.`}
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-bg-3)] bg-[var(--color-bg-1)]/70 px-3 py-1.5 text-xs font-semibold text-[var(--color-fg-0)] backdrop-blur transition hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)]"
      >
        <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-accent-cyan)]" />
        <span>{current.toUpperCase()}</span>
        <svg
          viewBox="0 0 24 24"
          className={`h-3 w-3 transition ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-44 overflow-hidden rounded-lg border border-[var(--color-bg-3)] bg-[var(--color-bg-1)]/95 shadow-2xl backdrop-blur-xl"
        >
          {others.map((l) => (
            <li key={l} role="option" aria-selected={false}>
              <Link
                href={`/${l}`}
                hrefLang={l}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 text-sm text-[var(--color-fg-1)] transition hover:bg-[var(--color-bg-2)] hover:text-[var(--color-accent-cyan)]"
              >
                <span>{LOCALE_LABELS[l]}</span>
                <span className="text-[10px] uppercase tracking-widest text-[var(--color-fg-3)]">{l}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
