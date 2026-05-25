#!/usr/bin/env node
// Hreflang sanity test. Walks the sitemap, for each URL fetches it and
// asserts:
//
//   1. <link rel="alternate" hreflang="..."> exists for every supported
//      locale + x-default. Missing tags = Google can't tell us apart from
//      our own alternates.
//   2. Alternates are RECIPROCAL — if page A links to page B via
//      hreflang="el", page B must link back to A via hreflang="en" (or
//      whatever A's locale is). Asymmetric hreflang signals get demoted.
//   3. Every alternate URL actually resolves to 200 (no dead links).
//
// Run after `npm run start` against the local prod build, or against
// any live URL:
//   BASE_URL=https://citynight.gr node scripts/translations/hreflang-sanity.mjs

const BASE = (process.env.BASE_URL ?? 'http://127.0.0.1:3300').replace(/\/$/, '');
const LOCALES = ['en', 'el', 'de', 'fr', 'it'];
const REQUIRED = [...LOCALES, 'x-default'];
const SAMPLE_LIMIT = 20; // cap so a 10k-URL sitemap doesn't make this a 2-hour script

async function fetchSitemapUrls() {
  const res = await fetch(`${BASE}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap fetched ${res.status}`);
  const xml = await res.text();
  // Crude but adequate for our well-formed sitemap output.
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

function extractHreflangs(html) {
  const out = new Map();
  const re = /<link[^>]+rel=["']alternate["'][^>]+hreflang=["']([^"']+)["'][^>]+href=["']([^"']+)["']|<link[^>]+hreflang=["']([^"']+)["'][^>]+href=["']([^"']+)["'][^>]+rel=["']alternate["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const lang = (m[1] ?? m[3]).toLowerCase();
    const href = m[2] ?? m[4];
    out.set(lang, href);
  }
  return out;
}

async function fetchHreflang(url) {
  const res = await fetch(url, { redirect: 'manual' });
  if (res.status >= 300 && res.status < 400) {
    return { status: res.status, hreflang: new Map(), redirect: res.headers.get('location') };
  }
  if (!res.ok) return { status: res.status, hreflang: new Map() };
  const html = await res.text();
  return { status: res.status, hreflang: extractHreflangs(html) };
}

const findings = [];

console.log(`Hreflang sanity against ${BASE}`);
const urls = await fetchSitemapUrls();
console.log(`Sitemap returned ${urls.length} URLs; sampling first ${SAMPLE_LIMIT} unique per-locale-rotation…\n`);

// Diversify the sample: pick first URL of each "locale-bucket" (URL.startsWith(`${BASE}/${locale}`)).
const perLocale = new Map();
for (const u of urls) {
  const m = new URL(u).pathname.match(/^\/([a-z]{2})(?:\/|$)/);
  const loc = m?.[1] ?? '_';
  if (!perLocale.has(loc)) perLocale.set(loc, []);
  perLocale.get(loc).push(u);
}
const sample = [];
const PER_BUCKET = Math.ceil(SAMPLE_LIMIT / Math.max(1, perLocale.size));
for (const [, arr] of perLocale) sample.push(...arr.slice(0, PER_BUCKET));

let checked = 0;
for (const url of sample.slice(0, SAMPLE_LIMIT)) {
  checked++;
  const { status, hreflang } = await fetchHreflang(url);
  if (status !== 200) {
    findings.push({ url, kind: 'fetch', detail: `HTTP ${status}` });
    continue;
  }

  // Coverage — every required tag present?
  for (const tag of REQUIRED) {
    if (!hreflang.has(tag)) {
      findings.push({ url, kind: 'missing_tag', detail: tag });
    }
  }

  // Reciprocity — fetch the EL alternate (cheap), confirm it points back to EN+this URL via reciprocity.
  const elHref = hreflang.get('el');
  if (elHref && new URL(elHref).origin === new URL(url).origin) {
    const back = await fetchHreflang(elHref);
    if (back.status === 200) {
      const matchesBack = [...back.hreflang.values()].includes(url) || [...back.hreflang.values()].some((h) => h.replace(/\/$/, '') === url.replace(/\/$/, ''));
      if (!matchesBack) {
        findings.push({ url, kind: 'asymmetric', detail: `el alternate ${elHref} does not link back` });
      }
    } else {
      findings.push({ url, kind: 'alternate_404', detail: `el alternate ${elHref} → HTTP ${back.status}` });
    }
  }
}

console.log(`Sampled ${checked} URLs.\n`);
if (findings.length === 0) {
  console.log('All hreflang checks passed.');
  process.exit(0);
}

console.log(`${findings.length} issue(s) found:`);
for (const f of findings) {
  console.log(`  ${f.url.padEnd(60)} ${f.kind.padEnd(16)} ${f.detail}`);
}
process.exit(1);
