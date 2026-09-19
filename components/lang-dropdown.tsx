'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/lib/i18n';

// Compact language switcher — shows ONLY the visitor's current locale as a
// readout; the other four hide in a dropdown that opens on click. Closes on
// outside-click, ESC, or any other locale being chosen. The code itself is a
// reading, so it is set in Lilex with the readout tracking.

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
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[var(--color-hair)] px-3 cn-readout text-[var(--color-ink)] transition-colors duration-[var(--motion-fast)] hover:text-[var(--color-bronze)]"
      >
        <span>{current.toUpperCase()}</span>
        <svg
          viewBox="0 0 24 24"
          className={`h-3 w-3 transition-transform duration-[var(--motion-fast)] ${open ? 'rotate-180' : ''}`}
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
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-48 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-hair)] bg-[var(--color-surface)] py-1"
        >
          {others.map((l) => (
            <li key={l} role="option" aria-selected={false}>
              <Link
                href={`/${l}`}
                hrefLang={l}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center justify-between px-3 text-[15px] text-[var(--color-ink)] transition-colors duration-[var(--motion-fast)] hover:text-[var(--color-bronze)]"
              >
                <span>{LOCALE_LABELS[l]}</span>
                <span className="cn-readout cn-readout-s uppercase text-[var(--color-muted)]">{l}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
