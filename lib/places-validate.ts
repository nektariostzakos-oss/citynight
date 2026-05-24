// Submission-time validation against Google Places (§9 / §12). Used to score
// user-submitted venues before publishing. We do NOT call Places for every
// public-page render — only on submission and weekly cron sync.

import 'server-only';

const SEARCH_TEXT_URL = 'https://places.googleapis.com/v1/places:searchText';

function key() {
  const k = process.env.GOOGLE_PLACES_API_KEY;
  if (!k) throw new Error('GOOGLE_PLACES_API_KEY required for submission validation.');
  return k;
}

const MASK = [
  'places.id', 'places.displayName', 'places.formattedAddress',
  'places.location', 'places.types', 'places.primaryType', 'places.businessStatus',
  'places.userRatingCount', 'places.rating',
].join(',');

export type PlacesMatch = {
  placeId: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  reviewCount: number | null;
  businessStatus: string | null;
  confidence: number; // 0..1 — higher = more confident the user's submission matches
};

const HAVERSINE_R = 6371000;
function metres(a: { lat: number; lng: number }, b: { lat: number | null; lng: number | null }): number {
  if (b.lat == null || b.lng == null) return Infinity;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat); const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat); const lat2 = toRad(b.lat);
  const s = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * HAVERSINE_R * Math.asin(Math.sqrt(s));
}

function nameSim(a: string, b: string): number {
  // Cheap Jaccard over lowercased character bigrams.
  const grams = (s: string) => {
    const x = s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const out = new Set<string>();
    for (let i = 0; i < x.length - 1; i++) out.add(x.slice(i, i + 2));
    return out;
  };
  const A = grams(a); const B = grams(b);
  if (!A.size || !B.size) return 0;
  let inter = 0; for (const g of A) if (B.has(g)) inter++;
  return inter / (A.size + B.size - inter);
}

export async function findPlacesMatch(input: {
  name: string;
  city: string;
  lat?: number | null;
  lng?: number | null;
}): Promise<PlacesMatch | null> {
  const body: Record<string, unknown> = { textQuery: `${input.name} ${input.city}`, languageCode: 'en' };
  if (input.lat != null && input.lng != null) {
    body.locationBias = { circle: { center: { latitude: input.lat, longitude: input.lng }, radius: 2000 } };
  }
  const res = await fetch(SEARCH_TEXT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key(),
      'X-Goog-FieldMask': MASK,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const json = await res.json() as { places?: Array<Record<string, unknown>> };
  const top = json.places?.[0];
  if (!top) return null;

  const name = ((top.displayName ?? {}) as { text?: string }).text ?? '';
  const loc = (top.location ?? {}) as { latitude?: number; longitude?: number };
  const sim = nameSim(name, input.name);
  const distM = input.lat != null && input.lng != null
    ? metres({ lat: input.lat, lng: input.lng }, { lat: loc.latitude ?? null, lng: loc.longitude ?? null })
    : 0;
  const distScore = distM === Infinity ? 0.5 : Math.max(0, 1 - distM / 1000); // 0m → 1.0, 1km+ → 0

  const confidence = Math.max(0, Math.min(1, 0.55 * sim + 0.45 * distScore));

  return {
    placeId: top.id as string,
    name,
    address: (top.formattedAddress as string) ?? null,
    lat: loc.latitude ?? null,
    lng: loc.longitude ?? null,
    rating: (top.rating as number) ?? null,
    reviewCount: (top.userRatingCount as number) ?? null,
    businessStatus: (top.businessStatus as string) ?? null,
    confidence,
  };
}
