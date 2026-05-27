# CLAUDE.md — citynight.gr (self-contained build prompt)

> **HOW TO USE:** Put this ONE file in an empty folder. Open Claude Code there and say:
> *"Read CLAUDE.md and build the entire project as specified — create every file and folder yourself. Follow the phased plan in §16 and STOP at each ✋ checkpoint for my approval. Ask before writing code if anything is ambiguous."*
> Claude Code generates everything below (scaffold, schema, seed scripts, pages, docs). You don't place or assemble anything by hand.

---

## ⚠️ Direction shift (Phase H, 2026-05) — read this first

The original product was a **directory** (sections 1–17 below). It has been
**replaced by a website-builder SaaS**: every business gets a free,
ready-made website, not a directory listing.

**Single canonical URL shape** — `/{locale}/cities/{city-slug}/{business-slug}`.
The old `/{locale}/greece/{city}/{bucket}/{venue}` tree is gone (only redirect stubs remain).

**Single product, three price points:**
- **Free hosted** — site lives at `citynight.gr/{locale}/cities/{city}/{name}`. Anyone can claim. Forever-free.
- **Custom domain** — €19/month. Owner points their own `.gr`/`.com` at the same site (CNAME via Cloudflare; SSL automatic).
- **Self-host ZIP** — €190 one-time. Owner downloads the full Atelier project pre-filled with their data and runs it themselves.

**The discovery surface** (`/{locale}/cities/{city}`) lists every business's
website — it's the citynight homepage / city pages — but each card opens a
**full website**, not a listing.

**Data model** — `sites` table (with `site_menu_*`, `site_photos`, `site_messages`, `site_pages`)
replaces the old `venues` + mini-site tables for new flow. The original
`venues` rows are mirrored 1:1 into `sites` via `sites.legacy_venue_id`
(Phase H1 migration, `scripts/migrate/venues-to-sites.mjs`). Old `/greece/...`
URLs 308-redirect to the canonical new URL via `lib/legacy-redirect.ts`.

**Stripe wiring** — two products: `STRIPE_PRICE_SITE_MONTHLY` (€19/mo
subscription unlocking custom domain) and `STRIPE_PRICE_SITE_ZIP` (€190
one-time unlocking ZIP download). Webhook at `/api/stripe/webhook` flips
`sites.stripe_subscription_id` / `sites.zip_purchased_at`.

**Tenant management** — `/{locale}/dashboard/sites/{siteId}` lets the
owner edit business info, about, photos, menu, reservation, and (if paid)
custom domain. Site renderer lives at `/{locale}/cities/{city}/{slug}/{layout,page,menu,about,book,gallery,contact}`.

**Integrity rules from §6 still apply** — AI never writes facts; photos
respect the CHECK constraint; sites cannot be deleted (URL persists).

Sections 1–17 below describe the original directory architecture and are
kept for historical context. Where they conflict with this header, this
header wins.

---

## 1. Project

**citynight.gr** — Greece-wide **nightlife** guide + venue directory. Multilingual public content for tourists, built with AI but grounded in real data. Goal: heavy **organic** traffic on a high-authority domain; money pages rank fast. After a one-time data fill, the site **self-maintains** (owner claims + weekly sync) — no ongoing manual content work.

Revenue, all wired at launch (sells once traffic exists): **affiliate** (geo-routed) + **display ads** + **3 owner tiers** (free / featured / ad-inventory) via Stripe.

---

## 2. Operating rules (non-negotiable)

- Senior full-stack engineer + product designer. Paired with Nektarios (digital marketing agency; lean, direct).
- **Clarify before inventing.** No filler. Ship-quality only — no TODOs/stubs/placeholders committed.
- **Hostinger constraints (§4) are LAW.** **Integrity rules (§6) are absolute** and enforced in code.
- **Design is first-class (§13)** — no generic AI UI.
- **Build in phases (§16)** — stop at each ✋.

---

## 3. Locked stack — do not substitute

