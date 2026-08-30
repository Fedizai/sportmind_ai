import { NextResponse } from 'next/server';

/**
 * Approximate shopping region.
 *
 * Three jobs behind one route:
 *   GET /api/region                          -> coarse region for this request's IP
 *   GET /api/region?list=countries           -> countries Open Prices has data for
 *   GET /api/region?list=cities&country=     -> cities in one of those countries
 *   GET /api/region?resolve=city&name=&country= -> that city's coordinates
 *
 * Privacy: the IP is read from the request headers, handed to the geolocation
 * service, and dropped. It is never written to Firestore, never logged, and
 * never returned to the browser. What comes back is a country, a city name and
 * a city-level coordinate — enough to ask "what do groceries cost around
 * here", and nothing finer. The browser's precise Geolocation API is not used
 * and no permission is requested for it.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface RegionInfo {
  country: string | null;
  countryCode: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  /** "Liège, Belgium" — what the picker shows. */
  label: string;
}

const PLACES_TTL_MS = 24 * 60 * 60 * 1000;
const placesCache = new Map<string, { at: number; body: unknown }>();

/**
 * The caller's address, as the proxy in front of us reports it.
 *
 * Returns null on loopback and private ranges: in local development the only
 * address available is the dev machine's own, and geolocating that would be
 * asking a stranger about our own network for no benefit.
 */
function clientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  const candidate =
    forwarded?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    null;

  if (!candidate) return null;
  if (
    candidate === '::1' ||
    candidate.startsWith('127.') ||
    candidate.startsWith('10.') ||
    candidate.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(candidate)
  ) {
    return null;
  }
  return candidate;
}

function labelFor(city: string | null, country: string | null): string {
  return [city, country].filter(Boolean).join(', ');
}

async function getJson(url: string): Promise<any | null> {
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(6_000),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Two keyless providers, tried in order. Both return country/city/coordinates
 * for an address with no account and no API key; neither is asked for, nor
 * returns, anything more precise than a city centroid.
 */
async function locate(ip: string | null): Promise<RegionInfo | null> {
  const primary = await getJson(ip ? `https://ipwho.is/${ip}` : 'https://ipwho.is/');
  if (primary?.success && primary.country_code) {
    return {
      country: primary.country ?? null,
      countryCode: String(primary.country_code).toUpperCase(),
      city: primary.city ?? null,
      latitude: typeof primary.latitude === 'number' ? primary.latitude : null,
      longitude: typeof primary.longitude === 'number' ? primary.longitude : null,
      label: labelFor(primary.city ?? null, primary.country ?? null),
    };
  }

  const fallback = await getJson(
    ip ? `https://get.geojs.io/v1/ip/geo/${ip}.json` : 'https://get.geojs.io/v1/ip/geo.json'
  );
  if (fallback?.country_code) {
    const latitude = parseFloat(fallback.latitude);
    const longitude = parseFloat(fallback.longitude);
    return {
      country: fallback.country ?? null,
      countryCode: String(fallback.country_code).toUpperCase(),
      city: fallback.city ?? null,
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null,
      label: labelFor(fallback.city ?? null, fallback.country ?? null),
    };
  }

  return null;
}

/** Countries and cities come from Open Prices itself, so the picker can only offer places that have prices. */
async function places(list: string, country: string | null) {
  const key = `${list}:${country ?? ''}`;
  const hit = placesCache.get(key);
  if (hit && Date.now() - hit.at < PLACES_TTL_MS) return hit.body;

  const url =
    list === 'cities' && country
      ? `https://prices.openfoodfacts.org/api/v1/locations/osm/countries/${encodeURIComponent(country)}/cities`
      : 'https://prices.openfoodfacts.org/api/v1/locations/osm/countries';

  const raw = await getJson(url);
  if (!Array.isArray(raw)) return null;

  const body =
    list === 'cities'
      ? raw
          // A city with no observations cannot produce an estimate, so offering
          // it would only be a way to pick emptiness.
          .filter((c: any) => (c?.price_count ?? 0) > 0 && c?.osm_name)
          .map((c: any) => ({ name: c.osm_name as string, priceCount: c.price_count as number }))
          .sort((a: any, b: any) => b.priceCount - a.priceCount)
      : raw
          .filter((c: any) => (c?.price_count ?? 0) > 0 && c?.country_code_2)
          .map((c: any) => ({
            name: c.name as string,
            code: c.country_code_2 as string,
            priceCount: c.price_count as number,
          }))
          .sort((a: any, b: any) => b.priceCount - a.priceCount);

  placesCache.set(key, { at: Date.now(), body });
  return body;
}

/**
 * A chosen city's coordinates, averaged over the shops Open Prices knows in it.
 *
 * The picker needs these: without a coordinate the price engine can only widen
 * to the whole country, and picking Liège would give the same answer as
 * picking Brussels. The cities endpoint does not carry them, so they are read
 * from the shop locations that report that city.
 */
async function resolveCity(name: string, country: string | null) {
  const key = `resolve:${name}:${country ?? ''}`;
  const hit = placesCache.get(key);
  if (hit && Date.now() - hit.at < PLACES_TTL_MS) return hit.body as RegionInfo | null;

  const url =
    'https://prices.openfoodfacts.org/api/v1/locations' +
    `?osm_address_city__like=${encodeURIComponent(name)}&price_count__gte=1&size=25`;

  const raw = await getJson(url);
  const items: any[] = Array.isArray(raw?.items) ? raw.items : [];

  const matching = items.filter((i) => {
    const cityMatches = String(i?.osm_address_city ?? '').toLowerCase() === name.toLowerCase();
    const countryMatches =
      !country || String(i?.osm_address_country_code ?? '').toUpperCase() === country.toUpperCase();
    return cityMatches && countryMatches && Number.isFinite(i?.osm_lat) && Number.isFinite(i?.osm_lon);
  });

  if (matching.length === 0) {
    placesCache.set(key, { at: Date.now(), body: null });
    return null;
  }

  const latitude = matching.reduce((sum, i) => sum + i.osm_lat, 0) / matching.length;
  const longitude = matching.reduce((sum, i) => sum + i.osm_lon, 0) / matching.length;
  const countryName = matching[0]?.osm_address_country ?? null;
  const countryCode = String(matching[0]?.osm_address_country_code ?? country ?? '').toUpperCase() || null;

  const body: RegionInfo = {
    country: countryName,
    countryCode,
    city: name,
    latitude,
    longitude,
    label: labelFor(name, countryName),
  };
  placesCache.set(key, { at: Date.now(), body });
  return body;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const list = url.searchParams.get('list');

  if (url.searchParams.get('resolve') === 'city') {
    const name = url.searchParams.get('name');
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
    const region = await resolveCity(name, url.searchParams.get('country'));
    return NextResponse.json({ region });
  }

  if (list === 'countries' || list === 'cities') {
    const body = await places(list, url.searchParams.get('country'));
    if (!body) return NextResponse.json({ error: 'unavailable' }, { status: 503 });
    return NextResponse.json({ items: body });
  }

  const region = await locate(clientIp(request));
  if (!region) {
    // No fabricated default. The UI asks the athlete to choose instead.
    return NextResponse.json({ region: null }, { status: 200 });
  }
  return NextResponse.json({ region });
}
