import Link from "next/link";
import Image from "next/image";
import { listPages } from "../../lib/pages";
import { withBasePath } from "../../lib/basePath";
import { detectLang } from "../../lib/i18nServer";
import { langField, langPick } from "../../lib/langs";

const COPY = {
  eyebrow: {
    en: "Journal",
    el: "Journal",
    de: "Journal",
    fr: "Journal",
    it: "Journal",
    es: "Journal",
    nl: "Journal",
    pl: "Journal",
    pt: "Journal",
    sv: "Journal",
    sq: "Journal",
  },
  title: {
    en: "Stories from the chair",
    el: "Ιστορίες από την καρέκλα",
    de: "Geschichten vom Stuhl",
    fr: "Histoires du fauteuil",
    it: "Storie dalla poltrona",
    es: "Historias desde el sillón",
    nl: "Verhalen uit de stoel",
    pl: "Historie z fotela",
    pt: "Histórias da cadeira",
    sv: "Berättelser från stolen",
    sq: "Histori nga karrigia",
  },
  all: {
    en: "All posts →",
    el: "Όλα τα άρθρα →",
    de: "Alle Beiträge →",
    fr: "Tous les articles →",
    it: "Tutti gli articoli →",
    es: "Todos los artículos →",
    nl: "Alle berichten →",
    pl: "Wszystkie wpisy →",
    pt: "Todos os artigos →",
    sv: "Alla inlägg →",
    sq: "Të gjithë artikujt →",
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

export default async function BlogStrip() {
  const all = await listPages("post");
  const posts = all.filter((p) => p.published).slice(0, 3);
  if (posts.length === 0) return null;

  const lang = await detectLang(undefined);

  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-[var(--gold)]">
              {langPick(COPY.eyebrow, lang)}
            </p>
            <h2 className="mt-2 font-serif text-3xl sm:text-4xl">{langPick(COPY.title, lang)}</h2>
          </div>
          <Link href="/blog" className="text-xs uppercase tracking-widest text-white/60 hover:text-[var(--gold)]">
            {langPick(COPY.all, lang)}
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => {
            const cat =
              String((p as Record<string, unknown>)[`category_${lang}`] ?? "") ||
              p.category ||
              langPick(COPY.general, lang);
            return (
              <Link
                key={p.id}
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
                    {cat}
                  </p>
                  <h3 className="mt-2 line-clamp-2 font-serif text-xl text-white transition-colors group-hover:text-[var(--gold)]">
                    {langField(p, "title", lang)}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm text-white/55">{langField(p, "excerpt", lang)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
