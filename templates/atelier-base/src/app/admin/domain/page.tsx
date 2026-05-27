import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "../../../lib/auth";
import { getCurrentTenant } from "../../../lib/tenantContext";
import { DomainStep } from "../../components/InstallWizard";

export const metadata = {
  title: "Domain · Admin",
  robots: { index: false, follow: false },
};

/**
 * Admin "Domain" page. Reuses the setup wizard's DomainStep so the owner can
 * connect a domain they already own, or search for and buy a new one, any
 * time after setup. A Stripe domain purchase returns here via ?bought=.
 */
export default async function AdminDomainPage({
  searchParams,
}: {
  searchParams: Promise<{ bought?: string }>;
}) {
  const me = await currentUser();
  if (!me) redirect("/admin/login");

  // The Domain feature only applies to hosted SaaS tenants. A standalone
  // customer ZIP install has no tenant context and owns its own domain, so
  // there is nothing to connect or buy: send them back to the dashboard.
  const slug = getCurrentTenant() ?? undefined;
  if (!slug) redirect("/admin");

  const { bought } = await searchParams;

  return (
    <div className="min-h-screen bg-[#0a0806] text-white">
      <header className="border-b border-white/10 bg-white/[0.02] px-4 py-4 sm:px-6 sm:py-5">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#c9a961] sm:text-xs">
              Settings
            </p>
            <h1 className="mt-0.5 font-serif text-xl font-semibold sm:mt-1 sm:text-2xl">
              Your domain
            </h1>
          </div>
          <Link
            href="/admin"
            className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-widest text-white/70 transition-colors hover:bg-white/10"
          >
            ← Back to admin
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-10">
        <DomainStep slug={slug} boughtDomain={bought ?? null} />
      </div>
    </div>
  );
}
