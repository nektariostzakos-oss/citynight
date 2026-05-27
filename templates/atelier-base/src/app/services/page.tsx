import type { Metadata } from "next";
import ServicesMenu from "../components/ServicesMenu";
import FAQ from "../components/FAQ";
import CTA from "../components/CTA";
import TranslatedPageHeader from "../components/TranslatedPageHeader";
import { buildPageMetadata } from "../../lib/pageSeo";
import { loadTemplateId, loadBusiness } from "@/lib/settings";
import { getActiveServices } from "@/lib/customServices";
import { tenantSiteUrl } from "@/lib/tenantSiteUrl";
import Template2Services from "@/templates/template2/services";
import Template3Services from "@/templates/template3/services";
import Template4Services from "@/templates/template4/services";
import Template5Services from "@/templates/template5/services";
import Template6Services from "@/templates/template6/services";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata("seo_services", { path: "/services" });
}

export default async function ServicesPage() {
  const tpl = await loadTemplateId();
  const [services, business, siteUrl] = await Promise.all([
    getActiveServices().catch(() => []),
    loadBusiness(),
    tenantSiteUrl(),
  ]);

  // Service ItemList — one entry per active service in the tenant's catalogue.
  // Each Service carries an Offer with the catalogue price + currency. Empty
  // install → empty list; we still emit ItemList with `numberOfItems: 0` so
  // crawlers see the page is intentionally blank, not broken.
  const serviceListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${business.name || "Services"} services`,
    numberOfItems: services.length,
    itemListElement: services.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Service",
        "@id": `${siteUrl}/services#${s.id}`,
        name: s.name,
        description: s.desc || undefined,
        provider: { "@id": `${siteUrl}#business` },
        url: `${siteUrl}/services`,
        offers: {
          "@type": "Offer",
          price: String(s.price ?? ""),
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
          url: `${siteUrl}/book`,
        },
      },
    })),
  };

  const body = (() => {
    if (tpl === "template2") return <Template2Services />;
    if (tpl === "template3") return <Template3Services />;
    if (tpl === "template4") return <Template4Services />;
    if (tpl === "template5") return <Template5Services />;
    if (tpl === "template6") return <Template6Services />;
    return (
      <main className="relative">
        <TranslatedPageHeader
          section="page_services"
          eyebrowKey="page.services.eyebrow"
          titleKey="page.services.title"
          subKey="page.services.sub"
        />
        <ServicesMenu />
        <FAQ />
        <CTA />
      </main>
    );
  })();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceListLd) }}
      />
      {body}
    </>
  );
}
