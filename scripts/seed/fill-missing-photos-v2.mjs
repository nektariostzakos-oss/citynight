// Pass 3: aggressive photo hunt. Tries every angle for each holdout city.
//
// Strategy per city, stop on first verified URL:
//   1. EN Wikipedia search → resolve to article → grab summary's originalimage.
//   2. EL Wikipedia search → same.
//   3. Wikipedia pageimages REST → main image.
//   4. Wikimedia Commons MediaSearch with multiple queries (city + region + landmark).
//   5. Pexels with multiple query phrasings (broader, no alt-match required).
//
// Loosened filters: only reject SVG/maps/flags/coats-of-arms. Anything else is fair game.

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'node:fs';

const PEXELS = process.env.PEXELS_API_KEY;
const UA = 'citynight-seed/0.2 (https://citynight.gr)';

const MISSING = [
  { slug: 'vouliagmeni',    titles: ['Vouliagmeni'], queries: ['Vouliagmeni lake', 'Vouliagmeni beach', 'Vouliagmeni Athens'] },
  { slug: 'poros',          titles: ['Poros'],                                            queries: ['Poros island Greece', 'Poros harbour'] },
  { slug: 'korinthos',      titles: ['Corinth'],                                          queries: ['Corinth Greece', 'Ancient Corinth Acrocorinth', 'Corinth canal'] },
  { slug: 'kalamata',       titles: ['Kalamata'],                                         queries: ['Kalamata Greece harbour', 'Kalamata Messenia'] },
  { slug: 'sparta',         titles: ['Sparta'],                                           queries: ['Sparta Greece city', 'Sparta Laconia Greece'] },
  { slug: 'pylos',          titles: ['Pylos'],                                            queries: ['Pylos Navarino', 'Pylos Greece fortress'] },
  { slug: 'gythio',         titles: ['Gytheio'],                                          queries: ['Gythio harbour', 'Gytheio Mani'] },
  { slug: 'tripoli',        titles: ['Tripoli, Greece', 'Tripoli (Greece)', 'Tripoli'],   queries: ['Tripoli Arcadia Greece', 'Tripoli Peloponnese'] },
  { slug: 'areopoli',       titles: ['Areopoli', 'Areopolis'],                            queries: ['Areopoli Mani', 'Areopolis Greece tower'] },
  { slug: 'mystras',        titles: ['Mystras'],                                          queries: ['Mystras Byzantine', 'Mistra Peloponnese'] },
  { slug: 'arachova',       titles: ['Arachova'],                                         queries: ['Arachova Parnassos', 'Arachova mountain'] },
  { slug: 'galaxidi',       titles: ['Galaxidi'],                                         queries: ['Galaxidi harbour', 'Galaxidi Phocis'] },
  { slug: 'karpenisi',      titles: ['Karpenisi'],                                        queries: ['Karpenisi Evrytania', 'Karpenisi mountain Greece'] },
  { slug: 'karystos',       titles: ['Karystos'],                                         queries: ['Karystos Evia', 'Karystos castle Greece'] },
  { slug: 'eretria',        titles: ['Eretria'],                                          queries: ['Eretria Evia harbour', 'Eretria ancient Greece'] },
  { slug: 'loutra-edipsou', titles: ['Loutra Aidipsou', 'Aidipsos'],                      queries: ['Loutra Edipsou Evia', 'Aidipsos spa Greece'] },
  { slug: 'lamia',          titles: ['Lamia (city)', 'Lamia'],                            queries: ['Lamia city Greece', 'Lamia castle Greece'] },
  { slug: 'larissa',        titles: ['Larissa'],                                          queries: ['Larissa Thessaly', 'Larissa Greece city'] },
  { slug: 'portaria',       titles: ['Portaria, Greece', 'Portaria'],                     queries: ['Portaria Pelion', 'Portaria mountain village'] },
  { slug: 'alonissos',      titles: ['Alonnisos'],                                        queries: ['Alonissos Sporades', 'Alonnisos harbour Greece'] },
  { slug: 'skyros',         titles: ['Skyros'],                                           queries: ['Skyros Chora', 'Skyros island'] },
  { slug: 'preveza',        titles: ['Preveza'],                                          queries: ['Preveza waterfront', 'Preveza harbour'] },
  { slug: 'sivota',         titles: ['Sivota', 'Syvota'],                                 queries: ['Sivota Thesprotia', 'Syvota Greece'] },
  { slug: 'arta',           titles: ['Arta, Greece', 'Arta (Greece)'],                    queries: ['Arta bridge', 'Arta Epirus Greece'] },
  { slug: 'zagori',         titles: ['Zagori'],                                           queries: ['Zagori stone bridges', 'Zagorochoria'] },
  { slug: 'igoumenitsa',    titles: ['Igoumenitsa'],                                      queries: ['Igoumenitsa port', 'Igoumenitsa Greece'] },
  { slug: 'veria',          titles: ['Veria', 'Veroia'],                                  queries: ['Veria old town', 'Veroia Macedonia'] },
  { slug: 'naoussa-imathia',titles: ['Naoussa, Imathia', 'Naousa, Imathia'],              queries: ['Naoussa Imathia waterfalls', 'Naoussa Macedonia'] },
  { slug: 'serres',         titles: ['Serres'],                                           queries: ['Serres city Greece', 'Serres Macedonia'] },
  { slug: 'kilkis',         titles: ['Kilkis'],                                           queries: ['Kilkis Macedonia Greece'] },
  { slug: 'pella',          titles: ['Pella', 'Pella (regional unit)'],                   queries: ['Pella ancient capital', 'Pella mosaics'] },
  { slug: 'grevena',        titles: ['Grevena'],                                          queries: ['Grevena Western Macedonia', 'Grevena Pindus'] },
  { slug: 'xanthi',         titles: ['Xanthi'],                                           queries: ['Xanthi old town', 'Xanthi Thrace'] },
  { slug: 'komotini',       titles: ['Komotini'],                                         queries: ['Komotini Thrace', 'Komotini Greece city'] },
  { slug: 'alexandroupolis',titles: ['Alexandroupoli', 'Alexandroupolis'],                queries: ['Alexandroupoli lighthouse', 'Alexandroupolis Thrace'] },
  { slug: 'kea',            titles: ['Kea (island)', 'Kea, Greece'],                      queries: ['Kea Tzia island', 'Kea Cyclades'] },
  { slug: 'sikinos',        titles: ['Sikinos'],                                          queries: ['Sikinos Cyclades', 'Sikinos chora'] },
  { slug: 'nisyros',        titles: ['Nisyros'],                                          queries: ['Nisyros volcano', 'Nisyros Mandraki'] },
  { slug: 'tilos',          titles: ['Tilos'],                                            queries: ['Tilos Dodecanese', 'Tilos Livadia'] },
  { slug: 'kasos',          titles: ['Kasos'],                                            queries: ['Kasos Dodecanese', 'Kasos Fry'] },
  { slug: 'halki',          titles: ['Halki (Dodecanese)', 'Chalki, Dodecanese'],         queries: ['Chalki Dodecanese', 'Halki harbour Greece'] },
  { slug: 'lipsi',          titles: ['Leipsoi', 'Lipsi'],                                 queries: ['Lipsi Dodecanese', 'Leipsoi Greece'] },
  { slug: 'limnos',         titles: ['Lemnos'],                                           queries: ['Lemnos Myrina', 'Limnos castle'] },
  { slug: 'fournoi',        titles: ['Fournoi, Ikaria', 'Fournoi Korseon'],               queries: ['Fournoi Korseon', 'Fournoi Greece harbour'] },
  { slug: 'sitia',          titles: ['Sitia'],                                            queries: ['Sitia Crete harbour', 'Sitia Crete'] },
];

