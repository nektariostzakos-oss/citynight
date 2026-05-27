"use client";

import { useLang } from "../../lib/i18n";

/**
 * Billing-issue strip for a SaaS tenant. server.js sets the
 * `x-atelier-tenant-banner` request header when a tenant's subscription is
 * past_due or unpaid; the layout passes the value here. The public site stays
 * up. The admin area is put in read-only mode (see demo middleware).
 */
export default function TenantBanner({ kind }: { kind: string }) {
  const { lang } = useLang();
  if (kind !== "past_due" && kind !== "unpaid") return null;

  const en =
    "There is a problem with this site's billing. Editing is paused until payment is resolved.";
  const el =
    "Υπάρχει πρόβλημα με τη χρέωση αυτού του ιστότοπου. Οι αλλαγές είναι σε παύση μέχρι να τακτοποιηθεί η πληρωμή.";

  return (
    <div className="sticky top-0 z-[60] w-full bg-[#e4b73d] text-black">
      <div className="mx-auto max-w-7xl px-4 py-2 text-center text-[12px] font-semibold sm:text-sm">
        {lang === "el" ? el : en}
      </div>
    </div>
  );
}
