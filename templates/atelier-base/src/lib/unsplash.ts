import { getAppRoot } from "@/lib/appRoot";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = () => path.join(getAppRoot(), "public", "uploads");

export type UnsplashResult = {
  url: string;
  author: string;
  authorUrl: string;
  sourceUrl: string;
};

type UnsplashRaw = {
  id: string;
  urls: { raw: string; regular: string; small: string };
  links: { html: string };
  user: { name: string; links: { html: string } };
};

async function searchOne(
  query: string,
  accessKey: string
): Promise<UnsplashRaw | null> {
  const url =
    "https://api.unsplash.com/search/photos?per_page=5&orientation=landscape&query=" +
    encodeURIComponent(query);
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${accessKey}` },
  });
  if (!res.ok) {
    throw new Error(`Unsplash: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { results: UnsplashRaw[] };
  const picked = data.results?.[0] ?? null;
  return picked;
}

async function download(url: string, keyLabel: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const hash = crypto
    .createHash("sha1")
    .update(buffer)
    .digest("hex")
    .slice(0, 10);
  const filename = `${keyLabel}_${Date.now().toString(36)}_${hash}.jpg`;
  await fs.mkdir(UPLOAD_DIR(), { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR(), filename), buffer);
  return `/uploads/${filename}`;
}

/**
 * Search Unsplash for each query, download the top result, and return
 * a map of slot key → local URL + attribution.
 * Silently skips slots whose search returns no results.
 */
export async function fetchAndStoreImages(
  queries: Array<{ key: string; query: string }>,
  accessKey: string
): Promise<Record<string, UnsplashResult>> {
  const out: Record<string, UnsplashResult> = {};

  // Sequential to stay well under Unsplash's 50/hour demo rate limit.
  for (const q of queries) {
    try {
      const found = await searchOne(q.query, accessKey);
      if (!found) continue;
      // Use regular-size (~1080w) — fine for web hero/gallery usage.
      const localUrl = await download(found.urls.regular, q.key);
      out[q.key] = {
        url: localUrl,
        author: found.user.name,
        authorUrl: found.user.links.html,
        sourceUrl: found.links.html,
      };
    } catch (e) {
      // Skip this slot on any error — caller falls back to placeholder.
      console.error(`Unsplash fetch failed for ${q.key}:`, e);
    }
  }
  return out;
}
