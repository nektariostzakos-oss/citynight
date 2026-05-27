-- Per-venue design parameters. Stores the AI-picked (or fallback-picked)
-- DesignParams JSON blob — palette / typePair / heroLayout / density /
-- motion / sectionOrder. Renderer reads this and emits scoped CSS vars.
--
-- Stored as JSON text rather than separate columns because the schema lives
-- in lib/design-system.ts (versioned via DesignParams.v) and is enum-validated
-- by parseDesignParams() at read time. Renderer falls back to
-- defaultDesignParams() when this column is NULL or invalid, so we can
-- backfill in batches without breaking the site.
--
-- AI integrity: the Phase C writer is the only producer of this column
-- besides admin overrides. It is intentionally isolated from venues.description
-- and the fact columns — see scripts/seed/tests/design-writer.test.js
-- (Phase C will land that test alongside the writer).

ALTER TABLE venues ADD COLUMN design_params TEXT; -- JSON, nullable
ALTER TABLE venues ADD COLUMN design_params_locked INTEGER NOT NULL DEFAULT 0; -- 0/1: owner override flag
