'use client';

// Theme control — three options, as the tokens file states them:
// Σκούρο (the default), Ανοιχτό, and Με τον ήλιο, which follows the real
// sunset and sunrise in Athens. The visitor's explicit choice always wins and
// is remembered.
//
// All the painting lives in the no-flash script in app/layout.tsx, which owns
// the storage key, the `theme-light` class and the sun crossing. This control
// only reads the current choice and calls back into it:
//
//   window.__cnTheme.get()        the stored choice
//   window.__cnTheme.resolve(c)   what that choice looks like right now
//   window.__cnTheme.apply(c)     store, paint, return the resolved theme
//
// Every call is guarded, so the control still switches dark and light if the
// script never ran (private mode, blocked inline scripts).

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Locale } from '@/lib/i18n';

type Choice = 'dark' | 'light' | 'sun';
type Resolved = 'dark' | 'light';

declare global {
  interface Window {
    __cnTheme?: {
      get(): Choice | null;
      resolve(choice: Choice): Resolved;
      apply(choice: Choice): Resolved;
    };
  }
}

const CHOICES: Choice[] = ['dark', 'light', 'sun'];

const LABELS: Record<Locale, { trigger: string; dark: string; light: string; sun: string }> = {
  el: { trigger: 'Θέμα', dark: 'Σκούρο', light: 'Ανοιχτό', sun: 'Με τον ήλιο' },
  en: { trigger: 'Theme', dark: 'Dark', light: 'Light', sun: 'Follow the sun' },
  de: { trigger: 'Thema', dark: 'Dunkel', light: 'Hell', sun: 'Der Sonne folgen' },
  fr: { trigger: 'Thème', dark: 'Sombre', light: 'Clair', sun: 'Suivre le soleil' },
  it: { trigger: 'Tema', dark: 'Scuro', light: 'Chiaro', sun: 'Segui il sole' },
};

function isChoice(value: string | null | undefined): value is Choice {
  return value === 'dark' || value === 'light' || value === 'sun';
}

function readChoice(): Choice {
  if (typeof document === 'undefined') return 'dark';
  const fromDom = document.documentElement.dataset.themeChoice;
  if (isChoice(fromDom)) return fromDom;
  const stored = typeof window.__cnTheme?.get === 'function' ? window.__cnTheme.get() : null;
  return isChoice(stored) ? stored : 'dark';
}

function readResolved(): Resolved {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.classList.contains('theme-light') ? 'light' : 'dark';
}

/** Last resort when the inline script is not there: paint it ourselves. */
function applyFallback(choice: Choice): Resolved {
  const root = document.documentElement;
  const resolved: Resolved = choice === 'sun' ? readResolved() : choice;
  root.classList.toggle('theme-light', resolved === 'light');
  root.style.colorScheme = resolved;
  root.dataset.themeChoice = choice;
  try { localStorage.setItem('cn:theme', choice); } catch { /* private mode */ }
  return resolved;
}

// The <html> element is the source of truth: the inline script writes the
// choice and the resolved palette on it, and the sun option repaints there on
// its own at sunrise and sunset. Subscribing to it keeps this control honest
// without polling and without a state write during hydration.
function subscribeToRoot(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme-choice'],
  });
  return () => observer.disconnect();
}
const rootSnapshot = () => `${readChoice()}|${readResolved()}`;
const serverSnapshot = () => 'dark|dark';

export function ThemeToggle({ locale = 'el' }: { locale?: Locale }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const t = LABELS[locale] ?? LABELS.el;

  const snapshot = useSyncExternalStore(subscribeToRoot, rootSnapshot, serverSnapshot);
  const [choicePart, resolvedPart] = snapshot.split('|');
  const choice: Choice = isChoice(choicePart) ? choicePart : 'dark';
  const resolved: Resolved = resolvedPart === 'light' ? 'light' : 'dark';

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function pick(next: Choice) {
    // The script paints and stores; the MutationObserver above turns that into
    // the next snapshot, so there is no local copy of the theme to drift.
    const apply = typeof window.__cnTheme?.apply === 'function' ? window.__cnTheme.apply : applyFallback;
    apply(next);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`${t.trigger}: ${t[choice]}`}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-hair)] text-[var(--color-muted)] transition-colors duration-[var(--motion-fast)] hover:text-[var(--color-ink)]"
      >
        <ChoiceIcon choice={choice} resolved={resolved} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t.trigger}
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-52 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-hair)] bg-[var(--color-surface)] py-1"
        >
          {CHOICES.map((c) => (
            <button
              key={c}
              type="button"
              role="menuitemradio"
              aria-checked={choice === c}
              onClick={() => pick(c)}
              className={`flex h-11 w-full items-center gap-3 px-3 text-left text-[15px] transition-colors duration-[var(--motion-fast)] ${
                choice === c ? 'text-[var(--color-bronze)]' : 'text-[var(--color-ink)] hover:text-[var(--color-bronze)]'
              }`}
            >
              <ChoiceIcon choice={c} resolved={resolved} />
              <span>{t[c]}</span>
              {choice === c && (
                <span className="ml-auto cn-readout cn-readout-s" aria-hidden>
                  ●
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChoiceIcon({ choice, resolved }: { choice: Choice; resolved: Resolved }) {
  const common = {
    viewBox: '0 0 24 24',
    width: 18,
    height: 18,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  if (choice === 'dark') {
    return (
      <svg {...common}>
        <path d="M20.5 13.8A8.5 8.5 0 1 1 10.2 3.5a7 7 0 0 0 10.3 10.3Z" />
      </svg>
    );
  }
  if (choice === 'light') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 3.4v2M12 18.6v2M3.4 12h2M18.6 12h2M5.9 5.9l1.4 1.4M16.7 16.7l1.4 1.4M5.9 18.1l1.4-1.4M16.7 7.3l1.4-1.4" />
      </svg>
    );
  }
  // With the sun: a horizon with the sun half above it, filled in while the
  // sun is up so the icon reads the same way the page does.
  return (
    <svg {...common}>
      <path d="M3.5 17.5h17" />
      <path d="M7.4 17.5a4.6 4.6 0 0 1 9.2 0" fill={resolved === 'light' ? 'currentColor' : 'none'} />
      <path d="M12 5v2.2M5.6 8.1l1.5 1.5M18.4 8.1l-1.5 1.5" />
    </svg>
  );
}
