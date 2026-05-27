-- Phase J.1 — editorial articles.
--
-- citynight pivots from a venue-listing directory to an article-led
-- city guide. Each article is a "Top N {category} in {city}" listicle,
-- AI-generated and grounded in real seeded venue facts (the venue rows
-- live as data only; their own public pages are removed in Phase J.4).
--
-- §6 integrity rule still applies at the data layer: AI writes ranking
-- justifications, blurbs, intros, outros. Venue facts (name, area, city,
-- category) are pulled from `venues` and never written by AI.

CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  city_id TEXT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  -- Categories table holds the nightlife sub-types; for food / stay we
  -- keep the column nullable so cross-category articles ("Best places
  -- to drink in Athens") and food/stay articles (which don't all match
  -- a categories row in the directory schema) still fit.
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,

  vertical TEXT NOT NULL CHECK (vertical IN ('nightlife', 'food', 'stay')),
  locale TEXT NOT NULL DEFAULT 'el',           -- one row per locale; cross-locale via translations later
  slug TEXT NOT NULL,                          -- "top-10-rooftop-bars-athens"

  title TEXT NOT NULL,
  subtitle TEXT,
  intro TEXT,                                  -- 2–3 paragraph opening (AI)
  outro TEXT,                                  -- closing paragraph (AI)

  -- Cover photo. Pexels for city-level / category-level imagery; never
  -- Google Places (Places is reserved for actual venues per memory).
  cover_url TEXT,
  cover_attribution TEXT,                      -- "Photo: photographer / Pexels"

  source TEXT NOT NULL DEFAULT 'ai' CHECK (source IN ('ai', 'editor')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),

  -- Lifecycle / observability
  generated_at INTEGER,                        -- unix-seconds — when AI produced this draft
  published_at INTEGER,
  view_count INTEGER NOT NULL DEFAULT 0,

  -- Provenance — the prompt + model that produced this article, so we
  -- can re-run with a tuned prompt later. JSON.
  prompt_meta TEXT,

  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS articles_locale_slug
  ON articles (locale, slug);

CREATE INDEX IF NOT EXISTS articles_city_published
  ON articles (city_id, status, published_at DESC);

CREATE INDEX IF NOT EXISTS articles_vertical_status
  ON articles (vertical, status);

-- Each article picks N venues from the seeded directory and ranks them.
-- The blurb is AI-written; the underlying venue facts (name, address,
-- category, rating) come from `venues`. A JOIN at render time gives the
-- card its facts.
CREATE TABLE IF NOT EXISTS article_venues (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,

  rank INTEGER NOT NULL,                       -- 1..N order in the listicle
  headline TEXT,                               -- "Rooftop with the cleanest Acropolis view"
  blurb TEXT NOT NULL,                         -- 2–3 sentences (AI, grounded)

  -- Cached photo at the time the article was generated. The venue's
  -- own primary photo can change later; the article keeps the one it
  -- shipped with for editorial consistency.
  photo_url TEXT,
  photo_attribution TEXT,

  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS article_venues_rank
  ON article_venues (article_id, rank);

CREATE INDEX IF NOT EXISTS article_venues_venue
  ON article_venues (venue_id);
