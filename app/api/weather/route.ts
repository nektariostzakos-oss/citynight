import { NextResponse } from 'next/server';
import { getCityWeather, weatherLabel, windCompass } from '@/lib/weather';

// GET /api/weather?lat=37.98&lng=23.72&locale=el
//
// Tiny passthrough that lets the client read the same Open-Meteo data
// the server already caches in-process. We never expose lat/lng back —
// the response is just the cached weather snapshot. Used by the hero
// live-status pill so the temperature shown matches the visitor's
// actual GPS, not Athens' national average.
//
// Cache layers stack: in-process 15-min map + Next route cache.
// Falls back to Athens (37.98, 23.72) when the request omits coords or
// passes garbage, so the pill never renders blank.

export const revalidate = 900;

const ATHENS = { lat: 37.9838, lng: 23.7275 };

export async function GET(req: Request) {
  const url = new URL(req.url);
  const latRaw = Number(url.searchParams.get('lat'));
  const lngRaw = Number(url.searchParams.get('lng'));
  const locale = url.searchParams.get('locale') ?? 'en';

  const inGreeceBox = (lat: number, lng: number) =>
    lat >= 34 && lat <= 42 && lng >= 19 && lng <= 30;

  const usable = Number.isFinite(latRaw) && Number.isFinite(lngRaw);
  const lat = usable ? latRaw : ATHENS.lat;
  const lng = usable ? lngRaw : ATHENS.lng;

  // If the visitor is well outside Greece (e.g. browsing while abroad),
  // fall back to Athens so the pill stays meaningful for the editorial
  // surface — we're a Greek-only product.
  const useLat = usable && inGreeceBox(lat, lng) ? lat : ATHENS.lat;
  const useLng = usable && inGreeceBox(lat, lng) ? lng : ATHENS.lng;

  const weather = await getCityWeather(useLat, useLng);
  if (!weather) {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
  const label = weatherLabel(weather.weatherCode, locale);
  return NextResponse.json({
    ok: true,
    tempC: Math.round(weather.temperatureC),
    feelsLikeC: Math.round(weather.feelsLikeC),
    windKmh: Math.round(weather.windKmh),
    windCompass: windCompass(weather.windDegrees, locale),
    weatherCode: weather.weatherCode,
    emoji: label.emoji,
    label: label.text,
    isDay: weather.isDay,
    usedFallback: !usable || !inGreeceBox(latRaw, lngRaw),
  });
}
