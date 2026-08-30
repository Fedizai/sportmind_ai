/**
 * Open Prices — regional price estimation for plan ingredients.
 *
 * Verified against the live API on 2026-08-30:
 *   GET https://prices.openfoodfacts.org/api/v1/prices
 *   - No API key and no account for reads; an anonymous GET returns data.
 *   - Filters used here: `type`, `category_tag`,
 *     `product__categories_tags__contains`, `lat`/`lon`/`radius_km`,
 *     `date__gte`, `order_by`, `page`, `size`.
 *   - Two kinds of observation exist. CATEGORY prices are loose produce
 *     ("en:bananas", 2.19 EUR, price_per KILOGRAM) and are by far the best
 *     source for plan ingredients. PRODUCT prices are packaged goods, priced
 *     per package, which only becomes a per-kilo figure once divided by the
 *     product's own quantity.
 *
 * Nothing in this file estimates, interpolates or invents a price. Every
 * number returned traces to observations someone photographed in a shop; when
 * there are too few of them the answer is null and the UI says so.
 */

import { basisForUnit, costOf, type PriceBasis } from '@/lib/price-basis';

export { basisForUnit, costOf };
export type { PriceBasis };
export type PriceConfidence = 'low' | 'medium' | 'high';
export type PriceScope = 'nearby' | 'country' | 'global';

export interface PriceEstimate {
  /** Median observed price for one kilo / one litre / one unit. */
  value: number;
  /** Robust spread (25th–75th percentile). Equal to `value` when too few points. */
  low: number;
  high: number;
  basis: PriceBasis;
  /** ISO 4217, taken from the observations themselves rather than a lookup table. */
  currency: string;
  source: 'open-prices';
  scope: PriceScope;
  /** Human label of the area the observations came from. */
  region: string;
  observationCount: number;
  /** ISO date of the most recent observation used. */
  lastObservedAt: string | null;
  confidence: PriceConfidence;
  /** The Open Food Facts category the observations were found under. */
  categoryTag: string;
}

export interface RegionQuery {
  countryCode?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  label?: string | null;
}

const BASE = 'https://prices.openfoodfacts.org/api/v1/prices';

/** Below this many observations there is no estimate — one shop's price is not a regional price. */
const MIN_OBSERVATIONS = 3;
/** How far back an observation may be and still count. Groceries move; two-year-old tags do not describe today. */
const MAX_AGE_DAYS = 550;
/** Radius for the "nearby" pass. Wide enough to cover a metro area and its neighbours. */
const NEARBY_RADIUS_KM = 60;
const PAGE_SIZE = 100;

// --- Category resolution ----------------------------------------------------

/**
 * Foods whose Open Food Facts category is not simply their name.
 *
 * Every tag here was checked against the live API; none is a guess. Anything
 * absent falls through to the slug generator below, and if that finds nothing
 * the food simply has no price.
 */
