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

export const eventsDaily = sqliteTable('events_daily', {
  venueId: text('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  day: text().notNull(),
  type: text({ enum: ['view', 'directions', 'phone', 'link'] }).notNull(),
  count: integer().notNull().default(0),
}, (t) => [uniqueIndex('events_daily_pk').on(t.venueId, t.day, t.type)]);
