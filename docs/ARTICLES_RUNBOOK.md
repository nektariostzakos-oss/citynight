# Articles Runbook — seed venues + generate listicles

Phase J shipped the article-led product. This runbook is the
operator-side guide to filling it with real content.

## Prerequisites

Set in `.env.local` (or your Hostinger env):

```
GOOGLE_MAPS_API_KEY=AIza...   # Google Places API (New)
ANTHROPIC_API_KEY=sk-ant-...  # Claude Haiku 4.5
REVIEW_TOKEN_SECRET=<32-char-random>  # set already in Phase I.7
DATABASE_PATH=./citynight.local.sqlite   # or your prod path
```

## Step 1 — Seed venues from Google Places

The seed pipeline pulls real venues into the `venues` table. Run it
city-by-city (cheaper to debug than `--all` on the first pass).

```bash
# Local DB, single city
node scripts/seed/run.js ingest --city=athens

# Same shape for the other published cities in scripts/seed/config.json:
node scripts/seed/run.js ingest --city=mykonos
node scripts/seed/run.js ingest --city=santorini
node scripts/seed/run.js ingest --city=thessaloniki
```

What this does:
- For each category in `scripts/seed/config.json` (night-club, bar,
  rooftop-bar, live-music, bouzoukia, beach-club), it calls Places
  `searchText` API with a tight field mask.
- Inserts each result into `venues` with `status='draft'`,
  `field_sources` marking name/address/phone/etc. as `'google_places'`.
- §6 integrity rule: AI never touches fact columns here.

**Cost estimate:** ~50 calls per (city × category) at $0.02 = roughly
$5–10 per city to seed.

## Step 2 — Enrich descriptions (optional, costs Anthropic credits)

```bash
node scripts/seed/run.js enrich --city=athens
```

What this does:
- For every `venues` row that has no description, calls Claude Haiku
  4.5 via the Messages Batches API (50% discount).
- Asks for a 2-3 sentence evergreen description per locale (en/el/de/fr/it).
- Writes ONLY to `venues.description` + `translations` rows. The
  enrichment module is the only code allowed to write that column
  (§6 integrity rule).

Skip this if you want articles to read venue names + facts only (the
generator uses descriptions when present, falls back to just facts
when not).

## Step 3 — Photos + gate

```bash
node scripts/seed/run.js photos --city=athens
node scripts/seed/run.js gate --city=athens
```

- `photos`: resolves Google Places photo URLs, caches them.
- `gate`: promotes `draft` venues with rating ≥ 4 + ≥5 reviews + a
  description to `status='published'`. Others stay `pending`.

## Step 4 — Generate articles

Single city + category:

```bash
node scripts/articles/generate.mjs \
  --city=athens \
  --vertical=nightlife \
  --category=rooftop-bar \
  --locale=el \
  --count=10
```

Output:
```
Generating: city=city_athens cat=cat_rooftop_bar locale=el ... ok slug=top-10-rooftop-bar-athens
Generated 1 / 1 articles (0 skipped/failed)
```

Full first batch (every published city × top 6 nightlife categories):

```bash
node scripts/articles/generate.mjs --all --locale=el
```

That's roughly `(cities × 6)` API calls to Claude. At Haiku 4.5 prices
this is cents per city — well under €1 for the first batch across all
published cities.

To publish immediately (vs. landing as drafts):

```bash
node scripts/articles/generate.mjs --all --locale=el --publish
```

Otherwise articles land at `status='draft'` and you flip them via a
direct SQL update (or a tiny CLI we can add later):

```sql
UPDATE articles SET status='published', published_at=unixepoch()
 WHERE status='draft' AND locale='el';
```

## Step 5 — Verify in browser

After running steps 1–4, navigate to:

- `/{locale}/{city}` — should list the generated articles, grouped by
  vertical.
- `/{locale}/{city}/{slug}` — should render the listicle with ranked
  venue cards, intros, outros, photos.

## Re-running

Generator is idempotent on `(locale, slug)`. Re-running with the same
arguments deletes the old article + its picks (via FK CASCADE) and
inserts a fresh draft. You can re-run safely after tweaking the prompt
or candidate pool without producing duplicates.

## Costs at a glance

| Step | Provider | One-time cost (10 cities × 6 cats) |
|---|---|---|
| Ingest venues | Google Places | $50–100 |
| Enrich descriptions | Anthropic (Batches) | $1–3 |
| Generate articles | Anthropic (Messages) | $0.30–0.60 |
| **Total first batch** | — | **~$55–105** |

Recurring: only the cron-driven re-sync (`scripts/cron/sync.js`,
weekly) hits Places again at ~$5–10/week to flip closed venues.
Article regeneration is on-demand only.

## Troubleshooting

- **`ai_invented_venue`** in the generator output — Claude returned a
  venueId outside the candidate pool. The generator rejects this and
  doesn't persist. Re-run; if it happens repeatedly, lower `count` so
  the model has less freedom to wander.
- **`not_enough_candidates`** — fewer than `max(5, count)` published
  venues in that (city, category). Either seed more venues, lower
  `count`, or skip that combination.
- **Article visible but no photos** — venues didn't have `photos` rows
  at generation time. Re-run step 3 (`photos`) then re-run the
  generator.
