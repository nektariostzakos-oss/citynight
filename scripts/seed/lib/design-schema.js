// JS mirror of the DesignParams schema from lib/design-system.ts. Kept here
// (and ONLY here) so the seed pipeline + writer + test can validate batch
// results without spinning up the TypeScript compiler.
//
// MUST stay in lockstep with lib/design-system.ts. The accompanying test
// (scripts/seed/tests/design-writer.test.js) loads the TS module via tsx
// and asserts the two are equal — drift will fail CI.

export const PALETTE_IDS = Object.freeze([
  'neon-pink', 'electric-cyan', 'electric-violet', 'solar-amber',
  'acid-lime', 'magenta-rave', 'oceanic-teal', 'ember-coral',
  'royal-purple', 'aegean-blue', 'peach-gold', 'bone-white',
]);

export const TYPE_PAIR_IDS = Object.freeze([
  'editorial', 'brutalist', 'glamour', 'industrial',
]);

export const HERO_LAYOUTS = Object.freeze([
  'split', 'full-bleed', 'layered', 'marquee', 'gallery-grid', 'editorial',
]);

export const DENSITIES = Object.freeze(['tight', 'default', 'airy']);
export const MOTIONS = Object.freeze(['subtle', 'dynamic', 'kinetic']);

export const SECTIONS = Object.freeze([
  'overview', 'events', 'hours', 'location', 'faq', 'related',
]);

export const DEFAULT_SECTION_ORDER = Object.freeze([
  'overview', 'events', 'hours', 'location', 'related', 'faq',
]);

// Validate a parsed JSON blob against the DesignParams shape. Returns the
// canonicalised object or null. The writer rejects null inputs so a bad AI
// response never reaches the DB.
export function parseDesignParams(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.v !== 1) return null;
  if (!PALETTE_IDS.includes(raw.palette)) return null;
  if (!TYPE_PAIR_IDS.includes(raw.typePair)) return null;
  if (!HERO_LAYOUTS.includes(raw.heroLayout)) return null;
  if (!DENSITIES.includes(raw.density)) return null;
  if (!MOTIONS.includes(raw.motion)) return null;
  let order = Array.isArray(raw.sectionOrder)
    ? raw.sectionOrder.filter((s) => SECTIONS.includes(s))
    : null;
  if (!order || !order.length) order = DEFAULT_SECTION_ORDER.slice();
  return {
    v: 1,
    palette: raw.palette,
    typePair: raw.typePair,
    heroLayout: raw.heroLayout,
    density: raw.density,
    motion: raw.motion,
    sectionOrder: order,
  };
}
