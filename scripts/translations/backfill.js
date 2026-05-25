#!/usr/bin/env node
// Translation backfill cron. Finds every (entityType, entityId, field, locale)
// tuple that's missing from the `translations` table for published content,
// and asks Claude Haiku 4.5 (via the Anthropic Batches API at 50% off) to
// fill the gap.
//
// CRITICAL: This module is part of the AI-write path. It can ONLY write
// `translations` rows; it MUST NOT touch any fact column on venues / cities
// / areas. See §6 RULE 1 + scripts/seed/lib/enrichment-writer.js for the
// canonical pattern.
//
// Required env:
//   DATABASE_PATH         path to the SQLite file
//   ANTHROPIC_API_KEY     Anthropic key (Messages Batches API access)
//   ANTHROPIC_MODEL       defaults to 'claude-haiku-4-5'
//
// Suggested cron line (weekly Wed 02:00, after the Mon Places sync settles):
//   0 2 * * 3  cd ~/domains/citynight.gr/public_html && node scripts/translations/backfill.js >> ~/logs/translation-backfill.log 2>&1
//
// Behaviour:
//   1. Walk published cities + venues, find missing (entity, field, locale).
//   2. Cap one run at MAX_PER_RUN tuples (budget control).
//   3. Submit a Messages Batch with one request per tuple, custom_id keyed
//      by `${entityType}|${entityId}|${field}|${locale}`.
//   4. Poll until ended; parse JSONL results; write `translations` rows
//      via a narrow prepared statement (only entity_type, entity_id,
//      field, locale, value, source='ai'; nothing else).
//
// This run is INTENTIONALLY a skeleton — the live API call is gated on
// ANTHROPIC_API_KEY. Without the key, the script reports what it WOULD
// translate and exits 0 — safe to wire into cron immediately.

import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const MAX_PER_RUN = parseInt(process.env.TRANSLATION_BACKFILL_MAX ?? '200', 10);
const LOCALES = ['en', 'el', 'de', 'fr', 'it'];

const TARGETS = [
  { entity: 'city',  field: 'name',        table: 'cities',  base: 'name' },
  { entity: 'city',  field: 'intro',       table: 'cities',  base: null /* MDX, no base column */ },
  { entity: 'venue', field: 'description', table: 'venues',  base: 'description' },
  { entity: 'area',  field: 'name',        table: 'areas',   base: 'name' },
];

function dbHandle(readonly = false) {
  const p = process.env.DATABASE_PATH;
  if (!p) throw new Error('DATABASE_PATH required');
  const dir = path.dirname(path.resolve(p));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return new Database(p, { readonly });
}

function loadGaps(db) {
  const covered = new Set();
  for (const r of db.prepare(`SELECT entity_type, entity_id, field, locale FROM translations`).all()) {
    covered.add(`${r.entity_type}|${r.entity_id}|${r.field}|${r.locale}`);
  }

  const entities = {
    city:  db.prepare(`SELECT id, name FROM cities WHERE is_published = 1`).all(),
    venue: db.prepare(`SELECT id, name, description FROM venues WHERE status = 'published' AND slug IS NOT NULL`).all(),
    area:  db.prepare(`SELECT id, name FROM areas`).all(),
  };

  const gaps = [];
  for (const t of TARGETS) {
    const rows = entities[t.entity] ?? [];
    for (const e of rows) {
      const enValue = t.base ? e[t.base] : null;
      if (!enValue && t.field !== 'name') continue; // city intros: no base = no source to translate
      for (const locale of LOCALES) {
        if (locale === 'en') continue; // base column IS the EN copy
        const key = `${t.entity}|${e.id}|${t.field}|${locale}`;
        if (covered.has(key)) continue;
        gaps.push({ entity: t.entity, entityId: e.id, field: t.field, locale, sourceEn: enValue });
      }
    }
  }
  return gaps;
}

