"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useLang } from "../../lib/i18n";
import { useSection } from "../../lib/editorClient";
import EditPencil from "./EditPencil";

type Quote = {
  quote_en: string;
  quote_el: string;
  name: string;
  role_en: string;
  role_el: string;
  source?: string;
  date?: string;
};

export default function Testimonials() {
  const { t, lang } = useLang();
  const c = useSection("testimonials", {
    eyebrow_en: t("testimonials.eyebrow"),
    eyebrow_el: t("testimonials.eyebrow"),
    title_en: t("testimonials.title"),
    title_el: t("testimonials.title"),
    items: [] as Quote[],
  });
  const items: Quote[] = (c.items as Quote[]) ?? [];
  const pick = (en: string, el: string) => (lang === "el" ? el || en : en);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  // Track which arrow buttons should be enabled.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      setCanScrollPrev(el.scrollLeft > 4);
      setCanScrollNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [items.length]);

  // Click-and-drag scrolling — desktop users without horizontal trackpads can
  // grab the row and drag it like a Spotify / shopping carousel.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let down = false;
    let startX = 0;
    let startScroll = 0;
    let moved = false;

    const onDown = (e: PointerEvent) => {
      // Don't hijack clicks on actual links inside cards.
      const target = e.target as HTMLElement;
      if (target.closest("a, button")) return;
      down = true;
      moved = false;
      startX = e.clientX;
      startScroll = el.scrollLeft;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      el.scrollLeft = startScroll - dx;
    };
    const stop = (e: PointerEvent) => {
      if (!down) return;
      down = false;
      try { el.releasePointerCapture(e.pointerId); } catch {}
      el.style.cursor = "grab";
      // Eat the click that follows a drag so cards don't open accidentally.
      if (moved) {
        const eat = (ev: Event) => {
          ev.preventDefault();
          ev.stopPropagation();
          window.removeEventListener("click", eat, true);
        };
        window.addEventListener("click", eat, true);
      }
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", stop);
    el.addEventListener("pointercancel", stop);
    el.style.cursor = "grab";
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", stop);
      el.removeEventListener("pointercancel", stop);
    };
  }, [items.length]);

  function scrollBy(direction: 1 | -1) {
    const el = scrollRef.current;
    if (!el) return;
    const firstCard = el.querySelector<HTMLElement>(":scope > *");
    const cardWidth = firstCard ? firstCard.offsetWidth + 24 : el.clientWidth * 0.6;
    el.scrollBy({ left: direction * cardWidth, behavior: "smooth" });
  }

  return (
    <section className="relative px-6 py-32">
      <EditPencil section="testimonials" />
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-12 flex flex-wrap items-end justify-between gap-6 sm:mb-16"
        >
          <div className="max-w-2xl">
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[var(--gold)]">
              {pick(c.eyebrow_en, c.eyebrow_el)}
            </p>
            <h2 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
              {pick(c.title_en, c.title_el)}
            </h2>
          </div>
          {/* Desktop-only prev/next arrows for mouse users */}
          <div className="hidden gap-2 md:flex">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              disabled={!canScrollPrev}
              aria-label="Previous review"
              className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-[var(--gold)]/60 hover:bg-white/10 hover:text-white disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              disabled={!canScrollNext}
              aria-label="Next review"
              className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-[var(--gold)]/60 hover:bg-white/10 hover:text-white disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
            >
              →
            </button>
          </div>
        </motion.div>

        <div
          ref={scrollRef}
          // Keyboard support: focusable region; ArrowLeft / ArrowRight
          // scroll by one card; Home / End jump to the ends. Mirrors the
          // mouse arrow buttons above so keyboard users have the same
          // discoverable navigation. role="region" + aria-label makes the
          // intent explicit to screen readers.
          tabIndex={0}
          role="region"
          aria-label="Customer reviews"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") {
              e.preventDefault();
              scrollBy(1);
            } else if (e.key === "ArrowLeft") {
              e.preventDefault();
              scrollBy(-1);
            } else if (e.key === "Home") {
              e.preventDefault();
              scrollRef.current?.scrollTo({ left: 0, behavior: "smooth" });
            } else if (e.key === "End") {
              e.preventDefault();
              const el = scrollRef.current;
              if (el) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
            }
          }}
          className="-mx-6 flex snap-x snap-mandatory select-none gap-4 overflow-x-auto px-6 pb-4 sm:gap-6 md:-mx-0 md:px-0 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {items.map((it, i) => (
            <motion.figure
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                duration: 0.7,
                delay: i * 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="w-[85%] shrink-0 snap-center rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:w-[60%] md:w-[45%] md:p-8 lg:w-[31%]"
            >
              <p className="mb-4 text-[var(--gold)]">★★★★★</p>
              <blockquote className="font-serif text-base leading-relaxed text-white/85 sm:text-lg">
                &ldquo;{pick(it.quote_en, it.quote_el)}&rdquo;
              </blockquote>
              <figcaption className="mt-6 sm:mt-8">
                <p className="text-sm font-medium">{it.name}</p>
                <p className="text-xs text-white/50">
                  {pick(it.role_en, it.role_el)}
                </p>
                {(it.source || it.date) && (
                  <p className="mt-2 text-[10px] uppercase tracking-widest text-white/60">
                    {[it.source, it.date].filter(Boolean).join(" · ")}
                  </p>
                )}
              </figcaption>
            </motion.figure>
          ))}
        </div>
        <p className="mt-4 text-center text-[10px] uppercase tracking-widest text-white/35 md:hidden">
          ← swipe →
        </p>
      </div>
    </section>
  );
}
