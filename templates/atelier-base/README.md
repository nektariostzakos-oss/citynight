# Atelier — Hair Salon, Barber Shop & Beauty Studio Template

Production-ready Next.js template for a single-location hair/beauty business. Unzip it on any Node-capable host, open the URL, follow the 2-minute setup wizard, you're live.

Built by Mindscrollers LLC. Powers real salons in the UK and Greece.

---

## What's included

### Customer-facing
- Hero with live "next available slot" badge and urgency indicators
- Multi-step **booking flow**: service → stylist → date/time → details → confirm
- **Tokenised self-service link** in every confirmation email — clients cancel/reschedule without calling
- Services menu with **"From £X" pricing** and per-service patch-test flag
- **Add-on upsells** at booking step 4
- Shop with cart, **Stripe-hosted Checkout**, auto-issued digital gift cards
- Per-client **referral codes**, loyalty counter, birthday flag
- Contact with WhatsApp / Call / Directions CTAs
- Blog with RSS feed + SEO-friendly article schema
- Chat concierge (local, no external API) — EN + EL knowledge base
- Privacy + Terms pages auto-filled from business settings
- **GDPR cookie banner** — analytics gated behind consent
- EN/EL content, adaptive dark/light theme, WCAG 2.2 AA
- SEO: sitemap, robots, llms.txt, JSON-LD (LocalBusiness, Service, Article, FAQPage)

### Admin
- **Forced password change** on first login
- Bookings calendar + list, walk-in modal, 8h reminder cron, post-visit review request cron
- Print-friendly daily schedule grouped by stylist
- Staff manager — weekly availability, lunch breaks, specialties
- Services manager — buffer time, "From £X", patch-test, add-ons
- Gift cards (issued, balance, redemption, order-linked deactivation)
- Coupons wired to orders + bookings server-side
- Clients directory with profile pages (history, loyalty, birthday, patch-test, referral)
- Password reset via HMAC-signed email link
- Audit log, backup/restore, GDPR export per client
- Analytics panel (revenue, top services/stylists/products, day-of-week heatmap, conversion)
- SMTP presets for Gmail / Brevo / Mailgun / SendGrid / Office 365
- Stripe, review URL, timezone, booking-rules settings UI
- Role scoping — `barber` users see only their own bookings

### Engineering
- Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4
- **Server-side price authority** (client-supplied prices are ignored)
- **Server-side availability enforcement** (buffer-, staff-, hours-aware)
- File-based storage with **in-process write serialisation** (no lost writes)
- **Two-layer rate limiting** on auth/bookings/orders/uploads (IP + email)
- CSP headers, HSTS in prod, `Cache-Control: no-store` on admin/setup/api
- PBKDF2 password hashing, HMAC tokens for cancel + password reset
- Auto-generated `/icon`, `/apple-icon`, `/opengraph-image` from branding

---

## Install

See [`DEPLOY.md`](DEPLOY.md) for the full Hostinger walkthrough. Short version: extract the ZIP into your app root, set Node 20.9+, run `npm ci && npm run build`, start the app, open the URL, follow the wizard.

---

## Dev (local)

```bash
npm install
npm run dev      # http://localhost:3000
```

First visit hits `/setup` when `data/settings.json.onboarded` is `false`. Pick a template, fill business info, install — you're live.

Already onboarded? Sign in at `/admin/login` (default seed: `admin@yoursalon.local` / `change-me` — forced to change on first login).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Turbopack dev on `:3000` |
| `npm run build` | Production build |
| `npm run start` | Serve `.next/` on `${PORT:-3000}` |
| `npm run lint` | ESLint (advisory) |

---

## Folder map

```
src/
├── app/                            Next.js App Router
│   ├── page.tsx                    home — switches by industryId
│   ├── admin/, setup/              private surfaces (no Nav/Footer)
│   ├── menu/, experiences/         restaurant aliases for /shop, /services
│   ├── api/                        REST (install, templates, products, bookings, orders…)
│   └── components/
│       ├── Nav, Footer, Hero, ...  base components (theme-aware via CSS vars)
│       └── restaurant/             industry-specific section variants
├── lib/                            data access + helpers
│   ├── settings.ts                 type defs + load* helpers
│   ├── bookings, orders, products  JSON-store CRUD
│   ├── tz.ts                       DST-aware timezone math
│   ├── fileLock.ts                 in-memory mutex for JSON writes
│   └── industryPresets.ts          preset list
└── proxy.ts                        Next middleware: /setup gate + preview cookie

data/                               runtime storage (selectively gitignored)
demos/<id>/                         template bundles (meta.json + data/)
public/
├── brand/                          per-template logos + favicons
├── products/, menu/, blog/         themed icon SVGs
├── demos/<id>/cover.svg            template card art for the wizard
└── uploads/                        user-uploaded images (never committed)
```

## Data files (`data/*.json`)

| File | Holds | Cleared on clean install |
|---|---|---|
| `bookings.json` | Appointments / reservations | ✓ |
| `orders.json` | Shop orders | ✓ |
| `clients.json` | Derived client list | ✓ |
| `views.json`, `audit.json` | Telemetry | ✓ |
| `waitlist.json`, `reviews.json` | Operational | ✓ |
| `emails.log.json` | Sent-mail log | ✓ |
| `users.json` | Admin/staff accounts | ✓ (re-seeds on first boot) |
| `settings.json` | Site config (theme, nav, branding, business) | overwritten by template meta |
| `content.json` | Editable copy | copied from template |
| `products.json`, `pages.json`, `services.json`, `staff.json`, `blog-categories.json` | Content | copied from template |
| `secret.json` | Session HMAC secret | auto-generated, **never commit** |

## Theme system

CSS custom properties live in `:root` (10 tokens — see `globals.css`). `data/settings.json.theme` overrides at runtime via inlined `<style>` in `layout.tsx`. Light templates auto-apply `data-theme="light"` on `<html>`, which scopes `globals.css` overrides that remap `text-white/X`, `bg-white/X`, `border-white/X` Tailwind utilities to `var(--foreground)`-based equivalents — no per-component refactor.

Logos: `branding.logoUrl` (cream text, default) + `branding.logoUrlDark` (dark text for light theme). Nav swaps automatically.

## Booking modes

- `appointment` → `<BookingFlow>` — service → barber → date → slot → guest
- `reservation` → `<ReservationFlow>` — party size → date → time → guest

Set per-template in `meta.json.bookingMode`. Read at runtime by `loadBookingMode()`.

## Industry switching

`src/app/page.tsx` branches on `loadIndustryId()`. Each industry can supply its own `<IndustryHome>` composite. Default falls through to Hero/InfoStrip/ServicesPreview/ShopPreview/Testimonials/CTA.

---

## Add your own template

See [`demos/README.md`](demos/README.md) for the bundle schema and playbook.

## Support

- Changelog: [`../CHANGELOG.md`](../CHANGELOG.md)
- License: [`../LICENSE`](../LICENSE)
- Email: hello@mindscrollers.com

© Mindscrollers LLC.
