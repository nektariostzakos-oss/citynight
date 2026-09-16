import { NextRequest, NextResponse } from 'next/server';
import { searchVenues, searchCities, searchCategories } from '@/lib/queries';
import { isLocale } from '@/lib/i18n';
import { db } from '@/db';
import { ipKey, rateLimit429 } from '@/lib/rate-limit';

// FTS5 typeahead + small-table LIKE scan for cities/categories. Biased to the
// detected city (§14). Returns minimal JSON so the modal stays snappy.
//
// Per-IP throttle: typeahead fires per keystroke, so 90/min is generous for a
// human and a wall for a scraper looping the whole dictionary through SQLite on
// a shared host.

export async function GET(req: NextRequest) {
  const limited = rateLimit429(`search:${ipKey(req)}`, { max: 90, windowMs: 60_000 });
  if (limited) return limited;
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') ?? '').slice(0, 80);
  const localeParam = searchParams.get('locale') ?? 'en';
  const citySlug = searchParams.get('city');
  if (!isLocale(localeParam)) return NextResponse.json({ venues: [], cities: [], categories: [] });

  let cityId: string | undefined;
  if (citySlug) {
    const row = db.$client.prepare(`SELECT id FROM cities WHERE slug = ?`).get(citySlug) as { id: string } | undefined;
    cityId = row?.id;
  }

  const venues = searchVenues(q, { cityId, locale: localeParam, limit: 8 });
  const cities = searchCities(q, 5);
  const categories = searchCategories(q, 5);
  return NextResponse.json(
    { venues, cities, categories, hits: venues }, // `hits` kept for any older callers
    { headers: { 'cache-control': 'no-store' } }
  );
}
