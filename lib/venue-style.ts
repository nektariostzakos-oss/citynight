// Resolves DesignParams → scoped CSS custom properties for a venue page.
//
// The renderer sets these on the venue's <article style={...}>, so every
// child component can reach for var(--venue-accent), var(--venue-display-size),
// etc. without leaking the venue's design into the rest of the site.
//
// This keeps the venue page fully SSR / ISR friendly (no client JS to apply
// styles), matches Tailwind v4's CSS-variable-first approach, and lets a
// single component implementation render dozens of distinct designs.

import type { CSSProperties } from 'react';
import {
  getPalette, getTypePair,
  DENSITY_SCALE,
  type DesignParams,
} from './design-system';

type VenueStyleVars = CSSProperties & Record<`--${string}`, string>;

export function venueStyleVars(params: DesignParams): VenueStyleVars {
  const palette = getPalette(params.palette);
  const type = getTypePair(params.typePair);
  const density = DENSITY_SCALE[params.density];

  const motionMs =
    params.motion === 'subtle'  ? '180ms' :
    params.motion === 'dynamic' ? '320ms' :
                                  '520ms';

  // H2 derives from H1 at ~0.55× so visual hierarchy stays tight regardless
  // of the H1 size the type pair specifies. Mobile equivalents track the
  // same ratio for consistency.
  const h2Rem = (type.display.sizeRem * 0.55).toFixed(3);
  const h2RemMobile = (type.display.sizeRemMobile * 0.6).toFixed(3);

  return {
    '--venue-accent': palette.accent,
    '--venue-accent-soft': palette.accentSoft,
    '--venue-glow': palette.glow,
    '--venue-bg-tint': palette.bgTint,

    '--venue-display-weight': String(type.display.weight),
    '--venue-display-tracking': type.display.tracking,
    '--venue-display-transform': type.display.transform,
    '--venue-display-leading': String(type.display.leading),
    '--venue-display-size': `${type.display.sizeRem}rem`,
    '--venue-display-size-mobile': `${type.display.sizeRemMobile}rem`,
    '--venue-h2-size': `${h2Rem}rem`,
    '--venue-h2-size-mobile': `${h2RemMobile}rem`,

    '--venue-body-weight': String(type.body.weight),
    '--venue-body-tracking': type.body.tracking,
    '--venue-body-size': `${type.body.sizeRem}rem`,
    '--venue-body-leading': String(type.body.leading),

    '--venue-section-gap': density.sectionGap,
    '--venue-page-max': density.pageMax,
    '--venue-body-max': density.bodyMax,

    '--venue-motion-ms': motionMs,
  } as VenueStyleVars;
}
