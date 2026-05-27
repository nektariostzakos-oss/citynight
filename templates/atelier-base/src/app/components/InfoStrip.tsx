"use client";

import { motion } from "framer-motion";
import { useLang } from "../../lib/i18n";
import { useSection } from "../../lib/editorClient";
import EditPencil from "./EditPencil";

type Item = {
  label_en: string;
  label_el: string;
  value_en: string;
  value_el: string;
};

export default function InfoStrip() {
  const { t, lang } = useLang();
  const c = useSection("info", {
    items: [
      { label_en: t("info.open"), label_el: t("info.open"), value_en: t("info.open_value"), value_el: t("info.open_value") },
      { label_en: t("info.address"), label_el: t("info.address"), value_en: t("info.address_value"), value_el: t("info.address_value") },
      { label_en: t("info.phone"), label_el: t("info.phone"), value_en: t("info.phone_value"), value_el: t("info.phone_value") },
      { label_en: t("info.walk_ins"), label_el: t("info.walk_ins"), value_en: t("info.walk_ins_value"), value_el: t("info.walk_ins_value") },
    ] as Item[],
  });
  const items: Item[] = (c.items as Item[]) ?? [];
  const pick = (en: string, el: string) => (lang === "el" ? el || en : en);

  return (
    <section className="relative border-y border-white/10 bg-white/[0.02] px-6 py-10">
      <EditPencil section="info" />
      <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
          >
            <p className="text-xs uppercase tracking-widest text-[var(--gold)]">
              {pick(it.label_en, it.label_el)}
            </p>
            <p className="mt-2 font-serif text-xl text-white">
              {pick(it.value_en, it.value_el)}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
