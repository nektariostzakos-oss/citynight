// Per-venue design system — the source of truth for "every venue gets its own
// designed page." The AI design writer (§Phase C) picks one value from each
// of the enums below; the renderer (§Phase B) emits scoped CSS variables on
// the venue page and dispatches to the right hero / section components.
//
// Constraints baked into this file:
//   • Neon stays an ACCENT only (§13). Body text never inherits --venue-accent.
//   • Every palette × type-pair × layout combination must look good — we
//     manually curate the enums so the AI can't pick an ugly mix.
//   • No external font loads here. Type pairs vary weight / tracking / case
//     within the single Manrope family already preloaded in app/layout.tsx
//     (keeps LCP <2.0s — see project memory).

// -------- palettes --------------------------------------------------------

export type Palette = {
  id: string;
  name: string;
  /** Primary accent — used for CTAs, focus rings, link underlines, badges. */
  accent: string;
  /** Translucent accent for soft fills (hex with alpha, OKLab-safe). */
  accentSoft: string;
  /** Glow shadow color used by hero scrim + featured frames. */
  glow: string;
  /** Subtle background tint applied to bg-1/2 panels on this venue. */
  bgTint: string;
  /** Human-readable mood — also surfaced as a hint to the AI design writer. */
  vibe: string;
  /** Category slugs this palette typically fits well (AI picker hint, not enforced). */
  fits: readonly string[];
};

export const PALETTES = [
  {
    id: 'neon-pink',
    name: 'Neon Pink',
    accent: '#ff2d95',
    accentSoft: 'rgba(255,45,149,0.18)',
    glow: 'rgba(255,45,149,0.45)',
    bgTint: 'rgba(255,45,149,0.04)',
    vibe: 'high-energy club, late-night, dancefloor',
    fits: ['night_club', 'bouzoukia'],
  },
  {
    id: 'electric-cyan',
    name: 'Electric Cyan',
    accent: '#00e5ff',
    accentSoft: 'rgba(0,229,255,0.18)',
    glow: 'rgba(0,229,255,0.40)',
    bgTint: 'rgba(0,229,255,0.04)',
    vibe: 'modern club, electronic, minimalist tech',
    fits: ['night_club', 'bar'],
  },
  {
    id: 'electric-violet',
    name: 'Electric Violet',
    accent: '#8b5cf6',
    accentSoft: 'rgba(139,92,246,0.18)',
    glow: 'rgba(139,92,246,0.40)',
    bgTint: 'rgba(139,92,246,0.04)',
    vibe: 'after-hours, hypnotic, deep night',
    fits: ['night_club', 'live_music'],
  },
  {
    id: 'solar-amber',
    name: 'Solar Amber',
    accent: '#ffb020',
    accentSoft: 'rgba(255,176,32,0.18)',
    glow: 'rgba(255,176,32,0.40)',
    bgTint: 'rgba(255,176,32,0.03)',
    vibe: 'warm rooftop, golden hour, sunset bar',
    fits: ['rooftop_bar', 'bar'],
  },
  {
    id: 'acid-lime',
    name: 'Acid Lime',
    accent: '#c0ff2e',
    accentSoft: 'rgba(192,255,46,0.18)',
    glow: 'rgba(192,255,46,0.36)',
    bgTint: 'rgba(192,255,46,0.04)',
    vibe: 'sharp underground, techno, day-rave',
    fits: ['night_club', 'beach_club'],
  },
  {
    id: 'magenta-rave',
    name: 'Magenta Rave',
    accent: '#d946ef',
    accentSoft: 'rgba(217,70,239,0.18)',
    glow: 'rgba(217,70,239,0.42)',
    bgTint: 'rgba(217,70,239,0.04)',
    vibe: 'queer-friendly, pride, festival energy',
    fits: ['night_club', 'bar'],
  },
  {
    id: 'oceanic-teal',
    name: 'Oceanic Teal',
    accent: '#14e0bf',
    accentSoft: 'rgba(20,224,191,0.18)',
    glow: 'rgba(20,224,191,0.36)',
    bgTint: 'rgba(20,224,191,0.04)',
    vibe: 'beach club daytime, fresh, breezy',
    fits: ['beach_club', 'rooftop_bar'],
  },
  {
    id: 'ember-coral',
    name: 'Ember Coral',
    accent: '#ff5b3c',
    accentSoft: 'rgba(255,91,60,0.18)',
    glow: 'rgba(255,91,60,0.40)',
    bgTint: 'rgba(255,91,60,0.04)',
    vibe: 'sunset terrace, cocktail bar, mediterranean',
    fits: ['bar', 'rooftop_bar', 'beach_club'],
  },
  {
    id: 'royal-purple',
    name: 'Royal Purple',
    accent: '#6d28d9',
    accentSoft: 'rgba(109,40,217,0.20)',
    glow: 'rgba(109,40,217,0.45)',
    bgTint: 'rgba(109,40,217,0.05)',
    vibe: 'luxury lounge, members-only, after-show',
    fits: ['bar', 'live_music'],
  },
  {
    id: 'aegean-blue',
    name: 'Aegean Blue',
    accent: '#2f7bff',
    accentSoft: 'rgba(47,123,255,0.20)',
    glow: 'rgba(47,123,255,0.40)',
    bgTint: 'rgba(47,123,255,0.05)',
    vibe: 'island night, harbour, classy seaside',
    fits: ['beach_club', 'rooftop_bar'],
  },
  {
    id: 'peach-gold',
    name: 'Peach Gold',
    accent: '#ffb38a',
    accentSoft: 'rgba(255,179,138,0.22)',
    glow: 'rgba(255,179,138,0.40)',
    bgTint: 'rgba(255,179,138,0.05)',
    vibe: 'romantic terrace, slow night, intimate',
    fits: ['bar', 'rooftop_bar'],
  },
  {
    id: 'bone-white',
    name: 'Bone White',
    accent: '#f4f4f6',
    accentSoft: 'rgba(244,244,246,0.16)',
    glow: 'rgba(244,244,246,0.30)',
    bgTint: 'rgba(255,255,255,0.02)',
    vibe: 'editorial, minimal, design-led venue',
    fits: ['bar', 'live_music', 'rooftop_bar'],
  },
] as const satisfies readonly Palette[];

