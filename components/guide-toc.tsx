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
        <p className="cn-readout cn-readout-s mb-3 text-[var(--color-muted)]">
          {label}
        </p>
        <ul className="space-y-1 text-sm">
          {items.map((it) => {
            const active = it.id === activeId;
            return (
              <li key={it.id}>
                <a
                  href={`#${it.id}`}
                  aria-current={active ? 'true' : undefined}
                  className={`flex min-h-[44px] items-center border-l pl-3 leading-snug transition-colors duration-[var(--motion-fast)] ease-[var(--motion-ease)] ${
                    active
                      ? 'border-[var(--color-bronze)] text-[var(--color-ink)]'
                      : 'border-[var(--color-hair)] text-[var(--color-muted)] hover:text-[var(--color-ink)]'
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
      <details className="mb-8 rounded-[var(--radius-md)] border border-[var(--color-hair)] bg-[var(--color-surface)] lg:hidden">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center px-4 text-sm font-semibold text-[var(--color-ink)]">
          <span className="inline-flex items-center gap-2">
            <span aria-hidden>▸</span>
            <span>{label}</span>
            <span className="cn-readout cn-readout-s text-[var(--color-muted)]">({items.length})</span>
          </span>
        </summary>
        <ul className="border-t border-[var(--color-hair)] px-4 py-1 text-sm">
          {items.map((it) => (
            <li key={it.id}>
              <a
                href={`#${it.id}`}
                className="flex min-h-[44px] items-center text-[var(--color-muted)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-ease)] hover:text-[var(--color-ink)]"
              >
                {it.label}
              </a>
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}