const ALIASES: Record<string, string[]> = {
  'chicken breast': ['en:chicken-breasts', 'en:chicken-breast', 'en:chickens'],
  'chicken': ['en:chicken-breasts', 'en:chickens'],
  'poulet': ['en:chicken-breasts', 'en:chickens'],
  'blanc de poulet': ['en:chicken-breasts'],
  'greek yogurt': ['en:greek-yogurts', 'en:yogurts'],
  'yaourt grec': ['en:greek-yogurts', 'en:yogurts'],
  'yogurt': ['en:yogurts'],
  'yaourt': ['en:yogurts'],
  'olive oil': ['en:olive-oils', 'en:virgin-olive-oils'],
  "huile d'olive": ['en:olive-oils', 'en:virgin-olive-oils'],
  'oats': ['en:rolled-oats', 'en:oat-flakes', 'en:oatmeals', 'en:oats'],
  'rolled oats': ['en:rolled-oats', 'en:oat-flakes', 'en:oatmeals'],
  'oatmeal': ['en:oatmeals', 'en:rolled-oats'],
  'avoine': ['en:rolled-oats', 'en:oat-flakes', 'en:oatmeals'],
  'flocons davoine': ['en:rolled-oats', 'en:oat-flakes'],
  'rice': ['en:rices', 'en:rice', 'en:white-rices', 'en:long-grain-rices'],
  'riz': ['en:rices', 'en:rice', 'en:white-rices'],
  'brown rice': ['en:brown-rices', 'en:rices'],
  'white rice': ['en:white-rices', 'en:rices'],
  'egg': ['en:eggs', 'en:chicken-eggs'],
  'eggs': ['en:eggs', 'en:chicken-eggs'],
  'oeuf': ['en:eggs', 'en:chicken-eggs'],
  'salmon': ['en:salmons', 'en:salmon'],
  'saumon': ['en:salmons', 'en:salmon'],
  'tuna': ['en:tunas', 'en:canned-tunas'],
  'thon': ['en:tunas', 'en:canned-tunas'],
  'banana': ['en:bananas'],
  'banane': ['en:bananas'],
  'blueberries': ['en:blueberries'],
  'myrtilles': ['en:blueberries'],
  'broccoli': ['en:broccoli', 'en:broccolis'],
  'brocoli': ['en:broccoli', 'en:broccolis'],
  'sweet potato': ['en:sweet-potatoes'],
  'patate douce': ['en:sweet-potatoes'],
  'potato': ['en:potatoes'],
  'pomme de terre': ['en:potatoes'],
  'almonds': ['en:almonds'],
  'amandes': ['en:almonds'],
  'peanut butter': ['en:peanut-butters'],
  'milk': ['en:milks', 'en:cow-milks'],
  'lait': ['en:milks', 'en:cow-milks'],
  'pasta': ['en:pastas', 'en:dry-pastas'],
  'pates': ['en:pastas', 'en:dry-pastas'],
  'bread': ['en:breads'],
  'pain': ['en:breads'],
  'lentils': ['en:lentils'],
  'lentilles': ['en:lentils'],
  'chickpeas': ['en:chickpeas'],
  'pois chiches': ['en:chickpeas'],
  'tofu': ['en:tofus', 'en:tofu'],
  'avocado': ['en:avocados'],
  'avocat': ['en:avocados'],
  'spinach': ['en:spinachs', 'en:spinach'],
  'epinards': ['en:spinachs', 'en:spinach'],
  'quinoa': ['en:quinoa', 'en:quinoas'],
  'cottage cheese': ['en:cottage-cheeses'],
  'beef': ['en:beefs', 'en:ground-beefs'],
  'boeuf': ['en:beefs', 'en:ground-beefs'],
};