Next.js 15 (App Router) · **ISR** rendering · Node on **Hostinger CloudLinux** (`next start`) · **SQLite** single file (no DB server) · **better-sqlite3** (fallback `node:sqlite` on Node 22+) · **Drizzle** ORM + drizzle-kit migrations · MDX/JSON for fully-static pages · **own session auth, passwordless magic-link** · **Tailwind** · **SQLite FTS5** search · **Google Maps JS** (lazy-loaded) · jobs via **Hostinger cron tab → script** · **Cloudflare** front (free `CF-IPCountry` header + CDN + DDoS) · enrichment via **Claude Haiku 4.5 + Message Batches API** (descriptions only) · seed via **Google Places API (New)** · **Stripe** Elements (UI) + Billing (subs) + webhook→SQLite · ads **AdSense** → Ezoic → **Google Ad Manager** · **Google-certified CMP** + consent mode v2 · i18n via locale-prefixed routes + **hreflang**, soft geo default, **never forced redirects**.

Affiliate: GetYourGuide (primary), Viator, Booking.com; local programs (Linkwise GR etc.) added per market.

---

## 4. Hostinger constraints (LAW)

- **SQLite file lives in a persistent dir OUTSIDE the deploy path** (env `DATABASE_PATH`); never overwritten by deploy. Back up via cron. Losing it = losing paid subs + claims.
- No worker queues → **cron tab** for sync/reconcile/backup.
- ISR needs the persistent `next start` process + `.next/cache` to survive between requests.
- Verify `better-sqlite3` prebuilt binary on the available Node version; else `node:sqlite`.
- Cloudflare caches static/ISR pages at the edge to spare the modest origin.

---

## 5. Architecture

Cloudflare → Hostinger Node (`next start`). Public pages = **ISR** generated from SQLite, revalidated on schedule + on owner edits. Fully-static pages (guides/legal) = MDX. Dynamic surfaces (auth, dashboard, claims, Stripe, ads, analytics) = Next route handlers on **SQLite (WAL mode)**. A separate **seed pipeline** (run by you / cron) fills & refreshes content. `CF-IPCountry` drives affiliate routing + soft locale/city default.

---

## 6. INTEGRITY RULES — absolute, enforced in code

1. **AI writes `description` (+ translations) ONLY — never facts.** Hours/phone/price/address/name come from Google Places (seed) or owner (claim). The enrichment code path must be an isolated module that can write ONLY `venues.description` and `translations`; never the fact columns. Prompt also forbids emitting any hour/price/phone/date/award/number. Add a test asserting the enrichment module cannot write fact columns.
2. **No fake/stock images on real things.** The `photos` CHECK constraint (in schema, §8) makes it impossible to attach AI/stock to a `venue`/`product`. No photo → no row → render a styled placeholder + "claim your venue" CTA.
3. **Nothing publishes unverified.** Seed venues `draft` → gated (freshness/dedupe/confidence) → `published`/`pending`. New owner submissions auto-validate vs Places before publishing.
4. **Owners can't delete pages.** They unclaim/wipe their own data; the URL persists (SEO asset; blocks competitor-deletion abuse).
5. **No thin ungrounded pages** (avoid Google scaled-content-abuse penalty). Grounding = real facts + real photos + curation.

---

## 7. Folder structure to create

```
/                      next.config, tailwind, drizzle.config, .env.example, package.json
/app                   App Router: [locale]/(public) + (dashboard) + /go/[slug] + /api/*
/components            UI (server + client), Tailwind
/db/schema.ts          Drizzle schema (§8) — create EXACTLY as given
/db/index.ts           better-sqlite3 + drizzle init (WAL); reads DATABASE_PATH
/db/migrations         drizzle-kit output
/lib                   auth (sessions/magic-link), geo (CF-IPCountry), affiliate router, fts, stripe, analytics
/content/{guides,legal}/{en,el,de,fr,it}   MDX
/scripts/seed          seed pipeline (§9) — better-sqlite3/Drizzle
/scripts/cron          sync.js, reconcile.js, backup-db.sh, rollup-analytics.js
/docs                  ARCHITECTURE.md, DEPLOYMENT.md, DECISIONS.md, CRON.md  (generate these)
```

---

## 8. Data model — create `db/schema.ts` EXACTLY like this (Drizzle/SQLite)

