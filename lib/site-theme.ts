// Per-template theme tokens for SaaS sites (Phase G3).
//
// Each SaaS template (restaurant, bar, …) has its own palette + typography.
// The shape mirrors the Atelier meta.json so customers who later download
// the ZIP recognise the same theme. The renderer reads these via inline
// `style={{...}}` on the site layout — same approach as venueStyleVars()
// on the directory side, but the tokens are scoped to the site, not
// site-wide.

import type { CSSProperties } from 'react';

export type SiteTheme = {
  /** Used by next/font fallbacks; readable label only. */
  fontHeading: 'fraunces' | 'inter' | 'manrope';
  fontBody:    'inter'    | 'manrope';
  tokens: {
    background: string;
    foreground: string;
    primary: string;        // accent — links, CTAs
    primaryAccent: string;  // gradient companion
    surface: string;        // panel fill
    surfaceStrong: string;
    border: string;
    borderStrong: string;
    muted: string;          // secondary text
    muted2: string;         // tertiary text
  };
};

const TEMPLATES: Record<string, SiteTheme> = {
  // Restaurant — Lemoni cocoa-on-cream. Mirrors templates/atelier-base
  // /demos/restaurant/meta.json.
  restaurant: {
    fontHeading: 'fraunces',
    fontBody: 'inter',
    tokens: {
      background: '#0f0b07',
      foreground: '#f3ebdc',
      primary: '#c08a3a',
      primaryAccent: '#d6a55a',
      surface: 'rgba(255, 255, 255, 0.03)',
      surfaceStrong: 'rgba(255, 255, 255, 0.06)',
      border: 'rgba(255, 255, 255, 0.10)',
      borderStrong: 'rgba(255, 255, 255, 0.18)',
      muted: 'rgba(243, 235, 220, 0.65)',
      muted2: 'rgba(243, 235, 220, 0.45)',
    },
  },
  // Bar / rooftop / nightclub — cooler, deeper night palette, same fonts as
  // restaurant for type consistency v1 (we can split later if needed).
  bar: {
    fontHeading: 'fraunces',
    fontBody: 'inter',
    tokens: {
      background: '#07070b',
      foreground: '#f4f4f6',
      primary: '#ff2d95',
      primaryAccent: '#d946ef',
      surface: 'rgba(255, 255, 255, 0.03)',
      surfaceStrong: 'rgba(255, 255, 255, 0.06)',
      border: 'rgba(255, 255, 255, 0.10)',
      borderStrong: 'rgba(255, 255, 255, 0.18)',
      muted: 'rgba(244, 244, 246, 0.65)',
      muted2: 'rgba(244, 244, 246, 0.45)',
    },
  },
  // Phase I.9 — booking-capable industries.
  // Each palette is hand-picked from atelier's source theme.ts files
  // (one default per industry, the rest land later as a paid upsell).

  // Barber — Oakline-style warm dark + bourbon accent.
  barber: {
    fontHeading: 'fraunces',
    fontBody: 'inter',
    tokens: {
      background: '#11100d',
      foreground: '#efe7d3',
      primary: '#b9842f',
      primaryAccent: '#d9a857',
      surface: 'rgba(255, 255, 255, 0.04)',
      surfaceStrong: 'rgba(255, 255, 255, 0.07)',
      border: 'rgba(255, 255, 255, 0.10)',
      borderStrong: 'rgba(255, 255, 255, 0.18)',
      muted: 'rgba(239, 231, 211, 0.65)',
      muted2: 'rgba(239, 231, 211, 0.45)',
    },
  },
  // Hair salon — magazine cream + champagne, lighter base.
  hair: {
    fontHeading: 'fraunces',
    fontBody: 'inter',
    tokens: {
      background: '#100c0a',
      foreground: '#f4ecdd',
      primary: '#e0b97a',
      primaryAccent: '#d49b58',
      surface: 'rgba(244, 236, 221, 0.04)',
      surfaceStrong: 'rgba(244, 236, 221, 0.07)',
      border: 'rgba(244, 236, 221, 0.12)',
      borderStrong: 'rgba(244, 236, 221, 0.22)',
      muted: 'rgba(244, 236, 221, 0.66)',
      muted2: 'rgba(244, 236, 221, 0.42)',
    },
  },
  // Aesthetics clinic — clinical precision, blue-grey + ice accent.
  clinic: {
    fontHeading: 'manrope',
    fontBody: 'inter',
    tokens: {
      background: '#0c1014',
      foreground: '#e9eef5',
      primary: '#3aa3ff',
      primaryAccent: '#7cc3ff',
      surface: 'rgba(255, 255, 255, 0.03)',
      surfaceStrong: 'rgba(255, 255, 255, 0.06)',
      border: 'rgba(255, 255, 255, 0.10)',
      borderStrong: 'rgba(255, 255, 255, 0.20)',
      muted: 'rgba(233, 238, 245, 0.66)',
      muted2: 'rgba(233, 238, 245, 0.44)',
    },
  },
  // Nail studio — bright, minimal, premium. Powder pink accent.
  nail: {
    fontHeading: 'fraunces',
    fontBody: 'inter',
    tokens: {
      background: '#fbf8f4',
      foreground: '#1d1916',
      primary: '#d36e8c',
      primaryAccent: '#e89bb3',
      surface: 'rgba(29, 25, 22, 0.03)',
      surfaceStrong: 'rgba(29, 25, 22, 0.06)',
      border: 'rgba(29, 25, 22, 0.10)',
      borderStrong: 'rgba(29, 25, 22, 0.20)',
      muted: 'rgba(29, 25, 22, 0.65)',
      muted2: 'rgba(29, 25, 22, 0.45)',
    },
  },
  // Day spa — calm, organic, restful. Sage + warm sand.
  spa: {
    fontHeading: 'fraunces',
    fontBody: 'inter',
    tokens: {
      background: '#15120c',
      foreground: '#ece7d6',
      primary: '#8aa57b',
      primaryAccent: '#b7c89e',
      surface: 'rgba(255, 255, 255, 0.04)',
      surfaceStrong: 'rgba(255, 255, 255, 0.07)',
      border: 'rgba(255, 255, 255, 0.10)',
      borderStrong: 'rgba(255, 255, 255, 0.18)',
      muted: 'rgba(236, 231, 214, 0.65)',
      muted2: 'rgba(236, 231, 214, 0.45)',
    },
  },
  // Yoga studio — warm playful collage, terracotta + cream.
  yoga: {
    fontHeading: 'fraunces',
    fontBody: 'inter',
    tokens: {
      background: '#0d0b08',
      foreground: '#f3e8d6',
      primary: '#d5703a',
      primaryAccent: '#ec9760',
      surface: 'rgba(243, 232, 214, 0.04)',
      surfaceStrong: 'rgba(243, 232, 214, 0.07)',
      border: 'rgba(243, 232, 214, 0.10)',
      borderStrong: 'rgba(243, 232, 214, 0.22)',
      muted: 'rgba(243, 232, 214, 0.65)',
      muted2: 'rgba(243, 232, 214, 0.45)',
    },
  },

  // Default fallback for non-hospitality verticals — neutral, professional.
  other: {
    fontHeading: 'manrope',
    fontBody: 'inter',
    tokens: {
      background: '#0d0d14',
      foreground: '#f4f4f6',
      primary: '#00e5ff',
      primaryAccent: '#8b5cf6',
      surface: 'rgba(255, 255, 255, 0.03)',
      surfaceStrong: 'rgba(255, 255, 255, 0.06)',
      border: 'rgba(255, 255, 255, 0.10)',
      borderStrong: 'rgba(255, 255, 255, 0.18)',
      muted: 'rgba(244, 244, 246, 0.65)',
      muted2: 'rgba(244, 244, 246, 0.45)',
    },
  },
};

