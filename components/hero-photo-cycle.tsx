'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

// Crossfading hero backdrop. Cycles through up to ~5 city photos every ~6s.
// Uses opacity transitions so the underlying gradient stays the only visible
// thing if all images are missing. SSR-safe: the first photo is rendered
// immediately so the hero is never blank before hydration.

export function HeroPhotoCycle({ photos, intervalMs = 7000 }: { photos: { url: string; alt: string }[]; intervalMs?: number }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (photos.length <= 1) return;
    // Honour reduced-motion.
    const m = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (m && m.matches) return;
    const t = window.setInterval(() => setIdx((i) => (i + 1) % photos.length), intervalMs);
    return () => window.clearInterval(t);
  }, [photos.length, intervalMs]);

  if (photos.length === 0) return null;

  return (
    <div className="absolute inset-0">
      {photos.map((p, i) => (
        <div
          key={p.url}
          className="absolute inset-0 transition-opacity duration-[2200ms] ease-in-out"
          style={{ opacity: i === idx ? 1 : 0 }}
          aria-hidden={i !== idx}
        >
          <Image
            src={p.url}
            alt={i === 0 ? p.alt : ''}
            fill
            sizes="100vw"
            priority={i === 0}
            className="object-cover city-hero-crop"
          />
        </div>
      ))}
    </div>
  );
}
