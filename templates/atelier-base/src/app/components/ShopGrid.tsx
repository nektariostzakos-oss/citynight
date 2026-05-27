"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useLang } from "../../lib/i18n";
import { withBasePath } from "../../lib/basePath";
import { langField, langPick } from "../../lib/langs";
import type { Product } from "../../lib/products";

const COPY = {
  soldOut: {
    en: "Sold out",
    el: "Εξαντλημένο",
    de: "Ausverkauft",
    fr: "Épuisé",
    it: "Esaurito",
    es: "Agotado",
    nl: "Uitverkocht",
    pl: "Wyprzedane",
    pt: "Esgotado",
    sv: "Slutsåld",
    sq: "U shit i gjithi",
  },
  featured: {
    en: "Featured",
    el: "Προτεινόμενο",
    de: "Empfohlen",
    fr: "En vedette",
    it: "In evidenza",
    es: "Destacado",
    nl: "Uitgelicht",
    pl: "Polecane",
    pt: "Em destaque",
    sv: "Utvald",
    sq: "Të zgjedhura",
  },
};

export default function ShopGrid({ products }: { products: Product[] }) {
  const { lang, t } = useLang();

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      set.add(langField(p, "category", lang));
    }
    return ["All", ...Array.from(set)];
  }, [products, lang]);

  const [active, setActive] = useState("All");
  const filtered = active === "All"
    ? products
    : products.filter((p) => langField(p, "category", lang) === active);

  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-10 flex flex-wrap items-center justify-center gap-2"
        >
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`relative isolate rounded-full px-5 py-2 text-xs uppercase tracking-widest transition-colors ${
                active === cat
                  ? "text-black"
                  : "text-white/70 hover:text-white"
              }`}
            >
              {active === cat && (
                <motion.span
                  layoutId="shop-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-[var(--gold)]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{cat === "All" ? t("filter.all") : cat}</span>
            </button>
          ))}
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p, i) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
            >
              <Link
                href={`/shop/${p.slug}`}
                className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] transition-colors hover:border-[var(--gold)]/40"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={withBasePath(p.image)}
                    alt={langField(p, "name", lang)}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    // First row is above the fold — load it eagerly for LCP.
                    priority={i < 3}
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  {p.stock === 0 && (
                    <span className="absolute right-3 top-3 rounded-full bg-red-500/80 px-3 py-1 text-[10px] uppercase tracking-widest text-white">
                      {langPick(COPY.soldOut, lang)}
                    </span>
                  )}
                  {p.featured && p.stock > 0 && (
                    <span className="absolute left-3 top-3 rounded-full bg-[var(--gold)] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-black">
                      {langPick(COPY.featured, lang)}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <p className="text-[10px] uppercase tracking-widest text-[var(--gold)]">
                    {langField(p, "category", lang)}
                  </p>
                  <h2 className="mt-1 font-serif text-xl text-white transition-colors group-hover:text-[var(--gold)]">
                    {langField(p, "name", lang)}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-sm text-white/55">
                    {langField(p, "shortDesc", lang)}
                  </p>
                  <p className="mt-4 font-serif text-2xl text-[var(--gold)]">
                    ${p.price}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
