// Pass 2: photo hunt for the 45 cities still on placeholders.
// Tries each source in order, picks the first verifiably-loading URL.
//
// Sources (in priority order):
//   1. Wikipedia article "lead image" (Wikipedia REST API summary) — usually the
//      iconic landmark photo curated by Wikipedia editors.
//   2. Wikimedia Commons MediaSearch — much larger pool, looser quality.
//   3. Pexels with broader query phrasings (region/landmark) — last resort.
//
// Output: public/__pass2.json — { slug: { src: 'wiki'|'commons'|'pexels', url, attr, attrUrl, license } }

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'node:fs';

const pexelsKey = process.env.PEXELS_API_KEY;

// 45 missing cities + their best-guess Wikipedia article titles.
// (Wikipedia uses local English forms; Greek redirects to those.)
const MISSING = [
  { slug: 'vouliagmeni',    wiki: 'Vouliagmeni',          extra: 'Vouliagmeni lake Greece' },
  { slug: 'poros',          wiki: 'Poros',                extra: 'Poros island Greece' },
  { slug: 'korinthos',      wiki: 'Corinth',              extra: 'Corinth Greece' },
  { slug: 'kalamata',       wiki: 'Kalamata',             extra: 'Kalamata Greece waterfront' },
  { slug: 'sparta',         wiki: 'Sparta',               extra: 'Sparta Greece city' },
  { slug: 'pylos',          wiki: 'Pylos',                extra: 'Pylos Navarino bay Greece' },
  { slug: 'gythio',         wiki: 'Gytheio',              extra: 'Gythio Greece harbour' },
  { slug: 'tripoli',        wiki: 'Tripoli, Greece',      extra: 'Tripoli Arcadia Greece' },
  { slug: 'areopoli',       wiki: 'Areopoli',             extra: 'Areopoli Mani Greece' },
  { slug: 'mystras',        wiki: 'Mystras',              extra: 'Mystras Byzantine Greece' },
  { slug: 'arachova',       wiki: 'Arachova',             extra: 'Arachova Greece village' },
  { slug: 'galaxidi',       wiki: 'Galaxidi',             extra: 'Galaxidi harbour Greece' },
  { slug: 'karpenisi',      wiki: 'Karpenisi',            extra: 'Karpenisi Evrytania Greece' },
  { slug: 'karystos',       wiki: 'Karystos',             extra: 'Karystos Evia Greece' },
  { slug: 'eretria',        wiki: 'Eretria',              extra: 'Eretria Evia Greece' },
  { slug: 'loutra-edipsou', wiki: 'Loutra Aidipsou',      extra: 'Loutra Edipsou Evia Greece' },
  { slug: 'lamia',          wiki: 'Lamia (city)',         extra: 'Lamia Greece city' },
  { slug: 'larissa',        wiki: 'Larissa',              extra: 'Larissa Greece city' },
  { slug: 'portaria',       wiki: 'Portaria, Greece',     extra: 'Portaria Pelion Greece' },
  { slug: 'alonissos',      wiki: 'Alonnisos',            extra: 'Alonissos Sporades Greece' },
  { slug: 'skyros',         wiki: 'Skyros',               extra: 'Skyros Sporades Greece' },
  { slug: 'preveza',        wiki: 'Preveza',              extra: 'Preveza Greece harbour' },
  { slug: 'sivota',         wiki: 'Sivota',               extra: 'Sivota Thesprotia Greece' },
  { slug: 'arta',           wiki: 'Arta, Greece',         extra: 'Arta Greece bridge' },
  { slug: 'zagori',         wiki: 'Zagori',               extra: 'Zagori Greece stone village' },
  { slug: 'igoumenitsa',    wiki: 'Igoumenitsa',          extra: 'Igoumenitsa Greece port' },
  { slug: 'veria',          wiki: 'Veria',                extra: 'Veria Greece Macedonia' },
  { slug: 'naoussa-imathia',wiki: 'Naoussa, Imathia',     extra: 'Naoussa Imathia Greece' },
  { slug: 'serres',         wiki: 'Serres',               extra: 'Serres Greece city' },
  { slug: 'kilkis',         wiki: 'Kilkis',               extra: 'Kilkis Greece' },
  { slug: 'pella',          wiki: 'Pella',                extra: 'Pella Greece ancient' },
  { slug: 'grevena',        wiki: 'Grevena',              extra: 'Grevena Greece' },
  { slug: 'xanthi',         wiki: 'Xanthi',               extra: 'Xanthi old town Greece' },
  { slug: 'komotini',       wiki: 'Komotini',             extra: 'Komotini Thrace Greece' },
  { slug: 'alexandroupolis',wiki: 'Alexandroupoli',       extra: 'Alexandroupoli Greece lighthouse' },
  { slug: 'kea',            wiki: 'Kea (island)',         extra: 'Kea Tzia Cyclades Greece' },
  { slug: 'sikinos',        wiki: 'Sikinos',              extra: 'Sikinos Cyclades Greece' },
  { slug: 'nisyros',        wiki: 'Nisyros',              extra: 'Nisyros volcano Greece' },
  { slug: 'tilos',          wiki: 'Tilos',                extra: 'Tilos Dodecanese Greece' },
  { slug: 'kasos',          wiki: 'Kasos',                extra: 'Kasos Dodecanese Greece' },
  { slug: 'halki',          wiki: 'Halki (Dodecanese)',   extra: 'Halki Dodecanese Greece' },
  { slug: 'lipsi',          wiki: 'Leipsoi',              extra: 'Lipsi Dodecanese Greece' },
  { slug: 'limnos',         wiki: 'Lemnos',               extra: 'Lemnos Limnos Greece' },
  { slug: 'fournoi',        wiki: 'Fournoi, Ikaria',      extra: 'Fournoi Korseon Greece' },
  { slug: 'sitia',          wiki: 'Sitia',                extra: 'Sitia Crete Greece' },
];

