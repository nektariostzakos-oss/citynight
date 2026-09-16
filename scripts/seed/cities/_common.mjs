// Shared seed pipeline utilities used by every city config.
//
// Pure functions only — no DB writes happen here. The runner
// (run-city.mjs) is what touches SQLite. This file is the canonical
// place for verification gates so every city goes through the same
// checks and we never drift between verticals.
//
// Gate summary (must pass ALL to be inserted):
//   1. Places searchText returned a row with photos + a name match.
//   2. businessStatus = OPERATIONAL (or unset).
//   3. Newest Places review ≤ MAX_REVIEW_AGE_MONTHS (6). Stale-but-
//      reachable website is NOT enough — small-town venues with a
//      stale .gr WordPress can stay "live" for years after closing.
//      Strict review-age catches that. ([[feedback-venue-photo-rules]])
//   4. Facebook URL HTTP-resolves and og:title contains the city.
//
// Each city config provides queries + static candidates; this file
// handles execution.

import { searchText as placesSearchText, resolvePhotoUrl } from '../lib/places.js';

// ── shared constants ───────────────────────────────────────────────────
export const MAX_REVIEW_AGE_MONTHS = 6;
export const MIN_RATING = 4.0;
export const MIN_REVIEWS = 50;
export const TARGET_BUSINESSES_PER_GUIDE = 10;

// ── normalization helpers ──────────────────────────────────────────────
export function normalize(s) {
  return (s ?? '').toLowerCase().normalize('NFD').replace(/\p{M}+/gu, '');
}

