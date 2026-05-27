// Phase J.1 — AI article generator.
//
// Picks a (city, vertical, category) combination and asks Claude to
// produce a ranked "Top N" listicle whose facts are drawn from
// pre-selected real venues. The model is asked to:
//   - Pick the best N from a candidate pool we hand it (it does NOT
//     invent venue names — those are constrained to the candidate ids).
//   - Write an intro, outro, and per-venue blurb in the target locale.
//   - Order the picks 1..N with a reason for each ranking.
//
// What AI CAN write here: intro/outro/blurb/headline prose. What AI
// CANNOT write: venue name, address, area, category, hours, phone,
// price. Those come from the venues row joined in at render time. This
// matches the §6 integrity rule that has been law since Phase A.

import 'server-only';
import { db } from '@/db';
import { createArticleWithPicks, type ArticleInput, type VenuePickInput } from './articles';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5';

const dbh = () => db.$client;

type Candidate = {
  id: string;
  name: string;
  area: string | null;
  address: string | null;
  description: string | null;
  rating: number | null;
  reviewCount: number | null;
  priceLevel: number | null;
  primaryPhotoUrl: string | null;
  primaryPhotoAttribution: string | null;
};

export type GenerateInput = {
  cityId: string;
  vertical: 'nightlife' | 'food' | 'stay';
  categoryId?: string | null;
  locale: string;       // "el" | "en" | "de" | "fr" | "it"
  count?: number;       // default 10
  publish?: boolean;    // default false — generator outputs drafts
};

export type GeneratorResult =
  | { ok: true; articleId: string; slug: string }
  | { ok: false; reason: string; detail?: string };

/** Public entry. Fully self-contained — pulls candidates, calls AI,
 * persists the article + picks transactionally. */
export async function generateArticle(input: GenerateInput): Promise<GeneratorResult> {
  const count = Math.min(20, Math.max(3, input.count ?? 10));

  const city = dbh().prepare(
    `SELECT id, slug, name FROM cities WHERE id = ?`,
  ).get(input.cityId) as { id: string; slug: string; name: string } | undefined;
  if (!city) return { ok: false, reason: 'city_not_found' };

  const category = input.categoryId
    ? dbh().prepare(`SELECT id, slug, name FROM categories WHERE id = ?`)
        .get(input.categoryId) as { id: string; slug: string; name: string } | undefined
    : null;

  // Candidate pool: published venues in city + category, ordered by
  // editorial signal (rating × reviewCount). Pull 2× the target count
  // so the model has room to pick the strongest N.
  const candidates = loadCandidates(input.cityId, input.categoryId ?? null, count * 2);
  if (candidates.length < Math.min(5, count)) {
    return { ok: false, reason: 'not_enough_candidates', detail: `need ${count}, have ${candidates.length}` };
  }

  // Slug is deterministic so re-running for the same (locale, city,
  // category) updates the same article (after we delete the old one).
  const slug = buildSlug(input.locale, city.slug, category?.slug, input.vertical, count);

  let parsed: AIArticle;
  try {
    parsed = await callClaude({
      locale: input.locale,
      city: city.name,
      vertical: input.vertical,
      categoryLabel: category?.name ?? input.vertical,
      candidates,
      count,
    });
  } catch (err) {
    return { ok: false, reason: 'ai_call_failed', detail: err instanceof Error ? err.message : String(err) };
  }

  // Validate: every picked id must be in the candidate pool. The model
  // is constrained to candidate ids — if it invents one, we reject the
  // whole article rather than silently substituting.
  const candidateById = new Map(candidates.map((c) => [c.id, c]));
  const picks: VenuePickInput[] = [];
  for (const pick of parsed.picks.slice(0, count)) {
    const c = candidateById.get(pick.venueId);
    if (!c) {
      return { ok: false, reason: 'ai_invented_venue', detail: pick.venueId };
    }
    picks.push({
      venueId: pick.venueId,
      rank: pick.rank,
      headline: pick.headline?.slice(0, 200) ?? null,
      blurb: pick.blurb.slice(0, 1000),
      photoUrl: c.primaryPhotoUrl ?? null,
      photoAttribution: c.primaryPhotoAttribution ?? null,
    });
  }
  if (picks.length < 3) return { ok: false, reason: 'not_enough_picks' };

  // Replace any existing article at this slug+locale so re-generation
  // produces a single fresh row, not a duplicate.
  dbh().prepare(`DELETE FROM articles WHERE locale = ? AND slug = ?`).run(input.locale, slug);

  const article: ArticleInput = {
    cityId: input.cityId,
    categoryId: input.categoryId ?? null,
    vertical: input.vertical,
    locale: input.locale,
    slug,
    title: parsed.title.slice(0, 200),
    subtitle: parsed.subtitle?.slice(0, 300) ?? null,
    intro: parsed.intro?.slice(0, 4000) ?? null,
    outro: parsed.outro?.slice(0, 2000) ?? null,
    // Cover photo: highest-ranked venue's primary photo. Pexels/city-level
    // covers can be wired in J.2 if you want richer hero imagery.
    coverUrl: picks[0]?.photoUrl ?? null,
    coverAttribution: picks[0]?.photoAttribution ?? null,
    source: 'ai',
    status: input.publish ? 'published' : 'draft',
    promptMeta: { model: MODEL, count, candidatePoolSize: candidates.length },
  };

  try {
    const created = createArticleWithPicks(article, picks);
    return { ok: true, articleId: created.id, slug: created.slug };
  } catch (err) {
    return { ok: false, reason: 'persist_failed', detail: err instanceof Error ? err.message : String(err) };
  }
}

