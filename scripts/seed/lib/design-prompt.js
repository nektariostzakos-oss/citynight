// Anthropic Message Batches prompt for Phase C — the AI design writer.
//
// The model is an art director, not a designer. Its only job is to pick one
// value from each enum (palette / typePair / heroLayout / density / motion)
// and propose a section order. It never authors copy, layout code, or facts.
// The renderer composes the page from the picked combination + a hand-built
// design system (lib/design-system.ts).
//
// Defense-in-depth: any output that fails parseDesignParams() is dropped at
// the writer layer (scripts/seed/lib/design-writer.js).

import {
  PALETTE_IDS, TYPE_PAIR_IDS, HERO_LAYOUTS, DENSITIES, MOTIONS, SECTIONS,
} from './design-schema.js';

const BATCHES_URL = 'https://api.anthropic.com/v1/messages/batches';

function key() {
  const k = process.env.ANTHROPIC_API_KEY;
  if (!k) throw new Error('ANTHROPIC_API_KEY is required for design enrichment.');
  return k;
}

function headers(version) {
  return {
    'x-api-key': key(),
    'anthropic-version': version,
    'content-type': 'application/json',
  };
}

// System prompt — strict JSON, enum-locked, no prose, no opinions on copy.
const SYSTEM = `You pick visual design parameters for a venue page on citynight.gr, Greece's nightlife guide.

You are an art director, NOT a writer. You do not produce copy, descriptions, hours, prices, or any text other than the JSON object below.

ABSOLUTE RULES — violation will cause your output to be discarded:
1. Output STRICT JSON only. No prose, no markdown, no code fences.
2. Pick ONE value from each enum below. Use the venue's category and vibe to
   guide the picks — match the energy of the place.
3. Section order: include each of these EXACTLY ONCE in the order you think
   reads best for this venue: overview, events, hours, location, faq, related.
4. Do not invent enum values. If you are unsure, choose the closest match
   from the lists.

ENUMS:
  palette: ${PALETTE_IDS.join(' | ')}
  typePair: ${TYPE_PAIR_IDS.join(' | ')}
  heroLayout: ${HERO_LAYOUTS.join(' | ')}
  density: ${DENSITIES.join(' | ')}
  motion: ${MOTIONS.join(' | ')}
  sectionOrder values: ${SECTIONS.join(' | ')}

OUTPUT SCHEMA (return EXACTLY this shape):
{"v":1,"palette":"...","typePair":"...","heroLayout":"...","density":"...","motion":"...","sectionOrder":["...","...","...","...","...","..."]}

PICKING GUIDANCE:
- Hot, club, late-night → neon-pink / magenta-rave / electric-violet, brutalist or industrial type, marquee or full-bleed hero, kinetic motion.
- Rooftop, sunset, cocktail → solar-amber / peach-gold / ember-coral, editorial or glamour type, split or editorial hero, subtle motion.
- Beach club, daytime → oceanic-teal / aegean-blue / acid-lime, glamour or editorial, gallery-grid or full-bleed, dynamic motion.
- Bouzoukia, live Greek night → neon-pink / royal-purple, brutalist, marquee, kinetic.
- Jazz / refined live music → royal-purple / bone-white, editorial, editorial or layered hero, subtle motion.
- Minimal / design-led bar → bone-white, editorial or glamour, split or editorial hero, subtle motion.`;

function userPromptFor(venue) {
  // Only non-fact inputs go to the model. Phone / hours / price / website /
  // exact address are deliberately omitted so the model can't echo them.
  const safe = {
    name: venue.name,
    city: venue.city_name,
    area: venue.area_name ?? null,
    category: venue.category_name ?? null,
    primary_type: venue.primary_type ?? null,
    types: Array.isArray(venue.types) ? venue.types.slice(0, 6) : [],
    // The English description (already AI-written, evergreen, no facts) is a
    // useful vibe signal. Trim it so it doesn't dominate the prompt.
    vibe: typeof venue.description === 'string' ? venue.description.slice(0, 280) : null,
  };
  return `Venue:\n${JSON.stringify(safe, null, 2)}\n\nReturn the JSON object now.`;
}

export function designBatchRequestFor(venue, { model }) {
  return {
    custom_id: venue.id,
    params: {
      model,
      max_tokens: 220,
      // Lower than enrichment — picking from enums; no creativity required.
      temperature: 0.2,
      system: SYSTEM,
      messages: [{ role: 'user', content: userPromptFor(venue) }],
    },
  };
}

export async function createDesignBatch(requests, anthropicVersion) {
  const res = await fetch(BATCHES_URL, {
    method: 'POST',
    headers: headers(anthropicVersion),
    body: JSON.stringify({ requests }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Anthropic batch create ${res.status}: ${txt.slice(0, 300)}`);
  }
  return res.json();
}

export async function getDesignBatch(batchId, anthropicVersion) {
  const res = await fetch(`${BATCHES_URL}/${batchId}`, { headers: headers(anthropicVersion) });
  if (!res.ok) throw new Error(`Anthropic batch get ${res.status}`);
  return res.json();
}

export async function downloadDesignBatchResults(resultsUrl, anthropicVersion) {
  const res = await fetch(resultsUrl, { headers: headers(anthropicVersion) });
  if (!res.ok) throw new Error(`Anthropic batch download ${res.status}`);
  const text = await res.text();
  return text.split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

export function extractDesignText(resultRow) {
  const r = resultRow.result;
  if (!r || r.type !== 'succeeded') return null;
  const blocks = r.message?.content ?? [];
  return blocks.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}

// Parse the design JSON safely. Returns the raw object or null. The writer
// runs parseDesignParams() on whatever we return — the validator there is
// the schema gate.
export function parseDesignText(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}
