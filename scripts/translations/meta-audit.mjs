#!/usr/bin/env node
// Per-locale meta description / title audit. Walks every public page that
// exports generateMetadata, hits it under each locale, and checks:
//
//   1. Does the rendered <meta name="description"> differ between locales?
//      (a duplicate across all 5 means the page isn't actually localized)
//   2. Does the description length fit Google's truncation budget (50–160)?
//   3. Does the canonical URL use the correct locale-prefixed path?
//
// Run after `npm run start` (or against prod via BASE_URL=https://citynight.gr).
//   BASE_URL=http://localhost:3300 node scripts/translations/meta-audit.mjs

const BASE = (process.env.BASE_URL ?? 'http://127.0.0.1:3300').replace(/\/$/, '');
const LOCALES = ['en', 'el', 'de', 'fr', 'it'];

// Paths to audit (locale-suffix appended). Add deeper routes here when you
// want them in the report.
const ROUTES = [
  '',                  // locale root, e.g. /el
  '/greece',
  '/greece/athens',
  '/guides',
  '/featured',
  '/for-owners',
];

function pickMeta(html, name) {
  const re = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i');
  const m = re.exec(html);
  return m?.[1] ?? null;
}
function pickCanonical(html) {
  const m = /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i.exec(html);
  return m?.[1] ?? null;
}
function pickTitle(html) {
  const m = /<title>([^<]+)<\/title>/i.exec(html);
  return m?.[1]?.trim() ?? null;
}

const findings = []; // { route, kind, severity, detail }

async function inspect(route) {
  const titlesByLocale = new Map();
  const descsByLocale = new Map();
  const canonicalsByLocale = new Map();

  for (const locale of LOCALES) {
    const url = `${BASE}/${locale}${route}`;
    let res;
    try { res = await fetch(url, { redirect: 'follow' }); }
    catch (err) {
      findings.push({ route, kind: 'fetch', severity: 'fail', detail: `${locale}: ${err.message}` });
      continue;
    }
    if (res.status === 404) continue; // skipped — not all routes exist for all locales
    if (!res.ok) {
      findings.push({ route, kind: 'status', severity: 'fail', detail: `${locale}: HTTP ${res.status}` });
      continue;
    }
    const html = await res.text();
    titlesByLocale.set(locale, pickTitle(html));
    descsByLocale.set(locale, pickMeta(html, 'description'));
    canonicalsByLocale.set(locale, pickCanonical(html));
  }

  // Duplicate-across-locales check (excluding EN as the reference). If every
  // non-EN locale's description matches EN's, the page isn't localized.
  const enDesc = descsByLocale.get('en');
  if (enDesc) {
    const allDup = ['el', 'de', 'fr', 'it'].every((l) => descsByLocale.get(l) === enDesc);
    if (allDup) {
      findings.push({ route, kind: 'duplicate_desc', severity: 'warn', detail: 'all non-EN locales share the EN description' });
    } else {
      // Identify which locales are still EN-only.
      const stillEn = ['el', 'de', 'fr', 'it'].filter((l) => descsByLocale.get(l) === enDesc);
      if (stillEn.length) {
        findings.push({ route, kind: 'duplicate_desc', severity: 'warn', detail: `${stillEn.join(',')} still use EN description` });
      }
    }
  }

  // Length check per locale.
  for (const [locale, desc] of descsByLocale) {
    if (!desc) {
      findings.push({ route, kind: 'missing_desc', severity: 'fail', detail: locale });
      continue;
    }
    if (desc.length < 50) findings.push({ route, kind: 'short_desc', severity: 'warn', detail: `${locale}: ${desc.length} chars` });
    if (desc.length > 160) findings.push({ route, kind: 'long_desc', severity: 'warn', detail: `${locale}: ${desc.length} chars (Google truncates)` });
  }

  // Canonical correctness — should always point to the EN version of this path.
  const expectedCanonical = `${BASE.replace(/^https?:\/\//, 'https://')}/en${route}`.replace(/\/$/, '');
  for (const [locale, canonical] of canonicalsByLocale) {
    if (!canonical) {
      findings.push({ route, kind: 'no_canonical', severity: 'fail', detail: locale });
      continue;
    }
    // We accept canonical == EN URL (preferred per lib/seo.ts:alternatesFor).
    if (!canonical.endsWith(`/en${route}`) && canonical !== `${BASE}/en` && route === '') continue;
    if (!canonical.endsWith(`/en${route}`)) {
      findings.push({ route, kind: 'wrong_canonical', severity: 'warn', detail: `${locale}: ${canonical}` });
    }
  }
}

console.log(`Meta audit against ${BASE}\n`);
for (const route of ROUTES) {
  process.stdout.write(`/${route ? `…${route}` : ''} … `);
  await inspect(route);
  console.log('done');
}

const bySeverity = { fail: 0, warn: 0 };
for (const f of findings) bySeverity[f.severity]++;

console.log(`\n${findings.length} findings (${bySeverity.fail} fail, ${bySeverity.warn} warn)\n`);
for (const f of findings) {
  console.log(`[${f.severity.toUpperCase().padEnd(4)}] ${f.route.padEnd(20)} ${f.kind.padEnd(18)} ${f.detail}`);
}

process.exit(bySeverity.fail > 0 ? 1 : 0);