export type PaletteId = (typeof PALETTES)[number]['id'];
export const PALETTE_IDS = PALETTES.map((p) => p.id) as readonly PaletteId[];

// -------- type pairs ------------------------------------------------------

// Each pair is a "typographic voice" expressed entirely through Manrope's
// weight + tracking + case + scale. All four are accessible (body always sits
// at 16-19px with normal tracking; only the display layer changes character).
export type TypePair = {
  id: string;
  name: string;
  /** Display headings (h1/h2). Body always uses --font-sans. */
  display: {
    weight: 500 | 600 | 700;
    /** CSS letter-spacing. */
    tracking: string;
    /** CSS text-transform. */
    transform: 'none' | 'uppercase' | 'lowercase';
    /** H1 size for desktop (rem). H2 derives at 0.55×. */
    sizeRem: number;
    /** Mobile H1 size (rem). */
    sizeRemMobile: number;
    /** CSS line-height. */
    leading: number;
  };
  body: {
    weight: 400 | 500;
    tracking: string;
    /** Bumps body size + line-height for "airy editorial" feel. */
    sizeRem: number;
    leading: number;
  };
  /** Human mood — AI hint. */
  vibe: string;
};

export const TYPE_PAIRS = [
  {
    id: 'editorial',
    name: 'Editorial',
    display: { weight: 600, tracking: '-0.02em', transform: 'none',      sizeRem: 4.5, sizeRemMobile: 2.75, leading: 1.02 },
    body:    { weight: 500, tracking: '0',        sizeRem: 1.125, leading: 1.65 },
    vibe: 'literary magazine, descriptive, slower read',
  },
  {
    id: 'brutalist',
    name: 'Brutalist',
    display: { weight: 700, tracking: '-0.035em', transform: 'uppercase', sizeRem: 5.0, sizeRemMobile: 3.0,  leading: 0.96 },
    body:    { weight: 500, tracking: '0',        sizeRem: 1.0625, leading: 1.55 },
    vibe: 'loud, in-your-face, dancefloor energy',
  },
  {
    id: 'glamour',
    name: 'Glamour',
    display: { weight: 500, tracking: '0.08em',   transform: 'uppercase', sizeRem: 3.25, sizeRemMobile: 2.0,  leading: 1.15 },
    body:    { weight: 500, tracking: '0.005em',  sizeRem: 1.0625, leading: 1.7 },
    vibe: 'cocktail bar, fashion week, refined night',
  },
  {
    id: 'industrial',
    name: 'Industrial',
    display: { weight: 700, tracking: '-0.025em', transform: 'uppercase', sizeRem: 3.75, sizeRemMobile: 2.5, leading: 1.0 },
    body:    { weight: 500, tracking: '0',        sizeRem: 1.0,    leading: 1.6 },
    vibe: 'techno warehouse, raw, mechanical',
  },
] as const satisfies readonly TypePair[];

