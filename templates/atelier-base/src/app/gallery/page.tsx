import type { Metadata } from "next";
import GalleryGrid from "../components/GalleryGrid";
import CTA from "../components/CTA";
import TranslatedPageHeader from "../components/TranslatedPageHeader";
import { buildPageMetadata } from "../../lib/pageSeo";
import { loadTemplateId } from "@/lib/settings";
import Template2Gallery from "@/templates/template2/gallery";
import Template3Gallery from "@/templates/template3/gallery";
import Template4Gallery from "@/templates/template4/gallery";
import Template5Gallery from "@/templates/template5/gallery";
import Template6Gallery from "@/templates/template6/gallery";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata("seo_gallery", { path: "/gallery" });
}

export default async function GalleryPage() {
  const tpl = await loadTemplateId();
  if (tpl === "template2") return <Template2Gallery />;
  if (tpl === "template3") return <Template3Gallery />;
  if (tpl === "template4") return <Template4Gallery />;
  if (tpl === "template5") return <Template5Gallery />;
  if (tpl === "template6") return <Template6Gallery />;
  return (
    <main className="relative">
      <TranslatedPageHeader
        section="page_gallery"
        eyebrowKey="page.gallery.eyebrow"
        titleKey="page.gallery.title"
        subKey="page.gallery.sub"
      />
      <GalleryGrid />
      <CTA />
    </main>
  );
}