export function slugify(s) {
  return normalize(s)
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

// Decodes named + numeric HTML entities. FB's og:title comes back with
// `&amp;`, `&#x39c;`, `&#956;` etc.; the city-match substring check needs
// the real characters or "Loutráki" looks like "Loutr&#xe1;ki".
export function decodeHtml(s) {
  return (s ?? '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

export function titleMatchesExpected(title, mustMatch) {
  if (!title) return false;
  const t = normalize(title);
  return mustMatch.some((needle) => t.includes(normalize(needle)));
}

/** Address-level city membership check. Places `locationBias` is a soft
 *  bias — it preferences results near the center but happily returns
 *  venues from neighbouring towns (Vrachati hotels surfacing in Loutraki
 *  bias circle, etc.). This is the hard filter: the Places-returned
 *  `formattedAddress` must contain at least one of the configured city
 *  names OR one of the configured postal codes. Run BEFORE FB and photo
 *  lookups so we don't waste calls on out-of-city venues. */
export function addressMatchesCity(address, { cityNames = [], postalCodes = [] } = {}) {
  if (!address) return false;
  const a = normalize(address);
  if (cityNames.some((n) => a.includes(normalize(n)))) return true;
  // Postal codes are ASCII, no normalization needed; strip whitespace
  // to catch both "203 00" and "20300" patterns.
  const aNoSpace = address.replace(/\s+/g, '');
  return postalCodes.some((p) => aNoSpace.includes(p.replace(/\s+/g, '')));
}

/** Fallback FB verifier: when og:title doesn't contain the city (small
 *  venues often have just "<Name>" or "<Name> | Greece"), accept if the
 *  title's leading segment matches the Places business name. Two-way
 *  substring on the normalized leading segment. This is safe because the
 *  Places result was already location-verified to be in the city bias
 *  circle — the FB check only needs to confirm the page exists for the
 *  right business, not re-verify the city. Rejects person-name false-
 *  positives like "Paul Stoffers" vs the bar "PAUL'S". */
export function titleMatchesName(title, placeName) {
  if (!title || !placeName) return false;
  const tCore = normalize(title).split(/[|\-—:•]/)[0]?.trim() ?? '';
  const n = normalize(placeName).split(/[|\-—:•]/)[0]?.trim() ?? '';
  if (tCore.length < 4 || n.length < 4) return false;
  // require at least 5 chars overlap to reject "paul" vs "paul stoffers".
  const minLen = Math.min(tCore.length, n.length, 5);
  return tCore.startsWith(n.slice(0, minLen))
      || n.startsWith(tCore.slice(0, minLen))
      || tCore.includes(n)
      || n.includes(tCore);
}

// ── Facebook verifier ──────────────────────────────────────────────────
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export async function verifyFacebook(rawUrl) {
  if (!/^https?:\/\/(www\.|m\.)?facebook\.com\//i.test(rawUrl)) {
    return { status: 'error', pageTitle: null, reason: 'not_a_facebook_url' };
  }
  let url;
  try { url = new URL(rawUrl).toString(); }
  catch { return { status: 'error', pageTitle: null, reason: 'invalid_url' }; }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, {
      headers: {
        'user-agent': UA, 'accept-language': 'en-US,en;q=0.9,el;q=0.8',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'sec-fetch-site': 'none', 'sec-fetch-mode': 'navigate', 'sec-fetch-user': '?1',
        'sec-fetch-dest': 'document', 'upgrade-insecure-requests': '1',
      },
      redirect: 'follow', signal: controller.signal,
    });
    if (res.status === 404) return { status: 'not_found', pageTitle: null, reason: 'http_404' };
    if (!res.ok) return { status: 'error', pageTitle: null, reason: `http_${res.status}` };
    const html = await res.text();
    if (/This (content|page) isn't available/i.test(html) || /Page Not Found/i.test(html)) {
      return { status: 'not_found', pageTitle: null, reason: 'page_unavailable_marker' };
    }
    const m = /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i.exec(html)
          ?? /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i.exec(html);
    if (m?.[1]) return { status: 'verified', pageTitle: decodeHtml(m[1]).trim(), reason: null };
    if (/login_form|You must log in to continue/i.test(html)) return { status: 'blocked', pageTitle: null, reason: 'login_wall' };
    return { status: 'error', pageTitle: null, reason: 'no_og_title' };
  } catch (err) {
    return { status: 'error', pageTitle: null, reason: err?.message ?? String(err) };
  } finally { clearTimeout(timer); }
}

// Build slug-derived FB URL candidates from the Places websiteUri + name.
// Many small Greek venues use facebook.com as their de-facto website, so
// the site URL is the highest-signal first guess. Then we try common
// patterns Greek small businesses use, including {slug}{citySlug} which
// catches "kavoshotel" / "kavospatras" / etc.
export function buildFbCandidates(websiteUri, name, citySlug, extraSuffixes = []) {
  const out = [];
  if (websiteUri && /^https?:\/\/(www\.|m\.)?facebook\.com\//i.test(websiteUri)) {
    out.push(websiteUri);
  }
  const ascii = normalize(name).replace(/[^a-z0-9]+/g, '');
  const slug = ascii.slice(0, 30);
  if (slug.length >= 4) {
    out.push(`https://www.facebook.com/${slug}/`);
    out.push(`https://www.facebook.com/${slug}.gr/`);
    out.push(`https://www.facebook.com/${slug}${citySlug}/`);
    out.push(`https://www.facebook.com/${slug}.${citySlug}/`);
    for (const sfx of extraSuffixes) {
      out.push(`https://www.facebook.com/${slug}${sfx}/`);
      out.push(`https://www.facebook.com/${sfx}${slug}/`);
    }
  }
  return [...new Set(out)];
}

// ── Activity gate (strict: newest review ≤ 6 months) ──────────────────
function newestReviewAt(place) {
  const reviews = place.reviews ?? [];
  let newest = 0;
  for (const r of reviews) {
    if (!r.publishTime) continue;
    const t = Date.parse(r.publishTime);
    if (Number.isFinite(t) && t > newest) newest = t;
  }
  return newest || null;
}

/** STRICT 6-month gate. Stale-reviews + reachable-website is intentionally
 *  NOT accepted any more (the old loutraki seed allowed it). A venue
 *  that closed two years ago can still leave a maintained website up;
 *  recent reviews are a much stronger "still trading" signal. */
export function verifyLatestActivity(place) {
  const newest = newestReviewAt(place);
  if (!newest) return { ok: false, reason: 'no review history' };
  const ageMonths = (Date.now() - newest) / (1000 * 60 * 60 * 24 * 30.4);
  if (ageMonths > MAX_REVIEW_AGE_MONTHS) {
    return { ok: false, reason: `newest review ${ageMonths.toFixed(0)} mo ago > ${MAX_REVIEW_AGE_MONTHS}` };
  }
  return { ok: true, signal: `last review ${ageMonths.toFixed(1)} mo ago` };
}

// ── Section-kind picker ────────────────────────────────────────────────
//
// Maps Places primaryType + types + name to a section_kind that the
// guide-page renderer (lib/article-md.tsx sectionKindMatchesHeading)
// can pin to an H2. Different verticals → different buckets because
// the H2 structure differs per guide template.
export function pickSectionKind(vertical, place, opts = {}) {
  const primary = (place.primaryType ?? '').toLowerCase();
  const all = (place.types ?? []).map((s) => s.toLowerCase());
  const name = normalize(place.displayName?.text ?? '');
  const seafrontPattern = opts.seafrontName ?? /beach|παραλι|seaside|seafront|posidonos|ποσειδων|ammos|αμμος/;

  if (vertical === 'nightlife') {
    if (primary === 'casino' || all.includes('casino')) return 'casino';
    if (/beach/.test(primary) || all.some((s) => /beach/.test(s))) return 'beach';
    if (/(bar|pub|cafe|night_club|lounge)/.test(primary)
        || all.some((s) => /(bar|pub|cafe|night_club|lounge)/.test(s))) return 'seafront';
    return 'other';
  }

  if (vertical === 'stay') {
    if (primary === 'spa'
        || all.some((s) => /spa|wellness/.test(s))
        || /\bspa\b|thermal|θερμα/.test(name)) return 'spa';
    if ((primary === 'lodging' || primary === 'hotel' || all.includes('lodging') || all.includes('hotel'))
        && seafrontPattern.test(name)) return 'seafront';
    return 'other';
  }

  if (vertical === 'food') {
    if (/(seafood|fish|ψαρ)/.test(name)
        || all.some((s) => /seafood/.test(s))) return 'seafood';
    if (seafrontPattern.test(name)) return 'seafront';
    if (/(tavern|ταβερν|grill|ψησταρι|σουβλακ|gyro|γυρο)/.test(name)
        || all.some((s) => /(meal_takeaway|tavern)/.test(s))) return 'taverna';
    return 'modern';
  }

  return 'other';
}

// ── Anthropic blurb generator ──────────────────────────────────────────
const SYSTEM_PROMPTS = {
  nightlife: (locale) => `You write venue blurbs for citynight.gr, a Greek nightlife guide. Write in ${locale === 'el' ? 'GREEK' : 'ENGLISH'}.

STRICT RULES:
- 1-2 short sentences, max 30 words total.
- Atmospheric, lived-in tone. Avoid generic marketing speak ("hidden gem", "must-visit", "best-kept secret").
- DO NOT invent facts: no opening hours, no prices, no specific cocktails/DJs/dates, no awards.
- Focus on the venue's general character (location, vibe, what kind of place it is).
- OUTPUT STRICT JSON ONLY: {"blurb": "..."}`,
  food: (locale) => `You write restaurant blurbs for citynight.gr, a Greek travel guide. Write in ${locale === 'el' ? 'GREEK' : 'ENGLISH'}.

STRICT RULES:
- 1-2 short sentences, max 30 words total.
- Lived-in tone. Avoid "authentic", "must-try", "best", "hidden gem".
- DO NOT invent facts: no prices, no specific dishes you weren't told, no chef names, no awards, no opening hours.
- Focus on the place's general character (location, what kind of cuisine, atmosphere).
- OUTPUT STRICT JSON ONLY: {"blurb": "..."}`,
  stay: (locale) => `You write hotel/accommodation blurbs for citynight.gr, a Greek travel guide. Write in ${locale === 'el' ? 'GREEK' : 'ENGLISH'}.

STRICT RULES:
- 1-2 short sentences, max 30 words total.
- Atmospheric, lived-in tone. Avoid generic marketing speak ("hidden gem", "must-stay", "luxurious").
- DO NOT invent facts: no room counts, prices, star ratings, specific amenities you weren't told, dates, awards.
- Focus on what the property feels like + its zone (seafront / spa / near casino / quiet).
- OUTPUT STRICT JSON ONLY: {"blurb": "..."}`,
};

export async function generateBlurb({ vertical, name, primaryType, locale, cityName, cityHint }) {
  const ANTHROPIC = process.env.ANTHROPIC_API_KEY;
  const fallback = locale === 'el'
    ? `${name} στο ${cityName}.`
    : `${name} in ${cityName}.`;
  if (!ANTHROPIC) return fallback;

  const sys = SYSTEM_PROMPTS[vertical]?.(locale) ?? SYSTEM_PROMPTS.nightlife(locale);
  const usr = `Name: ${name}
Type: ${primaryType ?? vertical}
City: ${cityName}, Greece${cityHint ? ` (${cityHint})` : ''}`;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': ANTHROPIC, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 200, system: sys, messages: [{ role: 'user', content: usr }] }),
  });
  if (!res.ok) {
    console.warn(`    anthropic ${res.status} — falling back to template blurb`);
    return fallback;
  }
  const json = await res.json();
  const text = json.content?.find((b) => b.type === 'text')?.text ?? '';
  const cleaned = text.trim().replace(/^```(?:json)?/, '').replace(/```$/, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed.blurb && typeof parsed.blurb === 'string') return parsed.blurb.slice(0, 280);
  } catch { /* fall through */ }
  return fallback;
}