export type TypePairId = (typeof TYPE_PAIRS)[number]['id'];
export const TYPE_PAIR_IDS = TYPE_PAIRS.map((t) => t.id) as readonly TypePairId[];

// -------- hero layouts ----------------------------------------------------

export const HERO_LAYOUTS = [
  'split',         // left content / right photo, full bleed photo
  'full-bleed',    // photo fills viewport, name overlaid bottom
  'layered',       // name floats center, photo behind with mask
  'marquee',       // huge sliding name marquee + photo strip
  'gallery-grid',  // 4-photo asymmetric grid + content right
  'editorial',     // magazine column with drop-cap, photo right
] as const;
export type HeroLayout = (typeof HERO_LAYOUTS)[number];

// Which hero layouts need 2+ photos to render correctly (otherwise the
// renderer falls back to 'split' which works with one).
export const HERO_NEEDS_MULTI_PHOTO: Record<HeroLayout, boolean> = {
  split: false,
  'full-bleed': false,
  layered: false,
  marquee: false,
  'gallery-grid': true,
  editorial: false,
};

// -------- section order ---------------------------------------------------

// Sections that can appear on a venue page. The AI writer picks an order;
// renderer skips any section the venue has no data for.
export const SECTIONS = ['overview', 'events', 'hours', 'location', 'faq', 'related'] as const;
export type Section = (typeof SECTIONS)[number];

// -------- density + motion -----------------------------------------------

export const DENSITIES = ['tight', 'default', 'airy'] as const;
export type Density = (typeof DENSITIES)[number];

// Density → spacing scale (used by the renderer to set --venue-spacing-* vars).
export const DENSITY_SCALE: Record<Density, { sectionGap: string; pageMax: string; bodyMax: string }> = {
  tight:   { sectionGap: '2.5rem', pageMax: '64rem', bodyMax: '38rem' },
  default: { sectionGap: '4rem',   pageMax: '72rem', bodyMax: '42rem' },
  airy:    { sectionGap: '6rem',   pageMax: '80rem', bodyMax: '48rem' },
};

export const MOTIONS = ['subtle', 'dynamic', 'kinetic'] as const;
export type Motion = (typeof MOTIONS)[number];

// -------- DesignParams (the AI output shape) ------------------------------

export type DesignParams = {
  /** Schema version — bump when we add/remove enum values. */
  v: 1;
  palette: PaletteId;
  typePair: TypePairId;
  heroLayout: HeroLayout;
  density: Density;
  motion: Motion;
  /** Section order. Anything missing falls back to the default order. */
  sectionOrder: readonly Section[];
};

export const DEFAULT_SECTION_ORDER: readonly Section[] = [
  'overview', 'events', 'hours', 'location', 'related', 'faq',
];

// -------- validator + fallback --------------------------------------------