/** The set of templateIds that lead with bookable services (vs menu/photos).
 * Used by the home page dispatcher to pick the right SiteHome variant. */
export const BOOKING_LED_TEMPLATES = new Set<string>([
  'barber', 'hair', 'clinic', 'nail', 'spa', 'yoga',
]);

export function isBookingLedTemplate(templateId: string): boolean {
  return BOOKING_LED_TEMPLATES.has(templateId);
}

export function themeForTemplate(templateId: string): SiteTheme {
  return TEMPLATES[templateId] ?? TEMPLATES.other!;
}

type SiteStyleVars = CSSProperties & Record<`--${string}`, string>;

/** Inline-style CSS variables for the site layout's root element. */
export function siteStyleVars(templateId: string): SiteStyleVars {
  const t = themeForTemplate(templateId);
  return {
    '--site-bg':              t.tokens.background,
    '--site-fg':              t.tokens.foreground,
    '--site-primary':         t.tokens.primary,
    '--site-primary-accent':  t.tokens.primaryAccent,
    '--site-surface':         t.tokens.surface,
    '--site-surface-strong':  t.tokens.surfaceStrong,
    '--site-border':          t.tokens.border,
    '--site-border-strong':   t.tokens.borderStrong,
    '--site-muted':           t.tokens.muted,
    '--site-muted-2':         t.tokens.muted2,
    backgroundColor: t.tokens.background,
    color:           t.tokens.foreground,
  } as SiteStyleVars;
}
