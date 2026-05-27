import type { Metadata } from "next";
import { loadContent } from "./content";
import { loadBusiness, loadIndustryId } from "./settings";
import { seoDefaults } from "./seoDefaults";
import { SITE_URL } from "./atelierSiteUrl";

type StoredSeo = Partial<{
  title_en: string;
  title_el: string;
  description_en: string;
  description_el: string;
  ogImage: string;
}>;

export async function buildPageMetadata(
  section: string,
  fallback: { path: string }
): Promise<Metadata> {
  const [all, business, industryId] = await Promise.all([loadContent(), loadBusiness(), loadIndustryId()]);
  const stored = ((all as Record<string, StoredSeo>)[section] ?? {}) as StoredSeo;
  const computed = seoDefaults(section, business, industryId);

  const title = stored.title_en || computed.title_en;
  const title_el = stored.title_el || computed.title_el;
  const description = stored.description_en || computed.description_en;
  const description_el = stored.description_el || computed.description_el;
  const ogImage = stored.ogImage || "/og.jpg";

  return {
    title,
    description,
    alternates: {
      canonical: fallback.path,
      languages: { "en-US": fallback.path, "el-GR": fallback.path },
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${fallback.path}`,
      images: [{ url: ogImage }],
      locale: "en_US",
      alternateLocale: ["el_GR"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    other: {
      "og:title:el": title_el,
      "og:description:el": description_el,
    },
  };
}
