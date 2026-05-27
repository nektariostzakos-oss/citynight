"use client";

/**
 * Site chrome gate.
 *
 * The full-screen admin dashboard and the /setup wizard must not render the
 * public site Nav + Footer (they carry their own menus and would overlap).
 *
 * This decision cannot live in the root layout: Next does NOT re-render the
 * root layout on client-side (soft) navigation, so a soft-nav into /admin
 * would keep the public Nav until a hard refresh. `usePathname()` IS reactive
 * on soft navigation and resolves correctly during SSR, so the gate lives in
 * this client component instead.
 *
 * `tenantMode` is true only in the SaaS bundle (a tenant slug is present); it
 * is stable for the session. A standalone customer install keeps today's
 * behavior (chrome always shown) because `tenantMode` is false there.
 */
import { usePathname } from "next/navigation";

// Matches /admin, /setup and their sub-paths, with or without a /<slug>
// prefix: /admin, /barber/admin, /admin/login, /setup, /barber/setup ...
const FULLSCREEN = /(^|\/)(admin|setup)(\/|$)/;

export default function SiteChrome({
  tenantMode,
  nav,
  footer,
  children,
}: {
  tenantMode: boolean;
  nav: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "/";
  const hideChrome = tenantMode && FULLSCREEN.test(pathname);
  return (
    <>
      {!hideChrome && nav}
      {children}
      {!hideChrome && footer}
    </>
  );
}
