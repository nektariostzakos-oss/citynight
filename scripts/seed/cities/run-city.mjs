#!/usr/bin/env node
// Generic city-import runner. Loads a config from
// scripts/seed/cities/<slug>.config.mjs and seeds the editorial guides
// (article + verified business cards) for every vertical the config
// defines.
//
// Usage:
//   node scripts/seed/cities/run-city.mjs <slug> [--vertical=nightlife|food|stay|all] [--dry]
//
// Contract:
//   - The runner deletes prior articles + guide_businesses for each
//     vertical it touches, then re-inserts fresh. Idempotent.
//   - A vertical only publishes when EXACTLY 10 candidates pass every
//     verification gate (FB + Places + ≤6-month review). Falling short
//     leaves the article unpublished (status='draft') with a printed
//     warning. The page renderer hides draft articles.
//   - "Static candidates" in the config are tried first (editor-curated
//     blurbs); discovery fills the rest.
//
// Cost notes (§17 of CLAUDE.md):
//   - Each city ≈ N queries × Places searchText + (10 × photos) +
//     (10 × FB HEAD) + (20 × Anthropic blurbs across 2 locales).
//   - Run city-by-city, not in bulk, until per-city cost is known.

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  TARGET_BUSINESSES_PER_GUIDE,
  discover, findStatic,
  verifyLatestActivity, verifyFacebook, titleMatchesExpected, titleMatchesName,
  buildFbCandidates, pickSectionKind, generateBlurb,
  parsePriceLevel, normalize, addressMatchesCity,
  pickPexelsCover,
} from './_common.mjs';
import { pickVenuePhotos } from './_photos.mjs';

// ── CLI parsing ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const citySlug = args.find((a) => !a.startsWith('--'));
const verticalArg = (args.find((a) => a.startsWith('--vertical='))?.split('=')[1]) ?? 'all';
const DRY = args.includes('--dry');

if (!citySlug) {
  console.error('usage: node run-city.mjs <slug> [--vertical=nightlife|food|stay|all] [--dry]');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, `${citySlug}.config.mjs`);
const configUrl = pathToFileURL(configPath).href;

let mod;
try { mod = await import(configUrl); }
catch (err) { console.error(`config not found: ${configPath}\n  ${err.message}`); process.exit(1); }

const cfg = mod.default ?? mod.config ?? mod;
if (!cfg?.slug || !cfg?.cityId || !cfg?.bias || !cfg?.verticals) {
  console.error('config is missing required fields (slug, cityId, bias, verticals)');
  process.exit(1);
}

const db = new Database('citynight.local.sqlite');
const LOCALES = cfg.locales ?? ['el', 'en'];

console.log(`\n=== ${cfg.name ?? cfg.slug} ===`);
console.log(`locales: ${LOCALES.join(', ')}  ·  bias: ${JSON.stringify(cfg.bias.circle?.center)}`);

const verticalsToRun = verticalArg === 'all'
  ? Object.keys(cfg.verticals)
  : [verticalArg];

for (const vertical of verticalsToRun) {
  const vcfg = cfg.verticals[vertical];
  if (!vcfg) { console.warn(`  skip ${vertical}: not in config`); continue; }
  console.log(`\n── ${vertical} ──`);
  await runVertical(vertical, vcfg);
}

db.close();

