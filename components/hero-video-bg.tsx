'use client';

import { useEffect, useState } from 'react';

// YouTube background video for the hero. Loads AFTER hydration so:
//   - SSR / crawlers / no-JS users see the still image poster below this
//     component (rendered as a sibling by the parent — see app/page.tsx).
//   - Initial LCP is the poster image, not the iframe.
//   - prefers-reduced-motion users never get the video.
//
// Controlled by NEXT_PUBLIC_HERO_YOUTUBE_ID — if unset, this component renders
// nothing and the page falls back to the static hero image cleanly.

export function HeroVideoBg({ videoId }: { videoId: string }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Honour reduced-motion.
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (m.matches) return;
    // Cheap mobile-data guard — skip on save-data hint.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conn = (navigator as any).connection;
    if (conn?.saveData) return;
    // Delay a tick so the poster image paints first.
    const t = window.setTimeout(() => setEnabled(true), 250);
    return () => window.clearTimeout(t);
  }, []);

  if (!enabled) return null;

  // Loop trick: `loop=1` alone doesn't loop on the IFrame embed — you also need
  // `playlist=<same-id>`. modestbranding + rel + controls hide UI chrome.
  const src =
    `https://www.youtube.com/embed/${videoId}` +
    `?autoplay=1&mute=1&loop=1&playlist=${videoId}` +
    `&controls=0&modestbranding=1&rel=0&showinfo=0&disablekb=1` +
    `&iv_load_policy=3&fs=0&playsinline=1`;

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      {/* Centred cover scaling: 16:9 iframe stretched so the shorter axis fills
          the viewport. On ultrawide screens we scale up the height; on tall
          mobile screens we scale up the width. Either way the iframe spills off
          the visible area rather than letterboxing. */}
      <iframe
        title=""
        src={src}
        allow="autoplay; encrypted-media; picture-in-picture"
        className="absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2 border-0"
      />
    </div>
  );
}
