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
  id: uuid().primaryKey(),
  cityId: text('city_id').notNull().references(() => cities.id, { onDelete: 'cascade' }),
  slug: text().notNull(), name: text().notNull(), lat: real(), lng: real(), heroPhotoId: text('hero_photo_id'),
}, (t) => [uniqueIndex('areas_city_slug').on(t.cityId, t.slug)]);

export const categories = sqliteTable('categories', {
  id: uuid().primaryKey(), slug: text().notNull().unique(), name: text().notNull(), parentId: text('parent_id'),
});

export const users = sqliteTable('users', {
  id: uuid().primaryKey(), email: text().notNull().unique(), phone: text(), name: text(),
  locale: text().default('en'), role: text({ enum: ['owner', 'admin'] }).notNull().default('owner'),
  // Google OAuth — populated when the user signs in via Google. Existing
  // magic-link users get a google_id stamped on first Google login if their
  // email matches (account linking). avatarUrl is the profile picture URL
  // Google returns; we don't proxy or cache it.
  googleId: text('google_id').unique(),
  avatarUrl: text('avatar_url'),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  createdAt: ts('created_at').default(now),
});

export const sessions = sqliteTable('sessions', {
  id: uuid().primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: ts('expires_at').notNull(), createdAt: ts('created_at').default(now),
}, (t) => [index('sessions_user').on(t.userId)]);

export const magicTokens = sqliteTable('magic_tokens', {
  id: uuid().primaryKey(), email: text().notNull(), tokenHash: text('token_hash').notNull(),
  purpose: text({ enum: ['login', 'claim'] }).notNull(), venueId: text('venue_id'),
  expiresAt: ts('expires_at').notNull(), usedAt: ts('used_at'),
});

export const venues = sqliteTable('venues', {
  id: uuid().primaryKey(), slug: text(),
  cityId: text('city_id').notNull().references(() => cities.id),
  areaId: text('area_id').references(() => areas.id),
  categoryId: text('category_id').references(() => categories.id),
  googlePlaceId: text('google_place_id').unique(), name: text().notNull(),
  address: text(), lat: real(), lng: real(),
  // VOLATILE FACTS — AI must never write these (app-layer isolation).
  phone: text(), openingHours: text('opening_hours', { mode: 'json' }),
  priceLevel: integer('price_level'), website: text(),
  description: text(),                          // ONLY field AI writes
  fieldSources: text('field_sources', { mode: 'json' }).notNull().default(sql`'{}'`),
  status: text({ enum: ['draft', 'pending', 'published', 'closed', 'rejected'] }).notNull().default('draft'),
  claim: text({ enum: ['unclaimed', 'pending', 'verified'] }).notNull().default('unclaimed'),
  ownerId: text('owner_id').references(() => users.id, { onDelete: 'set null' }),
  tier: text({ enum: ['free', 'featured'] }).notNull().default('free'),
  rating: real(), reviewCount: integer('review_count'), businessStatus: text('business_status'),
  isPermanentlyClosed: integer('is_permanently_closed', { mode: 'boolean' }).notNull().default(false),
  seedPhotoRefs: text('seed_photo_refs', { mode: 'json' }),
  // Per-venue design — JSON blob shaped by lib/design-system.ts (DesignParams).
  // NULL means "use defaultDesignParams() at render time"; Phase C backfills.
  // designParamsLocked=1 means a Featured owner picked their own combo and
  // the AI design writer must not overwrite this row.
  designParams: text('design_params'),
  designParamsLocked: integer('design_params_locked', { mode: 'boolean' }).notNull().default(false),
  // Mini-site content surface (Phase F1). Owner-edited via the dashboard.
  aboutText: text('about_text'),
  reservationUrl: text('reservation_url'),
  reservationEmail: text('reservation_email'),
  reservationPhone: text('reservation_phone'),
  reservationNotes: text('reservation_notes'),
  // Custom domain (Phase D). When set, middleware rewrites requests with
  // Host=<custom_domain> to this venue's canonical citynight URL.
  customDomain: text('custom_domain'),
  lastSyncedAt: ts('last_synced_at'),
  createdAt: ts('created_at').default(now),
  publishedAt: ts('published_at'),
}, (t) => [
  index('venues_city_status').on(t.cityId, t.status),
  index('venues_category').on(t.categoryId),
  index('venues_claim').on(t.claim),
  uniqueIndex('venues_city_slug').on(t.cityId, t.slug),
]);

