# Adding a Template

Each industry ships as a self-contained bundle in `demos/<id>/`. The Atelier installer (`/setup`) discovers them automatically via `GET /api/templates`.

## Bundle layout

```
demos/<id>/
├── meta.json                 spec sheet (theme, fonts, branding, nav, booking, industry)
└── data/
    ├── content.json          hero, info, gallery, about, team, FAQ, testimonials, CTA, contact
    ├── products.json         catalog (EN/EL + image per item)
    ├── services.json         services / experiences (optional, service-businesses only)
    ├── staff.json            team with bios + portraits (optional)
    ├── pages.json            6+ blog posts (EN/EL, cover, category)
    └── blog-categories.json  taxonomy
```

Plus `public/demos/<id>/cover.svg` (wizard card thumbnail) and `public/brand/<id>-{logo-light,logo-dark,favicon}.svg`.

## meta.json schema

| Key | Required | Notes |
|---|---|---|
| `id`, `name`, `industry`, `tagline`, `description` | yes | Wizard card metadata |
| `cover` | yes | Path to `/demos/<id>/cover.svg` |
| `accentColor` | yes | Hex used in the wizard card |
| `theme` | yes | 10 tokens — `background`, `foreground`, `primary`, `primaryAccent`, `surface`, `surfaceStrong`, `border`, `borderStrong`, `muted`, `muted2` |
| `typography` | yes | `headingFont` + `bodyFont` from `geist`/`inter`/`manrope`/`playfair`/`cormorant`/`fraunces` |
| `branding` | yes | `wordmark`, `tagline_en/el`, `logoUrl`, `logoUrlDark`, `faviconUrl` |
| `nav` | yes | `links[]` (id, label_en/el, href, enabled) + `bookLabel_en/el`, `bookHref` |
| `bookingMode` | yes | `"appointment"` (services) or `"reservation"` (tables/seats) |
| `industryId` | yes | Switch key for `src/app/page.tsx` industry routing |
| `features[]`, `stats{}` | yes | Wizard card specs |

## Playbook

1. **Research** (45 min) — five top sites in the industry. Note palette, typography pairing, photography style, hero composition, nav vocabulary, booking flow.
2. **Bundle scaffolding** (30 min) — copy `demos/barber/` to `demos/<id>/`, edit `meta.json` per the schema above.
3. **Brand assets** (20 min) — minimal wordmark logo (light + dark variants) + favicon tile in `public/brand/`. Cover SVG in `public/demos/<id>/`.
4. **Real photography** (30 min) — ~25 verified Unsplash IDs (hero, gallery, about, contact, CTA, staff portraits, blog covers, products). Verify each returns 200 before committing.
5. **Copy** (45 min) — `content.json` with full hero / about / team / FAQ / testimonials / contact blocks in EN + EL.
6. **Catalog** (45 min) — `products.json` (12–18 items), `services.json`, `staff.json`, `pages.json` (6 blog posts), `blog-categories.json`.
7. **Industry-specific layout** (optional, 60 min) — if standard sections don't fit, add `src/app/components/<id>/<Industry>Hero.tsx`, `<Industry>Home.tsx`, etc., and branch in `src/app/page.tsx`:
   ```tsx
   if (industry === "<id>") return <IndustryHome />;
   ```
8. **Route aliases** (optional) — if the industry uses different URLs (`/menu`, `/treatments`, `/rooms`), add `src/app/<alias>/page.tsx` that imports the existing data + a tailored layout.
9. **Booking variant** (only if neither `appointment` nor `reservation` fits) — extend `BookingMode` union and ship `<NewBookingFlow />`.
10. **Test** — duplicate `demo/` to `demo-<id>/`, swap `data/` to bundled files, run on a separate port.
11. **Ship** — commit. Deploy regenerates the customer ZIP + mirror automatically.

## Estimated effort

~4–6 hours per template. The architecture (install API, wizard, theme engine, light-theme overrides, booking modes, industry switching, logo swapping) is in place. Most time goes into **content + photography curation** — not code.

## Light vs dark templates

- **Light** (cocoa-on-cream): auto-applies `data-theme="light"` on `<html>` based on `theme.background` luminance. Components that hardcode `text-white/X` get auto-remapped to `var(--foreground)` via scoped overrides in `globals.css`. Nav uses `branding.logoUrlDark`.
- **Dark**: defaults work as-is. Use `branding.logoUrl` (cream text).

## Existing bundles

| ID | Brand | Industry | Booking |
|---|---|---|---|
| `barber` | Oakline | Hair / barber / beauty | appointment |

Research material for the next template (aesthetics — The Skin Artisté brand reference) lives at `coworker/research/theskinartiste/`.
