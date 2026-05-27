# ATELIER PORT INVENTORY

## Context

Atelier is a **single-tenant SaaS template** (Next 16 + React 19) that vendored at `templates/atelier-base/`. It has:
- Multi-tenant capability via `tenantContext.ts` (AsyncLocalStorage per-request tenant slug)
- **File-based JSON persistence** (no database) for all business data — bookings, services, products, settings live under `data/` as JSON files with filesystem locks
- Booking engine with Stripe payment integration
- Admin dashboard for managing business info, services, staff, bookings, products, coupons, gift cards, etc.
- Public pages for services, gallery, blog, shop, contact, team, booking flow

Citynight is **multi-venue on a multi-tenant SaaS model** (one venue = one site) with **SQLite + Drizzle ORM**, locale-prefixed routes, and the integrity rules from CLAUDE.md §6. 

The architectural gap: Atelier has one admin per business; Citynight has one owner per venue, venues live in a shared directory (/cities/{city}), and all data is SQL-backed.

---

## 1. App Routes Inventory

### `/` (root layout + page)
- **Purpose:** Homepage with hero, info strip, services carousel, gallery strip, booking CTA
- **Tenant-scoped:** YES (renders with business branding, photos, content per tenant)
- **Disk reads:** `data/content.json`, `data/settings.json`, `data/services.json`, `public/uploads/`
- **Dependencies:** Framer Motion (animations), Next Image, Tailwind
- **For booking-capable:** YES (required)

### `/admin` (dashboard root)
- **Purpose:** Auth-gated admin hub with tabs for dashboard, clients, services, staff, bookings, analytics, marketing, mobile app, domain, etc.
- **Tenant-scoped:** YES (reads/writes business settings, booking data)
- **Disk reads:** Full `data/` tree; **writes:** settings, services, bookings, clients, products, coupons, gift cards, users
- **Dependencies:** `auth.ts` (httpOnly session cookie), custom service/staff/booking libs, Stripe
- **For booking-capable:** YES (core to business)

### `/admin/login`
- **Purpose:** Email + password sign-in (password-based, not magic-link)
- **Tenant-scoped:** NO (global auth, but sets per-tenant session cookie at tenant cookie path)
- **Disk reads:** `data/users.json`
- **Dependencies:** `auth.ts`, password hashing (PBKDF2 + salt)
- **For booking-capable:** YES (required)

### `/admin/reset` 
- **Purpose:** Admin password-reset flow (RequestForm + ResetForm)
- **Tenant-scoped:** YES (per-tenant users, session scoped to `/<slug>`)
- **Disk reads:** `data/users.json`
- **Dependencies:** `auth.ts`, email (nodemailer/SMTP from settings.json)
- **For booking-capable:** YES (required)

### `/admin/schedule`
- **Purpose:** Staff availability & hours editor (ScheduleActions component)
- **Tenant-scoped:** YES
- **Disk reads:** `data/staff.json`, `data/settings.json`
- **Dependencies:** `customStaff.ts`, timezone lib
- **For booking-capable:** YES (core)

### `/admin/clients`
- **Purpose:** Client list, search, profile view/edit (ClientProfileActions)
- **Tenant-scoped:** YES
- **Disk reads:** `data/clients.json`, bookings, contact history
- **Dependencies:** `clients.ts`, export to CSV via `csv.ts`
- **For booking-capable:** YES (required for appointment history)

### `/admin/analytics` 
- **Purpose:** Views, bookings, revenue charts (AnalyticsPanel)
- **Tenant-scoped:** YES
- **Disk reads:** `data/events_daily.json`, bookings, orders
- **Dependencies:** `ownerAnalytics.ts`, charting (likely recharts or custom)
- **For booking-capable:** YES (if bookings exist)

### `/admin/marketing/campaigns`, `/automations`, `/reputation`, `/audiences`
- **Purpose:** Email/SMS campaigns, automation rules, review reputation, marketing segments
- **Tenant-scoped:** YES
- **Disk reads:** `data/clients.json`, `marketing_*.json` files (campaigns, automations, etc.)
- **Dependencies:** Nodemailer, SMS (Twilio ref in `sms.ts`), marketing libs, email validation
- **For booking-capable:** NO (optional engagement tools)

### `/admin/languages`
- **Purpose:** Toggle which languages the site shows (EN always; EL/others optional)
- **Tenant-scoped:** YES (settings.enabledLanguages)
- **Disk reads:** `data/settings.json`
- **Dependencies:** `langs.ts`, `i18nServer.ts`
- **For booking-capable:** NO (UX polish)

### `/admin/domain` 
- **Purpose:** Custom domain configuration (Vercel deployment only; not applicable to Hostinger/citynight)
- **Tenant-scoped:** YES
- **Disk reads:** None (Vercel API integration)
- **Dependencies:** Vercel API
- **For booking-capable:** NO (SaaS perk)

### `/admin/mobile-app`
- **Purpose:** Mobile app build UI (APK generation for Android)
- **Tenant-scoped:** YES
- **Disk reads:** Keystore config
- **Dependencies:** `apkBuilds.ts`, `apkBuilder.ts` (wraps APK build CLI)
- **For booking-capable:** NO (optional native wrapper)

### `/admin/packs`
- **Purpose:** Class packs / prepaid bundles manager
- **Tenant-scoped:** YES
- **Disk reads:** `data/packs.json`
- **Dependencies:** `packs.ts`
- **For booking-capable:** NO (optional upsell)

### `/admin/update`
- **Purpose:** Software update staging UI (for the bundled SaaS only; not for standalone customer ZIP)
- **Tenant-scoped:** NO (fleet-level)
- **Disk reads:** None
- **Dependencies:** Atelier bundle server integration
- **For booking-capable:** NO (SaaS internal)

### `/book` (booking flow)
- **Purpose:** Public multi-step booking form: service → stylist → date/time → guest info → payment
- **Tenant-scoped:** YES (reads business hours, services, staff, pricing, Stripe key)
- **Disk reads:** `data/services.json`, `data/staff.json`, `data/settings.json`, `data/coupons.json`, `data/bookings.json` (conflict check), `data/holidays.json`, `data/subscriptions.json` (membership discount)
- **Dependencies:** `bookings.ts`, `services.ts`, `coupons.ts`, Stripe Elements, timezone handling, rate limiting
- **For booking-capable:** YES (core)

### `/b/[id]` (booking confirmation/receipt)
- **Purpose:** Public booking receipt page (accessible via email link + `bookingToken.ts` signature)
- **Tenant-scoped:** YES (reads booking, renders business details)
- **Disk reads:** `data/bookings.json`, `data/settings.json`
- **Dependencies:** `bookingToken.ts` (HMAC signing), CancelButton component (POST to `/api/bookings/[id]/cancel`)
- **For booking-capable:** YES

### `/services`
- **Purpose:** Public services listing page (filtered by category, image gallery)
- **Tenant-scoped:** YES
- **Disk reads:** `data/services.json`, `data/photos.json` (if venue-attached images exist)
- **Dependencies:** `customServices.ts`
- **For booking-capable:** YES

### `/shop`
- **Purpose:** Public product e-commerce catalog (grid, search, cart sidebar)
- **Tenant-scoped:** YES
- **Disk reads:** `data/products.json`, `data/orders.json` (order history for logged-in users)
- **Dependencies:** `products.ts`, `orders.ts`, `cartClient.tsx` (Zustand state), Stripe for checkout
- **For booking-capable:** NO (optional shop module)

### `/gallery`
- **Purpose:** Photo gallery (venue images, transformation before/afters)
- **Tenant-scoped:** YES
- **Disk reads:** `public/uploads/`, `data/transformations.json`
- **Dependencies:** Next Image, Framer Motion
- **For booking-capable:** NO (visual showcase)

### `/blog` + `/blog/[slug]`
- **Purpose:** CMS blog index & single post pages
- **Tenant-scoped:** YES
- **Disk reads:** `data/pages.json` (blog posts), `data/blog-categories.json`
- **Dependencies:** MDX rendering (posts stored as JSON with markdown), `blogCategories.ts`
- **For booking-capable:** NO (SEO content)

### `/about`
- **Purpose:** Team / about page (staff bios, photos)
- **Tenant-scoped:** YES
- **Disk reads:** `data/staff.json`, `data/content.json` (hero/team section), uploads
- **Dependencies:** Team component
- **For booking-capable:** NO (trust signal)

### `/gallery`
- **Purpose:** Photo gallery with lightbox (transformations, venue ambiance)
- **Tenant-scoped:** YES
- **Disk reads:** `public/uploads/`
- **Dependencies:** Next Image, Framer Motion, lightbox
- **For booking-capable:** NO

### `/contact`
- **Purpose:** Contact form + embedded map + info (email/phone/address/hours)
- **Tenant-scoped:** YES
- **Disk reads:** `data/settings.json` (business contact, hours), `data/content.json` (contact section)
- **Dependencies:** Nodemailer, Google Maps JS (lazy-loaded via `useCallback`)
- **For booking-capable:** NO

### `/privacy` + `/terms`
- **Purpose:** Static legal pages (rendered from content.json or hardcoded boilerplate)
- **Tenant-scoped:** YES (branding)
- **Disk reads:** None (static or settings)
- **Dependencies:** None
- **For booking-capable:** NO

### `/setup` 
- **Purpose:** Fresh-install onboarding flow (first-run wizard for new tenant)
- **Tenant-scoped:** YES (but only on first install; thereafter admin login)
- **Disk reads:** None on first run; writes all initial `data/` files
- **Dependencies:** `install.ts`, brand upload, business info collection, Stripe key entry
- **For booking-capable:** YES (required on first run)

### `/cart` 
- **Purpose:** Shopping cart sidebar (product checkout)
- **Tenant-scoped:** YES
- **Disk reads:** `data/products.json`, `data/coupons.json` (discount codes)
- **Dependencies:** `cartClient.tsx` (Zustand), `orders.ts`, Stripe Elements
- **For booking-capable:** NO

### `/preview`
- **Purpose:** Admin preview mode (impersonate customer view without login)
- **Tenant-scoped:** YES
- **Disk reads:** None (just sets session cookie)
- **Dependencies:** `__impersonate/route.ts`
- **For booking-capable:** NO (admin tool)

### `/__impersonate` (routes + exit)
- **Purpose:** Admin impersonation (set fake session to test customer-side UX)
- **Tenant-scoped:** YES
- **Disk reads:** None (cookie manipulation)
- **Dependencies:** Session auth
- **For booking-capable:** NO (dev tool)

### `/icon-pwa`, `/apple-icon.tsx`, `/icon.tsx`, `/favicon.ico`
- **Purpose:** PWA + browser icon metadata
- **Tenant-scoped:** YES (if branding includes custom favicon)
- **Disk reads:** `data/settings.json` (branding.faviconUrl)
- **Dependencies:** None
- **For booking-capable:** NO (UX)

---

## 2. lib/ Inventory

### Core domain logic
- **`bookings.ts`**: Create, list, cancel, occupy-slot-check for appointments. File: `data/bookings.json` + filesystem lock.
- **`customServices.ts`**: Read/write services catalog. File: `data/services.json`. Falls back to hardcoded SERVICES if file missing.
- **`customStaff.ts`**: Staff availability, schedules, lunch breaks. File: `data/staff.json`.
- **`clients.ts`**: Client CRUD, search, contact history. File: `data/clients.json`.
- **`orders.ts`**: Shop order management. File: `data/orders.json`.
- **`products.ts`**: Product catalog (shop items). File: `data/products.json`.
- **`coupons.ts`**: Coupon / discount code CRUD. File: `data/coupons.json`.
- **`giftCards.ts`**: Gift voucher management. File: `data/gift-cards.json`.
- **`holidays.ts`**: Business holiday closures. File: `data/holidays.json`.
- **`subscriptions.ts`**: Membership subscriptions (recurring discount). File: `data/subscriptions.json`.
- **`packs.ts`**: Class packs / prepaid bundles. File: `data/packs.json`.

### Settings & configuration
- **`settings.ts`**: Business info, branding, SMTP, Stripe keys, timezone, hours, social links. File: `data/settings.json`. Cached (React cache).
- **`users.ts`**: Admin user CRUD, password hashing (PBKDF2), session signing. File: `data/users.json`, `data/secret.json` (session secret).

### Auth & session
- **`auth.ts`**: `currentUser()`, `isAdmin()`, `isStaff()`, `signIn()`, `signOut()`. Uses httpOnly cookie `atelier_session` read from `users.ts`.
- **`bookingToken.ts`**: HMAC signing for public booking receipt links.
- **`passwordReset.ts`**: Password reset token generation & validation.

### Email & notifications
- **`email.ts`**: Nodemailer SMTP integration; sends booking confirmations, reminders, reviews, password resets.
- **`notify.ts`**: Post-booking notifications (email, possibly Slack/Discord).
- **`sms.ts`**: SMS integration stub (Twilio setup; not fully implemented in template).

### Marketing & analytics
- **`ownerAnalytics.ts`**: Daily event rollup for dashboard (views, bookings, revenue). Reads `events.json`, `events_daily.json`.
- **`marketingCampaigns.ts`**, **`marketingAutomations.ts`**, **`marketingSegments.ts`**: Campaign/automation/segment CRUD.
- **`marketingPrefs.ts`**: Marketing consent per client.
- **`marketingQuota.ts`**: Rate limiting for email campaigns.

