import type { Metadata } from "next";
import About from "../components/About";
import Team from "../components/Team";
import CTA from "../components/CTA";
import TranslatedPageHeader from "../components/TranslatedPageHeader";
import { buildPageMetadata } from "../../lib/pageSeo";
import { loadTemplateId } from "@/lib/settings";
import Template2About from "@/templates/template2/about";
import Template3About from "@/templates/template3/about";
import Template4About from "@/templates/template4/about";
import Template5About from "@/templates/template5/about";
import Template6About from "@/templates/template6/about";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata("seo_about", { path: "/about" });
}

export default async function AboutPage() {
  const tpl = await loadTemplateId();
  if (tpl === "template2") return <Template2About />;
  if (tpl === "template3") return <Template3About />;
  if (tpl === "template4") return <Template4About />;
  if (tpl === "template5") return <Template5About />;
  if (tpl === "template6") return <Template6About />;
  return (
    <main className="relative">
      <TranslatedPageHeader
        section="page_team"
        eyebrowKey="page.team.eyebrow"
        titleKey="page.team.title"
        subKey="page.team.sub"
      />
      <About />
      <Team />
      <CTA />
    </main>
  );
}
