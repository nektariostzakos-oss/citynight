#!/usr/bin/env node
// SEO smoke test — runs against a locally-started Next server on $BASE_URL
// (defaults to http://localhost:3100). Boots the server itself if needed
// when invoked through pnpm test:seo so CI can use one command.
//
// Asserts per route:
//   1. HTTP 200.
//   2. At least one <script type="application/ld+json"> block that parses
//      to valid JSON. Validates the @type for routes with known expectations.
//   3. <link rel="alternate" hreflang="..."> covers en/el/de/fr/it + x-default.

import { strict as assert } from 'node:assert';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';

// Each entry: path → expected JSON-LD @types (any must appear) + whether hreflang is required.
const ROUTES = [
  { path: '/',               needTypes: ['Organization', 'WebSite'],          hreflang: true },
  { path: '/el',             needTypes: ['Organization', 'WebSite'],          hreflang: true },
  { path: '/el/greece',      needTypes: ['BreadcrumbList', 'ItemList'],       hreflang: true },
  { path: '/el/greece/athens', needTypes: ['BreadcrumbList', 'ItemList'],      hreflang: true, allow404: true },
  { path: '/el/guides',      needTypes: [],                                    hreflang: true },
];

const REQUIRED_HREFLANG = ['en', 'el', 'de', 'fr', 'it', 'x-default'];

async function fetchText(path) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, { redirect: 'follow' });
  return { res, html: await res.text(), url };
}

// Pull every <script type="application/ld+json">...</script> block. Multiline / non-greedy.
function extractJsonLdBlocks(html) {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const out = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    const body = m[1].trim();
    if (body) out.push(body);
  }
  return out;
}

function collectTypes(parsed) {
  const out = new Set();
  const walk = (node) => {
    if (!node) return;
    if (Array.isArray(node)) { for (const x of node) walk(x); return; }
    if (typeof node !== 'object') return;
    if (typeof node['@type'] === 'string') out.add(node['@type']);
    else if (Array.isArray(node['@type'])) for (const t of node['@type']) out.add(t);
  };
  walk(parsed);
  return out;
}

function extractHreflangs(html) {
  const re = /<link[^>]*rel=["']alternate["'][^>]*hreflang=["']([^"']+)["'][^>]*>|<link[^>]*hreflang=["']([^"']+)["'][^>]*rel=["']alternate["'][^>]*>/gi;
  const out = new Set();
  let m;
  while ((m = re.exec(html)) !== null) out.add((m[1] ?? m[2] ?? '').toLowerCase());
  return out;
}

const failures = [];
let pass = 0;

for (const r of ROUTES) {
  try {
    const { res, html, url } = await fetchText(r.path);
    if (res.status === 404 && r.allow404) {
      console.log(`SKIP  ${r.path} → 404 (allowed; route data absent locally)`);
      continue;
    }
    assert.equal(res.status, 200, `${url}: expected HTTP 200, got ${res.status}`);

    const blocks = extractJsonLdBlocks(html);
    if (r.needTypes.length > 0) {
      assert.ok(blocks.length > 0, `${url}: no <script type="application/ld+json"> blocks found`);
    }

    const seenTypes = new Set();
    for (const block of blocks) {
      let parsed;
      try { parsed = JSON.parse(block); }
      catch (e) { throw new Error(`${url}: JSON-LD block failed to parse: ${e.message}\n--- block ---\n${block.slice(0, 200)}...`); }
      for (const t of collectTypes(parsed)) seenTypes.add(t);
    }
    for (const need of r.needTypes) {
      assert.ok(seenTypes.has(need), `${url}: expected JSON-LD @type "${need}" — saw [${[...seenTypes].join(', ')}]`);
    }

    if (r.hreflang) {
      const langs = extractHreflangs(html);
      for (const need of REQUIRED_HREFLANG) {
        assert.ok(langs.has(need), `${url}: missing hreflang="${need}" — saw [${[...langs].join(', ')}]`);
      }
    }

    console.log(`PASS  ${r.path}  (types: ${[...seenTypes].join(', ') || '—'})`);
    pass++;
  } catch (err) {
    console.log(`FAIL  ${r.path}  ${err.message}`);
    failures.push(err);
  }
}

console.log(`\n${pass}/${ROUTES.length} passed, ${failures.length} failed.`);
process.exit(failures.length ? 1 : 0);
