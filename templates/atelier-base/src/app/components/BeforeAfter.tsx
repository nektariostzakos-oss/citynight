"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { withBasePath } from "../../lib/basePath";

type Props = {
  before: string;
  after: string;
  alt?: string;
  initial?: number; // 0..100
};

export default function BeforeAfter({ before, after, alt = "", initial = 50 }: Props) {
  const [pos, setPos] = useState(initial);
  const ref = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setPos(pct);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      const x = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      updateFromClientX(x);
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [updateFromClientX]);

  function start(clientX: number) {
    dragging.current = true;
    updateFromClientX(clientX);
  }

  return (
    <div
      ref={ref}
      className="relative aspect-[4/3] w-full overflow-hidden select-none touch-none rounded-xl"
      style={{
        border: "1px solid var(--border-strong)",
        background: "var(--surface)",
        cursor: "ew-resize",
      }}
      onMouseDown={(e) => start(e.clientX)}
      onTouchStart={(e) => start(e.touches[0].clientX)}
      role="slider"
      aria-label="Before and after comparison"
      aria-valuenow={Math.round(pos)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 5));
        if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 5));
      }}
    >
      {/* AFTER (full image underneath) */}
      <Image src={withBasePath(after)} alt={`${alt}: after`} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover pointer-events-none" priority={false} />
      <span className="absolute right-3 bottom-3 rounded-full px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.3em]"
        style={{ background: "color-mix(in srgb, var(--background) 75%, transparent)", color: "var(--foreground)" }}
      >
        After
      </span>

      {/* BEFORE (clipped to left side of handle) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        <Image src={withBasePath(before)} alt={`${alt}: before`} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover pointer-events-none" priority={false} />
        <span className="absolute left-3 bottom-3 rounded-full px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.3em]"
          style={{ background: "color-mix(in srgb, var(--background) 75%, transparent)", color: "var(--foreground)" }}
        >
          Before
        </span>
      </div>

      {/* Vertical drag handle */}
      <div
        aria-hidden
        className="absolute inset-y-0 w-px pointer-events-none"
        style={{ left: `${pos}%`, background: "var(--gold)", boxShadow: "0 0 0 1px color-mix(in srgb, var(--gold) 30%, transparent)" }}
      />
      {/* Visual drag handle. The wrapping element is already role="slider"
          with keyboard support, so this stays out of the a11y tree to avoid
          an interactive control nested inside another. */}
      <div
        aria-hidden="true"
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          left: `${pos}%`,
          top: "50%",
          width: 42,
          height: 42,
          background: "var(--gold)",
          color: "var(--background)",
          boxShadow: "0 10px 24px -6px color-mix(in srgb, var(--gold) 60%, transparent), 0 0 0 4px color-mix(in srgb, var(--background) 80%, transparent)",
        }}
        onMouseDown={(e) => { e.stopPropagation(); start(e.clientX); }}
        onTouchStart={(e) => { e.stopPropagation(); start(e.touches[0].clientX); }}
      >
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M10 7 L6 12 L10 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <path d="M14 7 L18 12 L14 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      </div>
    </div>
  );
}
