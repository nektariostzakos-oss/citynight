// Photo extractor for the seed pipeline.
//
// Contract (set by user 2026-05-27): images come from the venue's own
// website first, Facebook second. Places photos are NOT used. Quality
// bar: ≥1200px wide AND landscape (width ≥ height).
//
// Source order:
//   1. Venue website (if Places.websiteUri set and not a Facebook URL):
//      - <img width="W" height="H"> with W≥1200 and W≥H
//      - <img srcset="… N1w, … N2w"> — pick the largest entry ≥1200
//      - <meta property="og:image"> + <meta og:image:width> ≥ 1200
//   2. Facebook og:image (when we have the FB URL).
//      FB's automatic cover image is typically 1200x630 for business
//      pages — usable as a cover but rarely multiple.
//
// Dimensions: when not declared in HTML we range-fetch the first ~8KB
// of the image and parse JPEG SOF / PNG IHDR / WebP VP8 markers.

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const MIN_WIDTH = 1200;
const TIMEOUT_MS = 7000;

// ── HTML fetch (uses real-browser-ish headers; many .gr WP sites
//     gate cloudflare on default node fetch). ─────────────────────────
async function fetchHtml(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        'user-agent': UA,
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9,el;q=0.8',
        'sec-fetch-site': 'none', 'sec-fetch-mode': 'navigate',
        'sec-fetch-user': '?1', 'sec-fetch-dest': 'document',
        'upgrade-insecure-requests': '1',
      },
      redirect: 'follow', signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
  finally { clearTimeout(timer); }
}

// ── Parse <img> tags for explicitly-sized large images. ───────────────
function parseImgs(html, baseUrl) {
  const out = [];
  const re = /<img\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const tag = m[0];
    const src = /(?:^|\s)src=["']([^"']+)["']/.exec(tag)?.[1];
    if (!src) continue;
    const w = parseInt(/(?:^|\s)width=["']?(\d+)/.exec(tag)?.[1] ?? '0', 10);
    const h = parseInt(/(?:^|\s)height=["']?(\d+)/.exec(tag)?.[1] ?? '0', 10);
    const srcset = /(?:^|\s)srcset=["']([^"']+)["']/.exec(tag)?.[1];
    // Prefer the largest srcset entry over src when both exist.
    let bestSrc = src;
    let bestW = w;
    if (srcset) {
      for (const entry of srcset.split(',')) {
        const [u, sz] = entry.trim().split(/\s+/);
        const nW = parseInt(sz?.replace(/w$/, '') ?? '0', 10);
        if (u && nW > bestW) { bestSrc = u; bestW = nW; }
      }
    }
    if (bestW > 0 && h > 0 && h > bestW) continue;     // explicit portrait → skip
    if (bestW > 0 && bestW < MIN_WIDTH) continue;       // explicit too small
    if (looksLikeLogo(bestSrc)) continue;
    const absUrl = toAbsolute(bestSrc, baseUrl);
    if (!absUrl) continue;
    out.push({ url: absUrl, declaredW: bestW || null, declaredH: h || null });
  }
  // Dedupe by URL, keep first appearance order.
  const seen = new Set();
  return out.filter((p) => { if (seen.has(p.url)) return false; seen.add(p.url); return true; });
}

function parseOgImage(html, baseUrl) {
  const url = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1]
           ?? /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i.exec(html)?.[1]
           ?? null;
  if (!url) return null;
  const w = parseInt(/<meta[^>]+property=["']og:image:width["'][^>]+content=["']?(\d+)/i.exec(html)?.[1] ?? '0', 10);
  const h = parseInt(/<meta[^>]+property=["']og:image:height["'][^>]+content=["']?(\d+)/i.exec(html)?.[1] ?? '0', 10);
  const abs = toAbsolute(url, baseUrl);
  if (!abs) return null;
  return { url: abs, declaredW: w || null, declaredH: h || null };
}

function toAbsolute(url, base) {
  if (!url) return null;
  if (url.startsWith('data:')) return null;
  try {
    if (url.startsWith('//')) return `https:${url}`;
    const abs = new URL(url, base).toString();
    // Only allow HTTPS — next/image refuses http:// and we don't want
    // mixed-content warnings on the public page.
    if (!abs.startsWith('https://')) return null;
    return abs;
  } catch { return null; }
}

function looksLikeLogo(url) {
  return /(logo|icon|favicon|sprite|placeholder|loading|spinner)/i.test(url);
}

// ── Image dimension probe (read first bytes). Handles JPEG / PNG /
//     WebP. Returns { width, height } or null on parse failure. ──────
async function probeDimensions(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA, range: 'bytes=0-65535' },
      redirect: 'follow', signal: controller.signal,
    });
    if (!res.ok && res.status !== 206) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return readDimensions(buf);
  } catch { return null; }
  finally { clearTimeout(timer); }
}