// ─── candidate selection ──────────────────────────────────────────────

function loadCandidates(cityId: string, categoryId: string | null, limit: number): Candidate[] {
  const args: unknown[] = [cityId];
  let categoryFilter = '';
  if (categoryId) {
    categoryFilter = `AND v.category_id = ?`;
    args.push(categoryId);
  }
  args.push(limit);

  const rows = dbh().prepare(`
    SELECT v.id, v.name, v.address, v.description,
           v.rating, v.review_count, v.price_level,
           a.name AS area_name,
           (SELECT p.url FROM photos p
              WHERE p.venue_id = v.id
                AND p.subject_type IN ('venue','product')
              ORDER BY p.is_primary DESC, p.sort_order ASC, p.created_at ASC
              LIMIT 1) AS primary_photo_url,
           (SELECT p.attribution_text FROM photos p
              WHERE p.venue_id = v.id
                AND p.subject_type IN ('venue','product')
              ORDER BY p.is_primary DESC, p.sort_order ASC, p.created_at ASC
              LIMIT 1) AS primary_photo_attribution
      FROM venues v
      LEFT JOIN areas a ON a.id = v.area_id
     WHERE v.city_id = ? ${categoryFilter}
       AND v.status = 'published'
       AND v.is_permanently_closed = 0
     ORDER BY (COALESCE(v.rating,0) * 0.7 + MIN(COALESCE(v.review_count,0)/50.0, 5) * 0.3) DESC,
              v.review_count DESC,
              v.rating DESC
     LIMIT ?
  `).all(...args) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    area: (r.area_name as string | null) ?? null,
    address: (r.address as string | null) ?? null,
    description: (r.description as string | null) ?? null,
    rating: r.rating !== null ? Number(r.rating) : null,
    reviewCount: r.review_count !== null ? Number(r.review_count) : null,
    priceLevel: r.price_level !== null ? Number(r.price_level) : null,
    primaryPhotoUrl: (r.primary_photo_url as string | null) ?? null,
    primaryPhotoAttribution: (r.primary_photo_attribution as string | null) ?? null,
  }));
}

// ─── slug ─────────────────────────────────────────────────────────────

