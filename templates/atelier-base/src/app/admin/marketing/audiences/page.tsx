import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "../../../../lib/auth";
import { isMarketingFeatureOn } from "../../../../lib/marketingFlags";
import { listSegments } from "../../../../lib/marketingSegments";
import MarketingAudiences from "../../../components/MarketingAudiences";

export const metadata: Metadata = {
  title: "Audiences · Marketing · Admin",
  robots: { index: false, follow: false, noarchive: true },
};

export const dynamic = "force-dynamic";

/**
 * Server page for the salon's audience / segment builder.
 *
 * Auth: tenant admin session required. A barber-role user is sent back to the
 * dashboard. If the `segments` marketing feature is off, a short notice is
 * rendered instead of the full UI, so the route never 404s — the admin can
 * still navigate here and see a clear explanation.
 */
export default async function AdminAudiencesPage() {
  const me = await currentUser();
  if (!me) redirect("/admin/login");
  if (me.role !== "admin") redirect("/admin");

  const featureOn = await isMarketingFeatureOn("segments");

  // Pre-load the saved segments server-side so the client component hydrates
  // with data immediately rather than showing a spinner on first render.
  const initialSegments = featureOn ? await listSegments() : [];

  return (
    <div className="min-h-screen bg-[#0a0806] text-white">
      <header className="border-b border-white/10 bg-white/[0.02] px-4 py-4 sm:px-6 sm:py-5">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#c9a961] sm:text-xs">
              Marketing
            </p>
            <h1 className="mt-0.5 font-serif text-xl font-semibold sm:mt-1 sm:text-2xl">
              Audiences
            </h1>
          </div>
          <Link
            href="/admin"
            className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-widest text-white/70 transition-colors hover:bg-white/10"
          >
            Back to admin
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        {featureOn ? (
          <MarketingAudiences initialSegments={initialSegments} />
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <p className="text-sm text-white/50">
              The Audiences feature is currently disabled. Contact your platform
              operator to enable it for this account.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
