import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye } from "lucide-react";
import { findPage, listPages } from "../../../lib/pages";
import { loadBranding, loadBusiness } from "../../../lib/settings";
import { countViews } from "../../../lib/views";
import { withBasePath } from "../../../lib/basePath";
import { detectLang } from "../../../lib/i18nServer";
import { langField, langPick } from "../../../lib/langs";
import PostShare from "../../components/PostShare";
import { tenantSiteUrl } from "../../../lib/tenantSiteUrl";

const COPY = {
  back: {
    en: "Blog", el: "Ιστολόγιο", de: "Blog", fr: "Blog", it: "Blog", es: "Blog",
    nl: "Blog", pl: "Blog", pt: "Blogue", sv: "Blogg", sq: "Blogu",
  },
  general: {
    en: "General", el: "Γενικά", de: "Allgemein", fr: "Général", it: "Generale",
    es: "General", nl: "Algemeen", pl: "Ogólne", pt: "Geral", sv: "Allmänt",
    sq: "Të përgjithshme",
  },
  related: {
    en: "Related", el: "Σχετικά", de: "Verwandt", fr: "À lire aussi", it: "Correlati",
    es: "Relacionado", nl: "Gerelateerd", pl: "Powiązane", pt: "Relacionados",
    sv: "Liknande", sq: "Të ngjashme",
  },
};