function buildSlug(locale: string, citySlug: string, categorySlug: string | undefined, vertical: string, count: number): string {
  const cat = categorySlug ?? vertical;
  // Slug is locale-agnostic in form (latin) — the (locale, slug) uniqueness
  // index lets the same shape exist per language. e.g.
  //   top-10-rooftop-bars-athens
  return `top-${count}-${cat}-${citySlug}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

// ─── Anthropic call ───────────────────────────────────────────────────

type AIArticle = {
  title: string;
  subtitle?: string;
  intro: string;
  outro: string;
  picks: Array<{
    venueId: string;
    rank: number;
    headline?: string;
    blurb: string;
  }>;
};

async function callClaude(args: {
  locale: string;
  city: string;
  vertical: string;
  categoryLabel: string;
  candidates: Candidate[];
  count: number;
}): Promise<AIArticle> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY missing');

  const localeName = LOCALES[args.locale] ?? 'English';
  const system =
`You are writing for citynight.gr, a Greek city-guide site. Your job is to RANK ${args.count} ${args.categoryLabel} in ${args.city} from the candidate pool and write a short article in ${localeName}.

STRICT FACTUAL RULES:
- You can only pick venues from the candidate pool below. Do not invent venue names. Do not change names.
- Do not invent or paraphrase facts you weren't told: no prices, no hours, no phone numbers, no addresses, no awards, no specific dates.
- Each blurb is 2–3 sentences of opinion + atmosphere. Lean on each venue's existing description if present.
- Tone: confident, lived-in, useful. Avoid generic marketing language ("hidden gem", "must-visit", "best-kept secret").

OUTPUT FORMAT — strict JSON, no markdown fences, no commentary outside JSON:
{
  "title": "string (<= 80 chars)",
  "subtitle": "string (<= 140 chars)",
  "intro": "string — 2-3 paragraphs, plain text with \\n between paragraphs",
  "outro": "string — single closing paragraph",
  "picks": [
    { "venueId": "id-from-pool", "rank": 1, "headline": "string (<= 80 chars)", "blurb": "string — 2-3 sentences" },
    ...
  ]
}`;

  const candidateBlock = args.candidates.map((c, i) => {
    const facts: string[] = [];
    if (c.area) facts.push(`area: ${c.area}`);
    if (c.rating !== null && c.reviewCount !== null) facts.push(`rating: ${c.rating.toFixed(1)} (${c.reviewCount} reviews)`);
    if (c.priceLevel !== null) facts.push(`price: ${'€'.repeat(c.priceLevel + 1)}`);
    return `${i + 1}. id=${c.id}
   name: ${c.name}
   ${facts.join(' · ')}
   description: ${c.description ?? '(no description)'}`;
  }).join('\n\n');

  const user =
`City: ${args.city}
Vertical: ${args.vertical}
Category: ${args.categoryLabel}
Target locale: ${args.locale}
Pick the best ${args.count} from these ${args.candidates.length} candidates. Return ranked JSON.

CANDIDATES:
${candidateBlock}`;

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`anthropic ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = await res.json() as { content?: Array<{ type: string; text?: string }> };
  const text = json.content?.find((b) => b.type === 'text')?.text ?? '';

  // The model is asked for raw JSON; some runs still wrap it in fences.
  // Strip the wrap defensively before parse.
  const cleaned = text.trim().replace(/^```(?:json)?/, '').replace(/```$/, '').trim();
  let parsed: AIArticle;
  try {
    parsed = JSON.parse(cleaned) as AIArticle;
  } catch (err) {
    throw new Error(`anthropic returned non-JSON: ${cleaned.slice(0, 200)}`);
  }
  if (!parsed.title || !Array.isArray(parsed.picks)) {
    throw new Error('anthropic returned malformed article');
  }
  return parsed;
}

const LOCALES: Record<string, string> = {
  el: 'Greek',
  en: 'English',
  de: 'German',
  fr: 'French',
  it: 'Italian',
};
