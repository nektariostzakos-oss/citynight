import type { Metadata } from "next";
import HomeContent from "./components/HomeContent";
import { buildPageMetadata } from "../lib/pageSeo";
import { loadTemplateId } from "@/lib/settings";
import Template2Home from "@/templates/template2/home";
import Template3Home from "@/templates/template3/home";
import Template4Home from "@/templates/template4/home";
import Template5Home from "@/templates/template5/home";
import Template6Home from "@/templates/template6/home";

// Revalidate the home page every 60s. Fresh enough for the "next slot" badge
// (slots move in 30-min increments), and avoids full SSR every request —
// important on memory/CPU-constrained Hostinger shared plans.
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata("seo_home", { path: "/" });
}

export default async function Home() {
  const tpl = await loadTemplateId();
  if (tpl === "template2") return <Template2Home />;
  if (tpl === "template3") return <Template3Home />;
  if (tpl === "template4") return <Template4Home />;
  if (tpl === "template5") return <Template5Home />;
  if (tpl === "template6") return <Template6Home />;
  return <HomeContent />;
}
