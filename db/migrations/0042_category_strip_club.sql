-- Phase K.8 — add strip-club nightlife category.
--
-- Both INSERTs are OR IGNORE so re-running this migration on an env
-- that already has the row (e.g. local dev where it was inserted by
-- hand first) is a no-op.

INSERT OR IGNORE INTO categories (id, slug, name, parent_id)
VALUES ('cat_strip_club', 'strip-club', 'Strip club', 'parent_nightlife');

-- "Strip club" is the same in Greek (loanword); the translation row
-- exists for consistency with how every other category surfaces
-- through translations.
INSERT OR IGNORE INTO translations (id, entity_type, entity_id, field, locale, value, source)
VALUES ('tr_cat_strip_club_el', 'category', 'cat_strip_club', 'name', 'el', 'Strip club', 'admin');
