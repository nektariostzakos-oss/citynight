'use client';

import { createContext, useContext, useMemo } from 'react';
import { useVisitorLocation } from './visitor-location-provider';
import { sortByDistance, type LatLng } from '@/lib/geo-distance';

// Wraps the raw visitor location with the published city list (passed in from
// the server layout via props) and exposes ordered "nearest cities" so any
// child component can reorder/highlight without re-doing the distance math.
//
// Server passes the canonical city list; client sorts it. Server HTML and
// crawler HTML stay identical (alphabetical / by-region) — only the client
// UI reorders.

export type CityForNearby = {
  id: string;
  slug: string;
  name: string;
  region: string | null;
  lat: number | null;
  lng: number | null;
};

export type CityWithDistance = CityForNearby & { distanceKm: number };

type Ctx = {
  hasLocation: boolean;
  visitor: { city: string | null; countryCode: string | null } | null;
  nearestCities: CityWithDistance[]; // top 10, ordered by distance
  sortedAllCities: CityWithDistance[]; // full list ordered by distance (Infinity at end)
};

const NearbyCitiesContext = createContext<Ctx>({
  hasLocation: false, visitor: null, nearestCities: [], sortedAllCities: [],
});

export function NearbyCitiesProvider({ children, cities }: { children: React.ReactNode; cities: CityForNearby[] }) {
  const { visitor } = useVisitorLocation();

  const value = useMemo<Ctx>(() => {
    const hasLocation = typeof visitor.lat === 'number' && typeof visitor.lng === 'number';
    if (!hasLocation) {
      return { hasLocation: false, visitor: null, nearestCities: [], sortedAllCities: [] };
    }
    const origin: LatLng = { lat: visitor.lat!, lng: visitor.lng! };
    const sorted = sortByDistance(origin, cities);
    return {
      hasLocation: true,
      visitor: { city: visitor.city, countryCode: visitor.countryCode },
      nearestCities: sorted.filter((c) => Number.isFinite(c.distanceKm)).slice(0, 10),
      sortedAllCities: sorted,
    };
  }, [visitor, cities]);

  return <NearbyCitiesContext.Provider value={value}>{children}</NearbyCitiesContext.Provider>;
}

export function useNearbyCities(): Ctx {
  return useContext(NearbyCitiesContext);
}
