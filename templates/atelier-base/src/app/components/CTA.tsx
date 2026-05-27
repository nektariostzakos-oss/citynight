"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import { useLang } from "../../lib/i18n";
import { useSection } from "../../lib/editorClient";
import { withBasePath } from "../../lib/basePath";
import EditPencil from "./EditPencil";

export default function CTA() {
  const { t, lang } = useLang();
  const c = useSection("cta", {
    eyebrow_en: t("cta.eyebrow"),
    eyebrow_el: t("cta.eyebrow"),
    title_en: t("cta.title"),
    title_el: t("cta.title"),
    subtitle_en: t("cta.subtitle"),
    subtitle_el: t("cta.subtitle"),
    bgImage: "",
  });
  const pick = (en: string, el: string) => (lang === "el" ? el || en : en);

  return (
    <section className="relative px-6 py-32">
      <EditPencil section="cta" />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-[var(--gold)]/30"
      >
        {c.bgImage ? (
          <Image
            src={withBasePath(c.bgImage)}
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-40"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--background)] via-[var(--background)]/70 to-[var(--background)]/30" />

        <div className="relative px-8 py-20 sm:px-16 sm:py-24">
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[var(--gold)]">
            {pick(c.eyebrow_en, c.eyebrow_el)}
          </p>
          <h2 className="max-w-2xl font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            {pick(c.title_en, c.title_el)}
          </h2>
          <p className="mt-5 max-w-xl text-white/65">
            {pick(c.subtitle_en, c.subtitle_el)}
          </p>

          <motion.div
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="mt-10 inline-block"
          >
            <Link
              href="/book"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-8 py-4 text-sm font-semibold uppercase tracking-widest text-black"
            >
              {t("cta.book")}
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
