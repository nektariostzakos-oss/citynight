"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useLang } from "../../lib/i18n";
import { useSection } from "../../lib/editorClient";
import { withBasePath } from "../../lib/basePath";
import EditPencil from "./EditPencil";

type Member = {
  name_en: string;
  name_el: string;
  role_en: string;
  role_el: string;
  years_en: string;
  years_el: string;
  slug: string;
  image: string;
};

export default function Team() {
  const { t, lang } = useLang();
  const c = useSection("team", {
    eyebrow_en: t("team.eyebrow"),
    eyebrow_el: t("team.eyebrow"),
    title_en: t("team.title"),
    title_el: t("team.title"),
    members: [] as Member[],
  });
  const members: Member[] = (c.members as Member[]) ?? [];
  const pick = (en: string, el: string) => (lang === "el" ? el || en : en);

  return (
    <section className="relative px-6 py-32">
      <EditPencil section="team" />
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

        <div className="grid gap-6 sm:grid-cols-3">
          {members.map((m, i) => {
            const name = pick(m.name_en, m.name_el);
            const first = name.split(" ")[0];
            return (
              <motion.div
                key={m.slug || i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="group"
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/10">
                  <Image
                    src={withBasePath(m.image)}
                    alt={name}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover grayscale transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <p className="text-xs uppercase tracking-widest text-[var(--gold)]">
                      {pick(m.role_en, m.role_el)}
                    </p>
                    <p className="mt-1 font-serif text-2xl">{name}</p>
                    <p className="text-xs text-white/50">
                      {t("team.years")} · {pick(m.years_en, m.years_el)}
                    </p>
                    <Link
                      href={`/book?barber=${m.slug}`}
                      className="mt-4 inline-block rounded-full border border-white/30 px-4 py-1.5 text-xs uppercase tracking-widest text-white/90 transition-colors hover:bg-white hover:text-black"
                    >
                      {t("team.book_with")} {first}
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
