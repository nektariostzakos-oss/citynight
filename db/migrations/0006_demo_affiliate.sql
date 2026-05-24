-- 0006: DEMO affiliate destinations so `/{locale}/go/nightlife-experiences` resolves.
-- Real partner programs slot in here later — same slug, just update the URLs.

INSERT OR IGNORE INTO affiliate_links (id, slug, label) VALUES
  ('aff_nightlife_experiences', 'nightlife-experiences', 'Tours, transfers & experiences');

-- Geo-routed destinations. `country_code='default'` is the fallback when CF-IPCountry
-- doesn't match a specific entry. We're using GetYourGuide affiliate-style URLs as
-- placeholders — replace with real partner IDs / tracking when programs are signed.

INSERT OR IGNORE INTO affiliate_destinations
  (id, affiliate_link_id, country_code, program, url, is_active)
VALUES
  ('aff_dest_gr_default', 'aff_nightlife_experiences', 'default', 'getyourguide',
   'https://www.getyourguide.com/s/?q=greece+nightlife&partner_id=demo', 1),
  ('aff_dest_gr',         'aff_nightlife_experiences', 'GR',      'getyourguide',
   'https://www.getyourguide.com/s/?q=greece+nightlife&partner_id=demo&lang=el', 1),
  ('aff_dest_de',         'aff_nightlife_experiences', 'DE',      'getyourguide',
   'https://www.getyourguide.de/s/?q=griechenland+nachtleben&partner_id=demo&lang=de', 1),
  ('aff_dest_fr',         'aff_nightlife_experiences', 'FR',      'getyourguide',
   'https://www.getyourguide.fr/s/?q=grece+vie+nocturne&partner_id=demo&lang=fr', 1),
  ('aff_dest_it',         'aff_nightlife_experiences', 'IT',      'getyourguide',
   'https://www.getyourguide.it/s/?q=grecia+vita+notturna&partner_id=demo&lang=it', 1),
  ('aff_dest_us',         'aff_nightlife_experiences', 'US',      'viator',
   'https://www.viator.com/Greece/d56?partner_id=demo', 1),
  ('aff_dest_uk',         'aff_nightlife_experiences', 'GB',      'getyourguide',
   'https://www.getyourguide.co.uk/s/?q=greece+nightlife&partner_id=demo', 1);
