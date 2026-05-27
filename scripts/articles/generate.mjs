#!/usr/bin/env node
// Phase J.1 — generate one or many articles from the CLI.
//
//   node scripts/articles/generate.mjs --city=athens --vertical=nightlife --category=rooftop_bar --locale=el
//   node scripts/articles/generate.mjs --city=mykonos --vertical=nightlife            (auto-pick category)
//   node scripts/articles/generate.mjs --all                                          (every published city × top categories)
//
// Reads ANTHROPIC_API_KEY from env. Outputs the new article slug or a
// structured failure code. Idempotent on (locale, slug) — re-running for
// the same args replaces the existing article.
//
// This is a pure-Node ESM script — no TS compile step. It imports the
// lib via dynamic import + tsx fallback for dev convenience.

import 'dotenv/config';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

function parseArgs(argv) {
  const out = {};
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (!m) continue;
    out[m[1]] = m[2] ?? true;
  }
  return out;
}

const args = parseArgs(process.argv);

// We need access to lib/articles/generator which is TS. Easiest path:
// spawn tsx with a tiny inline runner so we don't reimplement the lib
// in plain Node.
const runnerSrc = `
import 'dotenv/config';
import { generateArticle } from '${path.resolve(repoRoot, 'lib/articles').replace(/\\\\/g, '/')}';
import Database from 'better-sqlite3';

const db = new Database(process.env.DATABASE_PATH);
db.pragma('journal_mode = WAL');

const opts = ${JSON.stringify(args)};

function findCity(slugOrId) {
  const row = db.prepare(\`SELECT id, slug, name FROM cities WHERE slug = ? OR id = ?\`).get(slugOrId, slugOrId);
  if (!row) throw new Error('city_not_found: ' + slugOrId);
  return row;
}
function findCategory(slugOrId) {
  if (!slugOrId) return null;
  const row = db.prepare(\`SELECT id, slug, name FROM categories WHERE slug = ? OR id = ?\`).get(slugOrId, slugOrId);
  if (!row) throw new Error('category_not_found: ' + slugOrId);
  return row;
}

const tasks = [];
if (opts.all) {
  // Every published city × top nightlife categories by default.
  const cities = db.prepare(\`SELECT id, slug FROM cities WHERE is_published = 1\`).all();
  const cats = ['night_club','rooftop_bar','bar','live_music','beach_club','bouzoukia'];
  for (const c of cities) {
    for (const catSlug of cats) {
      const cat = db.prepare(\`SELECT id FROM categories WHERE slug = ?\`).get(catSlug);
      if (cat) tasks.push({ cityId: c.id, categoryId: cat.id, vertical: 'nightlife', locale: opts.locale ?? 'el' });
    }
  }
} else {
  const city = findCity(opts.city);
  const category = findCategory(opts.category);
  const vertical = opts.vertical ?? 'nightlife';
  tasks.push({
    cityId: city.id,
    categoryId: category?.id ?? null,
    vertical,
    locale: opts.locale ?? 'el',
  });
}

const publish = opts.publish === true || opts.publish === 'true';
const count = opts.count ? parseInt(opts.count, 10) : 10;

let ok = 0, fail = 0;
for (const t of tasks) {
  process.stdout.write(\`Generating: city=\${t.cityId} cat=\${t.categoryId ?? '(none)'} locale=\${t.locale} ...\`);
  try {
    const result = await generateArticle({ ...t, count, publish });
    if (result.ok) {
      console.log(\` ok slug=\${result.slug}\`);
      ok++;
    } else {
      console.log(\` skip \${result.reason}\${result.detail ? ' (' + result.detail + ')' : ''}\`);
      fail++;
    }
  } catch (err) {
    console.log(\` ERROR \${err instanceof Error ? err.message : err}\`);
    fail++;
  }
}

console.log(\`\\nGenerated \${ok} / \${tasks.length} articles (\${fail} skipped/failed)\`);
process.exit(fail > 0 && ok === 0 ? 1 : 0);
`;

const tsxPath = path.resolve(repoRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');
const child = spawn(tsxPath, ['--eval', runnerSrc], {
  stdio: 'inherit',
  cwd: repoRoot,
  env: process.env,
  shell: false,
});
child.on('exit', (code) => process.exit(code ?? 0));