export const photos = sqliteTable('photos', {
  id: uuid().primaryKey(),
  venueId: text('venue_id').references(() => venues.id, { onDelete: 'cascade' }),
  areaId: text('area_id').references(() => areas.id, { onDelete: 'cascade' }),
  cityId: text('city_id').references(() => cities.id, { onDelete: 'cascade' }),
  subjectType: text('subject_type', { enum: ['venue', 'product', 'location', 'decorative'] }).notNull(),
  source: text({ enum: ['google_places', 'owner_upload', 'own_photography', 'licensed_stock', 'placeholder', 'ai_decorative'] }).notNull(),
  url: text().notNull(), storageKey: text('storage_key'),
  attributionText: text('attribution_text'), attributionUrl: text('attribution_url'), license: text(),
  cachedUntil: ts('cached_until'),
  isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: ts('created_at').default(now),
}, (t) => [
  index('photos_venue').on(t.venueId),
  check('photo_source_matches_subject', sql`
    (${t.subjectType} IN ('venue','product') AND ${t.source} IN ('google_places','owner_upload','placeholder'))
    OR (${t.subjectType} = 'location'  AND ${t.source} IN ('own_photography','licensed_stock','google_places','placeholder'))
    OR (${t.subjectType} = 'decorative' AND ${t.source} IN ('ai_decorative','licensed_stock'))`),
]);

