"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useLang } from "../../lib/i18n";
import { useSection } from "../../lib/editorClient";
import { withBasePath } from "../../lib/basePath";
import EditPencil from "./EditPencil";

export default function About() {
  const { t, lang } = useLang();
  const c = useSection("about", {
    eyebrow_en: t("about.eyebrow"),
    eyebrow_el: t("about.eyebrow"),
    title_en: t("about.title"),
    title_el: t("about.title"),
    p1_en: t("about.p1"),
    p1_el: t("about.p1"),
    p2_en: t("about.p2"),
    p2_el: t("about.p2"),
    p3_en: t("about.p3"),
    p3_el: t("about.p3"),
    image: "",
  });
  const pick = (en: string, el: string) => (lang === "el" ? el || en : en);

  return (
    <section className="relative px-6 py-24">
      <EditPencil section="about" />
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/10"
        >
          {c.image ? (
            <Image
              src={withBasePath(c.image)}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0" style={{ background: "var(--surface)" }} />
          )}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex flex-col justify-center"
        >
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[var(--gold)]">
            {pick(c.eyebrow_en, c.eyebrow_el)}
          </p>
          <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            {pick(c.title_en, c.title_el)}
          </h2>
          <div className="mt-6 space-y-5 text-white/70">
            <p>{pick(c.p1_en, c.p1_el)}</p>
            <p>{pick(c.p2_en, c.p2_el)}</p>
            <p>{pick(c.p3_en, c.p3_el)}</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
