-- 0007: Scope expansion — three verticals (Nightlife + Food + Stay).
--
-- Introduces three parent "kind" categories, re-parents the existing nightlife
-- categories under one of them, and adds new categories for food + stay.
-- Existing URLs are unchanged: /{locale}/greece/{city}/{category} works the
-- same — restaurants and hotels just become more category slugs in that slot.

-- 1) Parent "kind" categories. Slug doubles as the human-readable URL chunk
-- for the future /{city}/nightlife|food|stay landing pages (Phase 3 follow-up).
INSERT OR IGNORE INTO categories (id, slug, name, parent_id) VALUES
  ('parent_nightlife', 'nightlife', 'Nightlife',  NULL),
  ('parent_food',      'food',      'Food',       NULL),
  ('parent_stay',      'stay',      'Stay',       NULL);

-- 2) Re-parent the original 6 categories under Nightlife.
UPDATE categories SET parent_id = 'parent_nightlife'
 WHERE id IN ('cat_night_club','cat_bar','cat_rooftop_bar','cat_live_music','cat_bouzoukia','cat_beach_club')
   AND parent_id IS NULL;

-- 3) Food + Stay leaf categories.
INSERT OR IGNORE INTO categories (id, slug, name, parent_id) VALUES
  -- Food
  ('cat_restaurant',    'restaurant',    'Restaurant',   'parent_food'),
  ('cat_taverna',       'taverna',       'Taverna',      'parent_food'),
  ('cat_fine_dining',   'fine-dining',   'Fine dining',  'parent_food'),
  -- Stay
  ('cat_hotel',         'hotel',         'Hotel',          'parent_stay'),
  ('cat_boutique_hotel','boutique-hotel','Boutique hotel', 'parent_stay'),
  ('cat_resort',        'resort',        'Resort',         'parent_stay');