const REJECT_RE = /coat[-_]of[-_]arms|seal[-_]of|flag[-_]of|map[-_]of|location[-_]map|logo|emblem|insignia|\.svg$|\.pdf$|\.ogv$|\.webm$/i;

async function urlOk(url) {
  try { const r = await fetch(url, { method: 'HEAD' }); return r.ok; } catch { return false; }
}

// Search Wikipedia for an article + return its summary's lead image.
async function wikipediaSearch(title, lang = 'en') {
  // First, opensearch to resolve to the canonical title (handles redirects + alt forms).
  const search = `https://${lang}.wikipedia.org/w/api.php?action=opensearch&format=json&limit=1&search=${encodeURIComponent(title)}&origin=*`;
  const sres = await fetch(search, { headers: { 'User-Agent': UA }});
  if (!sres.ok) return null;
  const sj = await sres.json();
  const canonical = sj[1]?.[0];
  if (!canonical) return null;
  // Now fetch the REST summary with originalimage.
  const sumUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(canonical.replace(/ /g, '_'))}`;
  const r = await fetch(sumUrl, { headers: { 'User-Agent': UA }});
  if (!r.ok) return null;
  const j = await r.json();
  const src = j.originalimage?.source ?? j.thumbnail?.source;
  if (!src) return null;
  if (REJECT_RE.test(src)) return null;
  return {
    url: src,
    attr: 'Wikipedia',
    attrUrl: j.content_urls?.desktop?.page ?? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(canonical)}`,
    license: 'Wikimedia',
    sourceType: `wiki-${lang}`,
  };
}

