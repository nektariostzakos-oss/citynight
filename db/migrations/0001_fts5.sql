-- FTS5 virtual table over venue name + description + area name (§14).
-- Search is biased to detected city + filtered by locale at query time.
-- Content is mirrored via triggers so we never re-index manually.

CREATE VIRTUAL TABLE IF NOT EXISTS venues_fts USING fts5(
  name,
  description,
  area_name,
  venue_id UNINDEXED,
  city_id UNINDEXED,
  status UNINDEXED,
  tokenize = 'unicode61 remove_diacritics 2'
);

-- Insert: pull area name via subquery (it may be NULL when no area is set).
CREATE TRIGGER IF NOT EXISTS venues_ai AFTER INSERT ON venues BEGIN
  INSERT INTO venues_fts (name, description, area_name, venue_id, city_id, status)
  VALUES (
    new.name,
    COALESCE(new.description, ''),
    COALESCE((SELECT name FROM areas WHERE id = new.area_id), ''),
    new.id, new.city_id, new.status
  );
END;

-- Update: rewrite the FTS row in place (delete + insert is the FTS5 idiom).
CREATE TRIGGER IF NOT EXISTS venues_au AFTER UPDATE ON venues BEGIN
  DELETE FROM venues_fts WHERE venue_id = old.id;
  INSERT INTO venues_fts (name, description, area_name, venue_id, city_id, status)
  VALUES (
    new.name,
    COALESCE(new.description, ''),
    COALESCE((SELECT name FROM areas WHERE id = new.area_id), ''),
    new.id, new.city_id, new.status
  );
END;

CREATE TRIGGER IF NOT EXISTS venues_ad AFTER DELETE ON venues BEGIN
  DELETE FROM venues_fts WHERE venue_id = old.id;
END;

-- When an area is renamed, refresh affected FTS rows.
CREATE TRIGGER IF NOT EXISTS areas_au_fts AFTER UPDATE OF name ON areas BEGIN
  DELETE FROM venues_fts WHERE venue_id IN (SELECT id FROM venues WHERE area_id = new.id);
  INSERT INTO venues_fts (name, description, area_name, venue_id, city_id, status)
  SELECT v.name, COALESCE(v.description, ''), new.name, v.id, v.city_id, v.status
  FROM venues v WHERE v.area_id = new.id;
END;
