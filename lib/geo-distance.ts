// Haversine distance helpers — used by the visitor-location flow to surface
// the nearest cities/areas/venues without burning a paid geocoding API. Pure
// functions, isomorphic (server + client).

export type LatLng = { lat: number; lng: number };

const EARTH_KM = 6371.0088;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two points, in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

/** Rounded display value: < 10 km → 1 decimal, otherwise integer. */
export function formatDistanceKm(km: number): string {
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

/** Sort an array of items that each carry a `lat`/`lng` by ascending distance
 *  from `origin`. Items without lat/lng go to the bottom (Infinity distance).
 *  Accepts `null` as well as `undefined` so DB rows (`number | null`) can be
 *  passed straight in. */
type MaybeLatLng = { lat?: number | null; lng?: number | null };
export function sortByDistance<T extends MaybeLatLng>(
  origin: LatLng,
  items: readonly T[],
): (T & { distanceKm: number })[] {
  return items
    .map((it) => {
      const lat = typeof it.lat === 'number' ? it.lat : null;
      const lng = typeof it.lng === 'number' ? it.lng : null;
      const distanceKm = lat !== null && lng !== null ? haversineKm(origin, { lat, lng }) : Infinity;
      return { ...it, distanceKm };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/** Top-N nearest from `items`, filtering out items without coordinates. */
export function nearestN<T extends MaybeLatLng>(
  origin: LatLng,
  items: readonly T[],
  n: number,
): (T & { distanceKm: number })[] {
  return sortByDistance(origin, items).filter((x) => Number.isFinite(x.distanceKm)).slice(0, n);
}