// ── helpers ──────────────────────────────────────────────────────────────
async function urlOk(url) {
  try { const r = await fetch(url, { method: 'HEAD' }); return r.ok; } catch { return false; }
}

async function wikipediaLead(title) {
  // REST API summary returns originalimage (full-resolution lead).
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;
  const r = await fetch(url, { headers: { 'User-Agent': 'citynight-seed/0.1' }});
  if (!r.ok) return null;
  const j = await r.json();
  if (!j.originalimage?.source) return null;
  return {
    url: j.originalimage.source,
    attr: 'Wikipedia',
    attrUrl: j.content_urls?.desktop?.page,
    license: 'Wikimedia',
    sourceType: 'wiki',
  };
}

async function commonsSearch(query) {
  // MediaSearch — returns thumbnails. We extract the actual file via API.
  const u = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=8&gsrsearch=${encodeURIComponent(query)}&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=1800&origin=*`;
  const r = await fetch(u, { headers: { 'User-Agent': 'citynight-seed/0.1' }});
  if (!r.ok) return null;
  const j = await r.json();
  const pages = j.query?.pages;
  if (!pages) return null;
  // Sort by index (search relevance) and pick the first that's an image and looks landscape-ish.
  const ordered = Object.values(pages).sort((a, b) => (a.index ?? 999) - (b.index ?? 999));
  for (const p of ordered) {
    const ii = p.imageinfo?.[0];
    if (!ii?.url) continue;
    // Skip SVGs, maps, and obvious diagram/logo files
    if (/\.(svg|pdf|ogv|webm)$/i.test(ii.url)) continue;
    if (/coat[-_]of[-_]arms|seal|flag|map|location|logo|emblem/i.test(p.title)) continue;
    return {
      url: ii.thumburl ?? ii.url,
      attr: (ii.extmetadata?.Artist?.value ?? 'Wikimedia Commons').replace(/<[^>]*>/g, '').trim().slice(0, 80),
      attrUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
      license: ii.extmetadata?.LicenseShortName?.value ?? 'Wikimedia',
      sourceType: 'commons',
    };
  }
  return null;
}

async function pexelsSearch(query) {
  if (!pexelsKey) return null;
  const u = `https://api.pexels.com/v1/search?per_page=5&orientation=landscape&query=${encodeURIComponent(query)}`;
  const r = await fetch(u, { headers: { Authorization: pexelsKey }});
  if (!r.ok) return null;
  const j = await r.json();
  for (const p of j.photos || []) {
    const alt = (p.alt || '').toLowerCase();
    // Need an explicit match on the city or landmark in the alt text — no generic photos.
    if (!alt.includes(query.split(' ')[0].toLowerCase())) continue;
    const url = `https://images.pexels.com/photos/${p.id}/pexels-photo-${p.id}.jpeg?auto=compress&cs=tinysrgb&w=1800`;
    const ok = await urlOk(url);
    if (!ok) continue;
    return {
      url,
      attr: `${p.photographer} / Pexels`,
      attrUrl: `https://www.pexels.com/photo/${p.id}/`,
      license: 'Pexels',
      sourceType: 'pexels',
    };
  }
  return null;
}

// ── run ──────────────────────────────────────────────────────────────────
const out = {};
let wiki = 0, commons = 0, pexels = 0, none = 0;
for (const m of MISSING) {
  // Wikipedia first
  let picked = await wikipediaLead(m.wiki);
  if (picked && !await urlOk(picked.url)) picked = null;
  // Commons search (sunset/night first, then plain)
  if (!picked) picked = await commonsSearch(`${m.extra} sunset`);
  if (!picked) picked = await commonsSearch(`${m.extra} night`);
  if (!picked) picked = await commonsSearch(m.extra);
  if (!picked) picked = await commonsSearch(m.wiki);
  if (picked && !await urlOk(picked.url)) picked = null;
  // Pexels last
  if (!picked) picked = await pexelsSearch(m.extra);
  if (!picked) picked = await pexelsSearch(`${m.slug} Greece`);
  if (picked && !await urlOk(picked.url)) picked = null;

  out[m.slug] = picked;
  if (picked) {
    if (picked.sourceType === 'wiki') wiki++;
    else if (picked.sourceType === 'commons') commons++;
    else pexels++;
  } else none++;
  console.log(m.slug.padEnd(20), picked ? `[${picked.sourceType}]` : '[—]', picked?.attr?.slice(0, 50) ?? '');
}

fs.writeFileSync('public/__pass2.json', JSON.stringify(out, null, 2));
console.log(`\nSUMMARY: wiki=${wiki} commons=${commons} pexels=${pexels} none=${none}`);
