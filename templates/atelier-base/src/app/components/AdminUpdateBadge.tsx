"use client";

import { useEffect, useState } from "react";

type VersionInfo = {
  current: string;
  latest: string;
  updateAvailable: boolean;
};

/**
 * Always-visible pill in the admin header showing the running template
 * version. Switches to a gold "Update available" state when a newer
 * version is published on the operator side.
 *
 * Either way the pill links to /admin/update with the appropriate
 * instructions (git pull vs. ZIP replacement).
 */
export default function AdminUpdateBadge() {
  const [info, setInfo] = useState<VersionInfo | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/version", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: VersionInfo) => {
        if (alive) setInfo(d);
      })
      .catch(() => {
        if (alive) setInfo({ current: "?", latest: "?", updateAvailable: false });
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!info) return null;

  if (info.updateAvailable) {
    return (
      <a
        href="/admin/update"
        title={`v${info.latest} is available. You're on v${info.current}`}
        className="inline-flex items-center gap-2 rounded-full border border-[#c9a961]/60 bg-[#c9a961]/15 px-3 py-1.5 text-[10px] uppercase tracking-widest text-[#c9a961] transition-colors hover:bg-[#c9a961]/25 sm:px-4 sm:py-2 sm:text-xs"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c9a961] opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#c9a961]" />
        </span>
        <span className="hidden sm:inline">Update · v{info.latest}</span>
        <span className="sm:hidden">v{info.latest}</span>
      </a>
    );
  }

  return (
    <a
      href="/admin/update"
      title="View template version and update instructions"
      className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-[10px] uppercase tracking-widest text-white/55 transition-colors hover:bg-white/10 hover:text-white/80 sm:px-4 sm:py-2 sm:text-xs"
    >
      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
      <span className="hidden sm:inline">v{info.current}</span>
      <span className="sm:hidden">v{info.current}</span>
    </a>
  );
}
