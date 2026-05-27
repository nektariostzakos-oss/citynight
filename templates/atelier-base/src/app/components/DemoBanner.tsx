"use client";

import { useEffect, useState } from "react";

type Props = {
  marketingUrl: string;
};

export default function DemoBanner({ marketingUrl }: Props) {
  // The banner is permanent on the live demo — there is no dismiss control, so
  // the buy CTA stays in front of every visitor. It is hidden in two cases:
  // the screenshot tooling, and the /preview routes (the admin template picker
  // iframes them as thumbnails), where the demo chrome must not appear.
  const [hidden, setHidden] = useState(false);
  // Tenant-prefixed admin URL, so the one-click auto-login lands on THIS
  // demo's admin (e.g. /demo2/admin) and not the marketing app's /admin.
  const [adminHref, setAdminHref] = useState("/admin/login?auto=1");

  // The Buy CTA sends visitors to the marketing site's pricing page.
  const pricingUrl = `${marketingUrl.replace(/\/+$/, "")}/pricing`;

  useEffect(() => {
    try {
      const screenshotMode = window.localStorage.getItem("atelier_screenshot_mode") === "1";
      const isPreviewRoute = /\/preview(\/|$)/.test(window.location.pathname);
      setHidden(screenshotMode || isPreviewRoute);
      const slug = document.documentElement.dataset.tenant;
      if (slug) setAdminHref(`/${slug}/admin/login?auto=1`);
    } catch {}
  }, []);

  if (hidden) return null;

  return (
    <div className="sticky top-0 z-[60] w-full bg-[#c9a961] text-black">
      <div className="mx-auto flex max-w-7xl flex-nowrap items-center justify-center gap-2 px-3 py-1.5 text-[13px] sm:gap-3 sm:px-4 sm:text-sm">
        <span className="shrink-0 font-semibold uppercase tracking-widest sm:tracking-wider">
          Demo mode
        </span>
        <a
          href={adminHref}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-full border border-black/30 bg-black/[0.06] px-3.5 py-1.5 font-semibold text-black hover:bg-black/15"
        >
          <span className="sm:hidden">Admin</span>
          <span className="hidden sm:inline">View admin →</span>
        </a>
        <a
          href={pricingUrl}
          className="shrink-0 rounded-full bg-black/85 px-3.5 py-1.5 font-semibold text-[#c9a961] hover:bg-black"
        >
          <span className="sm:hidden">Buy</span>
          <span className="hidden sm:inline">Buy this site →</span>
        </a>
      </div>
    </div>
  );
}
