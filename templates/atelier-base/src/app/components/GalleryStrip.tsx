"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useLang } from "../../lib/i18n";
import { useSection } from "../../lib/editorClient";
import { withBasePath } from "../../lib/basePath";
import EditPencil from "./EditPencil";

const DEFAULT: { src: string }[] = [];

export default function GalleryStrip() {
  const { t, lang } = useLang();
  const c = useSection("gallery_strip", {
    eyebrow_en: t("gallery.eyebrow"),
    eyebrow_el: t("gallery.eyebrow"),
    title_en: t("gallery.title"),
    title_el: t("gallery.title"),
    images: DEFAULT,
  });
  const pick = (en: string, el: string) => (lang === "el" ? el || en : en);
  const images: { src: string }[] = (c.images as { src: string }[]) ?? DEFAULT;

  return (
    <section className="relative px-6 py-32">
      <EditPencil section="gallery_strip" />
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-16"
        >
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[var(--gold)]">
            {pick(c.eyebrow_en, c.eyebrow_el)}
          </p>
          <h2 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
            {pick(c.title_en, c.title_el)}
          </h2>
        </motion.div>

        <div className="grid auto-rows-[14rem] grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img, i) => (
            <motion.div
              key={img.src}
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.06 }}
              className={`group relative overflow-hidden rounded-xl border border-white/10 ${
                i === 0 ? "row-span-2 col-span-2" : ""
              }`}
            >
              <Image
                src={withBasePath(img.src)}
                alt=""
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                priority={i === 0}
                loading={i === 0 ? "eager" : "lazy"}
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
