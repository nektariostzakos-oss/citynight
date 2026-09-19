// Install the tracked city guides into whatever database DATABASE_PATH points
// at. Runs from scripts/hostinger-build.mjs right after the migrations, so a
// deploy carries content the same way it carries code.
//
// Why this exists: the SQLite file lives outside the deploy path on purpose,
// so it survives a redeploy. The consequence is that a push ships code and no
// content, and citynight.gr went live with 127 cities and zero guides. The
// guides are written once and verified once, so they behave like source.
// scripts/content/export-city-guides.mjs writes them out; this reads them in.
//
// The contract, borrowed from the seed runner so both behave the same:
//   - an article is matched by (locale, slug), which is already unique
//   - its businesses are replaced as a set, never merged row by row
//   - view_count, created_at and the existing row id are never touched
//   - a file whose version was already applied is skipped, so a database
//     somebody edited by hand is not overwritten on every deploy
//
// Nothing here writes a fact an AI produced: the rows carry what the seed
// pipeline verified against Google Places, with its timestamps intact.

import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

import { getRawSqlite } from './client';

type Business = Record<string, unknown> & { name: string };
type Article = Record<string, unknown> & { locale: string; slug: string; businesses: Business[] };
type CityFile = { version: string; city: { slug: string; name: string }; articles: Article[] };

const ARTICLE_FIELDS = [
  'vertical', 'locale', 'slug', 'title', 'subtitle', 'intro', 'outro',
  'cover_url', 'cover_attribution', 'source', 'status', 'generated_at',
  'published_at', 'prompt_meta', 'tagline', 'known_for', 'best_months',
  'typical_visit_length',
] as const;

const BUSINESS_FIELDS = [
  'name', 'address', 'lat', 'lng', 'google_maps_url', 'fb_url',
  'fb_verified_status', 'fb_verified_at', 'fb_page_title', 'blurb',
  'sort_order', 'google_place_id', 'places_verified_at', 'cover_photo_url',
  'cover_photo_attribution', 'rating', 'review_count', 'section_kind',
  'phone', 'price_level', 'opening_hours', 'extra_photos',
] as const;

type Db = ReturnType<typeof getRawSqlite>;

function ensureMarker(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _content_seed (
      name TEXT PRIMARY KEY,
      version TEXT NOT NULL,
      applied_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);
}

function appliedVersion(db: Db, name: string): string | null {
  const row = db.prepare('SELECT version FROM _content_seed WHERE name = ?').get(name) as
    | { version: string }
    | undefined;
  return row?.version ?? null;
}

function installCity(db: Db, file: CityFile, name: string): { articles: number; businesses: number } {
  const city = db.prepare('SELECT id FROM cities WHERE slug = ?').get(file.city.slug) as
    | { id: string }
    | undefined;
  if (!city) {
    console.warn(`[content] no city row for "${file.city.slug}", skipped`);
    return { articles: 0, businesses: 0 };
  }

  let articles = 0;
  let businesses = 0;

  // Explicit BEGIN/COMMIT rather than better-sqlite3's transaction() helper:
  // db/client.ts falls back to node:sqlite on hosts without the prebuilt
  // binary, and that driver has no such helper. Both understand plain SQL.
  const run = () => {
    for (const article of file.articles) {
      const existing = db
        .prepare('SELECT id FROM articles WHERE locale = ? AND slug = ?')
        .get(article.locale, article.slug) as { id: string } | undefined;

      const values = ARTICLE_FIELDS.map((f) => (article[f] ?? null) as unknown);
      let articleId: string;

      if (existing) {
        articleId = existing.id;
        db.prepare(
          `UPDATE articles SET city_id = ?, ${ARTICLE_FIELDS.map((f) => `${f} = ?`).join(', ')},
             updated_at = unixepoch()
           WHERE id = ?`,
        ).run(city.id, ...values, articleId);
      } else {
        articleId = crypto.randomUUID();
        db.prepare(
          `INSERT INTO articles (id, city_id, ${ARTICLE_FIELDS.join(', ')})
           VALUES (?, ?, ${ARTICLE_FIELDS.map(() => '?').join(', ')})`,
        ).run(articleId, city.id, ...values);
      }
      articles += 1;

      // Businesses are curated as a set: the file is the whole list for this
      // guide, so replace rather than merge. Same contract as the seed runner.
      db.prepare('DELETE FROM guide_businesses WHERE article_id = ?').run(articleId);
      const insert = db.prepare(
        `INSERT INTO guide_businesses (id, article_id, ${BUSINESS_FIELDS.join(', ')})
         VALUES (?, ?, ${BUSINESS_FIELDS.map(() => '?').join(', ')})`,
      );
      for (const b of article.businesses ?? []) {
        insert.run(crypto.randomUUID(), articleId, ...BUSINESS_FIELDS.map((f) => (b[f] ?? null) as unknown));
        businesses += 1;
      }
    }

    db.prepare(
      `INSERT INTO _content_seed (name, version, applied_at) VALUES (?, ?, unixepoch())
       ON CONFLICT(name) DO UPDATE SET version = excluded.version, applied_at = excluded.applied_at`,
    ).run(name, file.version);
  };

  db.exec('BEGIN');
  try {
    run();
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return { articles, businesses };
}

function main(): void {
  const dir = path.resolve(__dirname, '..', 'content', 'city-guides');
  if (!fs.existsSync(dir)) {
    console.log('[content] no content/city-guides directory, nothing to install');
    return;
  }

  const db = getRawSqlite();
  ensureMarker(db);

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  let installed = 0;

  for (const f of files) {
    const name = f.replace(/\.json$/, '');
    let file: CityFile;
    try {
      file = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')) as CityFile;
    } catch (err) {
      // A malformed content file must not stop a deploy: an empty city page is
      // recoverable, a build that will not finish is not.
      console.error(`[content] ${f} could not be read, skipped:`, err);
      continue;
    }

    if (appliedVersion(db, name) === file.version) continue;

    const { articles, businesses } = installCity(db, file, name);
    if (articles > 0) {
      console.log(`[content] ${name} ${file.version}: ${articles} article(s), ${businesses} business(es)`);
      installed += 1;
    }
  }

  console.log(installed === 0 ? '[content] already up to date' : `[content] ${installed} city file(s) installed`);
}

main();
