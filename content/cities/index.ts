// City guide content loader. The MDX/JSON content per city is curated by humans
// — no AI generation — and lives in content/cities/{slug}.json. We type-cast it
// here so consumers get autocomplete on the (slug, name, blurb) shape.
//
// Schema is layered so we can extend without breaking older consumers:
//   - top-level `intro` + `bestFor` = the nightlife vertical (the original site
//     scope; many pages still expect this exact shape)
//   - optional `food` and `stay` blocks carry the same intro/bestFor pair for
//     the two newer verticals (added 2026-05-24 scope expansion)
//   - `heroQueries` carries per-vertical Unsplash search strings, tuned to
//     return clean landscape/cityscape shots (no text, no people-with-signs,
//     no branded events/festivals). The seed `city-photos` stage will use
//     these to fetch real, attributed photos at seed time.

import type { Locale } from '@/lib/i18n';
import aegina from './aegina.json';
import andros from './andros.json';
import athens from './athens.json';
import chania from './chania.json';
import chios from './chios.json';
import corfu from './corfu.json';
import halkidiki from './halkidiki.json';
import heraklion from './heraklion.json';
import hydra from './hydra.json';
import ioannina from './ioannina.json';
import ios from './ios.json';
import kefalonia from './kefalonia.json';
import kos from './kos.json';
import lefkada from './lefkada.json';
import lesvos from './lesvos.json';
import milos from './milos.json';
import mykonos from './mykonos.json';
import nafplio from './nafplio.json';
import naxos from './naxos.json';
import paros from './paros.json';
import patmos from './patmos.json';
import patras from './patras.json';
import rethymno from './rethymno.json';
import rhodes from './rhodes.json';
import samos from './samos.json';
import santorini from './santorini.json';
import sifnos from './sifnos.json';
import skiathos from './skiathos.json';
import spetses from './spetses.json';
import symi from './symi.json';
import thessaloniki from './thessaloniki.json';
import tinos from './tinos.json';
import zakynthos from './zakynthos.json';

export type Neighborhood = {
  slug: string;
  name: Record<Locale, string>;
  blurb: Record<Locale, string>;
};

export type VerticalContent = {
  bestFor: Record<Locale, string[]>;
  intro: Record<Locale, string>;
};

export type HeroQueries = {
  hero: string;
  nightlife: string;
  food: string;
  stay: string;
};

export type CityGuide = {
  slug: string;
  dbId: string;
  season: string;
  // Nightlife vertical lives at the top level for backward-compat with the
  // pages that landed before the food/stay expansion.
  bestFor: Record<Locale, string[]>;
  intro: Record<Locale, string>;
  neighborhoods: Neighborhood[];
  // New verticals (optional during the rollout — fall back to nightlife if absent).
  food?: VerticalContent;
  stay?: VerticalContent;
  // Image sourcing. `heroQueries` is the new structured form; `unsplashQuery`
  // is kept for the seed stage that already reads it.
  heroQueries?: HeroQueries;
  unsplashQuery: string;
};

const ALL: CityGuide[] = [
  aegina, andros, athens, chania, chios, corfu, halkidiki, heraklion, hydra, ioannina,
  ios, kefalonia, kos, lefkada, lesvos, milos, mykonos, nafplio, naxos, paros,
  patmos, patras, rethymno, rhodes, samos, santorini, sifnos, skiathos, spetses, symi,
  thessaloniki, tinos, zakynthos,
] as CityGuide[];

export function getCityGuide(slug: string): CityGuide | null {
  return ALL.find((c) => c.slug === slug) ?? null;
}

export function getAllCityGuides(): CityGuide[] {
  return ALL;
}

export type Vertical = 'nightlife' | 'food' | 'stay';

export function isVertical(v: string | null | undefined): v is Vertical {
  return v === 'nightlife' || v === 'food' || v === 'stay';
}

export function getVertical(guide: CityGuide, vertical: Vertical): VerticalContent {
  if (vertical === 'food' && guide.food) return guide.food;
  if (vertical === 'stay' && guide.stay) return guide.stay;
  return { bestFor: guide.bestFor, intro: guide.intro };
}