```ts
import { sqliteTable, text, integer, real, index, uniqueIndex, check } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
const uuid = () => text().$defaultFn(() => crypto.randomUUID());
const now = sql`(unixepoch())`;
const ts = (n: string) => integer(n, { mode: 'timestamp' });

export const cities = sqliteTable('cities', {
  id: uuid().primaryKey(), slug: text().notNull().unique(), name: text().notNull(),
  region: text(), lat: real(), lng: real(), heroPhotoId: text('hero_photo_id'),
  isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(false),
  createdAt: ts('created_at').default(now),
});
export const areas = sqliteTable('areas', {
  id: uuid().primaryKey(), cityId: text('city_id').notNull().references(() => cities.id, { onDelete: 'cascade' }),
  slug: text().notNull(), name: text().notNull(), lat: real(), lng: real(), heroPhotoId: text('hero_photo_id'),
}, (t) => [uniqueIndex('areas_city_slug').on(t.cityId, t.slug)]);
export const categories = sqliteTable('categories', {
  id: uuid().primaryKey(), slug: text().notNull().unique(), name: text().notNull(), parentId: text('parent_id'),
});
export const users = sqliteTable('users', {
  id: uuid().primaryKey(), email: text().notNull().unique(), phone: text(), name: text(),
  locale: text().default('en'), role: text({ enum: ['owner','admin'] }).notNull().default('owner'),
  createdAt: ts('created_at').default(now),
});
export const sessions = sqliteTable('sessions', {
  id: uuid().primaryKey(), userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: ts('expires_at').notNull(), createdAt: ts('created_at').default(now),
}, (t) => [index('sessions_user').on(t.userId)]);
export const magicTokens = sqliteTable('magic_tokens', {
  id: uuid().primaryKey(), email: text().notNull(), tokenHash: text('token_hash').notNull(),
  purpose: text({ enum: ['login','claim'] }).notNull(), venueId: text('venue_id'),
  expiresAt: ts('expires_at').notNull(), usedAt: ts('used_at'),
});
export const venues = sqliteTable('venues', {
  id: uuid().primaryKey(), slug: text(),
  cityId: text('city_id').notNull().references(() => cities.id),
  areaId: text('area_id').references(() => areas.id),
  categoryId: text('category_id').references(() => categories.id),
  googlePlaceId: text('google_place_id').unique(), name: text().notNull(),
  address: text(), lat: real(), lng: real(),
  // VOLATILE FACTS — AI must never write these (app-layer isolation):
  phone: text(), openingHours: text('opening_hours', { mode: 'json' }),
  priceLevel: integer('price_level'), website: text(),
  description: text(),                          // ONLY field AI writes
  fieldSources: text('field_sources', { mode: 'json' }).notNull().default(sql`'{}'`),
  status: text({ enum: ['draft','pending','published','closed','rejected'] }).notNull().default('draft'),
  claim: text({ enum: ['unclaimed','pending','verified'] }).notNull().default('unclaimed'),
  ownerId: text('owner_id').references(() => users.id, { onDelete: 'set null' }),
  tier: text({ enum: ['free','featured'] }).notNull().default('free'),
  rating: real(), reviewCount: integer('review_count'), businessStatus: text('business_status'),
  isPermanentlyClosed: integer('is_permanently_closed', { mode: 'boolean' }).notNull().default(false),
  seedPhotoRefs: text('seed_photo_refs', { mode: 'json' }),
  lastSyncedAt: ts('last_synced_at'), createdAt: ts('created_at').default(now), publishedAt: ts('published_at'),
}, (t) => [
  index('venues_city_status').on(t.cityId, t.status), index('venues_category').on(t.categoryId),
  index('venues_claim').on(t.claim), uniqueIndex('venues_city_slug').on(t.cityId, t.slug),
]);
export const photos = sqliteTable('photos', {
  id: uuid().primaryKey(),
  venueId: text('venue_id').references(() => venues.id, { onDelete: 'cascade' }),
  areaId: text('area_id').references(() => areas.id, { onDelete: 'cascade' }),
  cityId: text('city_id').references(() => cities.id, { onDelete: 'cascade' }),
  subjectType: text('subject_type', { enum: ['venue','product','location','decorative'] }).notNull(),
  source: text({ enum: ['google_places','owner_upload','own_photography','licensed_stock','placeholder','ai_decorative'] }).notNull(),
  url: text().notNull(), storageKey: text('storage_key'),
  attributionText: text('attribution_text'), attributionUrl: text('attribution_url'), license: text(),
  cachedUntil: ts('cached_until'), isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0), createdAt: ts('created_at').default(now),
}, (t) => [
  index('photos_venue').on(t.venueId),
  check('photo_source_matches_subject', sql`
    (${t.subjectType} IN ('venue','product') AND ${t.source} IN ('google_places','owner_upload','placeholder'))
    OR (${t.subjectType} = 'location'  AND ${t.source} IN ('own_photography','licensed_stock','google_places','placeholder'))
    OR (${t.subjectType} = 'decorative' AND ${t.source} IN ('ai_decorative','licensed_stock'))`),
]);
export const claims = sqliteTable('claims', {
  id: uuid().primaryKey(), venueId: text('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  method: text({ enum: ['email','sms'] }).notNull().default('email'),
  status: text({ enum: ['pending','verified','rejected'] }).notNull().default('pending'),
  verifiedAt: ts('verified_at'), createdAt: ts('created_at').default(now),
});
export const venueSubmissions = sqliteTable('venue_submissions', {
  id: uuid().primaryKey(), venueId: text('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  submittedBy: text('submitted_by').references(() => users.id),
  placesMatch: integer('places_match', { mode: 'boolean' }), confidence: real(),
  autoDecision: text('auto_decision', { enum: ['auto_publish','hold','reject'] }), createdAt: ts('created_at').default(now),
});
export const reports = sqliteTable('reports', {
  id: uuid().primaryKey(), venueId: text('venue_id').references(() => venues.id, { onDelete: 'cascade' }),
  reason: text({ enum: ['closed','wrong_info','duplicate','spam'] }).notNull(), detail: text(),
  status: text({ enum: ['open','reviewing','resolved','dismissed'] }).notNull().default('open'), createdAt: ts('created_at').default(now),
});
export const subscriptions = sqliteTable('subscriptions', {
  id: uuid().primaryKey(), venueId: text('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  stripeCustomerId: text('stripe_customer_id').notNull(), stripeSubscriptionId: text('stripe_subscription_id').notNull().unique(),
  status: text({ enum: ['active','past_due','canceled','incomplete'] }).notNull(),
  currentPeriodEnd: ts('current_period_end'), createdAt: ts('created_at').default(now),
});
export const adCampaigns = sqliteTable('ad_campaigns', {
  id: uuid().primaryKey(), advertiserId: text('advertiser_id').notNull().references(() => users.id),
  name: text().notNull(), creativeUrl: text('creative_url').notNull(), targetUrl: text('target_url').notNull(),
  scope: text({ enum: ['site','section','category'] }).notNull(),
  targetCityId: text('target_city_id').references(() => cities.id),
  targetAreaId: text('target_area_id').references(() => areas.id),
  targetCategoryId: text('target_category_id').references(() => categories.id),
  stripeSubscriptionId: text('stripe_subscription_id'),
  status: text({ enum: ['draft','pending_payment','pending_moderation','active','paused','rejected','ended'] }).notNull().default('draft'),
  moderation: text({ enum: ['pending','approved','rejected'] }).notNull().default('pending'),
  startsAt: ts('starts_at'), endsAt: ts('ends_at'), createdAt: ts('created_at').default(now),
});
export const affiliateLinks = sqliteTable('affiliate_links', {
  id: uuid().primaryKey(), slug: text().notNull().unique(), label: text(),
});
export const affiliateDestinations = sqliteTable('affiliate_destinations', {
  id: uuid().primaryKey(), affiliateLinkId: text('affiliate_link_id').notNull().references(() => affiliateLinks.id, { onDelete: 'cascade' }),
  countryCode: text('country_code').notNull(), program: text().notNull(), url: text().notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
}, (t) => [uniqueIndex('aff_dest_link_country').on(t.affiliateLinkId, t.countryCode)]);
export const translations = sqliteTable('translations', {
  id: uuid().primaryKey(), entityType: text('entity_type', { enum: ['venue','city','area','category'] }).notNull(),
  entityId: text('entity_id').notNull(), field: text().notNull(), locale: text().notNull(), value: text().notNull(),
  source: text({ enum: ['google_places','owner','own_media','licensed_stock','ai','admin'] }).notNull().default('ai'),
}, (t) => [uniqueIndex('tr_unique').on(t.entityType, t.entityId, t.field, t.locale), index('tr_lookup').on(t.entityType, t.entityId, t.locale)]);
export const events = sqliteTable('events', {
  id: integer().primaryKey({ autoIncrement: true }), venueId: text('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  type: text({ enum: ['view','directions','phone','link'] }).notNull(), at: ts('at').default(now),
}, (t) => [index('events_venue_at').on(t.venueId, t.at)]);
export const eventsDaily = sqliteTable('events_daily', {
  venueId: text('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  day: text().notNull(), type: text({ enum: ['view','directions','phone','link'] }).notNull(), count: integer().notNull().default(0),
}, (t) => [uniqueIndex('events_daily_pk').on(t.venueId, t.day, t.type)]);
```
Also create an FTS5 virtual table (raw SQL migration) over venue name + description + area, kept in sync with venues, for search.

