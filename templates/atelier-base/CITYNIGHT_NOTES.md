# Atelier (vendored) — citynight notes

This is a **vendored copy** of the Atelier template
(`C:\Users\nekta\Desktop\coworker\atelier-final\demo` at the time of import).
It is the source we customise to produce **citynight-vertical industry
templates** (nightclub, bar, rooftop-bar, bouzoukia, beach-club, restaurant,
hotel, …).

## Boundaries

- **This sub-folder is its own Next.js 16 / React 19 app.** It has its own
  `package.json`, `next.config.ts`, `tsconfig.json`. Run `npm install` +
  `npm run dev` *inside this folder* (`templates/atelier-base/`) to work on it.
- **Excluded from the citynight build**:
  - `tsconfig.json` — `exclude: [..., "templates/atelier-base"]`
  - `eslint.config.mjs` — ignored
  - `.gitignore` — its `node_modules` + `.next` ignored (source is committed)
- **Do not import from `templates/atelier-base` into citynight's `app/`,
  `components/`, or `lib/`.** The two apps share no runtime code; citynight
  is the directory, Atelier is each venue's standalone site.

## Workflow for adding a citynight-vertical template

Follow [`demos/README.md`](./demos/README.md). Short version per template:

1. Copy `demos/barber/` to `demos/<id>/`. Edit `meta.json` for the new
   industry (palette, fonts, branding, `bookingMode`, `industryId`).
2. Add `public/demos/<id>/cover.svg` + `public/brand/<id>-*.svg`.
3. Write `data/content.json`, `data/services.json` (or restaurant `menu`),
   `data/staff.json`, `data/pages.json` in EN + EL.
4. If the layout needs to differ, add `src/app/components/<id>/<Industry>Home.tsx`
   and branch in `src/app/page.tsx`.
5. Test locally on a separate port from citynight's `:3004`.

## Verticals to ship (priority order — Nektarios decides which first)

1. `restaurant` — Food vertical. `reservation` mode, menu, Stripe orders.
2. `rooftop-bar` — Nightlife. `reservation` mode (tables).
3. `nightclub` — Nightlife. Reservation + ticketed events (may need a small
   booking variant for events).
4. `beach-club` — Nightlife / Day. Sunbed reservations.
5. `bouzoukia` — Nightlife. Table reservations.
6. `hotel` — Stay vertical. Needs new `room-night` booking mode.

## Connection back to citynight

Atelier instances live at the venue's own domain. The citynight venue page
links out via `venues.website`. No code import. No iframe.

The citynight dashboard's "Get your website" upsell (TBD — see Phase F)
will point Featured owners at:
1. Buying / downloading their Atelier instance
2. Entering the resulting URL into their citynight dashboard
3. The citynight venue page CTA changes from "Visit website" → "Book at {Name} →"
   deep-linked to Atelier's `/book` (or `/reserve`) route.
