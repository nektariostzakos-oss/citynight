// stage: enrich — Anthropic Message Batches → venues.description + translations.
// Only the EnrichmentWriter writes; this stage never updates fact columns.

import { db } from '../lib/db.js';
import { EnrichmentWriter } from '../lib/enrichment-writer.js';
import {
  batchRequestFor, createBatch, getBatch, downloadBatchResults, extractText, parseDescriptionJson,
} from '../lib/anthropic.js';

const POLL_MS = 30_000;
const MAX_WAIT_MIN = 60;

export async function enrich({ cfg, citySlug, dryRun }) {
  const handle = db();
  const writer = new EnrichmentWriter(handle);

  const where = citySlug ? `AND c.slug = '${citySlug.replace(/'/g, "''")}'` : '';
  const venues = handle.prepare(`
    SELECT v.id, v.name, v.description,
           c.name AS city_name,
           a.name AS area_name,
           cat.name AS category_name,
           v.business_status,
           v.is_permanently_closed
      FROM venues v
      JOIN cities c ON c.id = v.city_id
      LEFT JOIN areas a ON a.id = v.area_id
      LEFT JOIN categories cat ON cat.id = v.category_id
     WHERE v.status = 'draft'
       AND v.is_permanently_closed = 0
       AND (v.description IS NULL OR v.description = '')
       ${where}
  `).all();

  console.log(`[enrich] candidates: ${venues.length}`);
  if (!venues.length) return;

  const requests = venues.map((v) => batchRequestFor(v, { model: cfg.enrichModel, locales: cfg.locales }));

  if (dryRun) {
    console.log(`[enrich] dry-run: would submit batch of ${requests.length} requests, model=${cfg.enrichModel}`);
    console.log(JSON.stringify(requests[0], null, 2));
    return;
  }

  console.log(`[enrich] submitting batch (${requests.length} requests, model=${cfg.enrichModel})`);
  const batch = await createBatch(requests, cfg.anthropicVersion);
  const batchId = batch.id;
  console.log(`[enrich] batch id: ${batchId}`);

  const startedAt = Date.now();
  let resultsUrl = null;
  while (true) {
    if (Date.now() - startedAt > MAX_WAIT_MIN * 60_000) {
      throw new Error(`Batch ${batchId} did not finish within ${MAX_WAIT_MIN} minutes.`);
    }
    const cur = await getBatch(batchId, cfg.anthropicVersion);
    if (cur.processing_status === 'ended') { resultsUrl = cur.results_url; break; }
    console.log(`  status=${cur.processing_status} req_counts=${JSON.stringify(cur.request_counts ?? {})}`);
    await new Promise((r) => setTimeout(r, POLL_MS));
  }

  const rows = await downloadBatchResults(resultsUrl, cfg.anthropicVersion);
  let written = 0, skipped = 0;
  for (const row of rows) {
    const text = extractText(row);
    const parsed = parseDescriptionJson(text, cfg.locales);
    if (!parsed) { skipped++; continue; }
    writer.writeDescriptions(row.custom_id, parsed.description);
    written++;
  }
  console.log(`[enrich] wrote=${written} skipped=${skipped}`);
}