---

## 9. Seed pipeline — create `scripts/seed/` (better-sqlite3/Drizzle, ESM, own package.json)

Run-once fill, then cron-refresh. CLI: `node run.js <setup|ingest|enrich|photos|gate|all> [--city=slug]`.

**Config:** first-fill cities = Athens, Mykonos, Santorini, Thessaloniki, Corfu, Zakynthos, Heraklion, Rhodes, Paros, Ios. Categories: night_club, bar, rooftop_bar, live_music, bouzoukia, beach_club — native Places `includedType` where it exists; **bouzoukia & beach_club have no Places type → text query + Greek keyword match** (μπουζούκια/πίστα/σκυλάδικο ; beach bar/παραλία). Locales en,el,de,fr,it. Enrich model `claude-haiku-4-5`.

**Stage 1 `ingest`** — Google Places API (New) `places:searchText` with `X-Goog-Api-Key` + tight `X-Goog-FieldMask` (id, displayName, formattedAddress, location, types, primaryType, businessStatus, nationalPhoneNumber, regularOpeningHours, priceLevel, websiteUri, rating, userRatingCount, photos, nextPageToken). `locationBias` circle per city; follow `nextPageToken` (≤2 pages). Upsert by `googlePlaceId`. Write facts + `fieldSources={name,address,phone,opening_hours,price_level,website:'google_places'}`, `status='draft'`, map `businessStatus=CLOSED_PERMANENTLY`→`isPermanentlyClosed`, store first ~6 `photos[].name`+attributions in `seedPhotoRefs`. NO AI here.

