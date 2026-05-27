import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "../../../../lib/auth";
import { isMarketingFeatureOn } from "../../../../lib/marketingFlags";
import { listCampaigns } from "../../../../lib/marketingCampaigns";
import { listSegments } from "../../../../lib/marketingSegments";
import { listEvents, statsForCampaign } from "../../../../lib/marketingEvents";
import { detectLang } from "../../../../lib/i18nServer";
import MarketingCampaigns from "../../../components/MarketingCampaigns";
import type { Lang } from "../../../../lib/langs";

export const metadata: Metadata = {
  title: "Campaigns · Marketing · Admin",
  robots: { index: false, follow: false, noarchive: true },
};

export const dynamic = "force-dynamic";

/**
 * Server page for the salon's campaign builder.
 *
 * Auth: tenant admin session required. A barber-role user is redirected to
 * the dashboard. When the `campaigns` marketing feature is off, a short notice
 * is rendered instead of the full UI, so the route never 404s.
 *
 * Initial data is pre-loaded server-side so the client component hydrates with
 * real data on the first paint rather than showing a loading spinner.
 */
export default async function AdminCampaignsPage() {
  const me = await currentUser();
  if (!me) redirect("/admin/login");
  if (me.role !== "admin") redirect("/admin");

  const featureOn = await isMarketingFeatureOn("campaigns");

  // Resolve the active language from the request cookie.
  const lang: Lang = await detectLang(undefined);

  // Pre-load server-side so the first paint is not empty.
  const [rawCampaigns, initialSegments, events] = await Promise.all([
    featureOn ? listCampaigns() : Promise.resolve([]),
    featureOn ? listSegments() : Promise.resolve([]),
    featureOn ? listEvents() : Promise.resolve([]),
  ]);

  // Enrich campaigns with rolled-up event stats.
  const initialCampaigns = rawCampaigns.map((c) => ({
    ...c,
    eventStats: statsForCampaign(c.id, events),
  }));

  return (
    <div className="min-h-screen bg-[#0a0806] text-white">
      <header className="border-b border-white/10 bg-white/[0.02] px-4 py-4 sm:px-6 sm:py-5">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#c9a961] sm:text-xs">
              Marketing
            </p>
            <h1 className="mt-0.5 font-serif text-xl font-semibold sm:mt-1 sm:text-2xl">
              Campaigns
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/marketing/audiences"
              className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-widest text-white/70 transition-colors hover:bg-white/10"
            >
              Audiences
            </Link>
            <Link
              href="/admin"
              className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-widest text-white/70 transition-colors hover:bg-white/10"
            >
              Back to admin
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <MarketingCampaigns
          initialCampaigns={initialCampaigns}
          initialSegments={initialSegments}
          featureOn={featureOn}
          lang={lang}
        />
      </div>
    </div>
  );
}
