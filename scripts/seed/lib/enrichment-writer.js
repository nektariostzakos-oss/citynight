// §6 RULE 1 (LAW): the AI enrichment path may write ONLY:
//   - venues.description (the single description column)
//   - translations rows where source='ai' and field='description'
// It CANNOT touch any fact column (name, address, phone, opening_hours,
// price_level, website, lat, lng, status, claim, owner_id, etc.).
//
// This module is the ONLY code that should be called from the enrich stage to
// persist results. The accompanying test (scripts/seed/tests/enrichment-writer.test.js)
// proves the surface stays narrow.

import { uuid } from './db.js';

const DESC_LOCALE_CANONICAL = 'en';
const SOURCE = 'ai';
const FIELD = 'description';

export class EnrichmentWriter {
  constructor(db) {
    if (!db) throw new Error('EnrichmentWriter requires a db handle.');
    this._db = db;
    this._writeDesc = db.prepare(
      // The WHERE clause locks writes to a single row by id; the SET clause
      // hard-codes the only column this module can ever update.
      'UPDATE venues SET description = ? WHERE id = ?'
    );
    this._upsertTranslation = db.prepare(`
      INSERT INTO translations (id, entity_type, entity_id, field, locale, value, source)
      VALUES (?, 'venue', ?, ?, ?, ?, ?)
      ON CONFLICT(entity_type, entity_id, field, locale) DO UPDATE
        SET value = excluded.value, source = excluded.source
        WHERE source IN ('ai')  -- never overwrite owner/admin/own_media/etc.
    `);
  }

  // Persist one venue's AI-written descriptions across locales. Returns count written.
  // Input `byLocale` MUST be { locale: descriptionString }.
  writeDescriptions(venueId, byLocale) {
    if (typeof venueId !== 'string' || !venueId) throw new Error('venueId required');
    if (!byLocale || typeof byLocale !== 'object') throw new Error('byLocale required');

    let count = 0;
    const tx = this._db.transaction(() => {
      const canonical = byLocale[DESC_LOCALE_CANONICAL];
      if (typeof canonical === 'string' && canonical.length) {
        this._writeDesc.run(canonical, venueId);
      }
      for (const [locale, value] of Object.entries(byLocale)) {
        if (typeof value !== 'string' || !value.length) continue;
        this._upsertTranslation.run(uuid(), venueId, FIELD, locale, value, SOURCE);
        count++;
      }
    });
    tx();
    return count;
  }
}

// Safety net: list the column allow-list publicly so the test can assert it.
export const ALLOWED_WRITE_COLUMNS = Object.freeze(['venues.description', 'translations(field=description, source=ai)']);
