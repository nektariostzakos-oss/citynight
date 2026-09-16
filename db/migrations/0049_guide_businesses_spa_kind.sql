-- Add 'spa' to the section_kind taxonomy so stay-vertical guides can
-- pin spa/wellness hotels to a dedicated body section. SQLite has no
-- ALTER for CHECK constraints, but our existing section_kind column is
-- a plain TEXT — the enum lived in app code (Drizzle + the TS type),
-- not in a DB constraint. So this migration is documentary: it records
-- the taxonomy expansion in the migration log, no schema change needed.
--
-- App-layer enums to update alongside:
--   - db/schema.ts (guideBusinesses.sectionKind enum)
--   - lib/articles/articles.ts (GuideBusiness.sectionKind type)
--   - lib/article-md.ts (sectionKindMatchesHeading)
--   - scripts/seed/loutraki-guide-businesses.mjs (pickSectionKind)

SELECT 1;
