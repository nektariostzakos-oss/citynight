"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useLang } from "../../lib/i18n";
import { langPick } from "../../lib/langs";
import { useSection } from "../../lib/editorClient";
import EditPencil from "./EditPencil";

const CTA = {
  book: {
    en: "Book the chair",
    el: "Κλείσε καρέκλα",
    de: "Termin buchen",
    fr: "Réservez le fauteuil",
    it: "Prenota la poltrona",
    es: "Reserva el sillón",
    nl: "Reserveer de stoel",
    pl: "Zarezerwuj fotel",
    pt: "Reserve a cadeira",
    sv: "Boka stolen",
    sq: "Rezervo karrigen",
  },
  menu: {
    en: "Full menu",
    el: "Όλες οι υπηρεσίες",
    de: "Ganze Karte",
    fr: "Menu complet",
    it: "Menù completo",
    es: "Menú completo",
    nl: "Volledig menu",
    pl: "Pełna oferta",
    pt: "Menu completo",
    sv: "Hela menyn",
    sq: "Menyja e plotë",
  },
};

type Svc = {
  id: string;
  price: number;
  duration: number;
  name_en: string;
  name_el: string;
  desc_en: string;
  desc_el: string;
};

export default function ServicesPreview() {
  const { t, lang } = useLang();
  const c = useSection("services", {
    eyebrow_en: t("services.eyebrow"),
    eyebrow_el: t("services.eyebrow"),
    title_en: t("services.title"),
    title_el: t("services.title"),
    items: [] as Svc[],
  });
  const items: Svc[] = ((c.items as Svc[]) ?? []).slice(0, 6);
  const pick = (en: string, el: string) => (lang === "el" ? el || en : en);

  return (
    <section className="relative px-6 py-32">
      <EditPencil section="services" />
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-16 flex items-end justify-between gap-6"
        >
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[var(--gold)]">
              {pick(c.eyebrow_en, c.eyebrow_el)}
            </p>
            <h2 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
              {pick(c.title_en, c.title_el)}
            </h2>
          </div>
          <Link
            href="/services"
            className="hidden rounded-full border border-white/15 px-5 py-2 text-xs uppercase tracking-widest text-white/80 transition-colors hover:bg-white/10 sm:inline-block"
          >
            {t("cta.full_menu")}
          </Link>
        </motion.div>

        <div className="divide-y divide-white/10 border-y border-white/10">
          {items.map((s, i) => (
            <motion.div
              key={s.id || i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="group grid grid-cols-[1fr_auto] items-center gap-6 py-8 transition-colors hover:bg-white/[0.02] sm:grid-cols-[1fr_auto_auto] sm:gap-12"
            >
              <div>
                <h3 className="font-serif text-2xl text-white transition-colors group-hover:text-[var(--gold)]">
                  {pick(s.name_en, s.name_el)}
                </h3>
                <p className="mt-1 max-w-md text-sm text-white/55">
                  {pick(s.desc_en, s.desc_el)}
                </p>
              </div>
              <p className="hidden text-sm uppercase tracking-widest text-white/60 sm:block">
                {s.duration} {t("minutes")}
              </p>
              <p className="font-serif text-2xl text-[var(--gold)]">${s.price}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            href="/book"
            data-track="services_book"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-8 py-3.5 text-xs font-semibold uppercase tracking-widest text-[var(--background)] shadow-[0_10px_30px_-10px_rgba(201,169,97,0.55)] transition-all hover:bg-[var(--gold-2)] hover:shadow-[0_18px_50px_-12px_rgba(201,169,97,0.85)]"
          >
            {langPick(CTA.book, lang)} →
          </Link>
          <Link
            href="/services"
            data-track="services_full_menu"
            className="inline-block rounded-full border border-white/15 px-6 py-3 text-xs uppercase tracking-widest text-white/80 transition-colors hover:bg-white/10"
          >
            {langPick(CTA.menu, lang)}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