### Multi-tenancy & file system
- **`tenantContext.ts`**: AsyncLocalStorage per-request tenant slug; resolves `data/tenants/<slug>/_root/data/` for SaaS, or `./data/` for standalone.
- **`appRoot.ts`**: Returns tenant-aware app root. Falls back to `process.cwd()` if standalone.
- **`fileLock.ts`**: Mutex for concurrent writes to JSON files (prevents data corruption).

### Internationalization
- **`i18nServer.ts`**: Server-side i18n (detect locale from URL, translate settings labels).
- **`i18n.tsx`**: Client-side i18n context.
- **`langs.ts`**: Supported languages list; feature flags for per-tenant enabledLanguages.

### UI & branding
- **`brandingClient.tsx`**: Client-side branding context (colors, fonts, logos).
- **`theme.tsx`**: Tailwind color tokens generation from settings.theme.
- **`motion.ts`**: Framer Motion animation presets.

### Utilities
- **`utils.ts`**: Formatting, slug generation, etc.
- **`tz.ts`**: Timezone conversion (store times in UTC, render in business TZ).
- **`csv.ts`**: CSV export for bookings, clients, products.
- **`qr.ts`**: QR code generation (for gift cards, booking links).
- **`postalLookup.ts`**: Postal code validation (UK-centric).
- **`unsplash.ts`**: Unsplash API integration for stock photos.
- **`barberKnowledge.ts`**: Knowledge base for a barber-specific AI chatbot (not core to venue booking).

### Admin features
- **`audit.ts`**: Audit log for admin actions.
- **`installStats.ts`**: Track first-install timestamp per tenant.
- **`demoMode.ts`**: Flag to detect if running the demo showcase (hardcoded seed admin, auto-reset cron).

### External integrations
- **`stripe.ts`**: Stripe secret/publishable key resolution from settings or env; `createPaymentIntent()`, webhook validation.
- **`requests.ts`** (likely exists): HTTP client for external APIs (Google Places, Unsplash, etc.).

### Data I/O
- **`requests.ts`**: HTTP fetch wrapper.
- **`appRoot.ts`**: File system root resolution.

---

## 3. Component Inventory

**Location:** `src/app/components/`

### Core pages & layouts
- **`AdminDashboard.tsx`**: Main admin hub layout (tabs: overview, clients, services, bookings, etc.). Server + client.
- **`BookingFlow.tsx`**: Multi-step booking form (service → stylist → date/time → guest → payment). Client-only (form state).
- **`CartView.tsx`** + **`CartSidebar.tsx`**: Shop cart UI (Zustand state). Client.
- **`GalleryGrid.tsx`** + **`GalleryStrip.tsx`**: Photo gallery layouts. Client.
- **`BlogList.tsx`** + **`BlogStrip.tsx`**: Blog listing (posts grid / carousel). Server.

### Admin panels
- **`AnalyticsPanel.tsx`**: Dashboard charts (views, bookings, revenue). Client.
- **`ClientsPanel.tsx`**: Client list & search. Client.
- **`BookingsCalendar.tsx`**: Booking calendar / timeline. Client.
- **`UsersPanel.tsx`**: Admin user management. Client.
- **`WaitlistPanel.tsx`**: Waitlist for sold-out services. Client.
- **`CouponsPanel.tsx`**: Coupon CRUD. Client.
- **`GiftCardsPanel.tsx`**: Gift card management. Client.
- **`BlogPanel.tsx`**: Blog post editor. Client.
- **`BulkEmail.tsx`**: Bulk email to clients (marketing tool). Client.

### Modals & forms
- **`WalkInBookingModal.tsx`**: Quick walk-in appointment entry (for staff). Client.
- **`ForcePasswordChange.tsx`**: Forces new admin to set password before dashboard access. Client.

### Info & navigation
- **`About.tsx`**: Team bios + photos. Server.
- **`ContactInfo.tsx`**: Business hours, address, map embed. Server.
- **`Footer.tsx`**: Footer with links, hours, contact. Server.
- **`Team.tsx`**: Staff display. Server.
- **`FAQ.tsx`**: FAQ accordion. Server.
- **`InfoStrip.tsx`**: Business info card (hours, address, phone, walk-in status). Client.

### Third-party integrations
- **`ChatWidget.tsx`** + **`ChatWidgetLazy.tsx`**: AI chatbot widget (lazy-loads Chat API). Client.
- **`ShopPreview.tsx`**: Product preview in cart / checkout. Client.

### UI utilities
- **`EditPencil.tsx`**: Inline edit icon (hover state). Client.
- **`AdminUpdateBadge.tsx`**: "Update available" badge (for SaaS). Client.
- **`TenantBanner.tsx`**: Tenant context indicator (dev/debug). Client.
- **`DemoBanner.tsx`**: "This is a demo" banner (resets hourly). Client.

### Integrations
- **`ExpressCheckout.tsx`**: Stripe Express (one-click checkout). Client.
- **`CookieBanner.tsx`**: Cookie consent + GDPR banner. Client.
- **`TranslatedPageHeader.tsx`**: Localized page title + meta. Server.

### Layout components
- **`AvailabilitySnapshot.tsx`**: "Open now?" status mini-card. Client.
- **`BeforeAfter.tsx`**: Before/after transformation gallery. Client.
- **`CTA.tsx`**: Call-to-action button (variant system). Client.
- **`JsonLd.tsx`**: Schema.org JSON-LD for SEO. Server.

---

## 4. Data Model — Barber Demo Specifics

**Location:** `demos/barber/data/` + `demos/barber/meta.json`

### Top-level JSON files

| File | Shape | Purpose | Destination in Citynight |
|------|-------|---------|--------------------------|
| `meta.json` | `{ id, name, industry, tagline, description, cover, accentColor, theme, typography, bookingMode, branding, nav, features, stats }` | Demo metadata + site config | SQL: `sites` table (uuid, slug, legacy_venue_id) + `site_menu_*` cols, or JSON col |
| `settings.json` | `{ smtp, branding, business, nav, templates, analytics, ai, payments, theme, typography, bookingMode, industryId, onboarded, license, enabledLanguages }` | Full business config (SMTP, Stripe, hours, socials) | SQL: add cols to `sites` or separate `site_settings` table |
| `users.json` | `[{ id, email, role, barberId, passwordHash, createdAt, mustChangePassword }]` | Admin user(s) | SQL: link to user role; email is claimed/owner contact |
| `services.json` | `[{ id, tkey, name, name_el, desc, duration, price, bufferMinutes, deposit, fromPrice, requiresPatchTest, addOnIds, category, enabled, order }]` | Service catalog (haircuts, beard trim, etc.) | SQL: `site_services` table (new) |
| `staff.json` | `[{ id, name, role, barberId, hours, lunch, photo, order }]` | Barber/stylist roster + schedules | SQL: `site_staff` table |
| `bookings.json` | `[{ id, serviceId, serviceName, price, duration, barberId, barberName, date, time, name, phone, email, notes, status, createdAt, lang, remindedAt, reviewedAt, walkIn, deposit, depositPaid, membershipDiscount, usedPackId }]` | Appointment bookings | SQL: `bookings` table (rename from venues) + tenant key |
| `clients.json` | `[{ id, name, phone, email, notes, createdAt, lastBooking, totalSpent, contactPrefs, tags }]` | Customer database | SQL: `customers` or `site_clients` table |
| `orders.json` | `[{ id, clientId, items, total, status, createdAt, paidAt, shippedAt }]` | Shop orders (e-commerce) | SQL: `orders` table |
| `products.json` | `[{ id, slug, name_en, name_el, price, category_en, category_el, shortDesc_en, shortDesc_el, longDesc_en, longDesc_el, image, stock, featured }]` | Product catalog (pomade, clay, scissors, etc.) | SQL: `site_products` table |
| `coupons.json` | `[{ id, code, discount, type, validFrom, validTo, usageLimit, used, description }]` | Discount codes | SQL: `site_coupons` table |
| `gift-cards.json` | `[{ id, code, balance, initialBalance, purchasedBy, purchasedAt, redeemedBy, redeemedAt, expiresAt }]` | Gift voucher inventory | SQL: `site_gift_cards` table |
| `subscriptions.json` | `[{ id, clientId, stripeSubId, status, currentPeriodEnd, createdAt }]` | Active memberships | SQL: `site_subscriptions` table |
| `packs.json` | `[{ id, name, sessions, price, expiresAfterDays, usedBy, redeemedSessions }]` | Class packs (e.g., "10 haircuts for $400") | SQL: `site_packs` table |
| `pages.json` | `[{ id, slug, title_en, title_el, content_en, content_el, meta, published }]` | Custom pages + blog posts | SQL: `site_pages` table |
| `blog-categories.json` | `[{ id, slug, name_en, name_el, description, color }]` | Blog category taxonomy | SQL: `site_blog_categories` table |
| `transformations.json` | `[{ id, before, after, serviceId, clientName, date }]` | Before/after photo pairs (gallery) | SQL: `site_transformations` table or JSON `site_photos.metadata` |
| `reviews.json` | `[{ id, clientId, serviceId, rating, text, createdAt, visible }]` | Review/testimonial list | SQL: `site_reviews` table |
| `waitlist.json` | `[{ id, serviceId, clientId, createdAt, notified }]` | Waitlist for fully booked services | SQL: `site_waitlist` table |
| `content.json` | `{ page_home, hero, info, about, contact, testimonials, ... }` | CMS fields for public pages (hero copy, section text) | SQL: `site_content` JSON col or denormalize to individual cols |

### Uploads directory

- **`demos/barber/uploads/`** — Uploaded images (WebP, resized). In production, lives at `public/uploads/<siteId>/`.

### Schema mapping rationale

- **Single-source JSON** (Atelier) → **SQL per-site** (Citynight): Atelier's single `data/services.json` per tenant becomes `site_services` with `site_id` foreign key; same for all domain tables.
- **`content.json` (page/hero/info text)** → can be:
  1. JSON column in `sites` table (fast reads, single-key updates)
  2. Separate `site_content` table (structured schema, easier migrations)
  3. Denormalized columns on `sites` (simplest for MVP, schema bloat)
  
  **Recommend:** JSON column on `sites` for MVP (keep schema clean), migrate to structured table later if needed.

---

## 5. API Routes That Mutate

**Location:** `src/app/api/`

### Settings & configuration
| Route | Method | Writes | Used by | Notes |
|-------|--------|--------|---------|-------|
| `/api/settings` | GET | None | Admin dashboard | Returns masked secret fields (`pass`, `apiKey`, `stripeSecretKey` → `********`) |
| `/api/settings` | PATCH | `data/settings.json` | Settings UI | Allowlist validation; doesn't overwrite masked secrets if client sends `********` back |
| `/api/settings/test-email` | POST | None | Email config test | Sends test email via configured SMTP |
| `/api/settings/relay-status` | GET | None | Admin diagnostics | SaaS-only; checks email relay connectivity |
| `/api/branding` | GET | None | Public pages | Public branding (logo, colors) |
| `/api/branding` | PATCH | `data/settings.json` (branding subtree) | Admin | Updates logoUrl, wordmark, tagline |
| `/api/business` | GET | None | Public pages | Business hours, address, phone, socials |
| `/api/business` | PATCH | `data/settings.json` (business subtree) | Admin | Updates hours, phone, address, timezone |

### Services & staff
| Route | Method | Writes | Used by | Notes |
|-------|--------|--------|---------|-------|
| `/api/services` | GET | None | Booking flow, public | Returns enabled services sorted by order |
| `/api/services/admin` | GET | None | Admin panel | Returns all services (enabled + disabled) |
| `/api/services/admin` | POST | `data/services.json` | Admin | Upsert service; validates id + name |
| `/api/services/admin` | DELETE | `data/services.json` | Admin | Soft-delete (removes from list) or hard-delete |
| `/api/staff` | GET | None | Booking flow | Returns staff roster (names, photos, hours) |
| `/api/staff` | POST | `data/staff.json` | Admin | Add/edit barber; stores schedule + lunch breaks |
| `/api/staff/availability` | GET | None | Booking flow | Day-of-week + slot availability per staff |

### Bookings
| Route | Method | Writes | Used by | Notes |
|-------|--------|--------|---------|-------|
| `/api/bookings` | GET | None | Admin bookings view | List all bookings (date range optional) |
| `/api/bookings` | POST | `data/bookings.json` | Booking flow | Create appointment; validates slots, coupon, Stripe deposit |
| `/api/bookings/[id]` | GET | None | Receipt page, admin | Booking details |
| `/api/bookings/[id]` | PATCH | `data/bookings.json` | Admin | Update status, notes, client contact |
| `/api/bookings/[id]/cancel` | POST | `data/bookings.json` | Receipt page, admin | Cancel booking; refund deposit if paid |
| `/api/bookings/[id]/pay` | POST | Stripe API, `data/bookings.json` | Receipt page | Pay deposit or full amount |
| `/api/bookings/[id]/deposit-confirm` | POST | `data/bookings.json` | Stripe webhook callback | Mark deposit as paid after Stripe Checkout success |
| `/api/bookings/export` | GET | None | Admin export | CSV download of bookings |