**Stage 2 `enrich`** — Message Batches API (`POST https://api.anthropic.com/v1/messages/batches`, headers `x-api-key`, `anthropic-version: 2023-06-01`). One request per draft venue, `custom_id=venue.id`. System prompt: write 2–3 sentence evergreen description per locale as STRICT JSON `{"description":{"<locale>":"..."}}`; **forbid hours/prices/phones/dates/events/awards/any number not given; invent nothing.** Poll batch until `ended`, read JSONL results, write to `venues.description` (en) + `translations` rows. **This module is the ONLY code allowed to write description; it must have no access to fact-column writes.**

**Stage 3 `photos`** — for venues with `seedPhotoRefs`, resolve each via `GET .../v1/{photo.name}/media?maxWidthPx=1200&skipHttpRedirect=true&key=...` → store Google URL + attribution + `cachedUntil` (~30d), `source='google_places'`, `subjectType='venue'`. No refs → no row (placeholder at render). The CHECK constraint guarantees no AI/stock here.

**Stage 4 `gate`** — `isPermanentlyClosed`→`status='closed'`; dedupe within city+category (same slugified name within ~60m → keep higher reviewCount, other→`rejected`); confidence (`reviewCount>=5` AND has description → `published` + unique slug + `publishedAt`; else `pending`).

**Cron** (`scripts/cron/sync.js`, weekly): re-pull Places, flip closed, refresh photo URLs, auto-resolve matching `closed` reports.

---

## 10. i18n / geo / SEO

