# PHASE_STATUS — citynight.gr audit

Date: 2026-05-24
Scope: §6 integrity rules + §16 phased build plan.

---

## 1. Command results

| Command          | Result | Notes |
|------------------|--------|-------|
| `pnpm install`   | ✅ PASS | "Already up to date" in 323ms (deps installed previously). |
| `pnpm typecheck` | ❌ FAIL | 13 errors. See below. Primary fix needed before declaring any phase shipped. |
| `pnpm build`     | ❌ FAIL | Webpack/SWC compiled OK, but Next's type-validation step rejects `app/[locale]/greece/[city]/[bucket]/[venue]/page.tsx:49:26` — `Property 'name' does not exist on type ...`. Same root cause as typecheck. |
| `pnpm lint`      | ❌ FAIL | ESLint not initialized — `next lint` prompts an interactive setup wizard and exits non-zero in non-TTY. Repo has no `.eslintrc*` / `eslint.config.*`. **`next lint` is also deprecated in Next 16** — migrate to ESLint CLI. |

### Typecheck errors — categorized

**A. Drizzle-ORM API drift (8 errors in `db/schema.ts`)**
Tables `areas`, `sessions`, `venues`, `photos`, `affiliateDestinations`, `translations`, `events`, `eventsDaily` all use the **array-return** form of `extraConfig` (the modern Drizzle API):

```ts
}, (t) => [ index(...).on(...), uniqueIndex(...).on(...) ]);
```

The installed `drizzle-orm@^0.36.0` still types `extraConfig` as a callback returning an **object** (`SQLiteTableExtraConfig`), not an array. Two paths:
- pin/upgrade `drizzle-orm` to the version that ships array-form typings (newer minor), OR
- rewrite each `extraConfig` to return an object keyed by index name (legacy form). The schema content is correct either way; this is a type-surface mismatch only.

**B. Stripe API version mismatch (1 error)**
`lib/stripe.ts:14` passes `'2025-09-30.clover'`, the installed `stripe@^17` expects `'2025-02-24.acacia'`.

**C. Real bugs (4 errors — must be fixed regardless of Drizzle/Stripe upgrades)**
- `components/nearby-cities-context.tsx:46` — passing `CityForNearby[]` (lat/lng `number | null`) where helper requires `number | undefined`.
- `components/search-box.tsx:359,365,371` — using `array.map(...).filter(Boolean)` style that leaves `T | undefined` in the result type; needs a type-guard predicate.
- `lib/i18n.ts:68` — passing `string | undefined` where `string` is required (likely an env / header access without a default).
- `app/[locale]/greece/[city]/[bucket]/[venue]/page.tsx:49` — reading `v.name` / `v.cityName` from a query result type that doesn't expose them (the query's return type was narrowed and the page wasn't updated).

---

## 2. §6 INTEGRITY RULES — pass/fail

| # | Rule | Status | Evidence |
|---|------|--------|----------|
| **1** | AI writes `description` (+ translations) ONLY — never facts. | ✅ **PASS** | `scripts/seed/lib/enrichment-writer.js` exposes only `writeDescriptions()`. Its prepared statements are hard-coded to `UPDATE venues SET description = ? WHERE id = ?` and an `INSERT INTO translations (... 'venue', ?, ?, ?, ?, ?)` with `source='ai'`. The test at `scripts/seed/tests/enrichment-writer.test.js` already covers: (a) only `writeDescriptions` method exists, (b) descriptions + translations land where expected, (c) every fact column is byte-for-byte unchanged after a write, (d) bad input throws cleanly. **Test executed and all 4 assertions pass.** No additional Drizzle-level test required — the existing test asserts at the same SQL surface the production module uses. |
| **2** | No fake/stock images on real things. | ✅ **PASS** | `db/schema.ts:94-97` defines `check('photo_source_matches_subject', ...)` which restricts `subject_type IN ('venue','product')` to `source IN ('google_places','owner_upload','placeholder')` — AI / stock / own_photography are **excluded**. CHECK constraint is at the SQL layer so application code cannot bypass it. Verified verbatim against §8 spec. |
| **3** | Nothing publishes unverified (gated freshness/dedupe/confidence). | ✅ **PASS** | `scripts/seed/lib/gates.js` `runGates()` runs all four required gates: closes `CLOSED_PERMANENTLY`, dedupes within (city, category) at ≤60m by slugified name keeping higher `review_count`, promotes to `published` only when `review_count >= 5 AND description length > 30`, otherwise `pending`. Ingest stage inserts every venue with `status='draft'` (`scripts/seed/stages/ingest.js:54`). |
| **4** | Owners can't delete pages. | ⚠️ **UNVERIFIED** | Need to spot-check the venue editor + claim flow to confirm there is no `DELETE FROM venues` path exposed to owners. Schema allows it (no DB-level prohibition); enforcement must be in route handlers. Not blocking but recommend a follow-up audit of `app/api/venues/*` + `components/venue-editor.tsx`. |
| **5** | No thin ungrounded pages. | ✅ **PASS (by design)** | Confidence gate (§6 rule 3 above) requires both real facts (`review_count >= 5`) and an AI description (`length > 30`) before any venue page is published. Items failing either gate become `pending`, not `published`, so they are not indexable. |