// ── Photo picker (largest-first, ≥1200px, landscape) ──────────────────
export async function resolveTopPhotos(place, max = 3) {
  const candidates = (place.photos ?? [])
    .filter((p) => p?.name)
    .filter((p) => (p.widthPx ?? 0) >= 1200)
    .filter((p) => (p.widthPx ?? 0) >= (p.heightPx ?? 0))
    .sort((a, b) => (b.widthPx ?? 0) - (a.widthPx ?? 0))
    .slice(0, max);
  const out = [];
  for (const p of candidates) {
    try {
      const url = await resolvePhotoUrl(p.name, { maxWidthPx: 1600 });
      if (!url) continue;
      const author = p.authorAttributions?.[0]?.displayName;
      out.push({ url, attribution: author ? `${author} / Google` : 'Google' });
    } catch (err) { console.log(`    photo resolve error: ${err.message}`); }
  }
  return out;
}

// Places (New) emits `priceLevel` as enum strings; collapse to 0..4.
export function parsePriceLevel(v) {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return null;
  return {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  }[v] ?? null;
}

// ── Pexels cover picker per vertical ──────────────────────────────────
//
// nightlife → night-scape (dark sky + lights/neon). Never daytime.
// food      → close-up plated food / restaurant interior.
// stay      → hotel interior / lobby / pool / room.
// Memory ref: [[project-nightlife-nightscape-photos]] /
//             [[feedback-pexels-vs-places]].
const PEXELS_QUERIES = {
  // Prefer abstract / close-up nightlife scenes that aren't tied to a
  // recognisable foreign city (Reeperbahn, Las Vegas, Times Square).
  // Cocktails + neon close-ups read as "nightlife anywhere".
  nightlife: ['cocktail close up neon', 'bar counter neon lights', 'cocktail glass bokeh', 'neon abstract dark', 'bartender pouring drink'],
  food: ['greek mezze plate', 'taverna table greek', 'olive oil dish greek', 'mediterranean food', 'restaurant interior warm'],
  stay: ['hotel room mediterranean', 'boutique hotel interior', 'hotel pool greece', 'spa interior', 'hotel lobby warm'],
};

