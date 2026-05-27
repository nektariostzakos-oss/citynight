import type { Metadata } from "next";
import { Suspense } from "react";
import BookingFlow from "../components/BookingFlow";
import TranslatedPageHeader from "../components/TranslatedPageHeader";
import { buildPageMetadata } from "../../lib/pageSeo";
import { loadTemplateId, loadBusiness } from "@/lib/settings";
import { getActiveServices } from "@/lib/customServices";
import { tenantSiteUrl } from "@/lib/tenantSiteUrl";
import Template2Book from "@/templates/template2/book";
import Template3Book from "@/templates/template3/book";
import Template4Book from "@/templates/template4/book";
import Template5Book from "@/templates/template5/book";
import Template6Book from "@/templates/template6/book";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata("seo_book", { path: "/book" });
}

export default async function BookPage() {
  const tpl = await loadTemplateId();
  const [services, business, siteUrl] = await Promise.all([
    getActiveServices().catch(() => []),
    loadBusiness(),
    tenantSiteUrl(),
  ]);

  // ReserveAction wired onto each Service the tenant offers. The target is
  // /book on the tenant's own origin, so a crawler that supports Actions
  // surfaces the deep link directly. urlTemplate is the canonical /book URL —
  // a single landing where the customer picks the service. Omitted entirely
  // when the catalogue is empty (a brand-new install): claiming bookable
  // services that don't exist would be misleading.
  const reserveActionLd =
    services.length > 0
      ? {
          "@context": "https://schema.org",
          "@graph": services.map((s) => ({
            "@type": "Service",
            "@id": `${siteUrl}/services#${s.id}`,
            name: s.name,
            description: s.desc || undefined,
            provider: { "@id": `${siteUrl}#business` },
            offers: {
              "@type": "Offer",
              price: String(s.price ?? ""),
              priceCurrency: "EUR",
            },
            potentialAction: {
              "@type": "ReserveAction",
              target: {
                "@type": "EntryPoint",
                urlTemplate: `${siteUrl}/book?service=${s.id}`,
                actionPlatform: [
                  "http://schema.org/DesktopWebPlatform",
                  "http://schema.org/MobileWebPlatform",
                ],
              },
              result: {
                "@type": "Reservation",
                name: `${s.name} reservation at ${business.name || "the salon"}`,
              },
            },
          })),
        }
      : null;

  const body = (() => {
    if (tpl === "template2") return <Template2Book />;
    if (tpl === "template3") return <Template3Book />;
    if (tpl === "template4") return <Template4Book />;
    if (tpl === "template5") return <Template5Book />;
    if (tpl === "template6") return <Template6Book />;
    return (
      <main className="relative">
        <TranslatedPageHeader
          section="page_book"
          eyebrowKey="page.book.eyebrow"
          titleKey="page.book.title"
          subKey="page.book.sub"
        />
        <Suspense fallback={<div className="px-6 py-20 text-center opacity-40">…</div>}>
          <BookingFlow />
        </Suspense>
      </main>
    );
  })();

  return (
    <>
      {reserveActionLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(reserveActionLd) }}
        />
      )}
      {body}
    </>
  );
}
