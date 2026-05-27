// stage: design — Anthropic Message Batches → venues.design_params.
//
// Selects published venues where design_params is NULL and design_params_locked = 0
// (owner-overridden rows are skipped). Submits one batch request per venue,
// polls until ended, validates results through parseDesignParams, persists
// via the isolated DesignWriter — which can ONLY touch venues.design_params.

import { db } from '../lib/db.js';
import { DesignWriter } from '../lib/design-writer.js';
import {
  designBatchRequestFor,
  createDesignBatch, getDesignBatch, downloadDesignBatchResults,
  extractDesignText, parseDesignText,
} from '../lib/design-prompt.js';

const POLL_MS = 30_000;
const MAX_WAIT_MIN = 60;

export async function design({ cfg, citySlug, dryRun, force }) {
  const handle = db();
  const writer = new DesignWriter(handle);

  // Default: pick venues without a design yet. --force re-picks every
  // published venue except the locked ones (owner overrides stay).
  const filter = force
    ? `v.status = 'published' AND v.design_params_locked = 0`
    : `v.status = 'published' AND v.design_params IS NULL AND v.design_params_locked = 0`;
  const cityFilter = citySlug ? `AND c.slug = '${citySlug.replace(/'/g, "''")}'` : '';

  const venues = handle.prepare(`
    SELECT v.id, v.name, v.description,
           c.name AS city_name,
           a.name AS area_name,
           cat.name AS category_name,
           cat.slug AS category_slug
      FROM venues v
      JOIN cities c ON c.id = v.city_id
      LEFT JOIN areas a ON a.id = v.area_id
      LEFT JOIN categories cat ON cat.id = v.category_id
     WHERE ${filter}
       ${cityFilter}
  `).all();

  console.log(`[design] candidates: ${venues.length}`);
  if (!venues.length) return;

  const model = cfg.designModel ?? cfg.enrichModel; // falls back to the enrichment model if unset
  const requests = venues.map((v) => designBatchRequestFor(v, { model }));

  if (dryRun) {
    console.log(`[design] dry-run: would submit batch of ${requests.length} requests, model=${model}`);
    console.log(JSON.stringify(requests[0], null, 2));
    return;
  }

  console.log(`[design] submitting batch (${requests.length} requests, model=${model})`);
  const batch = await createDesignBatch(requests, cfg.anthropicVersion);
  const batchId = batch.id;
  console.log(`[design] batch id: ${batchId}`);

  const startedAt = Date.now();
  let resultsUrl = null;
  while (true) {
    if (Date.now() - startedAt > MAX_WAIT_MIN * 60_000) {
      throw new Error(`Batch ${batchId} did not finish within ${MAX_WAIT_MIN} minutes.`);
    }
    const cur = await getDesignBatch(batchId, cfg.anthropicVersion);
    if (cur.processing_status === 'ended') { resultsUrl = cur.results_url; break; }
    console.log(`  status=${cur.processing_status} req_counts=${JSON.stringify(cur.request_counts ?? {})}`);
    await new Promise((r) => setTimeout(r, POLL_MS));
  }

  const rows = await downloadDesignBatchResults(resultsUrl, cfg.anthropicVersion);
  let written = 0, invalid = 0, locked = 0, missing = 0;
  for (const row of rows) {
    const text = extractDesignText(row);
    const parsed = parseDesignText(text);
    const result = writer.writeDesignParams(row.custom_id, parsed);
    if (result.written) { written++; continue; }
    if (result.reason === 'invalid')   invalid++;
    else if (result.reason === 'locked')   locked++;
    else if (result.reason === 'not_found') missing++;
  }
  console.log(`[design] wrote=${written} invalid=${invalid} locked=${locked} missing=${missing}`);
}