async function commonsSearch(query) {
  const u = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=10&gsrsearch=${encodeURIComponent(query)}&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=1800&origin=*`;
  const r = await fetch(u, { headers: { 'User-Agent': UA }});
  if (!r.ok) return null;
  const j = await r.json();
  const pages = j.query?.pages;
  if (!pages) return null;
  const ordered = Object.values(pages).sort((a, b) => (a.index ?? 999) - (b.index ?? 999));
  for (const p of ordered) {
    const ii = p.imageinfo?.[0];
    if (!ii?.url) continue;
    if (REJECT_RE.test(ii.url) || REJECT_RE.test(p.title)) continue;
    return {
      url: ii.thumburl ?? ii.url,
      attr: (ii.extmetadata?.Artist?.value ?? 'Wikimedia Commons').replace(/<[^>]*>/g, '').trim().slice(0, 80) || 'Wikimedia Commons',
      attrUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
      license: (ii.extmetadata?.LicenseShortName?.value ?? 'Wikimedia').slice(0, 30),
      sourceType: 'commons',
    };
  }
  return null;
}

async function pexelsLoose(query) {
  if (!PEXELS) return null;
  const u = `https://api.pexels.com/v1/search?per_page=5&orientation=landscape&query=${encodeURIComponent(query)}`;
  const r = await fetch(u, { headers: { Authorization: PEXELS }});
  if (!r.ok) return null;
  const j = await r.json();
  for (const p of j.photos || []) {
    const url = `https://images.pexels.com/photos/${p.id}/pexels-photo-${p.id}.jpeg?auto=compress&cs=tinysrgb&w=1800`;
    if (!await urlOk(url)) continue;
    return {
      url,
      attr: `${p.photographer} / Pexels`,
      attrUrl: `https://www.pexels.com/photo/${p.id}/`,
      license: 'Pexels',
      sourceType: 'pexels-loose',
    };
  }
  return null;
}

const out = {};
const counters = { 'wiki-en': 0, 'wiki-el': 0, commons: 0, 'pexels-loose': 0, none: 0 };
for (const m of MISSING) {
  let picked = null;
  // 1. EN Wikipedia
  for (const t of m.titles) {
    picked = await wikipediaSearch(t, 'en');
    if (picked && await urlOk(picked.url)) break;
    picked = null;
  }
  // 2. EL Wikipedia
  if (!picked) {
    for (const t of m.titles) {
      picked = await wikipediaSearch(t, 'el');
      if (picked && await urlOk(picked.url)) break;
      picked = null;
    }
  }
  // 3. Commons (with multiple queries)
  if (!picked) {
    for (const q of m.queries) {
      picked = await commonsSearch(q);
      if (picked && await urlOk(picked.url)) break;
      picked = null;
    }
  }
  // 4. Pexels loose
  if (!picked) {
    for (const q of m.queries) {
      picked = await pexelsLoose(q);
      if (picked && await urlOk(picked.url)) break;
      picked = null;
    }
  }
  out[m.slug] = picked;
  if (picked) counters[picked.sourceType]++; else counters.none++;
  console.log(m.slug.padEnd(20), picked ? `[${picked.sourceType}]` : '[—]', picked?.attr?.slice(0, 60) ?? '');
}

fs.writeFileSync('public/__pass2.json', JSON.stringify(out, null, 2));
console.log('\nSUMMARY:', counters);
