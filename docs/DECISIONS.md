# Locked decisions

> Superseded on 2026-09-17: this file describes the original directory product (CLAUDE.md sections 1 to 17). Since Phase H (2026-05) the product is the website-builder SaaS described in the CLAUDE.md header, which wins where the two disagree. Kept as history until it is rewritten for Phase H.

Every locked choice from `CLAUDE.md`, with the one-line reason it was picked.

## Stack
- **Next.js 15 App Router** — server-first, ISR baked in, RSC reduces client JS.
- **ISR rendering** for public pages — pre-built HTML at the CDN edge, regenerated on schedule + on owner edits.
- **Hostinger CloudLinux Node (`next start`)** — affordable origin behind Cloudflare; persistent process keeps ISR cache and SQLite warm.
- **SQLite (single file) + WAL** — no DB server to operate; concurrent readers + one writer fits the workload; survives across deploys when stored OUTSIDE the deploy path.
- **better-sqlite3** (fallback **node:sqlite** on Node 22+) — synchronous, fast, prebuilt; fallback removes the prebuilt-binary risk on Hostinger.
- **Drizzle ORM + drizzle-kit** — TypeScript types, generated migrations, raw SQL escape hatch for FTS5.
- **MDX/JSON for fully-static pages** (guides/legal) — version-controlled content, no DB hit.
- **Own session auth, passwordless magic-link** — no third-party auth lock-in; SMS deferred (cost).
- **Tailwind v4** — CSS-first config, faster, native @theme tokens.
- **SQLite FTS5** — search without an external service; "good enough" for venue typeahead, biased to detected city + filtered by locale.
- **Google Maps JS, lazy-loaded** — billed per load; static thumbnail until click.
- **Hostinger cron tab** for sync/reconcile/backup/rollup — no worker queue runtime on Hostinger.
- **Cloudflare front** — free CDN + DDoS + `CF-IPCountry` header for geo-routing.
- **Anthropic Claude Haiku 4.5 + Message Batches** — ~50% off batch pricing; descriptions are tiny; latency isn't user-facing for seed.
- **Google Places API (New)** for seed/sync — single authoritative source for venue facts.
- **Stripe Elements (UI) + Billing (subs) + webhook → SQLite** — Elements gives the rendering & PCI scope handled; Billing handles dunning; SQLite is source of truth for tier state.
- **AdSense → Ezoic → GAM** — start with what we can self-serve; GAM-ready slot markup so direct-sold/backfill upgrade is a config swap.
- **Google-certified CMP + Consent Mode v2** — required for EEA personalized ads + AdSense compliance.
- **i18n: locale-prefixed routes + hreflang, soft geo default, never forced redirects** — every locale has one crawlable URL; the right page shows up in the right locale's search results.

## Affiliate
- **GetYourGuide primary, Viator + Booking.com secondary, Linkwise (GR) per-market** — coverage + commercial yield, geo-routed at the `/go/{slug}` redirect using `CF-IPCountry`.

## Integrity (§6)
- **AI writes description only** — facts always come from Google Places or owner. Enforced at the module boundary, not just by prompt.
- **Photos CHECK constraint** — DB rejects AI/stock on venue/product rows.
- **Seed → draft → gates → publish** — no thin or ungrounded pages (Google scaled-content-abuse risk).
- **Owners can't delete pages** — preserves SEO asset and prevents competitor-deletion abuse.

## Design (§13)
- **Superseded on 2026-09-19 by Direction A, "Αντικύθηρα"** (approved by Nektarios). Greece built the first known computer to read the sky; citynight reads the night. Every city and every venue opens on an instrument: how far the night has gone, what is open and for how long. Two colours and hairlines. Futurism comes from live readings, not effects.
  - **Neon is retired.** Bronze `#c9965f` means "yours to act on" or time that has passed; verdigris `#6fd0bd` means one thing only, open now. Nothing else uses either. No glow, no glass, no grain.
  - **Tokens are the only source of colour**, in `app/globals.css` under semantic names (`--color-ground`, `-surface`, `-raise`, `-ink`, `-muted`, `-faint`, `-hair`, `-bronze`, `-verdigris`, `-closed`). The old alias names stay mapped so nothing breaks, and new code never uses them.
  - **Type:** Commissioner for reading, Lilex for every readout (time, hours, distance, counts, percentages) with tabular figures. Greek capitals without accents, letter-spacing 0.08em, never under 12 px.
  - **Three themes:** dark (default), light (parchment), and one that follows the city's real sunset and sunrise. An explicit choice always wins and is remembered.
  - Design source: `products/citynight/design/tokens.md` and the approved prototype `products/citynight/design/2026-09-17-antikythera-prototype.html` in the record folder.
- **Mobile-first**, Tailwind tokens at scaffold time.
- **Real craft, not generic AI UI**.

## Cost flags (§17)
- Cap Places `nextPageToken` paging at 2 per query; seed city-by-city; budget alert.
- Lazy-load Google Maps JS (static thumbnail until click).
- Anthropic via Batch API (50% off).
- SMS deferred — claim verification via email + Stripe trust signal.
