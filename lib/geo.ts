import { headers } from 'next/headers';

// Cloudflare sits in front of Hostinger (LAW §4). CF-IPCountry is free and reliable;
// we never call a paid geo-IP service. Local dev (no CF) falls back to DEV_COUNTRY_OVERRIDE.
//
// Returns an uppercase ISO-3166 alpha-2 code (e.g. 'GR'), or null if unknown.

const CF_HEADER = 'cf-ipcountry';

export async function getCountryCode(): Promise<string | null> {
  const h = await headers();
  const cf = h.get(CF_HEADER);

  // CF returns 'XX' for unknown, 'T1' for Tor — treat as unknown.
  if (cf && cf !== 'XX' && cf !== 'T1') return cf.toUpperCase();

  if (process.env.NODE_ENV !== 'production') {
    const dev = process.env.DEV_COUNTRY_OVERRIDE;
    if (dev) return dev.toUpperCase();
  }
  return null;
}
