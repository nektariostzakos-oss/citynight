"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useLang } from "../../lib/i18n";
import { langPick } from "../../lib/langs";
import { useSection } from "../../lib/editorClient";
import EditPencil from "./EditPencil";

type Svc = {
  id: string;
  price: number;
  duration: number;
  name_en: string;
  name_el: string;
  desc_en: string;
  desc_el: string;
  /** When true, price renders as "From $X" — signals the final bill may vary
   * (hair length / colour uptake / add-ons). */
  fromPrice?: boolean;
};

export default function ServicesMenu() {
  const { t, lang } = useLang();
  const c = useSection("services", {
    items: [] as Svc[],
  });
  const items: Svc[] = (c.items as Svc[]) ?? [];
  const pick = (en: string, el: string) => (lang === "el" ? el || en : en);

  return (
    <section className="relative px-6 py-24">
      <EditPencil section="services" />
      <div className="mx-auto max-w-5xl">
        <div className="divide-y divide-white/10 border-y border-white/10">
          {items.map((s, i) => (
            <motion.div
              key={s.id || i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.04 }}
              className="group grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-4 py-8 sm:grid-cols-[1fr_auto_auto_auto] sm:gap-12"
            >
              <div className="col-span-2 sm:col-span-1">
                <h2 className="font-serif text-2xl text-white transition-colors group-hover:text-[var(--gold)]">
                  {pick(s.name_en, s.name_el)}
                </h2>
                <p className="mt-1 max-w-md text-sm text-white/55">
                  {pick(s.desc_en, s.desc_el)}
                </p>
              </div>
              <p className="hidden text-sm uppercase tracking-widest text-white/60 sm:block">
                {s.duration} {t("minutes")}
              </p>
              <p className="font-serif text-2xl text-[var(--gold)]">
                {s.fromPrice ? langPick({ en: "from $", el: "από $", de: "ab $", fr: "à partir de $", it: "da $", es: "desde $", nl: "vanaf $", pl: "od $", pt: "a partir de $", sv: "från $", sq: "nga $" }, lang) : "$"}{s.price}
              </p>
              <Link
                href={`/book?service=${s.id}`}
                className="justify-self-end rounded-full border border-white/20 px-5 py-2 text-xs uppercase tracking-widest text-white/80 transition-colors hover:bg-white/10 sm:justify-self-auto"
              >
                {t("svc.book")}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
