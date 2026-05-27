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