function readDimensions(buf) {
  if (buf.length < 24) return null;
  // PNG: 89 50 4E 47 0D 0A 1A 0A, then IHDR with w/h at 16..23
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // JPEG: scan for SOF marker
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      const isSof = marker >= 0xc0 && marker <= 0xcf
        && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      const segLen = buf.readUInt16BE(i + 2);
      i += 2 + segLen;
    }
  }
  // WebP: 'RIFF' .... 'WEBP'
  if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') {
    const fourcc = buf.slice(12, 16).toString('ascii');
    if (fourcc === 'VP8X' && buf.length >= 30) {
      const w = (buf.readUIntLE(24, 3) + 1);
      const h = (buf.readUIntLE(27, 3) + 1);
      return { width: w, height: h };
    }
    if (fourcc === 'VP8 ' && buf.length >= 30) {
      // Lossy WebP — width/height at bytes 26-29 (after 0x9d 0x01 0x2a)
      if (buf[23] === 0x9d && buf[24] === 0x01 && buf[25] === 0x2a) {
        const w = buf.readUInt16LE(26) & 0x3fff;
        const h = buf.readUInt16LE(28) & 0x3fff;
        return { width: w, height: h };
      }
    }
    if (fourcc === 'VP8L' && buf.length >= 25) {
      const b1 = buf[21], b2 = buf[22], b3 = buf[23], b4 = buf[24];
      const w = 1 + (((b2 & 0x3f) << 8) | b1);
      const h = 1 + ((b4 << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
      return { width: w & 0x3fff, height: h & 0x3fff };
    }
  }
  return null;
}

// ── Public entry: build a photo list for a venue. ────────────────────
export async function pickVenuePhotos({ websiteUri, fbUrl, max = 3 }) {
  const collected = [];
  const sources = [];

  // 1. Venue's own website. Skip if it's actually a Facebook URL.
  if (websiteUri && !/facebook\.com/i.test(websiteUri)) {
    sources.push({ kind: 'website', url: websiteUri });
  }
  // 2. Facebook page og:image.
  if (fbUrl) sources.push({ kind: 'facebook', url: fbUrl });

  for (const src of sources) {
    if (collected.length >= max) break;
    const html = await fetchHtml(src.url);
    if (!html) { console.log(`      photo: ${src.kind} fetch failed`); continue; }
    const candidates = [];
    // og:image is usually the best single image, try it first.
    const og = parseOgImage(html, src.url);
    if (og) candidates.push({ ...og, _from: `${src.kind}/og:image` });
    // Plus all <img> tags from the page.
    if (src.kind === 'website') {
      for (const img of parseImgs(html, src.url)) {
        candidates.push({ ...img, _from: `${src.kind}/img` });
      }
    }

    for (const c of candidates) {
      if (collected.length >= max) break;
      // If HTML declared dimensions, trust them when ≥1200 landscape.
      if (c.declaredW && c.declaredH) {
        if (c.declaredW < MIN_WIDTH || c.declaredH > c.declaredW) continue;
        if (!collected.some((p) => p.url === c.url)) {
          collected.push({ url: c.url, attribution: src.kind === 'facebook' ? 'Facebook' : 'Venue website', source: src.kind });
        }
        continue;
      }
      // Otherwise probe bytes.
      const dims = await probeDimensions(c.url);
      if (!dims) continue;
      if (dims.width < MIN_WIDTH || dims.height > dims.width) continue;
      if (!collected.some((p) => p.url === c.url)) {
        collected.push({ url: c.url, attribution: src.kind === 'facebook' ? 'Facebook' : 'Venue website', source: src.kind });
      }
    }
  }

  return collected;
}
