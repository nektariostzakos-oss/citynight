// §6 RULE 1 extension (Phase C): the AI design writer may write ONLY:
//   - venues.design_params   (a JSON-encoded DesignParams blob)
//
// It CANNOT touch any fact column (name, address, phone, opening_hours,
// price_level, website, lat, lng, status, claim, owner_id, etc.), nor
// venues.description (already governed by EnrichmentWriter), nor any other
// column. It also refuses to write when design_params_locked = 1 (a Featured
// owner has overridden the design via the dashboard).
//
// This module is the ONLY code that should persist Phase C results. The
// accompanying test proves the surface stays narrow.

import { parseDesignParams } from './design-schema.js';

export class DesignWriter {
  constructor(db) {
    if (!db) throw new Error('DesignWriter requires a db handle.');
    this._db = db;
    // Locked-down statement. WHERE clause locks writes to a single venue id
    // AND refuses rows where the owner has overridden the design.
    this._writeParams = db.prepare(
      'UPDATE venues SET design_params = ? WHERE id = ? AND design_params_locked = 0'
    );
  }

  // Persist one venue's DesignParams blob. Returns:
  //   { written: true } on success
  //   { written: false, reason: 'invalid'|'locked'|'not_found' } on rejection.
  writeDesignParams(venueId, params) {
    if (typeof venueId !== 'string' || !venueId) throw new Error('venueId required');
    const canonical = parseDesignParams(params);
    if (!canonical) return { written: false, reason: 'invalid' };

    const json = JSON.stringify(canonical);
    const info = this._writeParams.run(json, venueId);
    if (info.changes === 0) {
      // Could be either a locked row or a missing id. Distinguish so callers
      // can surface owner-overridden venues separately in logs.
      const row = this._db
        .prepare('SELECT id, design_params_locked FROM venues WHERE id = ?')
        .get(venueId);
      if (!row) return { written: false, reason: 'not_found' };
      if (row.design_params_locked) return { written: false, reason: 'locked' };
      // Same value already; treat as success.
      return { written: true };
    }
    return { written: true };
  }
}

// Safety net: list the column allow-list publicly so the test can assert it.
export const ALLOWED_WRITE_COLUMNS = Object.freeze(['venues.design_params']);
