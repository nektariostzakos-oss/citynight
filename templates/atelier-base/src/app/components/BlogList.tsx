"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useLang } from "../../lib/i18n";
import { withBasePath } from "../../lib/basePath";
import { langField, langPick } from "../../lib/langs";

type Post = {
  id: string;
  slug: string;
  title_en: string;
  title_el: string;
  excerpt_en: string;
  excerpt_el: string;
  image: string;
  category: string;
  tags: string[];
  publishedAt: string;
};

const COPY = {
  eyebrow: {
    en: "Journal",
    el: "Ημερολόγιο",
    de: "Journal",
    fr: "Journal",
    it: "Diario",
    es: "Diario",
    nl: "Journaal",
    pl: "Dziennik",
    pt: "Diário",
    sv: "Journal",
    sq: "Ditari",
  },
  heading: {
    en: "Stories & Tips",
    el: "Ιστορίες & Συμβουλές",
    de: "Geschichten & Tipps",
    fr: "Histoires et conseils",
    it: "Storie e consigli",
    es: "Historias y consejos",
    nl: "Verhalen & tips",
    pl: "Historie i porady",
    pt: "Histórias e dicas",
    sv: "Berättelser och tips",
    sq: "Histori dhe këshilla",
  },
  all: {
    en: "All",
    el: "Όλα",
    de: "Alle",
    fr: "Tout",
    it: "Tutti",
    es: "Todo",
    nl: "Alles",
    pl: "Wszystko",
    pt: "Tudo",
    sv: "Alla",
    sq: "Të gjitha",
  },
  empty: {
    en: "No posts yet.",
    el: "Δεν υπάρχουν δημοσιεύσεις ακόμη.",
    de: "Noch keine Beiträge.",
    fr: "Pas encore d'articles.",
    it: "Ancora nessun articolo.",
    es: "Aún no hay publicaciones.",
    nl: "Nog geen berichten.",
    pl: "Nie ma jeszcze wpisów.",
    pt: "Ainda não há artigos.",
    sv: "Inga inlägg än.",
    sq: "Ende nuk ka artikuj.",
  },
  general: {
    en: "General",
    el: "Γενικά",
    de: "Allgemein",
    fr: "Général",
    it: "Generale",
    es: "General",
    nl: "Algemeen",
    pl: "Ogólne",
    pt: "Geral",
    sv: "Allmänt",
    sq: "Të përgjithshme",
  },
};

const DATE_LOCALE: Record<string, string> = {
  en: "en-US",
  el: "el-GR",
  de: "de-DE",
  fr: "fr-FR",
  it: "it-IT",
  es: "es-ES",
  nl: "nl-NL",
  pl: "pl-PL",
  pt: "pt-PT",
  sv: "sv-SE",
  sq: "sq-AL",
};

export default function BlogList({ posts }: { posts: Post[] }) {
  const { lang } = useLang();
  const catLabel = (p: Post) =>
    String((p as Record<string, unknown>)[`category_${lang}`] ?? "") || p.category;

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of posts) if (p.category) set.add(p.category);
    return ["All", ...Array.from(set).sort()];
  }, [posts]);

  const [active, setActive] = useState("All");
  const filtered = active === "All" ? posts : posts.filter((p) => p.category === active);
  const catLabelByValue = (cat: string) => {
    if (cat === "All") return langPick(COPY.all, lang);
    const match = posts.find((p) => p.category === cat);
    return match ? catLabel(match) : cat;
  };

  return (
    <main className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] text-[var(--gold)]">
            {langPick(COPY.eyebrow, lang)}
          </p>
          <h1 className="mt-2 font-serif text-4xl sm:text-5xl">
            {langPick(COPY.heading, lang)}
          </h1>
        </div>

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
                active === cat ? "text-black" : "text-white/70 hover:text-white"
              }`}
            >
              {active === cat && (
                <motion.span
                  layoutId="blog-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-[var(--gold)]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{catLabelByValue(cat)}</span>
            </button>
          ))}
        </motion.div>

        {filtered.length === 0 ? (
          <p className="py-16 text-center text-white/60">
            {langPick(COPY.empty, lang)}
          </p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p, i) => (
              <motion.article
                key={p.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
              >
                <Link
                  href={`/blog/${p.slug}`}
                  className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] transition-colors hover:border-[var(--gold)]/40"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#14110d]">
                    {p.image && (
                      <Image
                        src={withBasePath(p.image)}
                        alt={langField(p, "title", lang)}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="p-5">
                    <p className="text-[10px] uppercase tracking-widest text-[var(--gold)]">
                      {catLabel(p) || langPick(COPY.general, lang)}
                    </p>
                    <h2 className="mt-2 font-serif text-xl text-white transition-colors group-hover:text-[var(--gold)]">
                      {langField(p, "title", lang)}
                    </h2>
                    <p className="mt-2 line-clamp-3 text-sm text-white/55">
                      {langField(p, "excerpt", lang)}
                    </p>
                    <p className="mt-4 text-[10px] uppercase tracking-widest text-white/60">
                      {new Date(p.publishedAt).toLocaleDateString(langPick(DATE_LOCALE, lang), {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