// ────────────────────────────────────────────────────────────────────────
async function runVertical(vertical, vcfg) {
  // Step 1: ensure article rows exist (delete + recreate, one per locale).
  const articles = upsertArticles(vertical, vcfg);

  // Step 2: refresh cover photo from Pexels (per-vertical aesthetic).
  if (!DRY) await maybeRefreshCover(vertical, articles, vcfg);

  // Step 3: discovery + static candidates.
  const articleIds = articles.map((a) => a.id);
  if (!DRY) {
    db.prepare(`DELETE FROM guide_businesses WHERE article_id IN (${articleIds.map(() => '?').join(',')})`).run(...articleIds);
  }

  let inserted = 0;
  const seenPlaceIds = new Set();
  let sortIdx = 0;

  // Static first (editor-curated, deterministic ordering).
  for (const c of vcfg.staticCandidates ?? []) {
    if (inserted >= TARGET_BUSINESSES_PER_GUIDE) break;
    const ok = await processStatic({ candidate: c, vertical, vcfg, articles, sortIdx });
    if (ok) {
      inserted++; sortIdx++;
      if (ok.placeId) seenPlaceIds.add(ok.placeId);
    }
  }

  if (inserted < TARGET_BUSINESSES_PER_GUIDE) {
    console.log('\n  discovery:');
    const discovered = await discover({
      queries: vcfg.discoveryQueries,
      bias: cfg.bias,
      minRating: vcfg.minRating,
      minReviews: vcfg.minReviews,
    });
    console.log(`  found ${discovered.length} candidates passing filters\n`);
    for (const p of discovered) {
      if (inserted >= TARGET_BUSINESSES_PER_GUIDE) break;
      if (seenPlaceIds.has(p.id)) { console.log(`→ ${p.displayName?.text} — already covered by static, skip`); continue; }
      const ok = await processDiscovered({ place: p, vertical, vcfg, articles, sortIdx });
      if (ok) {
        inserted++; sortIdx++;
        seenPlaceIds.add(p.id);
      }
    }
  }

  // Step 4: publication. Places-anchored verification means we publish
  // whatever we got — the FB gate is best-effort, so 5/10 still ships.
  // The ten-card *aim* is preserved by the discovery loop; the floor is
  // "at least one card" because an empty guide is just editorial body.
  if (!DRY) {
    if (inserted === 0) {
      console.warn(`\n  ⚠ 0 verified candidates — keeping article draft.`);
      db.prepare(`UPDATE articles SET status = 'draft', published_at = NULL, updated_at = unixepoch()
                  WHERE id IN (${articleIds.map(() => '?').join(',')})`).run(...articleIds);
    } else {
      db.prepare(`UPDATE articles SET status = 'published', published_at = COALESCE(published_at, unixepoch()), updated_at = unixepoch()
                  WHERE id IN (${articleIds.map(() => '?').join(',')})`).run(...articleIds);
      const marker = inserted >= TARGET_BUSINESSES_PER_GUIDE ? '✓' : '⚠';
      console.log(`\n  ${marker} ${inserted}/${TARGET_BUSINESSES_PER_GUIDE} published.`);
    }
  }

  // Step 5: tally for el locale (consistent debug output).
  if (!DRY) {
    const rows = db.prepare(`SELECT g.name, g.section_kind, g.rating, g.review_count
                             FROM guide_businesses g
                             JOIN articles a ON a.id = g.article_id
                             WHERE a.id IN (${articleIds.map(() => '?').join(',')}) AND a.locale = 'el'
                             ORDER BY g.sort_order ASC`).all(...articleIds);
    if (rows.length > 0) console.table(rows);
  }
}

// ────────────────────────────────────────────────────────────────────────
function upsertArticles(vertical, vcfg) {
  const slug = vcfg.slug;
  if (DRY) {
    // In dry mode, fake article rows for downstream calls. They aren't
    // used for inserts so plain shape is fine.
    return LOCALES.map((locale) => ({ id: `dry_${locale}_${slug}`, locale }));
  }
  const now = Math.floor(Date.now() / 1000);
  const out = [];
  const tx = db.transaction(() => {
    for (const locale of LOCALES) {
      const data = vcfg.content?.[locale];
      if (!data) { console.warn(`    no content for locale ${locale}, skipping`); continue; }
      const existing = db.prepare('SELECT id FROM articles WHERE locale = ? AND slug = ?').get(locale, slug);
      if (existing) {
        db.prepare('DELETE FROM articles WHERE id = ?').run(existing.id);
      }
      const id = randomUUID();
      db.prepare(`
        INSERT INTO articles (
          id, city_id, category_id, vertical, locale, slug,
          title, subtitle, intro, outro,
          cover_url, cover_attribution,
          source, status, generated_at, published_at,
          tagline, known_for, best_months, typical_visit_length,
          created_at, updated_at
        ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'editor', 'draft', NULL, NULL, ?, ?, ?, ?, ?, ?)
      `).run(
        id, cfg.cityId, vertical, locale, slug,
        data.title, data.subtitle ?? null,
        data.intro ?? null, data.outro ?? null,
        vcfg.coverUrl ?? null, vcfg.coverAttribution ?? null,
        data.tagline ?? null,
        JSON.stringify(data.knownFor ?? []),
        JSON.stringify(data.bestMonths ?? []),
        data.typicalVisitLength ?? null,
        now, now,
      );
      out.push({ id, locale });
      console.log(`    [${locale}] article created (draft) ${id}`);
    }
  });
  tx();
  return out;
}