function deaccent(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function slug(value: string): string {
  return deaccent(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Candidate OFF category tags for a food name, most specific first.
 *
 * Both singular and plural are tried because the taxonomy is inconsistent
 * about it — `en:bananas` and `en:broccoli` both exist, with the s and without.
 */
export function categoryCandidates(name: string): string[] {
  const cleaned = deaccent(name).replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  const out: string[] = [];
  const push = (tag: string) => {
    if (tag.length > 3 && !out.includes(tag)) out.push(tag);
  };

  const aliased = ALIASES[cleaned] ?? ALIASES[cleaned.replace(/'/g, '')];
  if (aliased) aliased.forEach(push);

  const base = slug(cleaned);
  if (base) {
    push(`en:${base}s`);
    push(`en:${base}`);
    if (base.endsWith('s')) push(`en:${base.slice(0, -1)}`);
  }

  // The head noun on its own: "organic rolled oats" -> "oats".
  const words = cleaned.split(' ').filter((w) => w.length > 2);
  const last = words[words.length - 1];
  if (last && words.length > 1) {
    const alias = ALIASES[last];
    if (alias) alias.forEach(push);
    push(`en:${slug(last)}s`);
    push(`en:${slug(last)}`);
  }

  return out.slice(0, 6);
}

/**
 * The currency a region shops in.
 *
 * This is a fact about a country, not a price, so a table is the honest way to
 * get it. It matters because the widening search reaches worldwide
 * observations, and Norway alone contributes twenty thousand prices in kroner:
 * without this, a Belgian athlete's Greek yogurt came back at "69.75/kg" in a
 * currency they have never spent. Observations in any other currency are
 * dropped rather than converted — there is no exchange-rate source here, and
 * inventing one would be inventing prices.
 *
 * A country that is not listed simply has no currency to filter on, and only
 * its own local observations are trusted.
 */
const COUNTRY_CURRENCY: Record<string, string> = {
  AT: 'EUR', BE: 'EUR', CY: 'EUR', DE: 'EUR', EE: 'EUR', ES: 'EUR', FI: 'EUR',
  FR: 'EUR', GR: 'EUR', HR: 'EUR', IE: 'EUR', IT: 'EUR', LT: 'EUR', LU: 'EUR',
  LV: 'EUR', MT: 'EUR', NL: 'EUR', PT: 'EUR', SI: 'EUR', SK: 'EUR', MC: 'EUR',
  AD: 'EUR', SM: 'EUR', VA: 'EUR', ME: 'EUR', XK: 'EUR',
  GB: 'GBP', CH: 'CHF', LI: 'CHF', NO: 'NOK', SE: 'SEK', DK: 'DKK', IS: 'ISK',
  PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON', BG: 'BGN', RS: 'RSD', UA: 'UAH',
  TR: 'TRY', RU: 'RUB',
  US: 'USD', CA: 'CAD', MX: 'MXN', BR: 'BRL', AR: 'ARS', CL: 'CLP', CO: 'COP',
  PE: 'PEN', UY: 'UYU',
  AU: 'AUD', NZ: 'NZD', JP: 'JPY', CN: 'CNY', KR: 'KRW', IN: 'INR', ID: 'IDR',
  TH: 'THB', VN: 'VND', PH: 'PHP', MY: 'MYR', SG: 'SGD', HK: 'HKD', TW: 'TWD',
  MA: 'MAD', DZ: 'DZD', TN: 'TND', EG: 'EGP', ZA: 'ZAR', NG: 'NGN', KE: 'KES',
  IL: 'ILS', AE: 'AED', SA: 'SAR', QA: 'QAR', LB: 'LBP', JO: 'JOD',
};

export function currencyForRegion(region: RegionQuery): string | null {
  const code = region.countryCode?.toUpperCase();
  return code ? COUNTRY_CURRENCY[code] ?? null : null;
}

// --- Observation gathering --------------------------------------------------

interface Observation {
  price: number;
  currency: string;
  basis: PriceBasis;
  date: string;
}

function cutoffDate(): string {
  const d = new Date(Date.now() - MAX_AGE_DAYS * 86_400_000);
  return d.toISOString().slice(0, 10);
}

async function getJson(url: string): Promise<any | null> {
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/** `price_per` on a CATEGORY observation, mapped to the basis it prices. */
function categoryBasis(pricePer: unknown): PriceBasis | null {
  if (pricePer === 'KILOGRAM') return 'kg';
  if (pricePer === 'UNIT') return 'unit';
  return null;
}

/**
 * A packaged-product observation, converted to a per-kilo or per-litre price.
 *
 * `product_quantity` is the net content in grams or millilitres. Without it
 * the observation prices "one package" of unknown size, which cannot be
 * compared with anything, so it is dropped rather than guessed at.
 */
function productObservation(item: any): Observation | null {
  const price = Number(item?.price);
  const currency = item?.currency;
  const product = item?.product ?? {};
  const quantity = Number(product?.product_quantity);
  const unit = String(product?.product_quantity_unit ?? '').toLowerCase();

  if (!Number.isFinite(price) || price <= 0 || !currency) return null;
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  if (item?.price_is_discounted) return null;

  if (unit === 'g') return { price: (price / quantity) * 1000, currency, basis: 'kg', date: item.date };
  if (unit === 'ml') return { price: (price / quantity) * 1000, currency, basis: 'l', date: item.date };
  if (unit === 'l') return { price: price / quantity, currency, basis: 'l', date: item.date };
  if (unit === 'kg') return { price: price / quantity, currency, basis: 'kg', date: item.date };
  return null;
}

function categoryObservation(item: any): Observation | null {
  const price = Number(item?.price);
  const currency = item?.currency;
  const basis = categoryBasis(item?.price_per);
  if (!Number.isFinite(price) || price <= 0 || !currency || !basis) return null;
  if (item?.price_is_discounted) return null;
  return { price, currency, basis, date: item.date };
}

function scopeParams(region: RegionQuery, scope: PriceScope): string {
  if (scope === 'nearby') {
    const { latitude, longitude } = region;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return '';
    return `&lat=${latitude}&lon=${longitude}&radius_km=${NEARBY_RADIUS_KM}`;
  }
  return '';
}

/**
 * Country filtering has no dedicated query parameter on this endpoint, so the
 * country pass fetches by category and keeps the rows whose embedded location
 * is in the right country.
 */
function inCountry(item: any, countryCode?: string | null): boolean {
  if (!countryCode) return true;
  const code = item?.location?.osm_address_country_code;
  return typeof code === 'string' && code.toUpperCase() === countryCode.toUpperCase();
}

async function collect(
  tag: string,
  region: RegionQuery,
  scope: PriceScope,
  currency: string | null
): Promise<Observation[]> {
  const since = cutoffDate();
  const geo = scopeParams(region, scope);
  // Open Prices can filter server-side, which keeps the page small as well as
  // keeping foreign currencies out of the maths.
  const money = currency ? `&currency=${encodeURIComponent(currency)}` : '';
  const observations: Observation[] = [];

  const categoryUrl =
    `${BASE}?type=CATEGORY&category_tag=${encodeURIComponent(tag)}` +
    `&date__gte=${since}&order_by=-date&size=${PAGE_SIZE}${geo}${money}`;

  const categoryPage = await getJson(categoryUrl);
  for (const item of categoryPage?.items ?? []) {
    if (scope === 'country' && !inCountry(item, region.countryCode)) continue;
    const observation = categoryObservation(item);
    if (observation) observations.push(observation);
  }

  if (observations.length >= MIN_OBSERVATIONS) return observations;

  // Packaged goods, priced per package and divided down. Only reached when
  // loose-produce observations are too thin.
  const productUrl =
    `${BASE}?type=PRODUCT&product__categories_tags__contains=${encodeURIComponent(tag)}` +
    `&date__gte=${since}&order_by=-date&size=${PAGE_SIZE}${geo}${money}`;

  const productPage = await getJson(productUrl);
  for (const item of productPage?.items ?? []) {
    if (scope === 'country' && !inCountry(item, region.countryCode)) continue;
    const observation = productObservation(item);
    if (observation) observations.push(observation);
  }

  return observations;
}

// --- Statistics -------------------------------------------------------------

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 1) return sorted[0];
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

/**
 * Discard observations that cannot be describing the same food.
 *
 * Crowdsourced data contains transcription slips — a 0.99 next to a 99.0 — and
 * a plain median over a handful of points is not immune to them. Anything more
 * than four times the median or less than a quarter of it is dropped before
 * the figures that get shown are computed.
 */
function withoutOutliers(values: number[]): number[] {
  if (values.length < 4) return values;
  const sorted = [...values].sort((a, b) => a - b);
  const median = quantile(sorted, 0.5);
  if (median <= 0) return values;
  const kept = sorted.filter((v) => v >= median / 4 && v <= median * 4);
  return kept.length >= MIN_OBSERVATIONS ? kept : sorted;
}

function confidenceFor(count: number, scope: PriceScope): PriceConfidence {
  if (count >= 8 && scope !== 'global') return 'high';
  if (count >= 5 || (count >= 3 && scope !== 'global')) return 'medium';
  return 'low';
}

/**
 * Turn a bag of observations into one estimate.
 *
 * Observations are bucketed by currency and by what they price — a per-kilo
 * price and a per-piece price are not two readings of the same number — and
 * the largest bucket wins, with a preference for the basis that matches how
 * the recipe measures the ingredient.
 */
function summarise(
  observations: Observation[],
  preferred: PriceBasis,
  scope: PriceScope,
  region: RegionQuery,
  tag: string
): PriceEstimate | null {
  const buckets = new Map<string, Observation[]>();
  for (const o of observations) {
    const key = `${o.currency}|${o.basis}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(o);
    else buckets.set(key, [o]);
  }

  let best: { key: string; items: Observation[] } | null = null;
  for (const [key, items] of buckets) {
    if (items.length < MIN_OBSERVATIONS) continue;
    if (!best) { best = { key, items }; continue; }

    const bestMatches = best.key.endsWith(`|${preferred}`);
    const thisMatches = key.endsWith(`|${preferred}`);
    // A bucket that can actually price the recipe's quantity beats a larger
    // one that cannot: a per-piece broccoli price says nothing about 100 g.
    if (thisMatches && !bestMatches) best = { key, items };
    else if (thisMatches === bestMatches && items.length > best.items.length) best = { key, items };
  }

  if (!best) return null;

  const [currency, basis] = best.key.split('|') as [string, PriceBasis];
  const cleaned = withoutOutliers(best.items.map((o) => o.price));
  const sorted = [...cleaned].sort((a, b) => a - b);

  const dates = best.items.map((o) => o.date).filter(Boolean).sort();

  return {
    value: quantile(sorted, 0.5),
    low: quantile(sorted, 0.25),
    high: quantile(sorted, 0.75),
    basis,
    currency,
    source: 'open-prices',
    scope,
    // Say where the observations are really from. Labelling a worldwide
    // median "Liège, Belgium" would overstate how local it is.
    region:
      scope === 'nearby' ? (region.label || region.city || region.countryCode || '')
      : scope === 'country' ? (region.countryCode ?? '')
      : currency,
    observationCount: sorted.length,
    lastObservedAt: dates.length ? dates[dates.length - 1] : null,
    confidence: confidenceFor(sorted.length, scope),
    categoryTag: tag,
  };
}

// --- Public entry point -----------------------------------------------------

/**
 * The regional price for one food, or null when the data does not support one.
 *
 * Widening happens in three steps — around the athlete, then their country,
 * then everywhere — and stops at the first step with enough observations, so a
 * local price is never diluted by a global one.
 */
export async function estimatePrice(
  foodName: string,
  unit: 'g' | 'ml' | 'piece',
  region: RegionQuery
): Promise<PriceEstimate | null> {
  const tags = categoryCandidates(foodName);
  if (tags.length === 0) return null;

  const preferred = basisForUnit(unit);
  const currency = currencyForRegion(region);
  const scopes: PriceScope[] =
    typeof region.latitude === 'number' && typeof region.longitude === 'number'
      ? ['nearby', 'country', 'global']
      : ['country', 'global'];

  // Worldwide observations are only a fair proxy when they are priced in the
  // money the athlete actually spends. Without a known currency for their
  // country, the search stops at their own country's data.
  const usable = currency ? scopes : scopes.filter((x) => x !== 'global');

  /**
   * The best estimate found whose basis cannot price this quantity. Kept as a
   * last resort so the UI can still say what the food costs per kilo, rather
   * than pretending Open Prices knows nothing about it at all.
   */
  let mismatched: PriceEstimate | null = null;

  for (const scope of usable) {
    for (const tag of tags) {
      const observations = await collect(tag, region, scope, currency);
      if (observations.length < MIN_OBSERVATIONS) continue;

      const estimate = summarise(observations, preferred, scope, region, tag);
      if (!estimate) continue;
      if (estimate.basis === preferred) return estimate;
      if (!mismatched) mismatched = estimate;
    }
  }

  return mismatched;
}
