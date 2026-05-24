'use client';

import { createContext, useContext, useEffect, useState } from 'react';

// Two-tier visitor location:
//   1. IP lookup (ipapi.co — free, no key) runs after hydration. Good enough
//      to detect country / regional default locale, but the coordinates are
//      the visitor's ISP egress, NOT their actual position. For Greek mobile
//      and home connections this routes through Athens — so a user in
//      Loutraki gets "Athens, 0.7 km" because that's where the ISP's NAT
//      lives. This is fundamental IP-geo, not a bug.
//   2. `requestPrecise()` upgrades to navigator.geolocation when the user
//      asks. Triggers the browser permission popup, then reverse-geocodes
//      the lat/lng via BigDataCloud (free, no key, CORS-enabled) to pick a
//      readable city/region. Stored as source='precise' and overrides the
//      IP layer for the haversine math everywhere.
//
// Why client-side: doing geolocation server-side would break ISR/Cloudflare
// caching and trigger SEO cloaking flags. CLAUDE.md §10 forbids per-visitor
// server personalisation.

const STORAGE_KEY = 'cn:visitor-loc';
const STORAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type VisitorLocation = {
  countryCode: string | null;  // ISO alpha-2, e.g. 'GR'
  city: string | null;         // e.g. 'Loutraki', 'Korinthos' — small towns supported
  region: string | null;       // e.g. 'Peloponnese'
  lat: number | null;
  lng: number | null;
  source: 'ip' | 'precise' | 'unknown';
  fetchedAt: number;           // epoch ms
};

const EMPTY: VisitorLocation = {
  countryCode: null, city: null, region: null, lat: null, lng: null, source: 'unknown', fetchedAt: 0,
};

type Ctx = {
  visitor: VisitorLocation;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Ask the browser for GPS-precise coordinates. Triggers a permission popup. */
  requestPrecise: () => Promise<void>;
  /** True while we're waiting on the permission popup / GPS fix / reverse geocode. */
  preciseLoading: boolean;
};

const VisitorLocationContext = createContext<Ctx>({
  visitor: EMPTY, loading: false, error: null,
  refresh: async () => {}, requestPrecise: async () => {}, preciseLoading: false,
});

function loadCache(): VisitorLocation | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VisitorLocation;
    if (!parsed.fetchedAt || Date.now() - parsed.fetchedAt > STORAGE_TTL_MS) return null;
    return parsed;
  } catch { return null; }
}

function saveCache(v: VisitorLocation): void {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); } catch { /* private mode */ }
}

type ReverseGeocoded = { city: string | null; region: string | null; countryCode: string | null };

async function reverseGeocode(lat: number, lng: number, locale: string): Promise<ReverseGeocoded> {
  // BigDataCloud's reverse-geocode-client endpoint is free, key-less and CORS-
  // enabled. It returns the locality (small Greek towns included) plus the
  // principalSubdivision (the region) — exactly the shape we want.
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=${encodeURIComponent(locale)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`bdc ${res.status}`);
    const j = (await res.json()) as {
      city?: string; locality?: string; principalSubdivision?: string; countryCode?: string;
    };
    return {
      // `locality` is the small-town field (e.g. "Loutraki"); `city` often
      // collapses to the regional capital, so prefer locality when available.
      city: j.locality || j.city || null,
      region: j.principalSubdivision || null,
      countryCode: j.countryCode || null,
    };
  } catch {
    return { city: null, region: null, countryCode: null };
  }
}

function getPrecisePosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('geolocation unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12_000,
      maximumAge: 60_000,
    });
  });
}