export const claims = sqliteTable('claims', {
  id: uuid().primaryKey(),
  venueId: text('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  method: text({ enum: ['email', 'sms'] }).notNull().default('email'),
  status: text({ enum: ['pending', 'verified', 'rejected'] }).notNull().default('pending'),
  verifiedAt: ts('verified_at'), createdAt: ts('created_at').default(now),
});

export const venueSubmissions = sqliteTable('venue_submissions', {
  id: uuid().primaryKey(),
  venueId: text('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  submittedBy: text('submitted_by').references(() => users.id),
  placesMatch: integer('places_match', { mode: 'boolean' }), confidence: real(),
  autoDecision: text('auto_decision', { enum: ['auto_publish', 'hold', 'reject'] }),
  createdAt: ts('created_at').default(now),
});

export const reports = sqliteTable('reports', {
  id: uuid().primaryKey(),
  venueId: text('venue_id').references(() => venues.id, { onDelete: 'cascade' }),
  reason: text({ enum: ['closed', 'wrong_info', 'duplicate', 'spam'] }).notNull(),
  detail: text(),
  status: text({ enum: ['open', 'reviewing', 'resolved', 'dismissed'] }).notNull().default('open'),
  createdAt: ts('created_at').default(now),
});

export const subscriptions = sqliteTable('subscriptions', {
  id: uuid().primaryKey(),
  venueId: text('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  stripeCustomerId: text('stripe_customer_id').notNull(),
  stripeSubscriptionId: text('stripe_subscription_id').notNull().unique(),
  status: text({ enum: ['active', 'past_due', 'canceled', 'incomplete'] }).notNull(),
  currentPeriodEnd: ts('current_period_end'),
  createdAt: ts('created_at').default(now),
});

export const adCampaigns = sqliteTable('ad_campaigns', {
  id: uuid().primaryKey(),
  advertiserId: text('advertiser_id').notNull().references(() => users.id),
  name: text().notNull(), creativeUrl: text('creative_url').notNull(), targetUrl: text('target_url').notNull(),
  scope: text({ enum: ['site', 'section', 'category'] }).notNull(),
  targetCityId: text('target_city_id').references(() => cities.id),
  targetAreaId: text('target_area_id').references(() => areas.id),
  targetCategoryId: text('target_category_id').references(() => categories.id),
  stripeSubscriptionId: text('stripe_subscription_id'),
  status: text({ enum: ['draft', 'pending_payment', 'pending_moderation', 'active', 'paused', 'rejected', 'ended'] }).notNull().default('draft'),
  moderation: text({ enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  startsAt: ts('starts_at'), endsAt: ts('ends_at'), createdAt: ts('created_at').default(now),
});

export const affiliateLinks = sqliteTable('affiliate_links', {
  id: uuid().primaryKey(), slug: text().notNull().unique(), label: text(),
});

export const affiliateDestinations = sqliteTable('affiliate_destinations', {
  id: uuid().primaryKey(),
  affiliateLinkId: text('affiliate_link_id').notNull().references(() => affiliateLinks.id, { onDelete: 'cascade' }),
  countryCode: text('country_code').notNull(), program: text().notNull(), url: text().notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
}, (t) => [uniqueIndex('aff_dest_link_country').on(t.affiliateLinkId, t.countryCode)]);

export const translations = sqliteTable('translations', {
  id: uuid().primaryKey(),
  entityType: text('entity_type', { enum: ['venue', 'city', 'area', 'category'] }).notNull(),
  entityId: text('entity_id').notNull(), field: text().notNull(), locale: text().notNull(), value: text().notNull(),
  source: text({ enum: ['google_places', 'owner', 'own_media', 'licensed_stock', 'ai', 'admin'] }).notNull().default('ai'),
}, (t) => [
  uniqueIndex('tr_unique').on(t.entityType, t.entityId, t.field, t.locale),
  index('tr_lookup').on(t.entityType, t.entityId, t.locale),
]);

export const events = sqliteTable('events', {
  id: integer().primaryKey({ autoIncrement: true }),
  venueId: text('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  type: text({ enum: ['view', 'directions', 'phone', 'link'] }).notNull(),
  at: ts('at').default(now),
}, (t) => [index('events_venue_at').on(t.venueId, t.at)]);

export const venueMenuSections = sqliteTable('venue_menu_sections', {
  id: uuid().primaryKey(),
  venueId: text('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  name: text().notNull(),
  description: text(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: ts('created_at').default(now),
  updatedAt: ts('updated_at').default(now),
}, (t) => [index('venue_menu_sections_venue_sort').on(t.venueId, t.sortOrder)]);

export const venueMenuItems = sqliteTable('venue_menu_items', {
  id: uuid().primaryKey(),
  sectionId: text('section_id').notNull().references(() => venueMenuSections.id, { onDelete: 'cascade' }),
  name: text().notNull(),
  description: text(),
  price: text(),
  isPopular: integer('is_popular', { mode: 'boolean' }).notNull().default(false),
  isVegetarian: integer('is_vegetarian', { mode: 'boolean' }).notNull().default(false),
  isVegan: integer('is_vegan', { mode: 'boolean' }).notNull().default(false),
  isGlutenFree: integer('is_gluten_free', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: ts('created_at').default(now),
  updatedAt: ts('updated_at').default(now),
}, (t) => [index('venue_menu_items_section_sort').on(t.sectionId, t.sortOrder)]);

export const venueMessages = sqliteTable('venue_messages', {
  id: uuid().primaryKey(),
  venueId: text('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  kind: text({ enum: ['reservation', 'contact'] }).notNull(),
  fromName: text('from_name'),
  fromEmail: text('from_email'),
  fromPhone: text('from_phone'),
  partySize: integer('party_size'),
  desiredAt: ts('desired_at'),
  body: text(),
  forwardedAt: ts('forwarded_at'),
  readAt: ts('read_at'),
  createdAt: ts('created_at').default(now),
}, (t) => [index('venue_messages_venue_created').on(t.venueId, t.createdAt)]);

// ── SaaS tenant model (Phase G1) ─────────────────────────────────────────
// Each `sites` row is a paying customer's website. Parallel to `venues` —
// they don't share rows; a customer can have one of each.
export const sites = sqliteTable('sites', {
  id: uuid().primaryKey(),
  slug: text().notNull().unique(),
  ownerId: text('owner_id').notNull().references(() => users.id),
  name: text().notNull(),
  vertical: text({ enum: ['restaurant', 'bar', 'rooftop', 'nightclub', 'beach_club', 'hotel', 'cafe', 'salon', 'other'] }).notNull(),
  templateId: text('template_id').notNull(),
  city: text(),
  country: text().notNull().default('GR'),
  address: text(),
  phone: text(),
  contactEmail: text('contact_email'),
  hours: text(), // JSON
  aboutText: text('about_text'),
  reservationUrl: text('reservation_url'),
  reservationEmail: text('reservation_email'),
  reservationPhone: text('reservation_phone'),
  reservationNotes: text('reservation_notes'),
  designParams: text('design_params'),
  designParamsLocked: integer('design_params_locked', { mode: 'boolean' }).notNull().default(false),
  wordmark: text(),
  tagline: text(),
  logoUrl: text('logo_url'),
  faviconUrl: text('favicon_url'),
  customDomain: text('custom_domain'),
  saasStatus: text('saas_status', { enum: ['trialing', 'active', 'past_due', 'canceled', 'paused', 'zip_only'] }).notNull().default('trialing'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  currentPeriodEnd: ts('current_period_end'),
  zipPurchasedAt: ts('zip_purchased_at'),
  zipStripeSessionId: text('zip_stripe_session_id').unique(),
  // Stripe Connect — each owner connects their own Stripe account; bookings,
  // orders, memberships charge there with a citynight application_fee. Null
  // means onboarding hasn't started. charges/payouts/details flags mirror
  // the Stripe Account object so the dashboard can show readiness.
  stripeAccountId: text('stripe_account_id'),
  stripeChargesEnabled: integer('stripe_charges_enabled', { mode: 'boolean' }).notNull().default(false),
  stripePayoutsEnabled: integer('stripe_payouts_enabled', { mode: 'boolean' }).notNull().default(false),
  stripeDetailsSubmitted: integer('stripe_details_submitted', { mode: 'boolean' }).notNull().default(false),
  stripeAccountCountry: text('stripe_account_country'),
  stripeAccountCurrency: text('stripe_account_currency'),
  stripeAccountUpdatedAt: ts('stripe_account_updated_at'),
  status: text({ enum: ['draft', 'published', 'suspended'] }).notNull().default('draft'),
  // Phase H1 — original venues.id when migrated from a directory listing.
  // The redirect handler (Phase H2) uses this to map old /greece/... URLs.
  legacyVenueId: text('legacy_venue_id'),
  createdAt: ts('created_at').default(now),
  publishedAt: ts('published_at'),
  suspendedAt: ts('suspended_at'),
}, (t) => [
  index('sites_owner').on(t.ownerId),
  index('sites_status').on(t.status),
  index('sites_saas_status').on(t.saasStatus),
]);

export const siteMenuSections = sqliteTable('site_menu_sections', {
  id: uuid().primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  name: text().notNull(),
  description: text(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: ts('created_at').default(now),
  updatedAt: ts('updated_at').default(now),
}, (t) => [index('site_menu_sections_site_sort').on(t.siteId, t.sortOrder)]);

export const siteMenuItems = sqliteTable('site_menu_items', {
  id: uuid().primaryKey(),
  sectionId: text('section_id').notNull().references(() => siteMenuSections.id, { onDelete: 'cascade' }),
  name: text().notNull(),
  description: text(),
  price: text(),
  isPopular: integer('is_popular', { mode: 'boolean' }).notNull().default(false),
  isVegetarian: integer('is_vegetarian', { mode: 'boolean' }).notNull().default(false),
  isVegan: integer('is_vegan', { mode: 'boolean' }).notNull().default(false),
  isGlutenFree: integer('is_gluten_free', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: ts('created_at').default(now),
  updatedAt: ts('updated_at').default(now),
}, (t) => [index('site_menu_items_section_sort').on(t.sectionId, t.sortOrder)]);

export const siteMessages = sqliteTable('site_messages', {
  id: uuid().primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  kind: text({ enum: ['reservation', 'contact'] }).notNull(),
  fromName: text('from_name'),
  fromEmail: text('from_email'),
  fromPhone: text('from_phone'),
  partySize: integer('party_size'),
  desiredAt: ts('desired_at'),
  body: text(),
  forwardedAt: ts('forwarded_at'),
  readAt: ts('read_at'),
  createdAt: ts('created_at').default(now),
}, (t) => [index('site_messages_site_created').on(t.siteId, t.createdAt)]);

export const sitePhotos = sqliteTable('site_photos', {
  id: uuid().primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  url: text().notNull(),
  storageKey: text('storage_key'),
  attributionText: text('attribution_text'),
  isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: ts('created_at').default(now),
}, (t) => [index('site_photos_site_sort').on(t.siteId, t.sortOrder)]);

export const sitePages = sqliteTable('site_pages', {
  id: uuid().primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  slug: text().notNull(),
  kind: text({ enum: ['post', 'page'] }).notNull().default('post'),
  title: text().notNull(),
  excerpt: text(),
  body: text(),
  coverUrl: text('cover_url'),
  category: text(),
  // Typed FK alongside the free-text `category` — populated for new posts
  // via the blog-categories UI. `category` stays as a write-through fallback
  // until all read paths join through categoryId.
  categoryId: text('category_id').references(() => siteBlogCategories.id, { onDelete: 'set null' }),
  published: integer({ mode: 'boolean' }).notNull().default(false),
  publishedAt: ts('published_at'),
  createdAt: ts('created_at').default(now),
  updatedAt: ts('updated_at').default(now),
}, (t) => [
  uniqueIndex('site_pages_site_slug').on(t.siteId, t.slug),
  index('site_pages_site_published').on(t.siteId, t.published, t.publishedAt),
  index('site_pages_category').on(t.categoryId),
]);

export const eventsDaily = sqliteTable('events_daily', {
  venueId: text('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  day: text().notNull(),
  type: text({ enum: ['view', 'directions', 'phone', 'link'] }).notNull(),
  count: integer().notNull().default(0),
}, (t) => [uniqueIndex('events_daily_pk').on(t.venueId, t.day, t.type)]);

// ────────────────────────────────────────────────────────────────────────
// Phase I.3 — Atelier port: services, staff, bookings, shop, CRM, blog,
// per-site analytics. Each table is per-site (FK sites.id ON DELETE CASCADE).

export const siteServices = sqliteTable('site_services', {
  id: uuid().primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  slug: text().notNull(),
  name: text().notNull(),
  description: text(),
  durationMinutes: integer('duration_minutes').notNull(),
  bufferMinutes: integer('buffer_minutes').notNull().default(0),
  priceCents: integer('price_cents').notNull(),
  category: text(),
  enabled: integer({ mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  tkey: text(),
  createdAt: ts('created_at').default(now),
  updatedAt: ts('updated_at').default(now),
}, (t) => [
  uniqueIndex('site_services_site_slug').on(t.siteId, t.slug),
  index('site_services_site_enabled_sort').on(t.siteId, t.enabled, t.sortOrder),
]);

export const siteStaff = sqliteTable('site_staff', {
  id: uuid().primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  slug: text().notNull(),
  name: text().notNull(),
  role: text(),
  bio: text(),
  photoUrl: text('photo_url'),
  specialties: text(), // JSON array of strings
  enabled: integer({ mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  workDays: text('work_days').notNull().default('[1,2,3,4,5]'),
  startTime: text('start_time').notNull().default('09:00'),
  endTime: text('end_time').notNull().default('18:00'),
  breakStart: text('break_start'),
  breakEnd: text('break_end'),
  createdAt: ts('created_at').default(now),
  updatedAt: ts('updated_at').default(now),
}, (t) => [
  uniqueIndex('site_staff_site_slug').on(t.siteId, t.slug),
  index('site_staff_site_enabled_sort').on(t.siteId, t.enabled, t.sortOrder),
]);

// Join: which staff can perform which service. Empty join for a service =
// all enabled staff may perform it.
export const siteServiceStaff = sqliteTable('site_service_staff', {
  serviceId: text('service_id').notNull().references(() => siteServices.id, { onDelete: 'cascade' }),
  staffId: text('staff_id').notNull().references(() => siteStaff.id, { onDelete: 'cascade' }),
}, (t) => [
  uniqueIndex('site_service_staff_pk').on(t.serviceId, t.staffId),
  index('site_service_staff_staff').on(t.staffId),
]);

export const siteClients = sqliteTable('site_clients', {
  id: uuid().primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  email: text(),
  phone: text(),
  name: text().notNull(),
  birthday: text(),
  notes: text(),
  tags: text(), // JSON array
  preferredStaffId: text('preferred_staff_id').references(() => siteStaff.id, { onDelete: 'set null' }),
  totalBookings: integer('total_bookings').notNull().default(0),
  totalSpentCents: integer('total_spent_cents').notNull().default(0),
  loyaltyPoints: integer('loyalty_points').notNull().default(0),
  lastBookedAt: ts('last_booked_at'),
  lastOrderedAt: ts('last_ordered_at'),
  deletedAt: ts('deleted_at'),
  createdAt: ts('created_at').default(now),
  updatedAt: ts('updated_at').default(now),
}, (t) => [
  index('site_clients_site_last_booked').on(t.siteId, t.lastBookedAt),
]);

export const siteMemberships = sqliteTable('site_memberships', {
  id: uuid().primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  clientId: text('client_id').notNull().references(() => siteClients.id, { onDelete: 'cascade' }),
  termMonths: integer('term_months').notNull(),
  discountPercent: integer('discount_percent').notNull(),
  pricePaidCents: integer('price_paid_cents').notNull(),
  currency: text().notNull().default('EUR'),
  startsAt: ts('starts_at').notNull(),
  expiresAt: ts('expires_at').notNull(),
  cancelledAt: ts('cancelled_at'),
  stripeCheckoutSessionId: text('stripe_checkout_session_id').unique(),
  createdAt: ts('created_at').default(now),
}, (t) => [
  index('site_memberships_client_active').on(t.siteId, t.clientId, t.expiresAt),
]);

export const siteBookings = sqliteTable('site_bookings', {
  id: uuid().primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  serviceId: text('service_id').notNull().references(() => siteServices.id, { onDelete: 'restrict' }),
  staffId: text('staff_id').notNull().references(() => siteStaff.id, { onDelete: 'restrict' }),
  clientId: text('client_id').references(() => siteClients.id, { onDelete: 'set null' }),

  date: text().notNull(), // "YYYY-MM-DD" local
  time: text().notNull(), // "HH:MM" local
  durationMinutes: integer('duration_minutes').notNull(),
  bufferMinutes: integer('buffer_minutes').notNull().default(0),

  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email'),
  customerPhone: text('customer_phone'),

  priceCents: integer('price_cents').notNull(),
  currency: text().notNull().default('EUR'),

  depositPercent: integer('deposit_percent'),
  depositPaidCents: integer('deposit_paid_cents'),
  depositStripePaymentIntentId: text('deposit_stripe_payment_intent_id'),

  membershipId: text('membership_id').references(() => siteMemberships.id, { onDelete: 'set null' }),
  discountPercent: integer('discount_percent'),

  status: text({ enum: ['pending', 'confirmed', 'completed', 'no_show', 'cancelled'] }).notNull().default('confirmed'),
  cancelledAt: ts('cancelled_at'),
  cancellationReason: text('cancellation_reason'),
  completedAt: ts('completed_at'),

  notes: text(),
  customerNotes: text('customer_notes'),
  walkIn: integer('walk_in', { mode: 'boolean' }).notNull().default(false),
  lang: text().notNull().default('en'),

  // Phase I.10 — cron-tracking timestamps
  remindedAt: ts('reminded_at'),
  reviewRequestedAt: ts('review_requested_at'),

  createdAt: ts('created_at').default(now),
  updatedAt: ts('updated_at').default(now),
}, (t) => [
  index('site_bookings_slot').on(t.siteId, t.staffId, t.date, t.time),
  index('site_bookings_site_date').on(t.siteId, t.date, t.time),
  index('site_bookings_client').on(t.clientId),
]);

export const siteAvailabilityRules = sqliteTable('site_availability_rules', {
  id: uuid().primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  staffId: text('staff_id').notNull().references(() => siteStaff.id, { onDelete: 'cascade' }),
  kind: text({ enum: ['open', 'closed'] }).notNull(),
  date: text(),                            // "YYYY-MM-DD" — XOR with weekday
  weekday: integer(),                      // 1..7 ISO — XOR with date
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  reason: text(),
  createdAt: ts('created_at').default(now),
}, (t) => [
  index('site_availability_rules_staff').on(t.siteId, t.staffId),
  index('site_availability_rules_date').on(t.siteId, t.date),
  check('site_availability_rules_date_xor_weekday', sql`(${t.date} IS NULL) != (${t.weekday} IS NULL)`),
]);

export const siteHolidays = sqliteTable('site_holidays', {
  id: uuid().primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  date: text().notNull(),
  reason: text(),
  createdAt: ts('created_at').default(now),
}, (t) => [uniqueIndex('site_holidays_site_date').on(t.siteId, t.date)]);

export const siteProducts = sqliteTable('site_products', {
  id: uuid().primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  slug: text().notNull(),
  name: text().notNull(),
  category: text(),
  shortDesc: text('short_desc'),
  longDesc: text('long_desc'),
  priceCents: integer('price_cents').notNull(),
  currency: text().notNull().default('EUR'),
  imageUrl: text('image_url'),
  stock: integer(),
  featured: integer({ mode: 'boolean' }).notNull().default(false),
  enabled: integer({ mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: ts('created_at').default(now),
  updatedAt: ts('updated_at').default(now),
}, (t) => [
  uniqueIndex('site_products_site_slug').on(t.siteId, t.slug),
  index('site_products_site_enabled_sort').on(t.siteId, t.enabled, t.sortOrder),
]);

export const siteCoupons = sqliteTable('site_coupons', {
  id: uuid().primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  code: text().notNull(),
  kind: text({ enum: ['percent', 'fixed'] }).notNull(),
  value: integer().notNull(),
  maxUses: integer('max_uses'),
  usedCount: integer('used_count').notNull().default(0),
  minTotalCents: integer('min_total_cents').notNull().default(0),
  appliesTo: text('applies_to', { enum: ['bookings', 'shop', 'both'] }).notNull(),
  active: integer({ mode: 'boolean' }).notNull().default(true),
  expiresAt: ts('expires_at'),
  createdAt: ts('created_at').default(now),
}, (t) => [
  uniqueIndex('site_coupons_site_code').on(t.siteId, t.code),
  index('site_coupons_site_active').on(t.siteId, t.active),
]);

export const siteGiftCards = sqliteTable('site_gift_cards', {
  id: uuid().primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  code: text().notNull(),
  amountCents: integer('amount_cents').notNull(),
  balanceCents: integer('balance_cents').notNull(),
  currency: text().notNull().default('EUR'),
  buyerName: text('buyer_name'),
  buyerEmail: text('buyer_email'),
  recipient: text(),
  orderId: text('order_id'),
  status: text({ enum: ['active', 'redeemed', 'expired', 'void'] }).notNull().default('active'),
  issuedAt: ts('issued_at').default(now),
  expiresAt: ts('expires_at'),
  createdAt: ts('created_at').default(now),
}, (t) => [uniqueIndex('site_gift_cards_site_code').on(t.siteId, t.code)]);

export const siteGiftCardRedemptions = sqliteTable('site_gift_card_redemptions', {
  id: uuid().primaryKey(),
  giftCardId: text('gift_card_id').notNull().references(() => siteGiftCards.id, { onDelete: 'cascade' }),
  orderId: text('order_id'),
  bookingId: text('booking_id').references(() => siteBookings.id, { onDelete: 'set null' }),
  amountCents: integer('amount_cents').notNull(),
  note: text(),
  createdAt: ts('created_at').default(now),
}, (t) => [index('site_gift_card_redemptions_card').on(t.giftCardId, t.createdAt)]);

export const siteOrders = sqliteTable('site_orders', {
  id: uuid().primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  clientId: text('client_id').references(() => siteClients.id, { onDelete: 'set null' }),

  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email'),
  customerPhone: text('customer_phone'),
  shippingAddress: text('shipping_address'),
  shippingCity: text('shipping_city'),
  shippingPostal: text('shipping_postal'),
  shippingCountry: text('shipping_country'),
  notes: text(),
  lang: text().notNull().default('en'),

  subtotalCents: integer('subtotal_cents').notNull(),
  discountCents: integer('discount_cents').notNull().default(0),
  shippingCents: integer('shipping_cents').notNull().default(0),
  taxCents: integer('tax_cents').notNull().default(0),
  totalCents: integer('total_cents').notNull(),
  currency: text().notNull().default('EUR'),
  couponId: text('coupon_id').references(() => siteCoupons.id, { onDelete: 'set null' }),
  giftCardId: text('gift_card_id').references(() => siteGiftCards.id, { onDelete: 'set null' }),

  stripePaymentIntentId: text('stripe_payment_intent_id'),
  stripeCheckoutSessionId: text('stripe_checkout_session_id'),
  applicationFeeCents: integer('application_fee_cents'),

  status: text({ enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'] }).notNull().default('pending'),
  paidAt: ts('paid_at'),
  shippedAt: ts('shipped_at'),
  deliveredAt: ts('delivered_at'),
  cancelledAt: ts('cancelled_at'),

  createdAt: ts('created_at').default(now),
  updatedAt: ts('updated_at').default(now),
}, (t) => [
  index('site_orders_site_status_created').on(t.siteId, t.status, t.createdAt),
]);

export const siteOrderItems = sqliteTable('site_order_items', {
  id: uuid().primaryKey(),
  orderId: text('order_id').notNull().references(() => siteOrders.id, { onDelete: 'cascade' }),
  productId: text('product_id').references(() => siteProducts.id, { onDelete: 'set null' }),
  name: text().notNull(),
  unitPriceCents: integer('unit_price_cents').notNull(),
  quantity: integer().notNull(),
  lineTotalCents: integer('line_total_cents').notNull(),
}, (t) => [index('site_order_items_order').on(t.orderId)]);

export const siteReviews = sqliteTable('site_reviews', {
  id: uuid().primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  bookingId: text('booking_id').references(() => siteBookings.id, { onDelete: 'set null' }),
  clientId: text('client_id').references(() => siteClients.id, { onDelete: 'set null' }),
  source: text({ enum: ['booking', 'manual', 'google'] }).notNull().default('booking'),
  authorName: text('author_name'),
  authorEmail: text('author_email'),
  rating: integer().notNull(),
  title: text(),
  body: text(),
  status: text({ enum: ['pending', 'approved', 'rejected', 'flagged'] }).notNull().default('pending'),
  approvedAt: ts('approved_at'),
  reply: text(),
  replyAt: ts('reply_at'),
  createdAt: ts('created_at').default(now),
}, (t) => [
  index('site_reviews_site_status_created').on(t.siteId, t.status, t.createdAt),
  index('site_reviews_booking').on(t.bookingId),
  check('site_reviews_rating_range', sql`${t.rating} BETWEEN 1 AND 5`),
]);

export const siteBlogCategories = sqliteTable('site_blog_categories', {
  id: uuid().primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  slug: text().notNull(),
  name: text().notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: ts('created_at').default(now),
}, (t) => [
  uniqueIndex('site_blog_categories_site_slug').on(t.siteId, t.slug),
  index('site_blog_categories_site_sort').on(t.siteId, t.sortOrder),
]);

// Per-site analytics — parallel to events/events_daily but with the wider
// atelier-level type set + drill-down FKs.
export const siteEvents = sqliteTable('site_events', {
  id: integer().primaryKey({ autoIncrement: true }),
  siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  type: text({
    enum: ['view', 'directions', 'phone', 'link', 'booking_started', 'booking_completed', 'order_started', 'order_completed', 'membership_purchased', 'review_submitted'],
  }).notNull(),
  serviceId: text('service_id'),
  staffId: text('staff_id'),
  bookingId: text('booking_id'),
  orderId: text('order_id'),
  sessionId: text('session_id'),
  referrer: text(),
  locale: text(),
  country: text(),
  at: ts('at').default(now),
}, (t) => [index('site_events_site_at').on(t.siteId, t.at)]);

export const siteEventsDaily = sqliteTable('site_events_daily', {
  siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  day: text().notNull(),
  type: text().notNull(),
  count: integer().notNull().default(0),
}, (t) => [uniqueIndex('site_events_daily_pk').on(t.siteId, t.day, t.type)]);