### Clients
| Route | Method | Writes | Used by | Notes |
|-------|--------|--------|---------|-------|
| `/api/clients` | GET | None | Admin panel | List clients (search, sort) |
| `/api/clients` | POST | `data/clients.json` | Admin | Create client (walk-in entry) |
| `/api/clients/[id]` | GET | None | Admin profile view | Client detail |
| `/api/clients/[id]` | PATCH | `data/clients.json` | Admin | Update name, phone, email, notes, contact prefs |
| `/api/clients/export` | GET | None | Admin export | CSV of client list |

### Coupons, gift cards, packs
| Route | Method | Writes | Used by | Notes |
|-------|--------|--------|---------|-------|
| `/api/coupons` | GET | None | Booking/shop flow | List active coupons (validation on POST booking/order) |
| `/api/coupons` | POST | `data/coupons.json` | Admin | Create coupon; set discount %, usage limit, validity |
| `/api/coupons` | PATCH | `data/coupons.json` | Admin | Edit coupon |
| `/api/coupons` | DELETE | `data/coupons.json` | Admin | Remove coupon |
| `/api/gift-cards` | GET | None | Admin | List gift cards |
| `/api/gift-cards` | POST | `data/gift-cards.json` + Stripe | Admin | Issue new gift card; generate code, set balance |
| `/api/gift-cards` | PATCH | `data/gift-cards.json` | Redemption flow | Mark as redeemed; deduct balance |
| `/api/packs` | GET | None | Booking flow (upsell) | List available packs |
| `/api/packs` | POST | `data/packs.json` | Admin | Create class pack |

### Orders & products
| Route | Method | Writes | Used by | Notes |
|-------|--------|--------|---------|-------|
| `/api/products` | GET | None | Shop public | List products (filters, search) |
| `/api/products/[id]` | GET | None | Product detail page | Single product |
| `/api/products` | POST | `data/products.json` | Admin | Add product |
| `/api/products/[id]` | PATCH | `data/products.json` | Admin | Edit product (price, stock, desc, image) |
| `/api/products/[id]` | DELETE | `data/products.json` | Admin | Remove product |
| `/api/products/import` | POST | `data/products.json` (bulk upsert) | Admin | CSV import |
| `/api/products/export` | GET | None | Admin | CSV export |
| `/api/orders` | GET | None | Admin | List orders (date range, status filter) |
| `/api/orders` | POST | `data/orders.json` + Stripe | Checkout | Create order; charge via Stripe |
| `/api/orders/[id]` | GET | None | Order history, admin | Order detail |
| `/api/orders/[id]/refund` | POST | Stripe API, `data/orders.json` | Admin | Refund order |
| `/api/orders/express` | POST | Stripe API, `data/orders.json` | Quick checkout | Fast one-click order (Stripe Express) |

### Auth & user management
| Route | Method | Writes | Used by | Notes |
|-------|--------|--------|---------|-------|
| `/api/auth` | POST | `data/users.json` (session cookie set) | Login form | Email + password sign-in; PBKDF2 verify |
| `/api/auth/reset` | POST | `data/users.json` (new password) | Password reset form | Token validation + password update |
| `/api/users` | GET | None | Admin users list | List all admin users |
| `/api/users` | POST | `data/users.json` | Admin | Create new admin/barber user |
| `/api/users/[id]` | PATCH | `data/users.json` | Admin | Edit user (role, email, password) |
| `/api/account/delete` | DELETE | `data/users.json` | Account settings | Delete authenticated user account |

### Marketing & analytics
| Route | Method | Writes | Used by | Notes |
|-------|--------|--------|---------|-------|
| `/api/analytics` | GET | None | Dashboard | Aggregated analytics (views, revenue, etc.) from `events_daily.json` |
| `/api/track` | POST | `data/events.json` + cron rolls up to `events_daily.json` | Frontend tracking pixels | Log view/click/phone/directions event |
| `/api/reviews` | GET | None | Public page | List visible reviews |
| `/api/reviews` | POST | `data/reviews.json` | Review form (post-visit email link) | Submit review |
| `/api/audit` | GET | None | Admin audit log | Action history (user logins, edits, etc.) |
| `/api/audit` | POST | `data/audit.json` (internal) | Internal | Log admin action |

### Emails, cron, webhooks
| Route | Method | Writes | Used by | Notes |
|-------|--------|--------|---------|-------|
| `/api/email` | POST | None (sends via SMTP/relay) | Cron, event triggers | Send email (booking confirm, reminder, review request, password reset) |
| `/api/cron/reminders` | POST | `data/bookings.json` (remindedAt timestamp) | Cron job (daily) | Send booking reminders 24h before; mark sent |
| `/api/cron/demo-reset` | POST | Wipes `data/` (for demo only) | Cron job (hourly on SaaS demo) | Full reset of demo site for fresh state |
| `/api/payment-intent` | POST | None (Stripe API call) | Checkout modal | Create Stripe PaymentIntent for booking deposit |
| `/api/membership/checkout` | POST | None (Stripe API call) | Membership signup modal | Create Stripe Session for membership subscription |
| `/api/membership/confirm` | POST | `data/subscriptions.json` | Stripe webhook | Confirm membership after Checkout success |
| `/api/membership/admin` | GET | None | Admin | List active memberships |

### Pages, templates, navigation
| Route | Method | Writes | Used by | Notes |
|-------|--------|--------|---------|-------|
| `/api/pages` | GET | None | Public pages | List pages (blog posts, custom pages) |
| `/api/pages` | POST | `data/pages.json` | Admin page editor | Create page |
| `/api/pages` | PATCH | `data/pages.json` | Admin page editor | Edit page |
| `/api/blog-categories` | GET | None | Blog pages | List blog categories |
| `/api/blog-categories` | POST | `data/blog-categories.json` | Admin | Create category |
| `/api/nav` | GET | None | Public navigation | Navigation links + book CTA label (per-locale) |
| `/api/templates` | GET | None | Setup wizard | List available templates (industry presets) |

### Install, admin, misc
| Route | Method | Writes | Used by | Notes |
|-------|--------|--------|---------|-------|
| `/api/install` | POST | Writes entire `data/` tree | Setup wizard | One-time fresh install; creates users, settings, demo data |
| `/api/admin/me` | GET | None | Admin nav | Current user info (email, role) |
| `/api/admin/packs` | GET | None | Admin | List packs (admin view) |
| `/api/admin/packs` | POST | `data/packs.json` | Admin | Create pack |
| `/api/admin/build-apk` | POST | Triggers build, stores in `/uploads/` | Mobile app builder | Build Android APK; async polling |
| `/api/admin/build-apk/[id]` | GET | None | Mobile app builder | APK build status |
| `/api/admin/build-apk/[id]/download` | GET | Serve binary | Mobile app builder | Download APK file |
| `/api/admin/update/stage` | POST | Atelier bundle server only | Fleet management | N/A to standalone |
| `/api/import-demo` | POST | `data/` (replaces with demo data) | Admin reset | Re-import demo dataset (for testing) |
| `/api/license-check` | GET | None | Install wizard | Validate license key (ATL-XXXX format) with mothership |
| `/api/version` | GET | None | Admin badge | Current template version |
| `/api/install-stats` | POST | `data/install-stats.json` | Telemetry (SaaS only) | Track first-install timestamp |
| `/api/gdpr` | POST | `data/` (export) | User requests | Generate GDPR data export (JSON download) |
| `/api/content` | GET | None | Public pages | Global content fields (hero, info, contact sections) |
| `/api/languages` | GET | None | Setup, admin | List supported languages |
| `/api/languages` | PATCH | `data/settings.json` (enabledLanguages) | Admin | Enable/disable languages for the site |
| `/api/holidays` | GET | None | Booking flow (conflict check) | List holiday closures |
| `/api/holidays` | POST | `data/holidays.json` | Admin | Add holiday closure |
| `/api/holidays` | DELETE | `data/holidays.json` | Admin | Remove holiday |

