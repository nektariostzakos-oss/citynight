#!/usr/bin/env node
// Depth-N internal-link crawl. Starts at /, follows every same-origin
// <a href> up to depth 3 (configurable via DEPTH env var). Reports:
//
//   - Total URLs discovered
//   - Reachable URLs (HTTP 200)
//   - Broken internal links (4xx/5xx)
//   - Sitemap delta: every URL in sitemap.xml that the crawl didn't reach
//     (signals an orphan page that's only reachable via direct URL — bad
//     for crawl efficiency, fix with an internal link).
//
// Run against a running prod server:
//   BASE_URL=http://127.0.0.1:3300 node scripts/tests/crawl-reachable.mjs

const BASE = (process.env.BASE_URL ?? 'http://127.0.0.1:3300').replace(/\/$/, '');
const DEPTH = parseInt(process.env.DEPTH ?? '3', 10);

function isSameOrigin(href) {
  try { return new URL(href, BASE).origin === BASE; } catch { return false; }
}
function normalize(href) {
  try { const u = new URL(href, BASE); u.hash = ''; return u.toString(); } catch { return null; }
}

const seen = new Map(); // url → { depth, status }
const queue = [{ url: BASE + '/', depth: 0 }];

async function crawl() {
  while (queue.length > 0) {
    const { url, depth } = queue.shift();
    if (seen.has(url)) continue;
    if (depth > DEPTH) continue;
    let res, html = '';
    try { res = await fetch(url, { redirect: 'follow' }); html = await res.text(); }
    catch (err) { seen.set(url, { depth, status: 'fetch-fail', err: err.message }); continue; }
    seen.set(url, { depth, status: res.status });
    if (res.status !== 200) continue;
    if (depth === DEPTH) continue;

    // Extract <a href="...">
    for (const m of html.matchAll(/<a\b[^>]*\shref=["']([^"'#]+)["']/gi)) {
      const href = m[1];
      if (!isSameOrigin(href)) continue;
      const norm = normalize(href);
      if (!norm) continue;
      // Skip API + dashboard + claim + auth + sign-in surfaces (private).
      if (/\/(?:api|dashboard|claim|auth|sign-in)(?:\/|$)/.test(new URL(norm).pathname)) continue;
      // Skip /go/ outbound redirect router.
      if (/\/go\//.test(new URL(norm).pathname)) continue;
      if (!seen.has(norm)) queue.push({ url: norm, depth: depth + 1 });
    }
  }
}

await crawl();

const ok = [...seen.entries()].filter(([, v]) => v.status === 200).length;
const broken = [...seen.entries()].filter(([, v]) => v.status !== 200);

console.log(`Crawl from ${BASE}/ to depth ${DEPTH}`);
console.log(`Discovered: ${seen.size}`);
console.log(`Reachable (200): ${ok}`);
console.log(`Broken: ${broken.length}`);

if (broken.length > 0) {
  console.log('\nBroken URLs:');
  for (const [url, v] of broken) console.log(`  [${v.status}] ${url}`);
}

// Sitemap delta.
const sm = await fetch(`${BASE}/sitemap.xml`).then((r) => r.text()).catch(() => '');
const sitemapUrls = new Set([...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
const orphans = [...sitemapUrls].filter((u) => !seen.has(u));
console.log(`\nSitemap delta: ${orphans.length} URL(s) in sitemap.xml but not reached by the crawl`);
if (orphans.length > 0) {
  for (const u of orphans.slice(0, 30)) console.log(`  ${u}`);
  if (orphans.length > 30) console.log(`  …and ${orphans.length - 30} more`);
}

process.exit(broken.length > 0 ? 1 : 0);