// Reject Pexels picks whose alt text screams a specific foreign city
// or scene that misrepresents a Greek guide. Nightlife is the worst
// offender because Pexels' top-ranked "neon at night" results are
// Hamburg, Las Vegas, NYC, Tokyo — none of which we want as a Greek
// city's hero. Match is case-insensitive (alt is lowercased upstream).
const COVER_DISQUALIFIERS = {
  nightlife: /day|sunny beach|beach.*sand|morning|reeperbahn|hamburg|berlin|las vegas|vegas\b|times square|new york|nyc|tokyo|shibuya|soho|london|paris|bangkok|hong kong|shanghai|dubai|miami|chinatown|moscow|prague/,
  food: /raw ingredient|supermarket|farm/,
  stay: /office|conference|cubicle/,
};

export async function pickPexelsCover(vertical) {
  const PEXELS = process.env.PEXELS_API_KEY;
  if (!PEXELS) return null;
  const queries = PEXELS_QUERIES[vertical] ?? PEXELS_QUERIES.nightlife;
  const block = COVER_DISQUALIFIERS[vertical] ?? /$.^/;
  for (const q of queries) {
    let res;
    try {
      const r = await fetch(`https://api.pexels.com/v1/search?per_page=10&orientation=landscape&query=${encodeURIComponent(q)}`,
        { headers: { Authorization: PEXELS } });
      if (!r.ok) continue;
      res = await r.json();
    } catch { continue; }
    for (const p of res.photos ?? []) {
      if (p.height > p.width) continue;
      if (p.width < 1500) continue;
      const alt = (p.alt ?? '').toLowerCase();
      if (block.test(alt)) continue;
      return {
        url: `https://images.pexels.com/photos/${p.id}/pexels-photo-${p.id}.jpeg?auto=compress&cs=tinysrgb&w=1800`,
        attribution: `Photo: ${p.photographer} / Pexels`,
        query: q,
      };
    }
  }
  return null;
}

