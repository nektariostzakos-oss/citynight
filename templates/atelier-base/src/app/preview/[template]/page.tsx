import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HomeContent from "../../components/HomeContent";
import Template2Home from "@/templates/template2/home";
import Template3Home from "@/templates/template3/home";
import Template4Home from "@/templates/template4/home";
import Template5Home from "@/templates/template5/home";
import Template6Home from "@/templates/template6/home";
import { isValidTemplateId } from "@/templates/registry";

// A live, on-demand preview of one template's homepage. Used by the admin
// Tools panel's template picker, so it must always reflect the current data.
export const dynamic = "force-dynamic";

/**
 * `/preview/<template>` renders one template's homepage in isolation, ignoring
 * the site's saved `template` setting. The admin Tools panel iframes it so the
 * owner can see each design before switching. The hero is `framed` (no nested
 * phone mock-up), exactly like the showcase `/preview` route. Never indexed.
 */
export const metadata: Metadata = {
  title: "Template preview",
  robots: { index: false, follow: false, nocache: true },
};

export default async function TemplatePreviewPage({
  params,
}: {
  params: Promise<{ template: string }>;
}) {
  const { template } = await params;
  if (!isValidTemplateId(template)) notFound();
  if (template === "template2") return <Template2Home />;
  if (template === "template3") return <Template3Home />;
  if (template === "template4") return <Template4Home />;
  if (template === "template5") return <Template5Home />;
  if (template === "template6") return <Template6Home />;
  return <HomeContent framed />;
}
