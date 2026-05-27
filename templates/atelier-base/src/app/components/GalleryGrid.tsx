"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { useLang } from "../../lib/i18n";
import { useSection } from "../../lib/editorClient";
import EditPencil from "./EditPencil";

const DEFAULT_TAGS = [
  { id: "All", key: "filter.all" },
  { id: "Cuts", key: "filter.cuts" },
  { id: "Beards", key: "filter.beards" },
  { id: "Shop", key: "filter.shop" },
];

type Cell = { src: string; tag: string; big: boolean | string };
type TagOption = { id: string; label_en?: string; label_el?: string; key?: string };

const DEFAULT: Cell[] = [];

export default function GalleryGrid() {
  const { t, lang } = useLang();
  const c = useSection("gallery", { items: DEFAULT, tags: [] as TagOption[] });
  const all: Cell[] = (c.items as Cell[]) ?? DEFAULT;
  // If content supplies a `tags` array use it verbatim (aesthetics / other
  // industries); otherwise fall back to the barber template's i18n filters.
  const storedTags = ((c.tags as TagOption[]) || []).filter((x) => x && x.id);
  const tags = storedTags.length > 0 ? storedTags : DEFAULT_TAGS;
  const pickLabel = (tag: TagOption) => {
    if (tag.key) return t(tag.key);
    return (lang === "el" ? tag.label_el || tag.label_en : tag.label_en) || tag.id;
  };
  const [active, setActive] = useState(tags[0]?.id ?? "All");
  const filtered = active === "All" ? all : all.filter((s) => s.tag === active);

  return (
    <section className="relative px-6 py-24">
      <EditPencil section="gallery" />
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-10 flex flex-wrap items-center justify-center gap-2"
        >
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => setActive(tag.id)}
              className={`relative rounded-full px-5 py-2 text-xs uppercase tracking-widest transition-colors ${
                active === tag.id
                  ? "text-black"
                  : "text-white/70 hover:text-white"
              }`}
            >
              {active === tag.id && (
                <motion.span
                  layoutId="filter-pill"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="absolute inset-0 rounded-full bg-[var(--gold)]"
                />
              )}
              <span className="relative">{pickLabel(tag)}</span>
            </button>
          ))}
        </motion.div>

        <div className="grid auto-rows-[16rem] gap-4 lg:grid-cols-3">
          {filtered.map((p, i) => {
            const big =
              p.big === true ||
              p.big === "true" ||
              String(p.big).toLowerCase() === "true";
            return (
              <motion.div
                key={p.src + i}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.04 }}
                className={`group relative overflow-hidden rounded-2xl border border-white/10 ${
                  big ? "lg:col-span-2 lg:row-span-2" : ""
                }`}
              >
                <Image
                  src={p.src}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  // First row is above the fold — load it eagerly for LCP.
                  priority={i < 3}
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <span className="absolute bottom-4 left-4 rounded-full bg-[var(--background)]/70 px-3 py-1 text-[10px] uppercase tracking-widest text-[var(--gold)] opacity-0 backdrop-blur transition-opacity duration-500 group-hover:opacity-100">
                  {p.tag}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