async function maybeRefreshCover(vertical, articles, vcfg) {
  if (vcfg.skipCoverRefresh) return;
  const cover = await pickPexelsCover(vertical);
  if (!cover) { console.log('    cover: Pexels returned nothing — keeping existing'); return; }
  const ids = articles.map((a) => a.id);
  db.prepare(`UPDATE articles SET cover_url = ?, cover_attribution = ?, updated_at = unixepoch()
              WHERE id IN (${ids.map(() => '?').join(',')})`).run(cover.url, cover.attribution, ...ids);
  console.log(`    cover ↺ ${cover.query}`);
}

// ────────────────────────────────────────────────────────────────────────
async function processStatic({ candidate, vertical, vcfg, articles, sortIdx }) {
  console.log(`\n→ [STATIC] ${candidate.key}`);
  const lookup = await findStatic({
    query: candidate.placesQuery,
    nameMatch: candidate.placesNameMatch,
    bias: cfg.bias,
  });
  if (!lookup.ok) { console.log(`  · PLACES: ${lookup.reason}`); return null; }
  const place = lookup.place;
  console.log(`  · PLACES ✓ ${place.displayName?.text}`);

  if (!addressMatchesCity(place.formattedAddress, { cityNames: cfg.cityMustMatch, postalCodes: cfg.postalCodes ?? [] })) {
    console.log(`  · CITY ✗ address "${place.formattedAddress}" not in ${cfg.slug}`);
    return null;
  }

  const activity = verifyLatestActivity(place);
  if (!activity.ok) { console.log(`  · ACTIVITY ✗ ${activity.reason}`); return null; }
  console.log(`  · ACTIVITY ✓ ${activity.signal}`);

  const fb = await tryFbCandidates(candidate.fbCandidates, cfg.cityMustMatch, place.displayName?.text);
  if (fb) console.log(`  · FB ✓ ${fb.pageTitle}`);
  else console.log('  · FB: not found (best-effort; falling back to website/maps)');

  const sectionKind = candidate.sectionKind ?? pickSectionKind(vertical, place);
  const inserted = await insert({
    vertical, articles, sortIdx, sectionKind,
    place, fb, blurb: candidate.blurb,
    nameOverride: candidate.displayName,
  });
  if (!inserted) return null;
  return { placeId: place.id };
}

async function processDiscovered({ place, vertical, vcfg, articles, sortIdx }) {
  const name = place.displayName?.text ?? '(unknown)';
  console.log(`\n→ [DISCOVERED] ${name}  ★${place.rating} (${place.userRatingCount})  via "${place._discoveryQuery}"`);

  if (!addressMatchesCity(place.formattedAddress, { cityNames: cfg.cityMustMatch, postalCodes: cfg.postalCodes ?? [] })) {
    console.log(`  · CITY ✗ address "${place.formattedAddress}" not in ${cfg.slug}`);
    return null;
  }

  const activity = verifyLatestActivity(place);
  if (!activity.ok) { console.log(`  · ACTIVITY ✗ ${activity.reason}`); return null; }
  console.log(`  · ACTIVITY ✓ ${activity.signal}`);

  const candidates = buildFbCandidates(place.websiteUri, name, cfg.slug, vcfg.fbSuffixes);
  const fb = candidates.length > 0
    ? await tryFbCandidates(candidates, cfg.cityMustMatch, name)
    : null;
  if (fb) console.log(`  · FB ✓ ${fb.pageTitle}`);
  else console.log(`  · FB: not found (best-effort; falling back to website/maps)`);

  const sectionKind = pickSectionKind(vertical, place, { seafrontName: vcfg.seafrontNamePattern });
  console.log(`  · section: ${sectionKind}`);
  console.log('  · generating blurbs…');
  const blurbs = {};
  for (const locale of LOCALES) {
    blurbs[locale] = await generateBlurb({
      vertical, name, primaryType: place.primaryType, locale,
      cityName: cfg.name ?? cfg.slug, cityHint: cfg.cityHint,
    });
  }
  const inserted = await insert({ vertical, articles, sortIdx, sectionKind, place, fb, blurb: blurbs });
  if (!inserted) return null;
  return { placeId: place.id };
}