/**
 * Validate an unknown blob (e.g. from `venues.design_params` JSON or an AI
 * batch result) against the DesignParams shape. Returns null if invalid so
 * the renderer can fall back to a deterministic default rather than crashing.
 */
export function parseDesignParams(raw: unknown): DesignParams | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.v !== 1) return null;
  if (!isOneOf(r.palette, PALETTE_IDS)) return null;
  if (!isOneOf(r.typePair, TYPE_PAIR_IDS)) return null;
  if (!isOneOf(r.heroLayout, HERO_LAYOUTS)) return null;
  if (!isOneOf(r.density, DENSITIES)) return null;
  if (!isOneOf(r.motion, MOTIONS)) return null;
  const order = Array.isArray(r.sectionOrder)
    ? r.sectionOrder.filter((s): s is Section => isOneOf(s, SECTIONS))
    : DEFAULT_SECTION_ORDER;
  return {
    v: 1,
    palette: r.palette as PaletteId,
    typePair: r.typePair as TypePairId,
    heroLayout: r.heroLayout as HeroLayout,
    density: r.density as Density,
    motion: r.motion as Motion,
    sectionOrder: order.length ? order : DEFAULT_SECTION_ORDER,
  };
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

/**
 * Deterministic fallback when a venue has no AI-generated design_params yet.
 * Hashes the venue id to pick a stable palette + layout combination so the
 * page doesn't change on every render and stays cached by ISR.
 *
 * Category-aware hints: bouzoukia favours hot palettes + brutalist type,
 * rooftops favour warm + editorial, beach clubs favour oceanic + glamour.
 */
export function defaultDesignParams(input: {
  venueId: string;
  categorySlug: string | null;
}): DesignParams {
  const seed = hash32(input.venueId);
  const cat = input.categorySlug ?? '';

  // Category-biased palette pools — keep neon energy where it belongs.
  const palettePool =
    cat === 'bouzoukia'   ? (['neon-pink','magenta-rave','royal-purple','ember-coral'] as const) :
    cat === 'rooftop_bar' ? (['solar-amber','peach-gold','ember-coral','bone-white','aegean-blue'] as const) :
    cat === 'beach_club'  ? (['oceanic-teal','aegean-blue','solar-amber','acid-lime'] as const) :
    cat === 'live_music'  ? (['electric-violet','royal-purple','ember-coral','bone-white'] as const) :
    cat === 'night_club'  ? (['neon-pink','electric-cyan','electric-violet','acid-lime','magenta-rave'] as const) :
                            (PALETTE_IDS); // generic bar / other

  const typePool =
    cat === 'bouzoukia'   ? (['brutalist','industrial'] as const) :
    cat === 'night_club'  ? (['brutalist','industrial','editorial'] as const) :
    cat === 'rooftop_bar' ? (['editorial','glamour'] as const) :
    cat === 'beach_club'  ? (['glamour','editorial'] as const) :
                            (TYPE_PAIR_IDS);

  return {
    v: 1,
    palette: palettePool[seed % palettePool.length] as PaletteId,
    typePair: typePool[(seed >>> 3) % typePool.length] as TypePairId,
    heroLayout: HERO_LAYOUTS[(seed >>> 6) % HERO_LAYOUTS.length] as HeroLayout,
    density: DENSITIES[(seed >>> 9) % DENSITIES.length] as Density,
    motion: MOTIONS[(seed >>> 11) % MOTIONS.length] as Motion,
    sectionOrder: DEFAULT_SECTION_ORDER,
  };
}

/** Small deterministic 32-bit hash (FNV-1a) — no crypto needed, fast in ISR. */
function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// -------- helpers for the renderer ----------------------------------------

export function getPalette(id: PaletteId): Palette {
  const p = PALETTES.find((x) => x.id === id);
  if (!p) throw new Error(`unknown palette: ${id}`);
  return p;
}

export function getTypePair(id: TypePairId): TypePair {
  const p = TYPE_PAIRS.find((x) => x.id === id);
  if (!p) throw new Error(`unknown type pair: ${id}`);
  return p;
}
