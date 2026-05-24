// Anthropic Message Batches client — descriptions only (§6 rule 1, §9 stage 2).
//
// This module is the ONLY place the enrichment prompt lives. The system prompt
// FORBIDS emitting any hour/price/phone/date/event/award/number. The output
// schema only contains `description` per locale — there is no other field.

const BATCHES_URL = 'https://api.anthropic.com/v1/messages/batches';

function key() {
  const k = process.env.ANTHROPIC_API_KEY;
  if (!k) throw new Error('ANTHROPIC_API_KEY is required for enrichment.');
  return k;
}

function headers(version) {
  return {
    'x-api-key': key(),
    'anthropic-version': version,
    'content-type': 'application/json',
  };
}

const SYSTEM = (locales) => `You write short, evergreen venue descriptions for citynight.gr, Greece's nightlife guide.

ABSOLUTE RULES — violation will cause your output to be discarded:
1. Output STRICT JSON only. No prose, no markdown, no code fences.
2. NEVER include any of: opening hours, days of the week, dates, years, seasons,
   prices, currency, phone numbers, addresses, distances, capacities, ages,
   review counts, ratings, named events, named DJs/owners/awards, "best of"
   superlatives, claims about safety/quality, any specific number.
3. Stick to evergreen attributes: vibe, music style category (e.g. house, mainstream,
   bouzoukia), setting (rooftop / seaside / underground / club / lounge), and the
   neighbourhood/city if given in the input.
4. 2 to 3 sentences per locale. Natural in each target language.
5. Invent NOTHING. If the input is sparse, write a sparse description.

Output schema (return EXACTLY this shape):
{"description":{${locales.map((l) => `"${l}":"..."`).join(',')}}}
`;

function userPromptFor(venue) {
  // We pass ONLY non-fact attributes to the model. Phone/hours/price/website
  // are deliberately omitted so the model can't echo them.
  const safe = {
    name: venue.name,
    city: venue.city_name,
    area: venue.area_name ?? null,
    category: venue.category_name ?? null,
    primary_type: venue.primary_type ?? null,
    types: Array.isArray(venue.types) ? venue.types.slice(0, 6) : [],
  };
  return `Venue:\n${JSON.stringify(safe, null, 2)}\n\nReturn the JSON object now.`;
}

// Build a single batch request for one venue.
export function batchRequestFor(venue, { model, locales }) {
  return {
    custom_id: venue.id,
    params: {
      model,
      max_tokens: 600,
      temperature: 0.4,
      system: SYSTEM(locales),
      messages: [{ role: 'user', content: userPromptFor(venue) }],
    },
  };
}

export async function createBatch(requests, anthropicVersion) {
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

export async function getBatch(batchId, anthropicVersion) {
  const res = await fetch(`${BATCHES_URL}/${batchId}`, { headers: headers(anthropicVersion) });
  if (!res.ok) throw new Error(`Anthropic batch get ${res.status}`);
  return res.json();
}

export async function downloadBatchResults(resultsUrl, anthropicVersion) {
  const res = await fetch(resultsUrl, { headers: headers(anthropicVersion) });
  if (!res.ok) throw new Error(`Anthropic batch download ${res.status}`);
  const text = await res.text();
  return text.split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

// Pull the model's text content out of a batch result row.
export function extractText(resultRow) {
  const r = resultRow.result;
  if (!r || r.type !== 'succeeded') return null;
  const blocks = r.message?.content ?? [];
  return blocks.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}

// Parse the description JSON safely. Returns { description: {locale: string} } or null.
// Rejects anything that contains digits in the description (defense in depth against
// the prompt rule being violated).
export function parseDescriptionJson(text, locales) {
  if (!text) return null;
  let obj;
  try { obj = JSON.parse(text); } catch { return null; }
  const desc = obj?.description;
  if (!desc || typeof desc !== 'object') return null;
  const out = {};
  for (const loc of locales) {
    const v = desc[loc];
    if (typeof v !== 'string' || v.length < 30 || v.length > 600) continue;
    // Defense in depth: if the model snuck in any digit, drop the locale.
    if (/\d/.test(v)) continue;
    out[loc] = v.trim();
  }
  return Object.keys(out).length ? { description: out } : null;
}