async function fetchFromIpapi(): Promise<VisitorLocation> {
  // Free, no key, returns city for small Greek towns (Loutraki, Nafplio, etc.).
  // We request only the fields we need to keep the response small.
  const res = await fetch('https://ipapi.co/json/?fields=country_code,city,region,latitude,longitude', {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`ipapi.co ${res.status}`);
  const json = (await res.json()) as {
    country_code?: string; city?: string; region?: string;
    latitude?: number; longitude?: number;
    error?: boolean; reason?: string;
  };
  if (json.error) throw new Error(json.reason ?? 'ipapi.co error');
  return {
    countryCode: json.country_code ?? null,
    city: json.city ?? null,
    region: json.region ?? null,
    lat: typeof json.latitude === 'number' ? json.latitude : null,
    lng: typeof json.longitude === 'number' ? json.longitude : null,
    source: 'ip',
    fetchedAt: Date.now(),
  };
}

export function VisitorLocationProvider({ children }: { children: React.ReactNode }) {
  const [visitor, setVisitor] = useState<VisitorLocation>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [preciseLoading, setPreciseLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const v = await fetchFromIpapi();
      setVisitor(v);
      saveCache(v);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'lookup failed');
    } finally {
      setLoading(false);
    }
  }

  async function requestPrecise() {
    setPreciseLoading(true);
    setError(null);
    try {
      const pos = await getPrecisePosition();
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      // Reverse-geocode in the browser's language so "Loutraki" shows in EN,
      // "Λουτράκι" in EL, etc. document.documentElement.lang is set by the
      // [locale] layout (HREFLANG[locale]).
      const lang = typeof document !== 'undefined' ? document.documentElement.lang || 'en' : 'en';
      const rg = await reverseGeocode(lat, lng, lang);
      const next: VisitorLocation = {
        countryCode: rg.countryCode ?? visitor.countryCode,
        city: rg.city,
        region: rg.region ?? visitor.region,
        lat, lng,
        source: 'precise',
        fetchedAt: Date.now(),
      };
      setVisitor(next);
      saveCache(next);
    } catch (e) {
      // PERMISSION_DENIED = 1, POSITION_UNAVAILABLE = 2, TIMEOUT = 3
      const code = (e as GeolocationPositionError | undefined)?.code;
      const msg = code === 1 ? 'permission denied'
                : code === 2 ? 'position unavailable'
                : code === 3 ? 'timeout'
                : (e instanceof Error ? e.message : 'precise lookup failed');
      setError(msg);
    } finally {
      setPreciseLoading(false);
    }
  }

  useEffect(() => {
    // Two-tier sequence:
    //   1. Render from localStorage if we already have something fresh.
    //   2. Always fetch the IP layer so we have a working fallback within ~1s.
    //   3. Auto-trigger the precise (GPS) upgrade — but only if the visitor
    //      hasn't already denied geolocation for this origin. The Permissions
    //      API tells us this without firing a popup. On `prompt` the browser
    //      shows its native permission dialog; on `granted` it's silent.
    const cached = loadCache();
    if (cached) {
      setVisitor(cached);
    }

    // If we already have a fresh precise fix in cache, don't re-prompt.
    if (cached?.source === 'precise') return;

    // Run IP refresh in parallel with the precise attempt — IP is faster but
    // less accurate; precise overrides it when (and if) it lands.
    if (!cached) {
      refresh().catch(() => { /* swallowed; error state already set */ });
    }

    let cancelled = false;
    (async () => {
      try {
        // Permissions API is supported everywhere we care about (Chrome,
        // Edge, Firefox, Safari 16+). If it's missing we just attempt anyway
        // — that'll surface the popup on first run, which is the goal.
        if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
          const status = await navigator.permissions.query({ name: 'geolocation' });
          if (status.state === 'denied') {
            // Visitor said no in a previous session — don't re-prompt.
            setError('permission denied');
            return;
          }
        }
        if (cancelled) return;
        await requestPrecise();
      } catch {
        // Permissions API itself failed — fall back to attempting the prompt.
        if (!cancelled) await requestPrecise();
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <VisitorLocationContext.Provider
      value={{ visitor, loading, error, refresh, requestPrecise, preciseLoading }}
    >
      {children}
    </VisitorLocationContext.Provider>
  );
}

export function useVisitorLocation(): Ctx {
  return useContext(VisitorLocationContext);
}
