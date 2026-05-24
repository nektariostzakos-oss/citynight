'use client';

import { useEffect, useState } from 'react';

// Theme toggle. The no-flash inline script in app/layout.tsx has already set
// the correct `theme-light` class + colorScheme on <html> before paint, so
// this component just needs to read the current value once and write changes
// back to localStorage when the user clicks.

type Theme = 'light' | 'dark';

function readCurrent(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.classList.contains('theme-light') ? 'light' : 'dark';
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(readCurrent());
    setMounted(true);
  }, []);

  function flip() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    const root = document.documentElement;
    if (next === 'light') root.classList.add('theme-light');
    else root.classList.remove('theme-light');
    root.style.colorScheme = next;
    try { localStorage.setItem('cn:theme', next); } catch { /* private mode etc. */ }
    setTheme(next);
  }

  // Render a placeholder with matched dimensions until mounted so layout
  // doesn't shift, but skip the icon swap to avoid a hydration mismatch.
  return (
    <button
      type="button"
      onClick={flip}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-bg-3)] bg-[var(--color-bg-1)]/60 text-[var(--color-fg-2)] backdrop-blur transition hover:border-[var(--color-accent-amber)] hover:text-[var(--color-accent-amber)]"
    >
      {!mounted ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden />
      ) : theme === 'dark' ? (
        // Sun — currently dark, click for light
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2" />
          <path d="M12 19v2" />
          <path d="M3 12h2" />
          <path d="M19 12h2" />
          <path d="m5.6 5.6 1.4 1.4" />
          <path d="m17 17 1.4 1.4" />
          <path d="m5.6 18.4 1.4-1.4" />
          <path d="m17 7 1.4-1.4" />
        </svg>
      ) : (
        // Moon — currently light, click for dark
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 13.5A8.5 8.5 0 1 1 10.5 3a7 7 0 0 0 10.5 10.5Z" />
        </svg>
      )}
    </button>
  );
}
