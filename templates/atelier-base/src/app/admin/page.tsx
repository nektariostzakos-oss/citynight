import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "../../lib/auth";
import { listBookings } from "../../lib/bookings";
import { isSmtpConfigured } from "../../lib/email";
import { loadSettings, loadBusiness } from "../../lib/settings";
import { getCurrentTenant } from "../../lib/tenantContext";
import { resolveMarketingFlags } from "../../lib/marketingFlags";
import AdminDashboard from "../components/AdminDashboard";

export async function generateMetadata(): Promise<Metadata> {
  const business = await loadBusiness();
  const name = business.name || "Your Salon";
  return {
    title: `Admin · Bookings · ${name}`,
    robots: { index: false, follow: false, noarchive: true },
  };
}

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect("/admin/login");
  // Barber role sees only their own bookings (stylists shouldn't see
  // colleagues' clients). Admins see everything.
  const all = await listBookings();
  const bookings =
    user.role === "admin"
      ? all
      : all.filter((b) => b.barberId === user.barberId || b.barberId === "any");
  const smtp = await isSmtpConfigured();
  const settings = await loadSettings();
  // The Domain page connects a custom domain to a SaaS tenant. A customer ZIP
  // install runs on the buyer's own server with their own domain, so there is
  // no tenant context and the Domain feature is hidden.
  const isTenant = !!getCurrentTenant();
  const marketingFlags = await resolveMarketingFlags();
  return (
    <AdminDashboard
      initial={bookings}
      smtpReady={smtp}
      onboarded={!!settings.onboarded}
      isTenant={isTenant}
      marketingFlags={marketingFlags}
      me={{
        id: user.id,
        email: user.email,
        role: user.role,
        barberId: user.barberId,
        mustChangePassword: !!user.mustChangePassword,
      }}
    />
  );
}