/** Map the template's lang codes to BCP-47 locale tags for Intl APIs. */
const LANG_LOCALE: Record<string, string> = {
  en: "en-GB",
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

const VIEW_LABEL: Record<string, [string, string]> = {
  en: ["view", "views"],
  el: ["προβολή", "προβολές"],
  de: ["Aufruf", "Aufrufe"],
  fr: ["vue", "vues"],
  it: ["visualizzazione", "visualizzazioni"],
  es: ["visita", "visitas"],
  nl: ["weergave", "weergaven"],
  pl: ["wyświetlenie", "wyświetlenia"],
  pt: ["visualização", "visualizações"],
  sv: ["visning", "visningar"],
  sq: ["pamje", "pamje"],
};

// Static-generate each published post at build time. New posts added after
// deploy are served via on-demand SSG (cached after first hit).
export async function generateStaticParams() {
  try {
    const posts = await listPages("post");
    return posts.filter((p) => p.published).map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

// Revalidate each post's static HTML every 10 min so admin edits show up.
export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [p, siteUrl] = await Promise.all([findPage(slug), tenantSiteUrl()]);
  if (!p) return { title: "Not found" };
  const canonical = `${siteUrl}/blog/${p.slug}`;
  return {
    title: p.title_en,
    description: p.excerpt_en,
    alternates: { canonical, languages: { "en-US": canonical, "el-GR": canonical } },
    keywords: p.tags?.length ? p.tags : undefined,
    openGraph: {
      title: p.title_en,
      description: p.excerpt_en,
      images: p.image ? [{ url: p.image }] : [],
      type: "article",
      publishedTime: p.publishedAt,
      modifiedTime: p.updatedAt,
      tags: p.tags,
      section: p.category || undefined,
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title: p.title_en,
      description: p.excerpt_en,
      images: p.image ? [p.image] : undefined,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await findPage(slug);
  if (!post || !post.published || post.kind !== "post") notFound();
  // Internal-link mesh contract (Job 2 item 4): every blog post must link
  // to at least three related posts. Prefer same-category; pad with the
  // most-recent posts from other categories when the category is thin.
  // listPages already sorts published-desc, so the fillers fall in
  // newest-first.
  const all = await listPages("post");
  const others = all.filter((p) => p.published && p.id !== post.id);
  const sameCat = others.filter((p) => p.category === post.category);
  const fillers = others.filter((p) => p.category !== post.category);
  const related = [...sameCat, ...fillers].slice(0, 3);

  const [branding, business, viewCount, lang, siteUrl] = await Promise.all([
    loadBranding(),
    loadBusiness(),
    countViews(`/blog/${post.slug}`),
    detectLang(undefined),
    tenantSiteUrl(),
  ]);

  const locale = LANG_LOCALE[lang] ?? "en-GB";
  const [viewSingular, viewPlural] = VIEW_LABEL[lang] ?? VIEW_LABEL.en;
  const postRec = post as unknown as Record<string, unknown>;
  const postTitle = langField(postRec, "title", lang);
  const postCategory =
    (String(postRec[`category_${lang}`] ?? "") || post.category) || langPick(COPY.general, lang);
  // BlogPosting (subtype of Article) + Author + Publisher (= the tenant
  // business, surfaced as the same Organization the layout-level JSON-LD
  // anchors to via `@id`). Image is normalised to an absolute URL so the
  // schema validates from any crawl origin.
  const publisherName = branding.wordmark || business.name || "Your Salon";
  const heroImage = post.image
    ? post.image.startsWith("http")
      ? post.image
      : `${siteUrl}${post.image}`
    : undefined;
  const articleSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title_en,
    description: post.excerpt_en,
    image: heroImage,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    inLanguage: lang,
    author: {
      "@type": "Organization",
      name: publisherName,
      url: siteUrl,
    },
    publisher: {
      "@type": "Organization",
      "@id": `${siteUrl}#business`,
      name: publisherName,
      logo: branding.logoUrl
        ? {
            "@type": "ImageObject",
            url: branding.logoUrl.startsWith("http")
              ? branding.logoUrl
              : `${siteUrl}${branding.logoUrl}`,
          }
        : undefined,
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${siteUrl}/blog/${post.slug}` },
    articleSection: post.category || undefined,
    keywords: post.tags?.join(", ") || undefined,
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
      { "@type": "ListItem", position: 3, name: post.title_en },
    ],
  };

  return (
    <article className="px-6 py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <div className="mx-auto max-w-4xl">
        <Link href="/blog" className="text-[10px] uppercase tracking-widest text-white/50 hover:text-[var(--gold)]">
          ← {langPick(COPY.back, lang)}
        </Link>
        <p className="mt-8 text-[11px] uppercase tracking-[0.4em] text-[var(--gold)]">
          {postCategory}
        </p>
        <h1 className="mt-4 font-serif text-5xl leading-[1.03] sm:text-6xl lg:text-7xl">
          {postTitle}
        </h1>
        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/50">
          <span>
            {new Date(post.publishedAt).toLocaleDateString(locale, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
          <span aria-hidden className="text-white/20">·</span>
          <span className="flex items-center gap-1.5">
            <Eye className="h-4 w-4" />
            {viewCount.toLocaleString(locale)} {viewCount === 1 ? viewSingular : viewPlural}
          </span>
        </div>
        <div className="mt-7 border-t border-white/10 pt-7">
          <PostShare title={postTitle} />
        </div>

        {post.image && (
          <div className="relative mt-12 aspect-[16/10] overflow-hidden rounded-2xl border border-white/10 bg-[#14110d]">
            <Image
              src={withBasePath(post.image)}
              alt={postTitle}
              fill
              sizes="(max-width: 768px) 100vw, 1024px"
              className="object-cover"
              priority
            />
          </div>
        )}

        <div
          className="prose prose-xl prose-invert prose-drop-cap mt-14 max-w-none prose-headings:font-serif prose-headings:text-[var(--foreground)] prose-headings:tracking-tight prose-h2:text-3xl prose-h2:sm:text-4xl prose-h3:text-2xl prose-p:text-[var(--muted)] prose-p:leading-[1.85] prose-p:text-[1.2rem] prose-a:text-[var(--gold)] prose-strong:text-[var(--foreground)] prose-li:text-[var(--muted)] prose-li:text-[1.18rem] prose-li:leading-[1.8]"
          dangerouslySetInnerHTML={{ __html: renderBody(langField(postRec, "body", lang)) }}
        />

        {post.tags.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2 border-t border-white/10 pt-6">
            {post.tags.map((t) => (
              <span key={t} className="rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-widest text-white/60">
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>

      {related.length > 0 && (
        <div className="mx-auto mt-16 max-w-6xl">
          <p className="mb-6 text-[10px] uppercase tracking-[0.4em] text-[var(--gold)]">
            {langPick(COPY.related, lang)}
          </p>
          <div className="grid gap-6 sm:grid-cols-3">
            {related.map((r) => {
              const rRec = r as unknown as Record<string, unknown>;
              const rTitle = langField(rRec, "title", lang);
              const rCategory =
                String(rRec[`category_${lang}`] ?? "") || r.category;
              return (
              <Link
                key={r.id}
                href={`/blog/${r.slug}`}
                className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] transition-colors hover:border-[var(--gold)]/40"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-[#14110d]">
                  {r.image && (
                    <Image src={withBasePath(r.image)} alt={rTitle} fill sizes="33vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  )}
                </div>
                <div className="p-4">
                  <p className="text-[10px] uppercase tracking-widest text-[var(--gold)]">{rCategory}</p>
                  <h3 className="mt-1 font-serif text-lg text-white">{rTitle}</h3>
                </div>
              </Link>
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
}

function renderBody(body: string): string {
  if (!body) return "";
  // SEC-5: The raw-HTML passthrough branch has been removed. All content goes
  // through the paragraph renderer regardless of whether it looks like HTML.
  // This prevents stored-HTML injection via the admin blog editor.
  return body
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
}
