"use client";

/**
 * Android-aware download button.
 *
 * Detects an Android UA at first paint and either shows the big download
 * button or a friendly "open this on Android" note. The detection has to be
 * client-side: the server can read the UA header but the page is otherwise
 * fully static, so doing it here avoids needing a force-dynamic route.
 */
import { useEffect, useState } from "react";

export default function InstallButton({
  href,
  downloadLabel,
  notAndroidLabel,
}: {
  href: string;
  downloadLabel: string;
  notAndroidLabel: string;
}) {
  const [isAndroid, setIsAndroid] = useState<boolean | null>(null);
  useEffect(() => {
    setIsAndroid(/android/i.test(navigator.userAgent));
  }, []);

  if (isAndroid === null) {
    return (
      <div className="mt-8 h-12 animate-pulse rounded-full bg-white/5" aria-hidden />
    );
  }

  if (!isAndroid) {
    return (
      <p className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/70">
        {notAndroidLabel}
      </p>
    );
  }

  return (
    <a
      href={href}
      className="mt-8 inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#c9a961] px-8 py-3 text-sm font-semibold uppercase tracking-widest text-black hover:opacity-90"
    >
      {downloadLabel}
    </a>
  );
}
