// One-off: fetch a Pexels hero photo for every new city in ALL_CITIES that
// doesn't yet exist in DB. Writes results to public/__pexels-pass1.json for
// the migration generator to consume.

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'node:fs';
import { ALL_CITIES, EXISTING_SLUGS } from './greece-city-master.js';

const key = process.env.PEXELS_API_KEY;
if (!key) { console.error('PEXELS_API_KEY missing'); process.exit(1); }

async function search(q, perPage = 5) {
  const u = `https://api.pexels.com/v1/search?per_page=${perPage}&orientation=landscape&query=${encodeURIComponent(q)}`;
  const r = await fetch(u, { headers: { Authorization: key }});
  if (!r.ok) return { photos: [] };
  return r.json();
}

async function urlOk(id) {
  const u = `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1800`;
  const r = await fetch(u, { method: 'HEAD' });
  return r.ok;
}

const out = {};
const targets = ALL_CITIES.filter((c) => !EXISTING_SLUGS.has(c.slug));
console.log('cities to fetch:', targets.length);

for (const c of targets) {
  // night > evening > generic Greek
  const queries = [
    `${c.name} Greece night`,
    `${c.name} Greece sunset`,
    `${c.name} Greece`,
  ];
  let picked = null;
  // Tier 1: strict — alt-text must include the city name.
  for (const q of queries) {
    const r = await search(q, 5);
    for (const p of r.photos || []) {
      const alt = (p.alt || '').toLowerCase();
      if (!alt.includes(c.name.toLowerCase())) continue;
      const ok = await urlOk(p.id);
      if (ok) { picked = { id: p.id, photographer: p.photographer, alt: p.alt, q, strict: true }; break; }
    }
    if (picked) break;
  }
  // Tier 2: loose — first usable result of "{city} Greece"
  if (!picked) {
    const r = await search(`${c.name} Greece`, 5);
    for (const p of r.photos || []) {
      const ok = await urlOk(p.id);
      if (ok) { picked = { id: p.id, photographer: p.photographer, alt: p.alt, q: '{name} Greece (loose)', strict: false }; break; }
    }
  }
  out[c.slug] = picked;
  console.log(c.slug.padEnd(22), picked ? (picked.strict ? '✓' : '~') + ' ' + picked.id + ' · ' + picked.photographer : '(none)');
}

fs.writeFileSync('public/__pexels-pass1.json', JSON.stringify(out, null, 2));
const strict = Object.values(out).filter((v) => v?.strict).length;
const loose = Object.values(out).filter((v) => v && !v.strict).length;
const none = Object.values(out).filter((v) => !v).length;
console.log(`\nstrict-match: ${strict}  ·  loose: ${loose}  ·  no-photo: ${none}`);
