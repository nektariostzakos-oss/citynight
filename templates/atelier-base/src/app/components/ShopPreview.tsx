"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useLang } from "../../lib/i18n";
import { langField } from "../../lib/langs";
import { withBasePath } from "../../lib/basePath";
import type { Product } from "../../lib/products";

// Currency-code to symbol map for the most common currencies the template
// supports. Covers every code the Stripe integration allows by default.
const CURRENCY_SYMBOLS: Record<string, string> = {
  usd: "$",
  eur: "€",
  gbp: "£",
  aud: "A$",
  cad: "C$",
  chf: "CHF ",
  sek: "kr ",
  nok: "kr ",
  dkk: "kr ",
  pln: "zł",
  jpy: "¥",
  hkd: "HK$",
  sgd: "S$",
  nzd: "NZ$",
  inr: "₹",
};

function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code.toLowerCase()] ?? code.toUpperCase() + " ";
}

export default function ShopPreview() {
  const { lang, t } = useLang();
  const [items, setItems] = useState<Product[]>([]);
  const [symbol, setSymbol] = useState("$");

  useEffect(() => {
    fetch(withBasePath("/api/products"))
      .then((r) => r.json())
      .then((d) => {
        const all: Product[] = d.products ?? [];
        const featured = all.filter((p) => p.featured);
        const rest = all.filter((p) => !p.featured);
        setItems([...featured, ...rest].slice(0, 3));
        // TODO: expose shop currency via /api/settings once that endpoint
        // includes payments config. For now, fall back to "$".
        if (d.currency) setSymbol(currencySymbol(d.currency));
      })
      .catch(() => {});
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="px-6 py-32">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-16 flex items-end justify-between gap-6"
        >
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[var(--gold)]">
              {t("shop.eyebrow")}
            </p>
            <h2 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
              {t("shop.title")}
            </h2>
          </div>
          <Link
            href="/shop"
            className="hidden rounded-full border border-white/15 px-5 py-2 text-xs uppercase tracking-widest text-white/80 transition-colors hover:bg-white/10 sm:inline-block"
          >
            {t("shop.all")}
          </Link>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-3">
          {items.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
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
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-serif text-xl text-white transition-colors group-hover:text-[var(--gold)]">
                    {langField(p, "name", lang)}
                  </h3>
                  <p className="mt-3 font-serif text-2xl text-[var(--gold)]">
                    {symbol}{p.price}
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
