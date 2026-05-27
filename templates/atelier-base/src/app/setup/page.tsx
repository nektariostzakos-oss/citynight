import { redirect } from "next/navigation";
import { loadSettings } from "../../lib/settings";
import { getCurrentTenant } from "../../lib/tenantContext";
import InstallWizard from "../components/InstallWizard";

export const metadata = {
  title: "Atelier · Install",
  description: "Pick a template, set up your business, and launch in under two minutes.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function SetupPage() {
  // Once onboarded we hard-redirect to /admin. There is intentionally no
  // `?force=1` bypass — re-running the wizard on a live site would overwrite
  // users.json and every setting without any auth, which is a full takeover
  // vector. A legitimate owner who wants to reinstall from scratch can delete
  // data/settings.json (documented in DEPLOY.md).
  const s = await loadSettings();
  if (s.onboarded) redirect("/admin");
  // SaaS-hosted tenant: the wizard skips the license-key step (already paid)
  // and gains a Domain step for connecting a custom domain.
  const tenantSlug = getCurrentTenant();
  // The wizard follows the active theme: it ships dark, but `InstallWizard`
  // restyles itself fully for light mode when the site is in light mode.
  return (
    <InstallWizard isTenant={!!tenantSlug} tenantSlug={tenantSlug ?? undefined} />
  );
}
