# scripts/seed — citynight.gr seed pipeline

Isolated ESM project. Runs the one-time data fill + the weekly refresh.

## Usage

```sh
cd scripts/seed
pnpm install
# .env or the parent .env must export DATABASE_PATH, GOOGLE_PLACES_API_KEY,
# ANTHROPIC_API_KEY before any stage runs.

# Dry-run for one city — no DB writes, no API spend on enrich.
node run.js all --city=mykonos --dry-run

# Full first-fill run, one city at a time (recommended for cost control, §17).
node run.js ingest --city=mykonos
node run.js enrich --city=mykonos
node run.js photos --city=mykonos
node run.js gate

# Each stage standalone:
node run.js setup            # verifies schema is migrated
node run.js ingest [--city=]
node run.js enrich [--city=]
node run.js photos [--city=]
node run.js gate
```

## Run the integrity test (§6 rule 1)

```sh
node tests/enrichment-writer.test.js
```

The test must pass before you ever run `enrich` against the real DB.

## What writes what

| Stage   | Writes                                                  | Never touches                |
| ------- | ------------------------------------------------------- | ---------------------------- |
| ingest  | fact columns + `seed_photo_refs`                        | `description`, `translations` |
| enrich  | `venues.description` + `translations(field=description, source=ai)` only | every fact column            |
| photos  | `photos` rows (`subject_type='venue'`, `source='google_places'`) | venues row                   |
| gate    | `venues.status`, `venues.slug`, `venues.published_at`   | facts, photos, descriptions  |