// Narrow writer — mirrors lib/enrichment-writer.js. Only writes translations
// rows; cannot touch fact columns.
class TranslationsWriter {
  constructor(db) {
    this._upsert = db.prepare(`
      INSERT INTO translations (id, entity_type, entity_id, field, locale, value, source)
      VALUES (?, ?, ?, ?, ?, ?, 'ai')
      ON CONFLICT(entity_type, entity_id, field, locale) DO UPDATE
        SET value = excluded.value, source = excluded.source
        WHERE source IN ('ai')
    `);
  }
  write({ entity, entityId, field, locale, value }) {
    if (typeof value !== 'string' || !value.length) return;
    this._upsert.run(crypto.randomUUID(), entity, entityId, field, locale, value);
  }
}

async function main() {
  const db = dbHandle();
  const gaps = loadGaps(db);
  console.log(`[backfill] found ${gaps.length} missing tuple(s)`);
  if (gaps.length === 0) { console.log('[backfill] nothing to do.'); return; }

  const batch = gaps.slice(0, MAX_PER_RUN);
  console.log(`[backfill] this run will translate ${batch.length} (cap MAX_PER_RUN=${MAX_PER_RUN})`);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('[backfill] ANTHROPIC_API_KEY not set — dry-run mode, no API call made.');
    console.log('[backfill] First 10 gaps:');
    for (const g of batch.slice(0, 10)) {
      console.log(`  ${g.entity.padEnd(7)} ${g.entityId.slice(0, 8)} ${g.field.padEnd(12)} → ${g.locale}  «${(g.sourceEn ?? '').slice(0, 60)}»`);
    }
    return;
  }

  // Live path — submit a Messages Batch + poll. Keeping this isolated so
  // the dry-run path above stays cron-safe.
  await runLiveBatch(db, batch);
}

async function runLiveBatch(db, gaps) {
  const model = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5';
  const writer = new TranslationsWriter(db);

  const requests = gaps.map((g) => ({
    custom_id: `${g.entity}|${g.entityId}|${g.field}|${g.locale}`,
    params: {
      model,
      max_tokens: g.field === 'intro' ? 800 : 200,
      system:
        `You translate Greek-nightlife guide content from English to ${g.locale}. ` +
        `Output ONLY the translated text — no quotes, no commentary, no metadata. ` +
        `Never invent facts, hours, prices, phone numbers, or dates not present in the source. ` +
        `Preserve city / venue names in their natural localized form (e.g. "Athens" → "Αθήνα" in el, ` +
        `"Mykonos" → "Mykonos" in de). Keep the same tone + length as the source.`,
      messages: [
        { role: 'user', content: `Translate this ${g.entity} ${g.field} to ${g.locale}:\n\n${g.sourceEn}` },
      ],
    },
  }));

  console.log(`[backfill] submitting batch of ${requests.length} requests`);
  const submitRes = await fetch('https://api.anthropic.com/v1/messages/batches', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });
  if (!submitRes.ok) throw new Error(`batch submit failed: ${submitRes.status} ${await submitRes.text()}`);
  const submitJson = await submitRes.json();
  const batchId = submitJson.id;
  console.log(`[backfill] batch ${batchId} submitted, polling…`);

  // Poll every 60s, give up after 30 minutes.
  const start = Date.now();
  while (Date.now() - start < 30 * 60_000) {
    await new Promise((r) => setTimeout(r, 60_000));
    const status = await fetch(`https://api.anthropic.com/v1/messages/batches/${batchId}`, {
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    }).then((r) => r.json());
    console.log(`[backfill] batch state=${status.processing_status}`);
    if (status.processing_status === 'ended') {
      // Stream results.
      const resultsRes = await fetch(status.results_url, {
        headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      });
      const text = await resultsRes.text();
      let written = 0;
      for (const line of text.split('\n').filter(Boolean)) {
        const r = JSON.parse(line);
        if (r.result?.type !== 'succeeded') continue;
        const [entity, entityId, field, locale] = r.custom_id.split('|');
        const value = r.result.message?.content?.[0]?.text?.trim();
        if (!value) continue;
        writer.write({ entity, entityId, field, locale, value });
        written++;
      }
      console.log(`[backfill] wrote ${written} translation rows.`);
      return;
    }
  }
  throw new Error('batch did not finish within 30 minutes — leaving for next run');
}

main().catch((err) => { console.error(err); process.exit(1); });