---

## 3. §8 schema match

`db/schema.ts` matches §8 **exactly** for: `cities`, `areas`, `categories`, `sessions`, `magicTokens`, `venues`, `photos` (including the CHECK constraint, verbatim), `claims`, `venueSubmissions`, `reports`, `subscriptions`, `adCampaigns`, `affiliateLinks`, `affiliateDestinations`, `translations`, `events`, `eventsDaily`.

**One additive deviation** — `users` carries three extra columns introduced for Google OAuth: `googleId` (unique), `avatarUrl`, `emailVerified` (boolean, default false). These extend §8 rather than replace any field and are documented in a comment in `db/schema.ts:28-34`. Recommend recording this in `docs/DECISIONS.md` if not already there.

FTS5 virtual table exists in `db/migrations/0001_fts5.sql`. Migrations 0000–0021 are present (init → taxonomy → demo data → city photos → OAuth → all-Greece cities → photo backfills). 22 migrations total.

---

## 4. §16 phase status — remaining work

| # | Phase | Status | One-line status |
|---|-------|--------|-----------------|
| 0 | Scaffold (Next 15 + Tailwind v4 + Drizzle/SQLite WAL + i18n + Cloudflare + base layout + `.env.example`) | 🟨 **CODE PRESENT — TYPECHECK FAILS** | All files exist; blocked by Drizzle API drift in `db/schema.ts` and the four real type bugs above. |
| 1 | `db/schema.ts` + migrations + FTS5 + seed cities/categories | 🟨 **CODE PRESENT — TYPECHECK FAILS** | Schema content matches §8 (+ OAuth extension); 22 migrations including FTS5; taxonomy seeded in 0002. Same Drizzle type errors block compile. |
| 2 | `scripts/seed/` pipeline (ingest → enrich → photos → gate) | ✅ **DONE** | All four stages exist under `scripts/seed/stages/`; enrichment writer is isolated and tested; gates verified. Lives in its own workspace with its own `package.json` (separate from app typecheck). |
| 3 | Public ISR site (home/city/area/category/venue/guides + hreflang + FTS5 search + lazy Google Map + `/go/` router + AdSense + CMP) | 🟨 **CODE PRESENT — BUILD FAILS** | All routes exist under `app/[locale]/greece/`, plus `/go/`, `search-box`, `lazy-map`, `cmp`, `ad-slot`, `affiliate-block`, `nearby-cities-*`. **Build blocked** by `app/[locale]/greece/[city]/[bucket]/[venue]/page.tsx:49` type error. |
| 4 | Auth: magic-link sessions | ✅ **DONE (subject to build)** | `app/api/auth/{request,logout,google}` + `sessions`/`magic_tokens` tables + `sign-in-form` + `google-signin-button`. Verify after typecheck fix. |
| 5 | Claim + verify + owner edit (with provenance) + new-venue submission gates | 🟨 **PARTIAL** | `app/[locale]/claim/[venueId]` and `venue-editor` exist; `venueSubmissions` table exists. **Could not locate a "submit new venue" route under `app/api/venues/` or `app/[locale]/*`** — confirm whether the self-serve submit flow is wired or still TODO. Also confirm `fieldSources` is stamped with `'owner'` on every owner-edit write. |
| 6 | Owner dashboard: manage, events, analytics + rollup cron | ✅ **DONE (subject to build)** | `app/[locale]/dashboard/[venueId]`, `venue-analytics`, `venue-editor`, `scripts/cron/rollup-analytics.js`. |
| 7 | Stripe: Elements + Billing + webhooks→SQLite; Featured + Ad tiers; GAM-ready slots | 🟨 **CODE PRESENT — TYPECHECK FAILS** | `app/api/stripe/{checkout,checkout-ad,portal,webhook}`, `subscriptions` + `adCampaigns` tables, `upgrade-button`, `manage-subscription-button`, `ad-slot`. Blocked by `lib/stripe.ts:14` API-version mismatch. |
| 8 | Deploy: Hostinger Node, persistent SQLite dir + backup cron, weekly sync cron + `docs/DEPLOYMENT.md` + `docs/CRON.md` | ✅ **DONE** | `docs/DEPLOYMENT.md`, `docs/CRON.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md` all present; `scripts/cron/{sync.js,reconcile.js,backup-db.sh,rollup-analytics.js}` all present. Verify after typecheck fix. |

