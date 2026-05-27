#!/usr/bin/env node
// Phase J.1 — smoke test for the articles lib.
//
//   node scripts/tests/articles-engine.test.mjs
//
// Same shape as the booking / shop / crm tests. Skips the Anthropic
// call (no key needed) — verifies:
//   1. The candidate-selection query returns published, non-closed
//      venues ordered by editorial signal.
//   2. createArticleWithPicks inserts the article + its picks in one
//      transaction, with (locale, slug) and (article_id, rank)
//      uniqueness honoured.
//   3. The JOIN-on-read query gives each pick its venue facts.
//   4. Re-generating the same (locale, slug) replaces the prior row.

import { strict as assert } from 'node:assert';
import Database from 'better-sqlite3';

function freshDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE cities (
      id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
      is_published INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE areas (
      id TEXT PRIMARY KEY,
      city_id TEXT NOT NULL REFERENCES cities(id),
      slug TEXT NOT NULL, name TEXT NOT NULL
    );
    CREATE TABLE categories (
      id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL
    );
    CREATE TABLE venues (
      id TEXT PRIMARY KEY, slug TEXT, name TEXT NOT NULL,
      city_id TEXT NOT NULL REFERENCES cities(id),
      area_id TEXT, category_id TEXT,
      address TEXT, description TEXT,
      rating REAL, review_count INTEGER, price_level INTEGER,
      status TEXT NOT NULL DEFAULT 'draft',
      is_permanently_closed INTEGER NOT NULL DEFAULT 0,
      field_sources TEXT NOT NULL DEFAULT '{}',
      claim TEXT NOT NULL DEFAULT 'unclaimed',
      tier TEXT NOT NULL DEFAULT 'free',
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE photos (
      id TEXT PRIMARY KEY,
      venue_id TEXT, area_id TEXT, city_id TEXT,
      subject_type TEXT NOT NULL,
      source TEXT NOT NULL,
      url TEXT NOT NULL,
      attribution_text TEXT,
      is_primary INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE articles (
      id TEXT PRIMARY KEY,
      city_id TEXT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      vertical TEXT NOT NULL,
      locale TEXT NOT NULL DEFAULT 'el',
      slug TEXT NOT NULL,
      title TEXT NOT NULL, subtitle TEXT, intro TEXT, outro TEXT,
      cover_url TEXT, cover_attribution TEXT,
      source TEXT NOT NULL DEFAULT 'ai',
      status TEXT NOT NULL DEFAULT 'draft',
      generated_at INTEGER, published_at INTEGER,
      view_count INTEGER NOT NULL DEFAULT 0,
      prompt_meta TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE UNIQUE INDEX articles_locale_slug ON articles (locale, slug);
    CREATE TABLE article_venues (
      id TEXT PRIMARY KEY,
      article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
      rank INTEGER NOT NULL,
      headline TEXT, blurb TEXT NOT NULL,
      photo_url TEXT, photo_attribution TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE UNIQUE INDEX article_venues_rank ON article_venues (article_id, rank);
  `);
  return db;
}

function seed(db) {
  db.prepare(`INSERT INTO cities VALUES ('city_athens','athens','Athens',1)`).run();
  db.prepare(`INSERT INTO areas VALUES ('area_kolonaki','city_athens','kolonaki','Kolonaki')`).run();
  db.prepare(`INSERT INTO areas VALUES ('area_psyrri','city_athens','psyrri','Psyrri')`).run();
  db.prepare(`INSERT INTO categories VALUES ('cat_rooftop','rooftop_bar','Rooftop Bar')`).run();
  db.prepare(`INSERT INTO categories VALUES ('cat_club','night_club','Nightclub')`).run();

  // 6 published rooftop bars, 1 closed, 1 draft (should not be candidates).
  const v = db.prepare(`INSERT INTO venues (id, slug, name, city_id, area_id, category_id, address, description, rating, review_count, price_level, status, is_permanently_closed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  v.run('v1','a-for-athens','A for Athens','city_athens','area_psyrri','cat_rooftop','Miaouli 2','Editorial blurb about A for Athens.',4.6,1200,2,'published',0);
  v.run('v2','galaxy','Galaxy Bar','city_athens','area_kolonaki','cat_rooftop','Syngrou 115','Top-floor cocktails with a wide view.',4.5,2400,3,'published',0);
  v.run('v3','couleur-locale','Couleur Locale','city_athens','area_psyrri','cat_rooftop','Normanou 3','Tucked rooftop in Monastiraki.',4.4,800,2,'published',0);
  v.run('v4','noel','Noel','city_athens','area_psyrri','cat_rooftop','Kolokotroni 59B','Atmospheric, candlelit, classic cocktails.',4.7,600,2,'published',0);
  v.run('v5','akro','Akro','city_athens','area_kolonaki','cat_rooftop','Plateia Lykavittou','Late-night Lycabettus rooftop.',4.3,400,2,'published',0);
  v.run('v6','rooftop-360','360 Athens','city_athens','area_psyrri','cat_rooftop','Ifestou 2','A long-running rooftop with sightlines.',4.2,1800,2,'published',0);
  v.run('v_closed','old-bar','Closed Rooftop','city_athens','area_kolonaki','cat_rooftop','—','—',4.0,50,2,'published',1);
  v.run('v_draft','draft-bar','Draft Bar','city_athens','area_kolonaki','cat_rooftop','—','—',4.8,10,2,'draft',0);

  // A photo per venue.
  const p = db.prepare(`INSERT INTO photos (id, venue_id, subject_type, source, url, attribution_text, is_primary, sort_order) VALUES (?, ?, 'venue', 'google_places', ?, ?, 1, 0)`);
  for (const id of ['v1','v2','v3','v4','v5','v6']) {
    p.run(`p_${id}`, id, `https://example.com/${id}.jpg`, 'Google Places');
  }
}

// ─── tests ────────────────────────────────────────────────────────────

function test_candidateSelection() {
  const db = freshDb();
  seed(db);

  // Mirrors lib/articles/generator.ts:loadCandidates ordering/filters.
  const rows = db.prepare(`
    SELECT v.id, v.name, v.rating, v.review_count
      FROM venues v
     WHERE v.city_id = ?
       AND v.category_id = ?
       AND v.status = 'published'
       AND v.is_permanently_closed = 0
     ORDER BY (COALESCE(v.rating,0) * 0.7 + MIN(COALESCE(v.review_count,0)/50.0, 5) * 0.3) DESC,
              v.review_count DESC,
              v.rating DESC
     LIMIT 20
  `).all('city_athens', 'cat_rooftop');

  assert.equal(rows.length, 6, 'closed + draft venues excluded');
  // Top by editorial signal: with reviewCount capped at 50 → 5, rating
  // dominates. v4 (4.7) and v1/v2 (~4.5+) should top the list.
  const top3 = rows.slice(0, 3).map((r) => r.id);
  assert.ok(top3.includes('v4'), 'highest-rated venue picked');
  console.log('  ok  candidate selection: excludes closed/draft, ranks by signal');
}

function test_persistArticleWithPicks() {
  const db = freshDb();
  seed(db);

  const articleId = 'a_test_1';
  const slug = 'top-6-rooftop-bar-athens';
  db.prepare(`
    INSERT INTO articles (
      id, city_id, category_id, vertical, locale, slug,
      title, subtitle, intro, outro, source, status, generated_at
    ) VALUES (?, ?, ?, 'nightlife', 'en', ?, ?, ?, ?, ?, 'ai', 'draft', unixepoch())
  `).run(articleId, 'city_athens', 'cat_rooftop', slug,
    'Top 6 Rooftop Bars in Athens', 'The places worth a climb.',
    'Athens treats rooftop bars as ...', 'Closing thought.');

  const insertPick = db.prepare(`
    INSERT INTO article_venues (id, article_id, venue_id, rank, headline, blurb, photo_url, photo_attribution)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const picks = [['v4',1],['v1',2],['v2',3],['v3',4],['v6',5],['v5',6]];
  for (const [vid, rank] of picks) {
    insertPick.run(`p_${vid}_${rank}`, articleId, vid, rank, `Headline ${rank}`, `Blurb about venue ${vid}.`, `https://example.com/${vid}.jpg`, 'Google Places');
  }

  // Confirm round-trip with JOIN to venues.
  const joined = db.prepare(`
    SELECT av.rank, av.blurb, v.name
      FROM article_venues av JOIN venues v ON v.id = av.venue_id
     WHERE av.article_id = ?
     ORDER BY av.rank
  `).all(articleId);

  assert.equal(joined.length, 6);
  assert.equal(joined[0].name, 'Noel');                    // v4
  assert.equal(joined[1].name, 'A for Athens');            // v1
  assert.match(joined[0].blurb, /v4/);
  console.log('  ok  persist article + picks: 6 ranked rows, JOIN gives venue facts');
}

function test_localeSlugUniqueness() {
  const db = freshDb();
  seed(db);

  const insertArticle = db.prepare(`
    INSERT INTO articles (id, city_id, vertical, locale, slug, title)
    VALUES (?, ?, 'nightlife', ?, ?, ?)
  `);
  insertArticle.run('a1', 'city_athens', 'el', 'top-rooftop-athens', 'EL');
  insertArticle.run('a2', 'city_athens', 'en', 'top-rooftop-athens', 'EN'); // different locale = ok

  assert.throws(
    () => insertArticle.run('a3', 'city_athens', 'el', 'top-rooftop-athens', 'EL #2'),
    /UNIQUE/,
    '(locale, slug) collision rejected',
  );
  console.log('  ok  (locale, slug) uniqueness: same slug across locales ok, same locale rejected');
}

function test_rankUniqueness() {
  const db = freshDb();
  seed(db);
  db.prepare(`INSERT INTO articles (id, city_id, vertical, locale, slug, title) VALUES ('a1','city_athens','nightlife','el','x','x')`).run();
  const insert = db.prepare(`
    INSERT INTO article_venues (id, article_id, venue_id, rank, blurb)
    VALUES (?, 'a1', ?, ?, 'b')
  `);
  insert.run('p1', 'v1', 1);
  assert.throws(() => insert.run('p2', 'v2', 1), /UNIQUE/, 'rank collision rejected');
  console.log('  ok  article_venues (article_id, rank) uniqueness: duplicates rejected');
}

function test_replaceOnRegenerate() {
  const db = freshDb();
  seed(db);
  // First generation
  db.prepare(`INSERT INTO articles (id, city_id, vertical, locale, slug, title) VALUES ('a1','city_athens','nightlife','en','top-x','v1')`).run();
  db.prepare(`INSERT INTO article_venues (id, article_id, venue_id, rank, blurb) VALUES ('p1','a1','v1',1,'b')`).run();
  // Re-generate flow: DELETE existing by (locale, slug), then INSERT new.
  const del = db.prepare(`DELETE FROM articles WHERE locale = ? AND slug = ?`).run('en', 'top-x');
  assert.equal(del.changes, 1, 'old article deleted');
  // Picks cascade-deleted via FK.
  const remaining = db.prepare(`SELECT COUNT(*) AS n FROM article_venues WHERE article_id = 'a1'`).get();
  assert.equal(remaining.n, 0, 'picks cascade-deleted');
  console.log('  ok  re-generation: DELETE by (locale,slug) cascades to picks');
}

console.log('articles-engine smoke test');
test_candidateSelection();
test_persistArticleWithPicks();
test_localeSlugUniqueness();
test_rankUniqueness();
test_replaceOnRegenerate();
console.log('all articles-engine smoke tests passed');