// ── Discovery loop (shared by all verticals) ───────────────────────────
/** Run all queries through Places, dedupe by place_id, filter by
 *  rating + reviewCount + photos + OPERATIONAL. Returns plain Places
 *  rows with `_discoveryQuery` annotated for logging. */
export async function discover({ queries, bias, minRating = MIN_RATING, minReviews = MIN_REVIEWS, maxPageTokens = 1 }) {
  const found = new Map();
  for (const q of queries) {
    console.log(`  · discovery query: "${q}"`);
    let results;
    try { results = await placesSearchText({ textQuery: q, location: bias, maxPageTokens }); }
    catch (err) { console.warn(`    places error: ${err.message}`); continue; }
    for (const p of results ?? []) {
      if (!p.id) continue;
      if (found.has(p.id)) continue;
      if (p.businessStatus && p.businessStatus !== 'OPERATIONAL') continue;
      const rating = p.rating ?? 0;
      const reviews = p.userRatingCount ?? 0;
      if (rating < minRating || reviews < minReviews) continue;
      if (!p.photos || p.photos.length === 0) continue;
      found.set(p.id, { ...p, _discoveryQuery: q });
    }
  }
  return [...found.values()];
}

/** Look up a single static candidate by query + name substring. */
export async function findStatic({ query, nameMatch, bias }) {
  const results = await placesSearchText({ textQuery: query, location: bias, maxPageTokens: 1 });
  const match = results.find((p) => normalize(p.displayName?.text ?? '').includes(normalize(nameMatch)));
  if (!match) return { ok: false, reason: 'no_name_match' };
  if (match.businessStatus === 'CLOSED_PERMANENTLY') return { ok: false, reason: 'closed' };
  return { ok: true, place: match };
}