---

## 5. Remaining work — execution order

To get back to a green tree and resume the phased plan, do these in order:

- [ ] **R1 · Unblock typecheck.** Pick one of:
  - upgrade `drizzle-orm` to the version where `extraConfig` accepts the array form (preferred — schema stays modern), **or**
  - rewrite the 8 `extraConfig` callbacks in `db/schema.ts` to return an object keyed by index name (legacy form).
- [ ] **R2 · Fix the 4 real type bugs** (independent of any version upgrade):
  - `components/nearby-cities-context.tsx:46` — adapt `lat: number | null` → `number | undefined` (or update helper to accept `null`).
  - `components/search-box.tsx:359/365/371` — type-guard the filter (`.filter((x): x is Row => !!x)`).
  - `lib/i18n.ts:68` — add a fallback to the optional string before passing it.
  - `app/[locale]/greece/[city]/[bucket]/[venue]/page.tsx:49` — fix the query return shape (expose `name`/`cityName`) or read them via the correct key.
- [ ] **R3 · Fix Stripe API version** in `lib/stripe.ts:14` (pin to `'2025-02-24.acacia'` matching `stripe@17`, or upgrade `stripe` to the version that ships `'2025-09-30.clover'`).
- [ ] **R4 · Re-run** `pnpm typecheck` and `pnpm build` — both must be green before claiming Phase 0/1/3/7 done.
- [ ] **R5 · Verify §6 rule 4** (owners cannot delete pages) — spot-check `app/api/venues/*` and `components/venue-editor.tsx` for any DELETE path; confirm "unclaim only wipes owner data, URL persists".
- [ ] **R6 · Verify Phase 5 completion** — locate or wire the self-serve "submit a new venue" flow that runs `venueSubmissions` auto-validation. If missing, build it before declaring Phase 5 done.
- [ ] **R7 · Initialize ESLint** properly (non-interactive). `next lint` is deprecated in Next 16; the recommended path is `npx @next/codemod@canary next-lint-to-eslint-cli .` then commit `eslint.config.mjs`.
- [ ] **R8 · Add the §8/users deviation** (Google OAuth columns) to `docs/DECISIONS.md` if not already documented.

---

**Recommendation:** ship R1+R2+R3 as a single "unblock the tree" PR (the type errors are localised), then run R4. Do not start any new phase work until typecheck and build are both green — the integrity-rule guarantees we depend on (especially rule 2's CHECK constraint) only hold at runtime if the schema actually compiles into a working `drizzle-kit generate` artifact.

Stopping here for your approval before changing any code.
