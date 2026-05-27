import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "../../../lib/auth";
import MobileAppPanel from "../../components/MobileAppPanel";

export const metadata = {
  title: "Mobile app · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Admin "Mobile app" page. Owner-only: a barber-role user is redirected back
 * to the dashboard. The actual UI lives in `MobileAppPanel` so the same
 * component can also be embedded as a tab inside `AdminDashboard`.
 */
export default async function AdminMobileAppPage() {
  const me = await currentUser();
  if (!me) redirect("/admin/login");
  if (me.role !== "admin") redirect("/admin");

  return (
    <div className="min-h-screen bg-[#0a0806] text-white">
      <header className="border-b border-white/10 bg-white/[0.02] px-4 py-4 sm:px-6 sm:py-5">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#c9a961] sm:text-xs">
              Marketing
            </p>
            <h1 className="mt-0.5 font-serif text-xl font-semibold sm:mt-1 sm:text-2xl">
              Mobile app
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

      <div className="mx-auto max-w-3xl px-6 py-10">
        <MobileAppPanel />
      </div>
    </div>
  );
}
