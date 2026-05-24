// Google Places API (New) client — places:searchText with a tight FieldMask.
// §9: at most `maxPageTokens` pages of pagination per query (cost control, §17).
// We never query Places from the public site; only this seed pipeline does.

const SEARCH_TEXT_URL = 'https://places.googleapis.com/v1/places:searchText';

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.types',
  'places.primaryType',
  'places.businessStatus',
  'places.nationalPhoneNumber',
  'places.regularOpeningHours',
  'places.priceLevel',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.photos',
  'nextPageToken',
].join(',');

function apiKey() {
  const k = process.env.GOOGLE_PLACES_API_KEY;
  if (!k) throw new Error('GOOGLE_PLACES_API_KEY is required for ingest.');
  return k;
}

export async function searchText({ textQuery, includedType, location, maxPageTokens = 2 }) {
  const results = [];
  let pageToken = null;
  let pages = 0;

  do {
    const body = { textQuery, locationBias: location, languageCode: 'en' };
    if (includedType) body.includedType = includedType;
    if (pageToken) body.pageToken = pageToken;

    const res = await fetch(SEARCH_TEXT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey(),
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Places searchText ${res.status}: ${txt.slice(0, 300)}`);
    }

    const json = await res.json();
    if (Array.isArray(json.places)) results.push(...json.places);
    pageToken = json.nextPageToken ?? null;
    pages++;

    // Per Places: the next page is briefly unavailable; back off slightly.
    if (pageToken && pages < maxPageTokens) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  } while (pageToken && pages < maxPageTokens);

  return results;
}

// Resolve a photo reference to a stable Google photo URL we can store in DB.
// `skipHttpRedirect=true` returns JSON with the underlying photoUri; we keep that URL.
export async function resolvePhotoUrl(photoName, { maxWidthPx = 1200 } = {}) {
  const url = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&skipHttpRedirect=true&key=${encodeURIComponent(apiKey())}`;
  const res = await fetch(url);
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Places photo media ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json = await res.json();
  return json.photoUri ?? null;
}
