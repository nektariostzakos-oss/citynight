-- Verified business cards inside city guides.
--
-- See [[project-guide-businesses-verified]]. This is NOT the old listicle
-- pattern that was dropped in migration 0043 (article_venues). The
-- difference:
--   - article_venues was a ranked "Top 10" with per-venue blurb as the
--     article's main content. Gone for good.
--   - guide_businesses is editor-curated SUPPLEMENTARY mentions, displayed
--     as a "Pinned spots" section alongside the editorial body. Each card
--     is independently verified.
--
-- Integrity: fb_url is REQUIRED at the application layer (CHECK at write
-- time via lib/fb-verify.ts), not enforced as NOT NULL here so we can
-- store the failure reason alongside.

CREATE TABLE IF NOT EXISTS guide_businesses (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  lat REAL,
  lng REAL,
  google_maps_url TEXT NOT NULL,      -- required: visitor opens directions
  fb_url TEXT NOT NULL,                -- required: proof of operation
  fb_verified_status TEXT NOT NULL DEFAULT 'pending',  -- pending | verified | not_found | blocked | error
  fb_verified_at INTEGER,              -- unixepoch of last check
  fb_page_title TEXT,                  -- og:title scraped at verify time (display hint)
  blurb TEXT NOT NULL,                 -- short editor description (1-2 sentences)
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS guide_businesses_article
  ON guide_businesses (article_id, sort_order);
