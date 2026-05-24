// Unsplash client — used at seed-time to fetch licensed city hero photos.
// Free tier: 50 req/hour. Attribution is mandatory per the Unsplash license:
// we store the photographer's name + profile URL on the photos row.

import 'server-only';

const API_BASE = 'https://api.unsplash.com';
const UTM = 'utm_source=citynight.gr&utm_medium=referral';

function key(): string {
  const k = process.env.UNSPLASH_ACCESS_KEY;
  if (!k) throw new Error('UNSPLASH_ACCESS_KEY required for fetching stock photos.');
  return k;
}

export type UnsplashPhoto = {
  id: string;
  description: string | null;
  urls: { regular: string; full: string };
  user: { name: string; username: string; links: { html: string } };
  links: { html: string };
  width: number;
  height: number;
  color: string | null;
};

export async function searchPhotos(query: string, perPage = 5, orientation: 'landscape' | 'portrait' | 'squarish' = 'landscape'): Promise<UnsplashPhoto[]> {
  const url = `${API_BASE}/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=${orientation}&content_filter=high`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${key()}`, 'Accept-Version': 'v1' },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Unsplash search ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json() as { results: UnsplashPhoto[] };
  return json.results ?? [];
}

// Triggering /photos/:id/download is required by Unsplash terms (hot-link is fine
// for display; the GET registers the download). No-op if it fails.
export async function triggerDownload(photoId: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/photos/${photoId}/download`, {
      headers: { Authorization: `Client-ID ${key()}` },
    });
  } catch { /* best effort */ }
}

// Build the public CDN URL for a given photo at a target width.
// Includes utm tracking required by Unsplash.
export function imageUrl(photo: UnsplashPhoto, width = 1600): string {
  // Unsplash image URLs accept w / q / fm querystring params for resizing.
  const u = new URL(photo.urls.regular);
  u.searchParams.set('w', String(width));
  u.searchParams.set('q', '80');
  u.searchParams.set('auto', 'format');
  u.searchParams.set('fit', 'crop');
  return u.toString();
}

// Attribution string per Unsplash license: "Photo by <Name> on Unsplash".
// We also store attribution_url so the UI can deep-link to the photographer.
export function attribution(photo: UnsplashPhoto): { text: string; url: string } {
  return {
    text: `${photo.user.name} / Unsplash`,
    url: `${photo.user.links.html}?${UTM}`,
  };
}
