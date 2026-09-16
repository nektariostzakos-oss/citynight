'use client';

// In-page table of contents for the guide. The list of H2 anchors is
// extracted server-side from the article's intro markdown and passed in
// as a prop — this component handles the scrollspy behavior + smooth
// scroll on click.
//
// Renders as a sticky sidebar on desktop (lg+), and a collapsible
// summary on mobile so it doesn't dominate small viewports.

import { useEffect, useState } from 'react';

export type TocItem = { id: string; label: string };

type Props = {
  items: TocItem[];
  label: string;
};

export function GuideToc({ items, label }: Props) {
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);

  // Track which H2 is currently in view. We use IntersectionObserver on the
  // actual headings (rendered by lib/article-md.tsx with the matching id).
  // The intersection ratio threshold is low (0.1) so a heading counts as
  // "active" as soon as it scrolls into the top quarter of the viewport.
  useEffect(() => {
    if (items.length === 0) return;
    const headings = items
      .map((it) => document.getElementById(it.id))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        // Pick the first visible entry whose top is closest to the viewport top.
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          // Most-up heading wins.
          const top = visible.reduce((best, e) => {
            const bestTop = best.target.getBoundingClientRect().top;
            const eTop = e.target.getBoundingClientRect().top;
            return eTop >= 0 && eTop < bestTop ? e : best;
          }, visible[0]!);
          setActiveId(top.target.id);
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: [0, 0.1, 1] },
    );
    headings.forEach((h) => obs.observe(h));
    return () => obs.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <>
      {/* Desktop: sticky sidebar */}
      <nav
        aria-label={label}
        className="hidden lg:block sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-4"
      >
        <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--color-fg-2)]">
          {label}
        </p>
        <ul className="space-y-2 text-sm">
          {items.map((it) => {
            const active = it.id === activeId;
            return (
              <li key={it.id}>
                <a
                  href={`#${it.id}`}
                  className={`block border-l-2 pl-3 leading-snug transition ${
                    active
                      ? 'border-[var(--color-accent-cyan)] text-[var(--color-fg-0)]'
                      : 'border-transparent text-[var(--color-fg-2)] hover:border-[var(--color-bg-3)] hover:text-[var(--color-fg-1)]'
                  }`}
                >
                  {it.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Mobile / tablet: collapsible details */}
      <details className="mb-8 rounded-2xl border border-[var(--color-bg-2)] bg-[var(--color-bg-1)] lg:hidden">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[var(--color-fg-0)]">
          <span className="inline-flex items-center gap-2">
            <span aria-hidden>▸</span>
            <span>{label}</span>
            <span className="text-xs text-[var(--color-fg-2)]">({items.length})</span>
          </span>
        </summary>
        <ul className="space-y-2 border-t border-[var(--color-bg-2)] px-4 py-3 text-sm">
          {items.map((it) => (
            <li key={it.id}>
              <a href={`#${it.id}`} className="block text-[var(--color-fg-1)] hover:text-[var(--color-accent-cyan)]">
                {it.label}
              </a>
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}
