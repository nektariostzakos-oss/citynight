import type { Metadata } from "next";
import ContactInfo from "../components/ContactInfo";
import CTA from "../components/CTA";
import TranslatedPageHeader from "../components/TranslatedPageHeader";
import { buildPageMetadata } from "../../lib/pageSeo";
import { loadTemplateId } from "@/lib/settings";
import Template2Contact from "@/templates/template2/contact";
import Template3Contact from "@/templates/template3/contact";
import Template4Contact from "@/templates/template4/contact";
import Template5Contact from "@/templates/template5/contact";
import Template6Contact from "@/templates/template6/contact";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata("seo_contact", { path: "/contact" });
}

export default async function ContactPage() {
  const tpl = await loadTemplateId();
  if (tpl === "template2") return <Template2Contact />;
  if (tpl === "template3") return <Template3Contact />;
  if (tpl === "template4") return <Template4Contact />;
  if (tpl === "template5") return <Template5Contact />;
  if (tpl === "template6") return <Template6Contact />;
  return (
    <main className="relative">
      <TranslatedPageHeader
        section="page_contact"
        eyebrowKey="page.contact.eyebrow"
        titleKey="page.contact.title"
        subKey="page.contact.sub"
      />
      <ContactInfo />
      <CTA />
    </main>
  );
}
