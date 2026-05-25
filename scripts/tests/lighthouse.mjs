#!/usr/bin/env node
// Lighthouse runner. Assumes the prod server is already running on
// $BASE_URL (default http://127.0.0.1:3200). Prints the Performance,
// Accessibility, Best Practices, SEO scores + the four Web Vitals
// (LCP, CLS, INP, TBT) for each key URL.
//
// CI usage:
//   1. npm run build && PORT=3200 npm run start &
//   2. wait until the server is ready
//   3. node scripts/tests/lighthouse.mjs
//
// Local usage: just `node scripts/tests/lighthouse.mjs` if a server is
// already up.

import { spawn } from 'node:child_process';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3200';
const ROUTES = ['/', '/el', '/el/greece', '/el/featured'];

function lighthouseExists() {
  return new Promise((resolve) => {
    const c = spawn('npx', ['--no-install', 'lighthouse', '--version'], { shell: true });
    c.on('exit', (code) => resolve(code === 0));
    c.on('error', () => resolve(false));
  });
}

async function runOne(url) {
  return new Promise((resolve, reject) => {
    const args = [
      'lighthouse', url,
      '--quiet',
      '--chrome-flags=--headless=new --no-sandbox',
      '--only-categories=performance,accessibility,best-practices,seo',
      '--output=json',
      '--output-path=stdout',
      '--throttling-method=simulate',
      '--form-factor=mobile',
    ];
    const c = spawn('npx', args, { shell: true });
    let stdout = '', stderr = '';
    c.stdout.on('data', (d) => { stdout += d.toString(); });
    c.stderr.on('data', (d) => { stderr += d.toString(); });
    c.on('error', reject);
    c.on('exit', (code) => {
      if (code !== 0) {
        return reject(new Error(`lighthouse exited ${code}\n${stderr.slice(-500)}`));
      }
      try { resolve(JSON.parse(stdout)); }
      catch (err) { reject(new Error(`could not parse Lighthouse JSON: ${err.message}\n${stdout.slice(0, 200)}…`)); }
    });
  });
}

(async () => {
  if (!(await lighthouseExists())) {
    console.error('Lighthouse CLI not installed. Install transiently:');
    console.error('  npx -y lighthouse@latest --help');
    console.error('Or persist:');
    console.error('  npm i -D lighthouse');
    process.exit(2);
  }

  console.log(`Lighthouse mobile run against ${BASE}\n`);
  const rows = [];
  for (const path of ROUTES) {
    const url = `${BASE}${path}`;
    process.stdout.write(`${path.padEnd(24)} … `);
    try {
      const report = await runOne(url);
      const cats = report.categories;
      const audits = report.audits;
      const row = {
        url: path,
        perf: Math.round((cats.performance?.score ?? 0) * 100),
        a11y: Math.round((cats.accessibility?.score ?? 0) * 100),
        bp:   Math.round((cats['best-practices']?.score ?? 0) * 100),
        seo:  Math.round((cats.seo?.score ?? 0) * 100),
        lcp:  audits['largest-contentful-paint']?.numericValue,
        cls:  audits['cumulative-layout-shift']?.numericValue,
        tbt:  audits['total-blocking-time']?.numericValue,
      };
      rows.push(row);
      console.log(`perf=${row.perf} a11y=${row.a11y} bp=${row.bp} seo=${row.seo}  LCP=${(row.lcp/1000).toFixed(2)}s CLS=${row.cls?.toFixed(3)} TBT=${Math.round(row.tbt)}ms`);
    } catch (err) {
      console.log(`FAIL — ${err.message}`);
      rows.push({ url: path, error: err.message });
    }
  }

  // Final summary table.
  console.log('\nSummary:');
  console.log('URL                       Perf  A11y  BP    SEO   LCP      CLS     TBT');
  console.log('───────────────────────────────────────────────────────────────────────────');
  for (const r of rows) {
    if (r.error) {
      console.log(`${(r.url + '').padEnd(24)}  —     —     —     —     FAIL`);
      continue;
    }
    console.log(
      `${(r.url + '').padEnd(24)}  ${String(r.perf).padEnd(4)}  ${String(r.a11y).padEnd(4)}  ${String(r.bp).padEnd(4)}  ${String(r.seo).padEnd(4)}  ${((r.lcp/1000).toFixed(2)+'s').padEnd(7)}  ${r.cls.toFixed(3).padEnd(6)}  ${Math.round(r.tbt)}ms`,
    );
  }

  // Fail CI if any url falls below the thresholds.
  const bad = rows.filter((r) => !r.error && (r.perf < 70 || r.a11y < 90 || r.seo < 90));
  if (bad.length) {
    console.error(`\n${bad.length} URL(s) below thresholds (perf≥70, a11y≥90, seo≥90).`);
    process.exit(1);
  }
})().catch((err) => { console.error(err); process.exit(2); });