### Notes on mutation scope
- **All writes to `data/*.json`** — single-tenant JSON persistence; requires filesystem lock (`fileLock.ts`) to prevent concurrent corruption.
- **Stripe API calls** — externalize payment processing; webhook at `/api/membership/confirm` + `/api/bookings/[id]/deposit-confirm` writes back to local JSON.
- **Email route** is **read-only** (POST just sends; doesn't persist separately — mail history can be reconstructed from bookings + audit log).
- **Cron routes** (reminders, demo-reset) — typically guarded by env var or secret header to prevent abuse.

---

## 6. Single-Tenant Assumptions Breaking Multi-Tenant

### Hard-coded paths (not tenant-scoped)
- **`data/settings.json`** — line 8 in `lib/settings.ts`: `const FILE = () => path.join(getAppRoot(), "data", "settings.json");` The `getAppRoot()` call **is tenant-aware** (returns `<tenants-root>/<slug>/_root` if in SaaS), so this is **OK**; but callers may cache the result at module-load time (if not, risk).
- **`data/secret.json`** — line 8 in `lib/users.ts`: `const SECRET_FILE = () => path.join(getAppRoot(), "data", "secret.json");` Same, **OK** if `getAppRoot()` is called dynamically.

### Session cookie scoping (tenant-aware)
- **`tenantCookiePath()`** in `lib/tenantContext.ts` — correctly returns `/<slug>` for SaaS, `/` for standalone. Used in `lib/auth.ts` line 44: `c.set(COOKIE, token, { ..., path: tenantCookiePath() })`. **OK**.

### Stripe key resolution (has demo mode logic)
- **`lib/stripe.ts`** lines 17–26 — handles demo mode (uses `DEMO_STRIPE_SECRET_KEY` env) vs. production (reads from `settings.json`). When `isDemoMode()` is true, bypasses per-tenant settings and uses global demo keys. **This will break if citynight tries to run multiple live sites in one process** (e.g., hosted SaaS). Citynight should remove the demo logic and always read from settings.

### Admin auth (role-based, no per-venue ACL)
- **`lib/auth.ts`** and `lib/users.ts`** — assume one admin per tenant (single `users.json` per site). Citynight's owner may delegate to team members via future ACL, but the template has no per-resource role enforcement (e.g., "Admin A can only edit services, Admin B can only view analytics"). **OK for MVP** (owner controls one site); future feature gate.

### Email sender address (hardcoded per-business)
- **`lib/email.ts`** — reads `settings.smtp.from` or `settings.business.email` as `From` header. Per-business SMTP config is loaded from `data/settings.json`. **OK** — correctly scoped.

### Uploads & image serving
- **`public/uploads/`** — all tenant uploads go to one shared directory in the template. In Citynight (multi-site), uploads must be namespaced by site ID (e.g., `public/uploads/<siteId>/photo.webp`). Template code doesn't enforce this; it's an **operational risk**.

### Marketing automations & relay (SaaS feature, not applicable)
- **`lib/marketingAutomations.ts`**, **`lib/email.ts` (mode: "atelier")**  — SaaS relay integration. Standalone doesn't use; citynight should ignore.

### Admin impersonation (`/__impersonate/route.ts`)
- **Line 25** in `src/app/api/__impersonate/route.ts` — assumes same-origin CSRF check, but doesn't validate that the impersonated user is on the same site. In multi-tenant SaaS, an admin could theoretically impersonate a user on a different tenant if CSRF check passes. **Risk: not fully isolated**. Citynight should add tenant ID validation.

---

## 7. Next 15 → 16 Considerations

### Route segment config
- **`const runtime = "nodejs"`** appears in `src/app/api/membership/route.ts` (line 4) — explicitly opts out of Edge Runtime. **OK**: booking/Stripe logic is CPU-bound, not suitable for Edge.
- Other API routes don't declare `runtime` — they use the default (Node.js for API routes, Edge for pages). **OK** — appropriate defaults.

### `revalidate` / ISR
- Template doesn't appear to use explicit `revalidate` in pages. Public pages (home, services, gallery, blog) are rendered on-demand (no static generation). This is **OK** for low-traffic venues, but citynight should consider **ISR** for city homepages (`/{locale}/cities/{city}`) — `revalidate: 3600` to cache city listings at edge, revalidate once per hour.

### Next/Image (`unoptimized` flag)
- **`next.config.ts` line 98** — `unoptimized: isDev || !!ASSET_PREFIX`. In development, Image optimizer is disabled (fetch fails in sandbox). In SaaS (ASSET_PREFIX set), also disabled (see comment: asset prefix not applied to `/_next/image`, causing routing to wrong app). **Citynight implication:** if using Cloudflare front + ISR, Image optimizer will work fine in production. Can leave as default (optimized).

### Middleware patterns
- Template doesn't use Next.js middleware (`middleware.ts`). All routing is app-based. **OK**; citynight might add middleware for geo-routing or locale detection, but not required.

### Dynamic imports & lazy loading
- **`ChatWidgetLazy.tsx`** (line 8 in `src/app/components/ChatWidgetLazy.tsx`) — uses `dynamic(() => import('./ChatWidget'), { ssr: false })`. This is correct lazy-load pattern. **OK for Next 16**.

### Async Server Components
- Template heavily uses `async` page components (e.g., `src/app/admin/page.tsx`). This is the **standard for Next 15+**. **OK**.

### React 19
- Package.json specifies `"react": "19.2.4"`. Template uses React 19 (form actions, etc.). **Citynight on Next 15 would need React 18**; upgrading to Next 16 brings React 19, so must audit for breaking changes (e.g., `useTransition` behavior, form API changes).

---

## 8. Dependency Delta

**Atelier's `package.json` vs. Citynight (assumed Next 15 + Drizzle base):**

### New dependencies (not in Citynight)
- **`@stripe/react-stripe-js`** (^6.3.0) — Stripe Elements React wrapper for payment forms
- **`@stripe/stripe-js`** (^9.5.0) — Stripe.js SDK
- **`framer-motion`** (^12.38.0) — Animation library (used in all admin panels, hero section)
- **`lucide-react`** (^1.16.0) — Icon library (replace with different if needed)
- **`nodemailer`** (^8.0.5) — Email sending (SMTP); citynight uses Resend
- **`web-push`** (^3.6.7) — Web push notifications for bookings
- **`sharp`** (^0.34.5) — Image processing (WebP, resize on upload) **might conflict** with Hostinger Node version
- **`adm-zip`** (^0.5.17) — ZIP creation for APK/site export

### Versions that might conflict
- **`next`**: atelier has 16.2.6, citynight likely has 15.x. Bump citynight to 16 if porting.
- **`react`** / **`react-dom`**: atelier has 19.2.4, citynight on Next 15 likely has 18.x. Major version bump.
- **`tailwindcss`**: atelier has @tailwindcss/postcss ^4, citynight likely has tailwindcss v3. Tailwind v4 is a breaking change; compatibility check needed.

### Libraries citynight has that atelier might not
- **`drizzle-orm`**, **`drizzle-kit`** — not in atelier (JSON-based)
- **`better-sqlite3`** — not in atelier
- **`resend`** — Citynight email provider; atelier uses nodemailer + SMTP

---

## 9. Risk List (Top 5)

### 1. **File-based JSON persistence → SQLite mismatch** (CRITICAL)
- **Risk:** Atelier saves all data as JSON files with filesystem locks. Citynight uses Drizzle ORM + SQLite. Porting logic requires:
  - Rewrite all `data/*.json` read/write operations to SQL queries
  - Migrate 38+ `path.join(getAppRoot(), "data", "...")` callsites
  - Handle concurrent writes (atelier's `fileLock.ts` → SQLite transactions)
  - **Impact:** Could introduce data corruption bugs, N+1 queries, race conditions if not careful
- **Severity:** Critical
- **Mitigation:** Create a database abstraction layer (`src/lib/db/bookings.ts` etc.) that mirrors atelier's function signatures but uses Drizzle under the hood; use a migration script to populate initial SQLite data from demo JSON files.

### 2. **Session auth (password-based) vs. citynight's passwordless magic-link** (HIGH)
- **Risk:** Atelier uses httpOnly cookie + password hash (PBKDF2). Citynight uses magic-link tokens. The owner auth model is incompatible.
- **Citynight implication:** Atelier's `/admin/login` doesn't fit; must either:
  - Adapt atelier's password-auth to citynight's magic-link (changes all auth paths)
  - Keep dual auth (magic-link for claims, password for existing admins)
- **Severity:** High (affects access control, trust model)
- **Mitigation:** Decide on single auth approach early; rewrite `lib/auth.ts` to match citynight's spec.

### 3. **Stripe integration scope mismatch** (HIGH)
- **Risk:** Atelier handles Stripe per-tenant (separate Stripe keys per site, reads from `settings.json`). Citynight will likely centralize Stripe (one key for all sites, routes via `/{locale}/` structure).
- **Citynight implication:** Atelier's Stripe webhook paths, customer lookups, and charge logic assume one business per instance. Adapting to per-site subscriptions requires:
  - Webhook to identify site from order metadata
  - Refund/cancellation logic to scope to correct site
  - Dashboard analytics to roll up across venues (or keep per-venue)
- **Severity:** High (payment processing; incorrect scoping = revenue leaks or cross-site access)
- **Mitigation:** Rewrite `lib/stripe.ts` to accept a `siteId` param; store site ID in Stripe metadata; validate site ownership on webhook.

### 4. **Image upload & storage (local FS vs. CDN)** (MEDIUM)
- **Risk:** Atelier uploads to `public/uploads/` (Hostinger's local filesystem). Citynight is likely to use Cloudflare R2 / S3 for multi-site isolation and caching.
- **Atelier code:** `/api/products/import` and photo upload routes save files with `sharp` to disk, referencing them as `/uploads/...` URLs.
- **Citynight implication:** Must swap disk I/O for S3 PUT/GET calls; update image URLs to CDN domain.
- **Severity:** Medium (affects performance, cloud ops, but not payment/auth)
- **Mitigation:** Create a storage abstraction (`src/lib/storage.ts`); use S3 SDK; stub local uploads with in-process temp storage for dev.

### 5. **Multi-language & locale routing incompatibility** (MEDIUM)
- **Risk:** Atelier assumes **one language per site** (set in `settings.enabledLanguages`). Citynight's routes are **locale-prefixed** (`/{locale}/...`). 
- **Atelier code:** Pages don't check URL locale; they read business language from settings. This breaks in citynight's multi-locale structure.
- **Citynight implication:** Must refactor all pages to read locale from route params, not settings. `lib/i18nServer.ts` must resolve locale from URL, not `settings.enabledLanguages`.
- **Severity:** Medium (UX breakage; queries run in wrong language)
- **Mitigation:** Extract locale from `[locale]` param in all layouts; store site language config separately from active locale.

---

## Summary: Porting Effort Estimate

| Category | Effort | Notes |
|----------|--------|-------|
| **Rewrite data layer** (JSON → SQL) | 15–20 days | Drizzle schema, migrations, all CRUD rewrites |
| **Stripe integration** (per-site subscriptions) | 5–7 days | Webhook routing, metadata, refund logic |
| **Auth bridge** (password ↔ magic-link) | 3–5 days | Session model, owner identity |
| **Image/storage migration** (FS → S3) | 3–4 days | Sharp → S3 SDK, URL rewrites, CDN config |
| **Locale routing refactor** | 2–3 days | URL param extraction, i18n cleanup |
| **Component integration** (admin UI reuse) | 10–15 days | Adapt Atelier admin panels to citynight data model |
| **Testing & fixes** | 10–14 days | Integration, edge cases, data integrity |
| **Total (high confidence)** | **48–68 days** | 2–3 FTE months of full-stack work |

**Critical path:** Data layer + Stripe + Auth + testing. These three must work before integrating UI components.


This is the comprehensive audit. I'll now return it as a single markdown document for you to write to the file.

Based on my comprehensive audit of the atelier template at `templates/atelier-base/`, here is the detailed inventory for porting into citynight Next.js 15 app:

---

# ATELIER PORT INVENTORY

## Context

Atelier is a **single-tenant SaaS template** (Next 16 + React 19) with:
- Multi-tenant capability via `tenantContext.ts` (AsyncLocalStorage per-request tenant slug)
- **File-based JSON persistence** (no database) — all business data (bookings, services, products, settings) lives under `data/` as JSON files with filesystem locks
- Booking engine with Stripe payment integration
- Full admin dashboard for business management
- Public pages for services, gallery, blog, shop, contact, team

Citynight is **multi-venue on SaaS** (one venue = one site) with **SQLite + Drizzle ORM**, locale-prefixed routes, and integrity rules from CLAUDE.md §6.

The architectural gap: Atelier has one admin per business in one JSON file tree; Citynight has one owner per venue in SQL, venues live in shared directory (`/{locale}/cities/{city}`), and the integrity rules forbid AI from writing fact columns.

---

## 1. App Routes Inventory

### Public/customer-facing pages

| Route | Purpose | Tenant-scoped | Disk reads | Dependencies | Booking-required |
|-------|---------|---------------|-----------|--------------|-----------------|
| `/` | Homepage with hero, info, services carousel, gallery | YES | `data/content.json`, `data/settings.json`, `data/services.json`, uploads | Framer Motion, Next Image | YES |
| `/book` | Multi-step booking form (service → stylist → date/time → guest → payment) | YES | `data/services.json`, `data/staff.json`, `data/settings.json`, `data/bookings.json`, `data/coupons.json`, `data/holidays.json`, `data/subscriptions.json` | `bookings.ts`, `services.ts`, `coupons.ts`, Stripe Elements, rate limiting | YES |
| `/b/[id]` | Booking confirmation/receipt (public, HMAC-signed link) | YES | `data/bookings.json`, `data/settings.json` | `bookingToken.ts`, CancelButton (POST to cancel) | YES |
| `/services` | Services listing (grid by category, images) | YES | `data/services.json`, photos | `customServices.ts` | YES |
| `/gallery` | Photo gallery with lightbox (venue ambiance, transformations) | YES | `public/uploads/`, `data/transformations.json` | Next Image, Framer Motion | NO |
| `/about` | Team bios and photos | YES | `data/staff.json`, `data/content.json`, uploads | Team component | NO |
| `/contact` | Contact form + embedded map + info (hours, address, phone) | YES | `data/settings.json`, `data/content.json` | Nodemailer, Google Maps JS (lazy-loaded) | NO |
| `/blog` + `/blog/[slug]` | Blog index and single post pages | YES | `data/pages.json`, `data/blog-categories.json` | MDX rendering, `blogCategories.ts` | NO |
| `/shop` | E-commerce product catalog (grid, search, cart) | YES | `data/products.json`, `data/orders.json`, uploads | `products.ts`, `orders.ts`, `cartClient.tsx` (Zustand), Stripe | NO |
| `/cart` | Shopping cart sidebar (product checkout) | YES | `data/products.json`, `data/coupons.json` | `cartClient.tsx` (Zustand), `orders.ts`, Stripe Elements | NO |
| `/privacy` + `/terms` | Static legal pages | YES | Settings or hardcoded | None | NO |

### Admin/authenticated pages

| Route | Purpose | Tenant-scoped | Disk writes | Dependencies | Booking-required |
|-------|---------|---------------|------------|--------------|-----------------|
| `/admin` | Admin dashboard hub (main nav to all admin features) | YES | None (read-only) | `auth.ts`, custom service/staff/booking libs | YES |
| `/admin/login` | Email + password sign-in | NO (global) | `data/users.json` (session cookie set) | `auth.ts`, password hashing (PBKDF2) | YES |
| `/admin/reset` | Password reset flow (RequestForm + ResetForm) | YES | `data/users.json` | `auth.ts`, email (nodemailer/SMTP from settings) | YES |
| `/admin/schedule` | Staff availability & hours editor | YES | `data/staff.json`, `data/settings.json` (updates) | `customStaff.ts`, timezone lib | YES |
| `/admin/clients` | Client list, search, profile (ClientProfileActions for edits) | YES | `data/clients.json` | `clients.ts`, CSV export via `csv.ts` | YES |
| `/admin/analytics` | Views, bookings, revenue charts (AnalyticsPanel) | YES | None (read) | `ownerAnalytics.ts`, events/events_daily.json | YES |
| `/admin/marketing/campaigns` | Email/SMS campaign builder and history | YES | `data/clients.json`, `data/marketing_*.json` files | Nodemailer, SMS (Twilio), marketing libs | NO |
| `/admin/marketing/automations` | Booking follow-up automations | YES | Marketing automation files | Marketing libs | NO |
| `/admin/marketing/reputation` | Review reputation tracking | YES | Review data files | Marketing libs | NO |
| `/admin/marketing/audiences` | Marketing segment definitions | YES | Segment files | Marketing libs | NO |
| `/admin/languages` | Toggle enabled languages (EN always; EL/others optional) | YES | `data/settings.json` (updates enabledLanguages) | `langs.ts`, `i18nServer.ts` | NO |
| `/admin/domain` | Custom domain configuration (Vercel-only; N/A to Hostinger) | YES | None (Vercel API) | Vercel API integration | NO |
| `/admin/mobile-app` | Mobile app build UI (Android APK generation) | YES | Keystore, `data/` snapshot for APK | `apkBuilds.ts`, `apkBuilder.ts` | NO |
| `/admin/packs` | Class packs / prepaid bundles manager | YES | `data/packs.json` | `packs.ts` | NO |
| `/admin/update` | Software update staging (SaaS fleet only; skip) | NO (fleet-level) | None | Atelier bundle server integration | NO |
| `/setup` | Fresh-install onboarding wizard (one-time) | YES | Creates entire `data/` tree, writes settings, users, branding | `install.ts`, brand upload, Stripe key entry | YES |
| `/preview` | Admin preview mode (impersonate customer without login) | YES | Session cookie (impersonation flag set) | `__impersonate/route.ts` | NO |

---

## 2. lib/ Inventory

### Core booking & service domain (all do I/O: read/write JSON files with locks)

| Module | Purpose | I/O | Single-tenant assumptions |
|--------|---------|-----|---------------------------|
| `bookings.ts` | Create, list, cancel appointments; occupied-slot checks | `data/bookings.json` (R/W with lock) | Assumes one booking file per context; uses `getAppRoot()` |
| `customServices.ts` | Read/write service catalog; fallback to hardcoded SERVICES | `data/services.json` (R/W) | One services.json per tenant |
| `customStaff.ts` | Staff availability, schedules, lunch breaks, schedule filtering | `data/staff.json` (R) + `data/settings.json` (R for hours) | One staff file per tenant |
| `clients.ts` | Client CRUD, search, contact history | `data/clients.json` (R/W) | One clients file per tenant |
| `orders.ts` | Shop order creation, lookup, refund | `data/orders.json` (R/W) | One orders file per tenant |
| `products.ts` | Product catalog read-only for public | `data/products.json` (R) | One products file per tenant |
| `coupons.ts` | Coupon/discount code CRUD, validation | `data/coupons.json` (R/W) | One coupons file per tenant |
| `giftCards.ts` | Gift voucher management, redemption | `data/gift-cards.json` (R/W) | One gift-cards file per tenant |
| `holidays.ts` | Business holiday closures (conflict check in booking flow) | `data/holidays.json` (R/W) | One holidays file per tenant |
| `subscriptions.ts` | Membership subscriptions (recurring discount) | `data/subscriptions.json` (R/W) | One subscriptions file per tenant |
| `packs.ts` | Class packs / prepaid bundles, redemption | `data/packs.json` (R/W) | One packs file per tenant |

### Settings & configuration (cached; I/O on save)

| Module | Purpose | I/O | Single-tenant assumptions |
|--------|---------|-----|---------------------------|
| `settings.ts` | Business info, branding, SMTP, Stripe keys, timezone, hours, socials; cached with React cache() | `data/settings.json` (R/W) | One settings.json per tenant; `getAppRoot()` is tenant-aware |
| `users.ts` | Admin user CRUD, password hashing (PBKDF2), session signing | `data/users.json` (R/W), `data/secret.json` (R for session secret) | One users.json per tenant; one shared secret.json per tenant |

### Auth & sessions (cookie-based, tenant-scoped path)

| Module | Purpose | I/O | Single-tenant assumptions |
|--------|---------|-----|---------------------------|
| `auth.ts` | `currentUser()`, `isAdmin()`, `isStaff()`, `signIn()`, `signOut()` | None directly; reads users.ts | Session cookie path is `tenantCookiePath()` (correct), but per-user role enforcement is coarse (admin vs. barber only) |
| `bookingToken.ts` | HMAC signing for public booking receipt links | None (crypto only) | None |
| `passwordReset.ts` | Password reset token generation & validation | None (crypto only) | None |

### Email & notifications (send via SMTP/relay; no local persistence besides audit)

| Module | Purpose | I/O | Single-tenant assumptions |
|--------|---------|-----|---------------------------|
| `email.ts` | Nodemailer SMTP integration; sends confirmations, reminders, reviews, password resets | Network (SMTP) | Reads `settings.smtp` per-tenant; mode can be "smtp" (standalone) or "atelier" (SaaS relay) |
| `notify.ts` | Post-booking notifications (webhook trigger) | Network + optional logging | Tenant-scoped; references site slug |
| `sms.ts` | SMS integration stub (Twilio setup; incomplete in template) | Network (Twilio) | Tenant-scoped if ever implemented |

### Marketing & analytics (I/O: JSON files + marketing data)

| Module | Purpose | I/O | Single-tenant assumptions |
|--------|---------|-----|---------------------------|
| `ownerAnalytics.ts` | Daily event rollup for dashboard (views, bookings, revenue) | `events.json` (R), `events_daily.json` (R/W on cron rollup) | One events file per tenant |
| `marketingCampaigns.ts` | Campaign CRUD | `data/marketing_campaigns.json` (R/W) | One campaigns file per tenant |
| `marketingAutomations.ts` | Automation rules CRUD | `data/marketing_automations.json` (R/W) | One automations file per tenant |
| `marketingSegments.ts` | Marketing segment definitions | `data/marketing_segments.json` (R/W) | One segments file per tenant |
| `marketingPrefs.ts` | Per-client marketing consent | `data/clients.json` (R/W, nested field) | Stored with client record |
| `marketingQuota.ts` | Rate limiting for email campaigns | Memory-based or `data/marketing_quota.json` (R/W) | Per-tenant quotas |

### Multi-tenancy & file system (critical for SaaS isolation)

| Module | Purpose | I/O | Single-tenant assumptions |
|--------|---------|-----|---------------------------|
| `tenantContext.ts` | AsyncLocalStorage per-request tenant slug; exports `getCurrentTenant()`, `getTenantPath()` | None (ALS only) | Assumes tenant slug is set by `server.js` (Atelier bundle wrapper). Standalone (no wrapper) returns null, falls back to single-site behavior. |
| `appRoot.ts` | Returns tenant-aware app root; `getAppRoot()` → `<tenants-root>/<slug>/_root` (SaaS) or `<cwd>` (standalone) | None (path calculation only) | **Critical:** All 38+ `path.join(getAppRoot(), "data", ...)` callsites assume lazy evaluation. If cached at module load, breaks multi-tenant. |
| `fileLock.ts` | Mutex for concurrent writes to JSON files (prevents corruption) | File locks (`./data/.lock/*`) | Per-tenant locks; relies on `getAppRoot()` |

### Internationalization (cached; lazy loads language data)

| Module | Purpose | I/O | Single-tenant assumptions |
|--------|---------|-----|---------------------------|
| `i18nServer.ts` | Server-side i18n; detect locale from URL, translate settings labels | None (reads settings in-memory) | Reads `enabledLanguages` from settings; assumes URL locale param matches enabled langs |
| `i18n.tsx` | Client-side i18n context | None (React context) | Reads current locale from URL/cookie |
| `langs.ts` | Supported languages list; feature flags per-tenant enabledLanguages | None (hardcoded list) | SERVICES fallback hardcoded with EN descriptions only |

### UI & branding (reads from settings; cached)

| Module | Purpose | I/O | Single-tenant assumptions |
|--------|---------|-----|---------------------------|
| `brandingClient.tsx` | Client-side branding context (colors, fonts, logos) | None (React context from settings) | Reads theme from `settings.theme` |
| `theme.tsx` | Tailwind color tokens generation from `settings.theme` | None (theme object passed as prop) | Derives colors from settings |
| `motion.ts` | Framer Motion animation presets | None (utility functions) | None |

### Utilities (mostly pure functions or env-based)

| Module | Purpose | I/O | Single-tenant assumptions |
|--------|---------|-----|---------------------------|
| `utils.ts` | Formatting, slug generation, string utilities | None | None |
| `tz.ts` | Timezone conversion (store UTC, render in business TZ) | None | Reads `settings.timezone` for business TZ |
| `csv.ts` | CSV export for bookings, clients, products | None (string generation) | None |
| `qr.ts` | QR code generation (for gift cards, booking links) | None (library wrapper) | None |
| `postalLookup.ts` | Postal code validation (UK-centric) | None | Hard-coded UK postal rules; not reusable for other countries |
| `unsplash.ts` | Unsplash API integration for stock photos (admin upload UI) | Network (Unsplash API) | None |
| `barberKnowledge.ts` | Knowledge base for barber-specific AI chatbot (not core to booking) | JSON knowledge base (R) | Barber-specific; not reusable for restaurants/salons |

### Admin features (logging, telemetry, demo mode)

| Module | Purpose | I/O | Single-tenant assumptions |
|--------|---------|-----|---------------------------|
| `audit.ts` | Audit log for admin actions (create/edit/delete events) | `data/audit.json` (R/W) | One audit file per tenant; not critical (informational only) |
| `installStats.ts` | Track first-install timestamp per tenant (telemetry) | `data/install-stats.json` (R/W) | SaaS only; skipped in standalone |
| `demoMode.ts` | Flag to detect if running demo showcase; uses hardcoded DEMO_ADMIN_EMAIL/PASSWORD | None (env check) | **Important:** if `isDemoMode()` true, uses global demo Stripe keys, skips per-tenant settings. Must not be triggered in production Citynight. |

### External integrations (network I/O)

| Module | Purpose | I/O | Single-tenant assumptions |
|--------|---------|-----|---------------------------|
| `stripe.ts` | Stripe secret/publishable key resolution from settings or env; PaymentIntent creation, Webhook validation | Network (Stripe API) + `settings.json` (R for keys) | Reads per-tenant `settings.payments.stripeSecretKey`; has demo mode logic (uses DEMO_STRIPE_SECRET_KEY env if `isDemoMode()`). **Risk:** if multiple live sites in process, demo mode bypass could leak keys. |

---

## 3. Component Inventory

**Location:** `src/app/components/`

### Page-level layouts & flows (server or client)

| Component | Purpose | Type | Tenant-scoped data | Dependencies |
|-----------|---------|------|-------------------|--------------|
| `AdminDashboard.tsx` | Main admin hub layout (tabs for overview, clients, services, bookings, etc.) | Server + client | YES | Admin panels (below), auth |
| `BookingFlow.tsx` | Multi-step booking form (service → stylist → date/time → guest → payment) | Client | YES | Form state (Zustand/useState), `bookings.ts`, Stripe Elements |
| `CartView.tsx` + `CartSidebar.tsx` | Shopping cart UI (product view, checkout flow) | Client | YES | Zustand cart state, `orders.ts`, Stripe |
| `GalleryGrid.tsx` + `GalleryStrip.tsx` | Photo gallery layouts (lightbox, carousel) | Client | YES | Next Image, Framer Motion |
| `BlogList.tsx` + `BlogStrip.tsx` | Blog index (post grid/carousel) and listing | Server | YES | Markdown/MDX rendering |

### Admin panels (all Client; read data via API)

| Component | Purpose | Tenant data | Notes |
|-----------|---------|------------|-------|
| `AnalyticsPanel.tsx` | Dashboard charts (views, bookings, revenue trends) | Events, bookings, orders | Reads analytics API |
| `ClientsPanel.tsx` | Client list, search, bulk actions | Clients | Searchable table |
| `BookingsCalendar.tsx` | Booking timeline / calendar view | Bookings, staff | Drag-to-reschedule (client-side optimistic) |
| `UsersPanel.tsx` | Admin user management (create, roles, password reset) | Users | Admin-only |
| `WaitlistPanel.tsx` | Waitlist for sold-out services | Waitlist entries | Optional feature |
| `CouponsPanel.tsx` | Coupon CRUD (create, edit, disable, view usage) | Coupons | Discount code management |
| `GiftCardsPanel.tsx` | Gift card management (issue, view balance, redeem history) | Gift cards | Prepaid vouchers |
| `BlogPanel.tsx` | Blog post editor (create, edit, publish, categories) | Pages, blog categories | MDX/JSON editor |
| `BulkEmail.tsx` | Bulk email to clients (segmented send, templates) | Clients, email templates | Marketing tool; requires email provider |

### Modals & inline forms

| Component | Purpose | Tenant data | Type |
|-----------|---------|-------------|------|
| `WalkInBookingModal.tsx` | Quick walk-in appointment entry (for staff at desk) | Bookings, services, staff | Client modal |
| `ForcePasswordChange.tsx` | Force new admin to set password before dashboard (mustChangePassword flag) | Users | Client modal |

### Info & navigation components (mostly Server)

| Component | Purpose | Data source | Type |
|-----------|---------|-------------|------|
| `About.tsx` | Team bios + photos | `data/staff.json`, `data/content.json` | Server |
| `ContactInfo.tsx` | Business hours, address, map embed | `data/settings.json` | Server |
| `Footer.tsx` | Footer with links, hours, contact, socials | `data/settings.json`, `data/nav` | Server |
| `Team.tsx` | Staff display (roster, photos) | `data/staff.json` | Server |
| `FAQ.tsx` | FAQ accordion (hardcoded or from content) | Content JSON or hardcoded | Server |
| `InfoStrip.tsx` | Business info card (hours, address, phone, walk-in status) | `data/settings.json`, `data/bookings.json` (for "open now?") | Client |

### Third-party integrations (Client lazy-loaded or Server)

| Component | Purpose | External service | Type |
|-----------|---------|------------------|------|
| `ChatWidget.tsx` + `ChatWidgetLazy.tsx` | AI chatbot widget (lazy-loads on demand) | Claude API (internal, or Vercel AI SDK) | Client lazy |
| `ShopPreview.tsx` | Product preview in cart / checkout | None (local data) | Client |

### UI utilities & badges (all Client)

| Component | Purpose | Notes |
|-----------|---------|-------|
| `EditPencil.tsx` | Inline edit icon (hover state reveals edit button) | UX polish |
| `AdminUpdateBadge.tsx` | "Update available" badge (for SaaS fleet) | N/A to standalone |
| `TenantBanner.tsx` | Tenant context indicator (dev/debug; shows slug) | Debug feature |
| `DemoBanner.tsx` | "This is a demo" banner (resets hourly) | Demo mode only |

### Consent & compliance (Client)

| Component | Purpose | External | Notes |
|-----------|---------|----------|-------|
| `CookieBanner.tsx` | Cookie consent + GDPR banner | CMP platform (e.g., OneTrust) | Consent mode v2 integration |

### Content components (Server or Client)

| Component | Purpose | Data | Type |
|-----------|---------|------|------|
| `TranslatedPageHeader.tsx` | Localized page title + meta (og:title, description per locale) | Content JSON | Server |
| `AvailabilitySnapshot.tsx` | "Open now?" status mini-card (business hours check) | `data/settings.json` | Client |
| `BeforeAfter.tsx` | Before/after transformation gallery (image pair viewer) | Transformation photos | Client |
| `CTA.tsx` | Call-to-action button (multiple styles: solid, outline, ghost) | None (props-driven) | Client |
| `JsonLd.tsx` | Schema.org JSON-LD for SEO (LocalBusiness, Event, etc.) | `data/settings.json`, current page context | Server |

### Express Checkout (Stripe)

| Component | Purpose | Integrations | Type |
|-----------|---------|--------------|------|
| `ExpressCheckout.tsx` | Stripe Express (one-click checkout with saved payment method) | Stripe Express Button | Client |

---

## 4. Data Model — Barber Demo Specifics

**Location:** `demos/barber/data/` (JSON files) + `demos/barber/meta.json` + `demos/barber/uploads/` (WebP images)

### Top-level JSON files with shape & purpose

| File | Top-level shape | Purpose | Citynight mapping |
|------|-----------------|---------|-------------------|
| `meta.json` | `{ id, name, industry, tagline, description, cover, accentColor, theme{}, typography{}, bookingMode, industryId, branding{}, nav{}, features[], stats{} }` | Demo metadata + site config override | `sites` table: id→uuid, slug→slug, legacy_venue_id link; theme→JSON col; branding→JSON col |
| `settings.json` | `{ smtp{}, branding{}, business{}, nav{}, templates{}, analytics{}, ai{}, payments{}, theme{}, typography{}, bookingMode, industryId, onboarded, license, enabledLanguages[] }` | Full business config (SMTP auth, Stripe keys, hours, socials, timezone) | `sites` table: denormalize into cols or separate `site_settings` JSON col |
| `users.json` | `[{ id, email, role("admin"\|"barber"), barberId?, passwordHash, createdAt, mustChangePassword? }]` | Admin user roster (one or more admins per site) | Link to `users` table (owner); role as ENUM; email matches claimed business |
| `services.json` | `[{ id, tkey, name, name_el?, desc, desc_el?, duration, price, bufferMinutes?, deposit?, fromPrice?, requiresPatchTest?, addOnIds?, category, enabled, order }]` | Service catalog (haircuts, beard trim, shave) | Create `site_services` table (new) with `site_id` FK |
| `staff.json` | `[{ id, name, role, barberId?, hours[], lunch?, photo, order }]` | Barber/stylist roster + availability | Create `site_staff` table with `site_id` FK |
| `bookings.json` | `[{ id, serviceId, serviceName, price, duration, barberId, barberName, date("YYYY-MM-DD"), time("HH:MM"), name, phone, email, notes?, status("pending"\|"confirmed"\|"completed"\|"cancelled"), createdAt, lang?, remindedAt?, reviewedAt?, walkIn?, deposit?, depositPaid?, membershipDiscount?, usedPackId? }]` | Appointment records | Rename/refactor existing `bookings` table; add `site_id` FK |
| `clients.json` | `[{ id, name, phone, email, notes?, createdAt, lastBooking?, totalSpent?, contactPrefs?, tags? }]` | Customer database | Create `site_clients` table with `site_id` FK |
| `orders.json` | `[{ id, clientId?, items[{productId, qty, price}], total, status("pending"\|"completed"\|"refunded"), createdAt, paidAt?, shippedAt? }]` | Shop orders (e-commerce) | Create `site_orders` table with `site_id` FK |
| `products.json` | `[{ id, slug, name_en, name_el, price, category_en, category_el, shortDesc_en, shortDesc_el, longDesc_en, longDesc_el, image, stock, featured }]` | Product catalog (pomade, clay, scissors, etc.) | Create `site_products` table with `site_id` FK |
| `coupons.json` | `[{ id, code, discount, type("percent"\|"fixed"), validFrom, validTo, usageLimit, used, description }]` | Discount codes (e.g., "SAVE20" = 20% off) | Create `site_coupons` table with `site_id` FK |
| `gift-cards.json` | `[{ id, code, balance, initialBalance, purchasedBy, purchasedAt, redeemedBy, redeemedAt, expiresAt }]` | Gift voucher inventory | Create `site_gift_cards` table with `site_id` FK |
| `subscriptions.json` | `[{ id, clientId, stripeSubId, status("active"\|"past_due"\|"canceled"), currentPeriodEnd, createdAt }]` | Active memberships (recurring discount) | Create `site_subscriptions` table with `site_id` FK |
| `packs.json` | `[{ id, name, sessions, price, expiresAfterDays, usedBy[], redeemedSessions }]` | Class packs (e.g., "10 cuts for €400") | Create `site_packs` table with `site_id` FK |
| `pages.json` | `[{ id, slug, title_en, title_el, content_en, content_el, meta{}, published }]` | Custom pages + blog posts | Create `site_pages` table with `site_id` FK |
| `blog-categories.json` | `[{ id, slug, name_en, name_el, description, color }]` | Blog category taxonomy | Create `site_blog_categories` table with `site_id` FK |
| `transformations.json` | `[{ id, before, after, serviceId, clientName, date }]` | Before/after photo pairs (gallery) | Create `site_transformations` table or store in `site_photos.metadata` JSON |
| `reviews.json` | `[{ id, clientId, serviceId, rating, text, createdAt, visible }]` | Reviews/testimonials | Create `site_reviews` table with `site_id` FK |
| `waitlist.json` | `[{ id, serviceId, clientId, createdAt, notified }]` | Waitlist for fully booked services | Create `site_waitlist` table with `site_id` FK |
| `content.json` | `{ page_home{}, hero{}, info{}, about{}, contact{}, testimonials{}, ... }` | CMS fields for public pages (hero copy, section text, image refs) | `sites` table: store as JSON col; or denormalize to individual `site_content` cols |

### Uploads directory

- **`demos/barber/uploads/`** — WebP images (resized, fingerprinted filenames). 
- In production, lives at `public/uploads/<siteId>/` or on CDN (S3/R2).

### Schema mapping rationale for Citynight

**Current:** Atelier's single `data/*.json` per tenant → One `sites.id` gets JSON columns or relationships.

**Future:** Normalize into dedicated tables per data type (cleanest for queries, migrations).

**Recommended MVP approach:**
1. Add `site_id` FK to existing `bookings`, `photos` tables
2. Create NEW tables: `site_services`, `site_staff`, `site_clients`, `site_orders`, `site_products`, `site_coupons`, `site_gift_cards`, `site_subscriptions`, `site_packs`, `site_pages`, `site_blog_categories`, `site_transformations`, `site_reviews`, `site_waitlist`
3. Store `content.json`, `settings.json`, `branding` as JSON columns on `sites` table (no need for normalization yet)

---

## 5. API Routes That Mutate

**Location:** `src/app/api/` (route handlers that write to `data/` files or external systems)

### Settings & configuration (business info, Stripe keys, SMTP, theme)

| Route | Method | Writes to | Purpose | Citynight equivalent |
|-------|--------|-----------|---------|----------------------|
| `/api/settings` | GET | None | Returns masked secrets | Read from DB |
| `/api/settings` | PATCH | `data/settings.json` | Allowlist validation; doesn't overwrite masked `pass`, `apiKey`, `stripeSecretKey` if sent as `********` | Update `sites` settings JSON col |
| `/api/settings/test-email` | POST | None (SMTP only) | Test email via configured SMTP | Send via Resend + log |
| `/api/settings/relay-status` | GET | None | Relay connectivity check (SaaS only) | Skip |
| `/api/branding` | GET | None | Public branding (logo, colors, wordmark) | Read from `sites` branding col |
| `/api/branding` | PATCH | `data/settings.json` (branding subtree) | Update branding | Update `sites` branding col |
| `/api/business` | GET | None | Business hours, address, phone, socials | Read from `sites` |
| `/api/business` | PATCH | `data/settings.json` (business subtree) | Update hours, phone, address, timezone | Update `sites` |

### Services & staff (catalog management)

| Route | Method | Writes to | Purpose | Citynight equivalent |
|-------|--------|-----------|---------|----------------------|
| `/api/services` | GET | None | Enabled services (public, sorted) | Read from `site_services` |
| `/api/services/admin` | GET | None | All services incl. disabled (admin view) | Read from `site_services` |
| `/api/services/admin` | POST | `data/services.json` | Upsert service; validate id + name | INSERT/UPDATE `site_services` |
| `/api/services/admin` | DELETE | `data/services.json` | Delete/hide service | DELETE from `site_services` |
| `/api/staff` | GET | None | Staff roster (names, photos, hours) | Read from `site_staff` |
| `/api/staff` | POST | `data/staff.json` | Add/edit barber; schedule + lunch | INSERT/UPDATE `site_staff` |
| `/api/staff/availability` | GET | None | Slot availability per staff per day | Compute from `site_staff` hours + `bookings` |

### Bookings (appointment management)

| Route | Method | Writes to | Purpose | Citynight equivalent |
|-------|--------|-----------|---------|----------------------|
| `/api/bookings` | GET | None | List all bookings (admin) | Read from `bookings` WHERE site_id |
| `/api/bookings` | POST | `data/bookings.json` + Stripe API | Create appointment; validate slots, coupon, deposit | INSERT `bookings`; call Stripe |
| `/api/bookings/[id]` | GET | None | Booking detail | Read from `bookings` |
| `/api/bookings/[id]` | PATCH | `data/bookings.json` | Update status, notes, client contact | UPDATE `bookings` |
| `/api/bookings/[id]/cancel` | POST | `data/bookings.json`, Stripe refund | Cancel; refund deposit if paid | UPDATE `bookings` status; Stripe refund |
| `/api/bookings/[id]/pay` | POST | Stripe API, `data/bookings.json` | Pay deposit or full amount | UPDATE `bookings`; Stripe charge |
| `/api/bookings/[id]/deposit-confirm` | POST | `data/bookings.json` | Mark deposit paid (Stripe webhook callback) | UPDATE `bookings` depositPaid |
| `/api/bookings/export` | GET | None | CSV download | Generate from `bookings` query |

### Clients (customer database)

| Route | Method | Writes to | Purpose | Citynight equivalent |
|-------|--------|-----------|---------|----------------------|
| `/api/clients` | GET | None | List clients (search, sort) | Read from `site_clients` |
| `/api/clients` | POST | `data/clients.json` | Create client (walk-in entry) | INSERT `site_clients` |
| `/api/clients/[id]` | GET | None | Client detail | Read from `site_clients` |
| `/api/clients/[id]` | PATCH | `data/clients.json` | Update name, phone, email, notes, contact prefs | UPDATE `site_clients` |
| `/api/clients/export` | GET | None | CSV export | Generate from `site_clients` query |

### Coupons, gift cards, packs (discounts & bundles)

| Route | Method | Writes to | Purpose | Citynight equivalent |
|-------|--------|-----------|---------|----------------------|
| `/api/coupons` | GET | None | List active coupons (public + admin) | Read from `site_coupons` |
| `/api/coupons` | POST | `data/coupons.json` | Create coupon; set discount %, limit, validity | INSERT `site_coupons` |
| `/api/coupons` | PATCH | `data/coupons.json` | Edit coupon | UPDATE `site_coupons` |
| `/api/coupons` | DELETE | `data/coupons.json` | Remove coupon | DELETE from `site_coupons` |
| `/api/gift-cards` | GET | None | List gift cards (admin) | Read from `site_gift_cards` |
| `/api/gift-cards` | POST | `data/gift-cards.json` + Stripe | Issue new gift card; generate code, set balance | INSERT `site_gift_cards` |
| `/api/gift-cards` | PATCH | `data/gift-cards.json` | Redeem; deduct balance | UPDATE `site_gift_cards` balance |
| `/api/packs` | GET | None | List available packs (public + admin) | Read from `site_packs` |
| `/api/packs` | POST | `data/packs.json` | Create class pack | INSERT `site_packs` |

### Orders & products (e-commerce)

| Route | Method | Writes to | Purpose | Citynight equivalent |
|-------|--------|-----------|---------|----------------------|
| `/api/products` | GET | None | List products (public, filters, search) | Read from `site_products` |
| `/api/products/[id]` | GET | None | Product detail | Read from `site_products` |
| `/api/products` | POST | `data/products.json` | Add product | INSERT `site_products` |
| `/api/products/[id]` | PATCH | `data/products.json` | Edit product (price, stock, desc, image) | UPDATE `site_products` |
| `/api/products/[id]` | DELETE | `data/products.json` | Remove product | DELETE from `site_products` |
| `/api/products/import` | POST | `data/products.json` (bulk upsert) | CSV import | BULK INSERT/UPDATE `site_products` |
| `/api/products/export` | GET | None | CSV export | Generate from `site_products` query |
| `/api/orders` | GET | None | List orders (admin, date range, status) | Read from `site_orders` |
| `/api/orders` | POST | `data/orders.json` + Stripe API | Create order; charge via Stripe | INSERT `site_orders`; Stripe charge |
| `/api/orders/[id]` | GET | None | Order detail | Read from `site_orders` |
| `/api/orders/[id]/refund` | POST | Stripe API, `data/orders.json` | Refund order | Stripe refund; UPDATE `site_orders` status |
| `/api/orders/express` | POST | Stripe API, `data/orders.json` | Fast one-click order (Stripe Express) | INSERT `site_orders`; Stripe charge |

### Auth & user management

| Route | Method | Writes to | Purpose | Citynight equivalent |
|-------|--------|-----------|---------|----------------------|
| `/api/auth` | POST | `data/users.json` (session cookie set) | Email + password sign-in; PBKDF2 verify | Match to `users` table + set session |
| `/api/auth/reset` | POST | `data/users.json` (new password) | Password reset token validation + password update | UPDATE `users` password |
| `/api/users` | GET | None | Admin user roster | Read from `users` WHERE role IN ('admin', 'barber') |
| `/api/users` | POST | `data/users.json` | Create admin/barber user | INSERT `users` with role |
| `/api/users/[id]` | PATCH | `data/users.json` | Edit user (role, email, password) | UPDATE `users` |
| `/api/account/delete` | DELETE | `data/users.json` | Delete authenticated user | DELETE from `users` |

### Marketing & analytics

| Route | Method | Writes to | Purpose | Citynight equivalent |
|-------|--------|-----------|---------|----------------------|
| `/api/analytics` | GET | None | Aggregated metrics (views, revenue, etc.) | Read from `events_daily`, `bookings`, `orders` |
| `/api/track` | POST | `data/events.json` (+ cron rolls to `events_daily.json`) | Log view/click/phone/directions event | INSERT `events`; cron rollup to `events_daily` |
| `/api/reviews` | GET | None | List visible reviews | Read from `site_reviews` WHERE visible |
| `/api/reviews` | POST | `data/reviews.json` | Submit review (post-visit email link) | INSERT `site_reviews` |
| `/api/audit` | GET | None | Admin action history | Read from audit log (DB or file) |
| `/api/audit` | POST | `data/audit.json` (internal) | Log admin action | INSERT audit log |

### Email, cron, webhooks

| Route | Method | Writes to | Purpose | Citynight equivalent |
|-------|--------|-----------|---------|----------------------|
| `/api/email` | POST | None (sends via SMTP/relay) | Send email (confirmations, reminders, reviews, password resets) | Send via Resend + log audit |
| `/api/cron/reminders` | POST | `data/bookings.json` (remindedAt timestamp) | Send booking reminders 24h before; mark sent | Query due bookings; Resend email; UPDATE |
| `/api/cron/demo-reset` | POST | Wipes `data/` (demo-only) | Full reset of demo site (hourly) | Skip (not applicable) |
| `/api/payment-intent` | POST | None (Stripe API call) | Create Stripe PaymentIntent for booking deposit | Call Stripe; return clientSecret |
| `/api/membership/checkout` | POST | None (Stripe API call) | Create Stripe Session for membership subscription | Call Stripe; return sessionUrl |
| `/api/membership/confirm` | POST | `data/subscriptions.json` | Confirm membership after Checkout success (Stripe webhook) | INSERT `site_subscriptions` |
| `/api/membership/admin` | GET | None | List active memberships | Read from `site_subscriptions` |

### Pages, templates, navigation, content

| Route | Method | Writes to | Purpose | Citynight equivalent |
|-------|--------|-----------|---------|----------------------|
| `/api/pages` | GET | None | List pages (blog posts, custom pages) | Read from `site_pages` |
| `/api/pages` | POST | `data/pages.json` | Create page | INSERT `site_pages` |
| `/api/pages` | PATCH | `data/pages.json` | Edit page | UPDATE `site_pages` |
| `/api/blog-categories` | GET | None | List blog categories | Read from `site_blog_categories` |
| `/api/blog-categories` | POST | `data/blog-categories.json` | Create category | INSERT `site_blog_categories` |
| `/api/nav` | GET | None | Navigation links + book CTA label (per-locale) | Read from `sites.nav` JSON col |
| `/api/templates` | GET | None | List available templates (industry presets) | Return hardcoded templates; skip (not applicable to Citynight) |

### Install, admin, misc

| Route | Method | Writes to | Purpose | Citynight equivalent |
|-------|--------|-----------|---------|----------------------|
| `/api/install` | POST | Writes entire `data/` tree | One-time fresh install (setup wizard) | Claim & configure `sites` record |
| `/api/admin/me` | GET | None | Current user info (email, role) | Read from `users` + session |
| `/api/admin/packs` | GET | None | List packs (admin view) | Read from `site_packs` |
| `/api/admin/packs` | POST | `data/packs.json` | Create pack | INSERT `site_packs` |
| `/api/admin/build-apk` | POST | APK build (Hostinger-specific) | Trigger Android APK build | Skip (not applicable) |
| `/api/admin/build-apk/[id]` | GET | None | APK build status | Skip |
| `/api/admin/build-apk/[id]/download` | GET | Serve binary file | Download APK | Skip |
| `/api/admin/update/stage` | POST | Atelier bundle server only | Fleet management | Skip (not applicable) |
| `/api/import-demo` | POST | `data/` (replaces with demo data) | Re-import demo dataset (for testing) | Populate with seed data for testing |
| `/api/license-check` | GET | None | Validate license key (ATL-XXXX format) | Skip (not applicable; Stripe handles billing) |
| `/api/version` | GET | None | Current template version | Return app version from package.json |
| `/api/install-stats` | POST | `data/install-stats.json` | Track first-install timestamp (SaaS telemetry only) | Skip or log to DB |
| `/api/gdpr` | POST | `data/` export (ZIP download) | Generate GDPR data export (JSON) | Query `users`, `bookings`, `site_clients` for person; ZIP as JSON |
| `/api/content` | GET | None | Global content fields (hero, info, contact sections) | Read from `sites.content` JSON col |
| `/api/languages` | GET | None | Supported languages | Read from hardcoded list |
| `/api/languages` | PATCH | `data/settings.json` (enabledLanguages) | Enable/disable languages for site | UPDATE `sites.enabledLanguages` JSON col |
| `/api/holidays` | GET | None | List holiday closures | Read from `site_holidays` |
| `/api/holidays` | POST | `data/holidays.json` | Add holiday closure | INSERT `site_holidays` |
| `/api/holidays` | DELETE | `data/holidays.json` | Remove holiday | DELETE from `site_holidays` |

### Notes on mutation scope
- **All writes to `data/*.json`** — Atelier uses filesystem locks (`fileLock.ts`) to prevent concurrent corruption.
- **Citynight equivalent:** Use SQLite transactions for atomicity.
- **Stripe webhooks** — Async confirmation callbacks; must idempotently handle retries (use Stripe event ID deduplication).
- **Email routes** — POST is fire-and-forget via Resend or SMTP; no separate persistence layer.
- **Cron routes** — Must be guarded by env var or HMAC header to prevent public abuse.

---

## 6. Single-Tenant Assumptions Breaking Multi-Tenant

### Hard-coded file paths (checked at runtime, mostly safe if getAppRoot() is lazy)

| File | Location | Assumption | Citynight risk |
|------|----------|------------|-----------------|
| `data/settings.json` | `lib/settings.ts:8` | `const FILE = () => path.join(getAppRoot(), "data", "settings.json");` | **LOW RISK** — `getAppRoot()` is called dynamically (inside function), so tenant context is resolved per-request. ✓ Safe. |
| `data/secret.json` | `lib/users.ts:8` | `const SECRET_FILE = () => path.join(getAppRoot(), "data", "secret.json");` | **LOW RISK** — Same pattern. ✓ Safe. |
| `data/services.json` | `lib/customServices.ts:6` | `const FILE = () => path.join(getAppRoot(), "data", "services.json");` | **LOW RISK** — Same pattern. ✓ Safe. |
| **All 38+ similar callsites** | Various lib files | Assume `getAppRoot()` is lazy-evaluated | **CRITICAL**: If ANY module caches `getAppRoot()` result at load time (not inside function), breaks multi-tenant isolation. Must audit all calls. |

### Session cookie scoping (correctly tenant-aware)

| Code | Location | Pattern | Citynight status |
|------|----------|---------|------------------|
| `tenantCookiePath()` | `lib/tenantContext.ts:88-91` | Returns `/<slug>` for SaaS, `/` for standalone | **✓ CORRECT** — Scopes cookies per tenant. |
| `c.set(COOKIE, token, { ..., path: tenantCookiePath() })` | `lib/auth.ts:44` | Uses tenant-aware path | **✓ CORRECT** — Admin session isolated per site. |

### Stripe key resolution (has demo mode bypass)

| Code | Location | Pattern | Citynight risk |
|------|----------|---------|-----------------|
| `isDemoMode()` check in `lib/stripe.ts:17-26` | Stripe key resolution | If demo mode, uses global `DEMO_STRIPE_SECRET_KEY` env, ignoring per-tenant `settings.payments.stripeSecretKey` | **HIGH RISK** — If Citynight ever runs multiple **live** sites in one process (SaaS multi-tenant), demo mode bypass could leak keys or route payments to wrong account. **Mitigation**: Remove demo mode logic; always read from `sites.payments.stripeSecretKey`. |

### Admin auth (role-based, no per-resource ACL)

| Code | Location | Pattern | Citynight risk |
|------|----------|---------|-----------------|
| `isAdmin()`, `isStaff()` in `lib/auth.ts` | Entire auth module | Checks `user.role` is "admin" or "barber"; no per-resource authorization | **LOW RISK for MVP** — Owner controls one site; future feature gate for team member ACL. |

### Email sender address (per-business SMTP)

| Code | Location | Pattern | Citynight status |
|------|----------|---------|------------------|
| `settings.smtp.from` or `settings.business.email` in `lib/email.ts` | Email sender resolution | Reads per-tenant SMTP config from `data/settings.json` | **✓ CORRECT** — Per-site branding; owner configures SMTP in setup. |

### Uploads & image serving (namespace risk)

| Code | Location | Pattern | Citynight risk |
|------|----------|---------|-----------------|
| `public/uploads/` directory | `src/app/api/products/import`, `/api/bookings/.../pay` (file uploads) | All tenant uploads to shared `public/uploads/` directory | **HIGH RISK** — Multi-site isolation requires namespacing by `siteId` (e.g., `public/uploads/<siteId>/`). Template doesn't enforce this; risk of cross-site image access. **Mitigation**: Update all upload routes to create `<siteId>` subdirs; serve only images matched to current `site_id`. |

### Admin impersonation (same-origin CSRF check only)

| Code | Location | Pattern | Citynight risk |
|------|----------|---------|-----------------|
| CSRF validation in `src/app/api/__impersonate/route.ts:25-36` | Impersonation endpoint | Validates `Origin` / `Referer` are same-origin, but doesn't validate impersonated user is on the same **tenant** | **MEDIUM RISK** — In SaaS multi-tenant, an admin of Site A could theoretically impersonate a user of Site B if CSRF check passes. **Mitigation**: Add `site_id` validation; ensure impersonated user belongs to current `site_id`. |

### Marketing automations & relay (SaaS feature, not applicable to standalone)

| Code | Location | Pattern | Citynight status |
|------|----------|---------|------------------|
| `lib/marketingAutomations.ts`, `lib/email.ts` (mode: "atelier") | Email relay integration | SaaS relay feature; standalone doesn't use | **✓ SKIP** — Not applicable to Hostinger standalone. |

### Demo mode global state (hourly reset in SaaS demo)

| Code | Location | Pattern | Citynight risk |
|------|----------|---------|-----------------|
| `/api/cron/demo-reset` | Demo reset cron | Wipes entire `data/` tree for the demo showcase (`__demo__` tenant) | **✓ SKIP** — Not applicable to production Citynight. |

---

## 7. Next 15 → 16 Considerations

### Route segment config (`runtime`, `revalidate`, `dynamic`)

| Feature | Usage in Atelier | Next 16 impact | Citynight note |
|---------|------------------|-----------------|-----------------|
| `runtime = "nodejs"` | Declared in `src/app/api/membership/route.ts:4` | Opts out of Edge Runtime; Node.js only for booking logic | **✓ OK** — CPU-bound Stripe operations need Node.js, not Edge. |
| `revalidate` (ISR) | Not used in pages; all routes on-demand | Citynight may benefit from ISR on city homepages (`/{locale}/cities/{city}`) | Consider adding `revalidate: 3600` to city pages for Cloudflare edge caching. |
| `dynamic = "force-dynamic"` | Not explicitly used (routes are dynamic by default) | API routes naturally dynamic; pages default to static unless they have `headers()`, `cookies()`, etc. | **✓ OK** — Atelier's pattern (no explicit dynamic config) works in Next 16. |

### `next/image` optimizer (`unoptimized` flag)

| Setting | Location | Reasoning | Citynight implication |
|---------|----------|-----------|----------------------|
| `unoptimized: isDev \|\| !!ASSET_PREFIX` | `next.config.ts:98` | Dev: sandbox can't fetch external hosts. SaaS: asset prefix breaks `/_next/image` routing. | **✓ OK for production Citynight** — No ASSET_PREFIX (not SaaS); Image optimizer will work. Uploads are pre-resized WebP, so double-optimization is minor. |

### Middleware patterns

| Feature | Usage in Atelier | Citynight implication |
|---------|------------------|----------------------|
| Next.js middleware | Not used; no `middleware.ts` | All routing is app-based (layout + pages) | **✓ OK** — Middleware is optional. Citynight might add geo-routing or locale detection later, but not required. |

### Dynamic imports & lazy loading

| Component | Location | Pattern | Status |
|-----------|----------|---------|--------|
| `ChatWidgetLazy.tsx` | `src/app/components/ChatWidgetLazy.tsx` | `dynamic(() => import('./ChatWidget'), { ssr: false })` | **✓ CORRECT** — Standard lazy-load pattern for Next 15+. |

### Async Server Components

| Pattern | Usage | Status |
|---------|-------|--------|
| `async` page components | All admin pages, public pages | **✓ CORRECT** — Standard in Next 15+. Works in Next 16. |

### React 19 features

| Feature | Usage in Atelier | Citynight implication |
|---------|------------------|----------------------|
| React 19 (from `package.json: "react": "19.2.4"`) | Form actions, use client/server boundaries | **CAUTION:** Citynight on Next 15 uses React 18. Upgrading to Next 16 brings React 19; must audit form actions, hooks (`useTransition` behavior), and `use` API for breaking changes. |

### Turbopack config

| Setting | Location | Status |
|---------|----------|--------|
| `turbopack.root` pinning (lines 84–86 in `next.config.ts`) | Monorepo support | **✓ OK if monorepo** — Citynight is standalone; can remove this if not using monorepo. |

---

## 8. Dependency Delta

**Atelier `package.json` vs. Citynight (assumed Next 15 + Drizzle SQLite):**

### New dependencies (in Atelier, not in Citynight)

| Package | Version | Purpose | Integration notes |
|---------|---------|---------|-------------------|
| `@stripe/react-stripe-js` | ^6.3.0 | Stripe Elements React wrapper for payment forms | Payment UI (booking deposit, order checkout, membership signup) |
| `@stripe/stripe-js` | ^9.5.0 | Stripe.js SDK | Client-side Stripe initialization |
| `framer-motion` | ^12.38.0 | Animation library | Used in admin panels (tab transitions, modals), hero sections, gallery lightbox; heavy dependency |
| `lucide-react` | ^1.16.0 | Icon library (1400+ icons) | Can substitute with different icon lib if needed |
| `nodemailer` | ^8.0.5 | Email sending (SMTP direct or relay) | **Citynight uses Resend instead** — will need to replace all email routes |
| `web-push` | ^3.6.7 | Web push notifications | Booking reminders to PWA-installed apps; optional feature |
| `sharp` | ^0.34.5 | Image processing (WebP, resize) | Resize & convert uploads to WebP on `/api/products/import`, photo uploads. **Potential conflict:** Requires native binary; verify Node version support on Hostinger. |
| `adm-zip` | ^0.5.17 | ZIP file creation/extraction | APK export (Android build), GDPR data export; can stub out if not needed |

### Versions that may conflict or require upgrade

| Package | Atelier | Citynight (assumed) | Breaking changes | Mitigation |
|---------|---------|-------------------|-----------------|------------|
| `next` | 16.2.6 | 15.x | Minor version bump; feature additions, fixes | Bump Citynight to Next 16 (planned per brief) |
| `react` / `react-dom` | 19.2.4 | 18.x | **Major version bump** — React 19 drops legacy behavior, changes hooks APIs | Audit form actions, `useTransition`, `use()` API; plan React 19 migration alongside Next 16 |
| `tailwindcss` | @tailwindcss/postcss ^4 | tailwindcss v3 | **v4 is major breaking change** — new engine, config format, utility generation | Decide: upgrade to Tailwind v4 or keep v3 in Atelier code; if v3, must downgrade Atelier's deps. |
| `typescript` | ^5 | ^5 | Minor; compatible | No action needed |

### Libraries Citynight has that Atelier doesn't

| Package | Purpose in Citynight |
|---------|---------------------|
| `drizzle-orm` | SQL query builder & ORM |
| `drizzle-kit` | Migrations & schema management |
| `better-sqlite3` (or `node:sqlite` on Node 22+) | SQLite client |
| `resend` | Email service (replaces nodemailer) |

### Recommendation for dependency integration

1. **Keep Stripe packages** — Atelier's Stripe integration is robust; reuse it with Drizzle instead of JSON.
2. **Keep framer-motion** — Admin UI heavily uses it; difficult to replace mid-development.
3. **Replace nodemailer with Resend** — Per citynight's spec (Resend is the email provider).
4. **sharp:** Verify Hostinger Node version compatibility (required for upload processing).
5. **web-push:** Optional; include if PWA notifications are planned; otherwise stub/remove.
6. **adm-zip:** Include for GDPR data export; can skip APK generation on Hostinger.
7. **Tailwind v4 decision:** Citynight should decide on v3 vs. v4 early; Atelier uses v4, Citynight's template likely uses v3.

---

## 9. Risk List (Top 5, ranked by severity)

### 1. **File-based JSON persistence → SQLite ORM mismatch** (CRITICAL)

**Risk:** Atelier saves all data as JSON files with filesystem locks. Citynight uses Drizzle ORM + SQLite. Porting requires:
- Rewrite ALL 38+ `path.join(getAppRoot(), "data", "...")` callsites to Drizzle queries
- Migrate file lock pattern (`fileLock.ts`) to SQLite transactions
- Handle concurrent writes correctly (SQLite WAL mode vs. JSON file locks)
- Risk of race conditions, N+1 queries, data integrity bugs if not careful

**Impact:** Silent data corruption, payment/booking loss, audit log gaps if botched.

**Severity:** CRITICAL

**Mitigation:** 
- Create database abstraction layer (`src/lib/db/*.ts`) that mirrors Atelier's function signatures but uses Drizzle underneath
- Write comprehensive migration script to populate initial SQLite from demo JSON
- Unit test all CRUD operations before production
- Use SQLite transactions for all multi-step operations (booking creation with payment, etc.)

---

### 2. **Session auth (password-based) vs. Citynight's passwordless magic-link** (HIGH)

**Risk:** Atelier uses httpOnly cookie + PBKDF2 password hash. Citynight uses magic-link tokens. Auth model is fundamentally incompatible.

**Atelier code:**
- `/admin/login` form (email + password)
- `lib/auth.ts:34-51` (signIn with password verify)
- `lib/users.ts` (hashPassword, verifyPassword)

**Citynight requirement:** Magic-link only (no passwords).

**Impact:** 
- Existing admin can't log in (wrong auth method)
- Must rewrite all auth flows
- Changes owner identity model (magic-link assumes email ownership)

**Severity:** HIGH (access control, UX friction)

**Mitigation:** 
- Decide early: Single auth method (magic-link) or dual (magic-link + password)?
- Rewrite `lib/auth.ts` to match Citynight's magic-link spec
- Adapt `mustChangePassword` flag if needed for first-time setup

---

### 3. **Stripe integration scope mismatch (per-tenant vs. centralized)** (HIGH)

**Risk:** Atelier handles Stripe per-tenant (separate keys per site, reads from `settings.json`). Citynight will likely centralize Stripe (one key for all sites, routes via `/{locale}/` structure).

**Atelier code:**
- `lib/stripe.ts` (key resolution from settings)
- `/api/membership/checkout` + `/api/membership/confirm` (webhook handling)
- `/api/payment-intent` (PaymentIntent creation per site)

**Citynight implications:**
- Webhook must identify site from order metadata
- Refund/cancellation must scope to correct site
- Dashboard analytics must roll up across venues (or stay per-venue)
- Stripe customer records need site identifier

**Impact:** 
- Wrong payment attribution
- Cross-site refunds (revenue leak)
- Incorrect booking confirmation

**Severity:** HIGH (payment processing; trust & revenue critical)

**Mitigation:**
- Rewrite `lib/stripe.ts` to accept `siteId` param
- Store site ID in Stripe charge/subscription metadata
- Validate site ownership on all webhook callbacks
- Add idempotency checks for webhook retries (use Stripe event ID)

---

### 4. **Image upload & storage (local filesystem vs. S3/CDN)** (MEDIUM)

**Risk:** Atelier uploads to `public/uploads/` (Hostinger's local FS). Citynight is multi-site, so uploads must be:
- Isolated per-site (avoid cross-site image access)
- On CDN (not local FS) for caching and scale

**Atelier code:**
- `/api/products/import` (CSV → products with images)
- Photo upload endpoints (resize with sharp → save to disk)
- Image URLs hardcoded as `/uploads/...`

**Citynight implications:**
- Must upload to S3/R2, not local FS
- Image URLs must point to CDN domain
- Need storage abstraction layer (`src/lib/storage.ts`)

**Impact:** 
- Performance (no CDN caching)
- Multi-site security (no per-site isolation)
- Local disk bloat on Hostinger

**Severity:** MEDIUM (affects performance, cloud ops, not security-critical for auth/payment)

**Mitigation:**
- Create storage abstraction (`src/lib/storage.ts` with S3 SDK)
- Use presigned URLs for direct upload from browser
- Namespace uploads by `siteId` in bucket key path
- Update image URLs to CDN domain

---

### 5. **Multi-language & locale routing incompatibility** (MEDIUM)

**Risk:** Atelier assumes **one language per site** (set in `settings.enabledLanguages`). Citynight's routes are **locale-prefixed** (`/{locale}/...`). Pages don't check URL locale; they read settings.

**Atelier code:**
- All pages use `i18nServer.ts` which reads `settings.enabledLanguages`
- No route parameter for locale extraction
- Hardcoded locale resolution from cookie/header, not URL

**Citynight structure:**
- Routes: `/{locale}/(public)/{page}`
- Locale is URL param, not cookie

**Impact:**
- Pages render in wrong language (reads settings, not URL)
- Locale cookie not respected if URL says different language
- SEO broken (same content at multiple locale URLs)

**Severity:** MEDIUM (UX breakage, query execution in wrong language)

**Mitigation:**
- Extract locale from `[locale]` param in all layouts
- Pass locale to `i18n` context, not read from settings
- Update `search_threads` to match by locale + city
- Keep `settings.enabledLanguages` for feature flags (which languages are available), not current-request locale

---

**Summary:** Porting effort is 2–3 FTE-months. Critical path: data layer (JSON → SQL) + Stripe (per-site) + auth (password → magic-link) + testing. These must work before integrating UI components.

---

## Status — Phase I final landing (closed 2026-05-27)

| Sub-phase | What shipped |
|-----------|--------------|
| I.1 | Next 15→16 upgrade; `middleware.ts` → `proxy.ts`; archiver pinned to v7 |
| I.2 | Inventory + locked product decisions (saved to memory: Resend, Stripe Connect, full v1 scope, one default template per industry, Hostinger uploads, memberships+deposits standard, atelier-level analytics) |
| I.3 | Migrations 0034–0039 — 14 new tables: services/staff/junction, bookings/availability_rules/holidays, products/coupons/gift_cards/orders, clients/memberships/reviews, blog_categories, site_events/_daily. Plus stripe Connect columns on `sites`. |
| I.4 | Auth unification — `requireSiteOwner(siteId)` helper; atelier's own auth NOT ported (citynight session is canonical) |
| I.5 | Booking engine end-to-end: lib (services/staff/holidays/bookings/availability/tz) + 6 API routes + Stripe Connect onboarding & deposit PaymentIntents + booking UI + dashboard. Browser-verified on oakline-barber-demo. |
| I.6 | Shop engine end-to-end: lib (products/coupons/gift-cards/orders) + 7 API routes + checkout UI with Stripe Elements + dashboard products+orders panels |
| I.7 | CRM: clients (with GDPR soft-delete + auto-upsert from bookings/orders + rollups) + reviews (HMAC-signed post-visit links) + dashboards + public `/review/{token}` page |
| I.8 | Blog (uses existing `site_pages` + `site_blog_categories`) + public listing/detail + dashboard CRUD |
| I.9 | Industry templates — **hybrid approach**: 6 new industry palettes (barber/hair/clinic/nail/spa/yoga) + `BookingHome` booking-led layout. Full 6-template atelier port deferred as paid upsell. |
| I.10 | Cron jobs: `booking-reminders.mjs` (every 5min), `review-requests.mjs` (hourly). Migration 0040 adds `reminded_at` + `review_requested_at`. CRON.md + this doc updated. |

**Smoke-test coverage:** 15 cases in `pnpm test:integrity` — booking engine (5), shop engine (5), CRM (5).

**Deferred to a future phase / paid upsell:**
- 6 full atelier template variants (the 1300-LOC-each `template{2..6}` directories) — the hybrid in I.9 ships the same surface result for v1
- Marketing automations (bulk email campaigns, automated reminders, segment targeting). The cron job layer is in place; the campaign/segment tables aren't
- Per-service `deposit_percent` column — deposits are accepted per-booking via the API, but no UI for owners to set service-level defaults yet
- Stock alert cron + low-stock owner notification

**Original 2–3 FTE-months estimate retired:** the hybrid choices kept the critical path tight.