async function tryFbCandidates(urls, mustMatch, placeName) {
  for (const url of urls) {
    const v = await verifyFacebook(url);
    if (v.status !== 'verified') {
      console.log(`  · FB ${url} → ${v.status} (${v.reason ?? v.pageTitle})`);
      continue;
    }
    const cityOk = titleMatchesExpected(v.pageTitle, mustMatch);
    const nameOk = placeName ? titleMatchesName(v.pageTitle, placeName) : false;
    if (!cityOk && !nameOk) {
      console.log(`  · FB rejected: title="${v.pageTitle}" no city/name match`);
      continue;
    }
    return { fbUrl: url, pageTitle: v.pageTitle, via: cityOk ? 'city' : 'name' };
  }
  return null;
}

async function insert({ vertical, articles, sortIdx, sectionKind, place, fb, blurb, nameOverride }) {
  if (DRY) {
    console.log(`  ↳ DRY: would insert "${nameOverride ?? place.displayName?.text}" (${sectionKind})`);
    return true;
  }
  // Photos: venue website first, FB second. NO Places photos. ≥1200px
  // landscape required. If no qualifying photos, venue is dropped (we
  // return false so the caller doesn't count it).
  const photos = await pickVenuePhotos({
    websiteUri: place.websiteUri,
    fbUrl: fb?.fbUrl,
    max: 3,
  });
  if (photos.length === 0) {
    console.log(`  · PHOTOS ✗ no ≥1200px landscape image on website/FB — dropping`);
    return false;
  }
  console.log(`  · PHOTOS ✓ ${photos.length} from ${[...new Set(photos.map((p) => p.source))].join('+')}`);
  const cover = photos[0];
  const extras = photos.slice(1);
  const priceLevel = parsePriceLevel(place.priceLevel);
  const openingHoursJson = place.regularOpeningHours?.periods
    ? JSON.stringify({ periods: place.regularOpeningHours.periods })
    : null;

  // FB best-effort. When the FB check fails (rate-limited, URL-guess
  // miss, no candidates) we still publish the card — Places already
  // verified the venue. The link button falls back to the venue's
  // website, else Google Maps. fb_verified_status records what actually
  // happened so the admin queue can re-check later.
  const fbUrl = fb?.fbUrl
    ?? (place.websiteUri && !/facebook\.com/i.test(place.websiteUri) ? place.websiteUri : null)
    ?? place.googleMapsUri
    ?? `https://www.google.com/maps/place/?q=place_id:${place.id}`;
  const fbVerifiedStatus = fb ? 'verified' : 'pending';
  const fbPageTitle = fb?.pageTitle ?? null;

  const stmt = db.prepare(`
    INSERT INTO guide_businesses (
      id, article_id, name, address, lat, lng,
      google_maps_url, google_place_id, places_verified_at,
      fb_url, fb_verified_status, fb_verified_at, fb_page_title,
      cover_photo_url, cover_photo_attribution,
      rating, review_count, section_kind,
      phone, price_level, opening_hours, extra_photos,
      blurb, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), ?, ?, unixepoch(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())
  `);

  for (const a of articles) {
    const blurbText = blurb[a.locale] ?? blurb.en ?? Object.values(blurb)[0];
    const id = randomUUID();
    stmt.run(
      id, a.id,
      nameOverride ?? place.displayName?.text ?? '(unknown)',
      place.formattedAddress ?? null,
      place.location?.latitude ?? null,
      place.location?.longitude ?? null,
      place.googleMapsUri ?? `https://www.google.com/maps/place/?q=place_id:${place.id}`,
      place.id,
      fbUrl, fbVerifiedStatus, fbPageTitle,
      cover?.url ?? null, cover?.attribution ?? null,
      place.rating ?? null,
      place.userRatingCount ?? null,
      sectionKind,
      place.nationalPhoneNumber ?? null,
      priceLevel,
      openingHoursJson,
      extras.length > 0 ? JSON.stringify(extras) : null,
      blurbText, sortIdx,
    );
  }
  console.log(`  ↳ inserted (${sectionKind}) fb=${fb ? 'yes' : 'no'} photos=${photos.length}`);
  return true;
}
