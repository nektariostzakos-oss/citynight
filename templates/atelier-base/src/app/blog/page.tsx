import type { Metadata } from "next";
import { listPages } from "../../lib/pages";
import { loadBusiness, loadTemplateId } from "../../lib/settings";
import BlogList from "../components/BlogList";
import Template2Blog from "@/templates/template2/blog";
import Template3Blog from "@/templates/template3/blog";
import Template4Blog from "@/templates/template4/blog";
import Template5Blog from "@/templates/template5/blog";
import Template6Blog from "@/templates/template6/blog";
import { SITE_URL } from "../../lib/atelierSiteUrl";

export async function generateMetadata(): Promise<Metadata> {
  const business = await loadBusiness();
  const name = business.name || "Your Salon";
  return {
    title: "Blog",
    description: `Cutting technique, colour science and studio stories from ${name}.`,
    alternates: {
      canonical: "/blog",
      languages: { "en-GB": "/blog", "en-US": "/blog" },
    },
    openGraph: {
      title: `Blog · ${name}`,
      description: `Cutting technique, colour science and studio stories from ${name}.`,
      url: `${SITE_URL}/blog`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `Blog · ${name}`,
      description: `Cutting technique, colour science and studio stories from ${name}.`,
    },
  };
}

export default async function BlogIndexPage() {
  const tpl = await loadTemplateId();
  if (tpl === "template2") return <Template2Blog />;
  if (tpl === "template3") return <Template3Blog />;
  if (tpl === "template4") return <Template4Blog />;
  if (tpl === "template5") return <Template5Blog />;
  if (tpl === "template6") return <Template6Blog />;
  const all = await listPages("post");
  const published = all.filter((p) => p.published);
  return <BlogList posts={published} />;
}
