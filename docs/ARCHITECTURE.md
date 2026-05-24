# Architecture

```
Visitor → Cloudflare (CDN/DDoS + CF-IPCountry) → Hostinger CloudLinux Node (`next start`) → SQLite (WAL)
                                                              ↘ Stripe webhooks → SQLite
                                              ↘ Anthropic Batch API (descriptions only) — via seed pipeline
                                              ↘ Google Places API (New) — via seed pipeline
```

## Surfaces

| Surface | Rendering | Source |
| --- | --- | --- |
| `/{locale}/greece/{city}/...` | **ISR** — built from SQLite, revalidated on schedule + owner edits | `venues`, `cities`, `areas`, `categories`, `photos`, `translations` |
| `/{locale}/guides/...` `/{locale}/legal/...` | Fully static MDX | `content/{guides,legal}/...` |
| `/{locale}/dashboard/...` | Dynamic, server-rendered | `users`, `sessions`, owner-scoped venue queries |
| `/api/auth/...` `/api/stripe/...` `/api/claim/...` | Route handlers | SQLite (writes) |
| `/{locale}/go/{slug}` | Route handler 302 | `affiliate_links`, `affiliate_destinations` keyed on `CF-IPCountry` |
| `/{locale}/search` (typeahead) | Route handler over **FTS5** | `venues_fts` virtual table |

## Boundaries (integrity rules §6, enforced in code)

1. **AI writes `venues.description` and `translations` ONLY.** The enrichment module has no write capability to fact columns. A test asserts this.
2. **`photos.CHECK` constraint** forbids `ai_decorative` / `licensed_stock` from being attached to a `venue` or `product` subject.
3. **Seed → draft → gates → published**. Nothing publishes unverified.
4. **Owners cannot delete pages.** Unclaim wipes owner-attributed data; URL persists.

## Why these choices

See `DECISIONS.md`.