Locale-prefixed routes `/{locale}/greece/{city}/...` + **hreflang** linking versions (this serves the right language in search — NOT redirects). **No forced geo/language redirects** (breaks crawling). Soft default only: homepage → nearest city via `CF-IPCountry`; "View in English?" banner (cookie-remembered). Every city/locale = one crawlable URL. Page tree: pillar `/{city}/nightlife/` → sub-pillars (by type + district) → venue pages + informational guides. Commercial-intent pages carry affiliate links; informational carry ads. Internal links ladder up.

---

## 11. Monetization

- **Affiliate router:** `/{locale}/go/{slug}` route handler → read `CF-IPCountry` → `affiliate_destinations` (country or `default`) → 302; outbound `rel="sponsored nofollow"`; disclosure on every page.
- **Ads:** AdSense now; slots built **GAM-ready** for direct-sold + backfill later. **CMP + consent mode v2** gates EEA personalized ads.
- **Tiers:** Free (claim+manage, page stays ours) → Featured (badge, **labeled** capped top-of-category, events, analytics) → Ad inventory (site/section/category, also outside brands, moderated, flat monthly). Stripe **Elements** UI + **Billing** engine + **webhook → SQLite** as source of truth.

---

## 12. Auth / claim / dashboard

- **Auth:** own session (httpOnly cookie + `sessions`), **passwordless magic-link** (`magic_tokens`).
- **Claim:** find listing → email magic-link verify (same mechanism as login). Successful Stripe payment = strong trust signal. New venues: self-serve submit → auto-validate vs Places → `pending` until gates pass. No manual approval.
- **Dashboard:** edit listing/photos/hours (writes flagged `owner` in `fieldSources`), post events (featured), per-venue analytics from `events`/`events_daily` (daily rollup cron). Unclaim wipes owner data; page persists.

---

## 13. Design

Dark base + **neon as ACCENT only** (CTAs/highlights/hover) — never neon body text (readability/accessibility; content-heavy). Readable light-grey/white on dark. Mobile-first. Tailwind tokens defined at scaffold. Real design craft, not generic AI UI. Map: static thumbnail → interactive Google Map on click (cost control).

---

## 14. Search

SQLite **FTS5** typeahead over venue name + description + area; results **biased to the detected city** and **filtered by locale**. Sits above the crawlable category/area navigation (which carries SEO).

---

## 15. Env (`.env.example`)

```
DATABASE_PATH=/home/uXXX/persistent/citynight.sqlite   # OUTSIDE deploy path
GOOGLE_MAPS_API_KEY=   ANTHROPIC_API_KEY=
STRIPE_SECRET_KEY=     STRIPE_WEBHOOK_SECRET=
EMAIL_FROM=  EMAIL_API_KEY=        # magic-link sender (Resend/SMTP)
CMP_SITE_ID=                        # consent platform
NEXT_PUBLIC_SITE_URL=https://citynight.gr
```
Secrets server-side only — never `NEXT_PUBLIC_*`.

---

## 16. Phased build plan — STOP at each ✋

0. Scaffold: Next 15 + Tailwind + Drizzle/SQLite (WAL) + i18n routing + Cloudflare + base layout + `.env.example`. ✋
1. `db/schema.ts` (§8) + migrations + FTS5 + seed cities/categories. ✋
2. `scripts/seed/` (§9); dry-run `--city=mykonos`. ✋
3. Public site: ISR pages (home/city/area/category/venue/guides) + hreflang + FTS5 search + lazy Google Map + `/go/` router + AdSense slots + CMP. ✋
4. Auth: magic-link sessions. ✋
5. Claim + verify + owner edit (with provenance) + new-venue submission gates. ✋
6. Owner dashboard: manage, events, analytics + rollup cron. ✋
7. Stripe: Elements + Billing + webhooks→SQLite; Featured + Ad tiers; GAM-ready slots. ✋
8. Deploy: Hostinger Node, persistent SQLite dir + backup cron, weekly sync cron. Generate `docs/DEPLOYMENT.md` + `docs/CRON.md`. ✋

After scaffolding, also generate `docs/DECISIONS.md` summarizing every locked choice above with one-line rationale.

---

## 17. Cost flags to respect

Google Places billed per call (field mask widens SKU) — cap pages, seed city-by-city, budget alert. Google Maps JS billed per load — lazy-load. Anthropic Batch ~50% off; descriptions are tiny. SMS not free (defer; email+Stripe-trust covers claim verification).
