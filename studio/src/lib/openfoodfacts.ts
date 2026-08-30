/**
 * Open Food Facts — packaged-product lookup by barcode.
 *
 * Verified against the live API on 2026-08-30:
 *   GET https://world.openfoodfacts.org/api/v2/product/{barcode}.json
 *   - No API key. Reads are public; the only requirement is an identifying
 *     User-Agent of the form `AppName/Version (contact)`.
 *   - Documented limit: 15 product reads per minute per IP.
 *
 * That limit is the reason this lives on the server behind a cache rather than
 * being called straight from the browser: the browser cannot set a User-Agent
 * at all (it is a forbidden header), and every repeat scan of the same product
 * would otherwise spend one of those 15 slots.
 *
 * v3 is the newer read endpoint, but it returns a narrower product object and
 * omits fields this app uses (serving_size among them) on products where v2
 * has them. v2 remains the endpoint the OFF clients use for a plain read, so
 * that is what this asks for, with the fields it wants named explicitly so the
 * response stays small.
 */

const BASE = 'https://world.openfoodfacts.org/api/v2/product';

/**
 * OFF asks every client to identify itself. There is no secret here — it is a
 * courtesy header so they can contact an integrator whose traffic misbehaves.
 */
const USER_AGENT = 'SportMindAI/1.0 (https://sportmind-ai-lo721.web.app)';

const FIELDS = [
  'code', 'product_name', 'product_name_en', 'product_name_fr', 'generic_name',
  'brands', 'quantity', 'serving_size', 'serving_quantity',
  'image_front_url', 'image_url', 'image_front_small_url',
  'nutriscore_grade', 'nutriments', 'ingredients_text', 'ingredients_text_en',
  'ingredients_text_fr', 'allergens_tags', 'categories_tags',
].join(',');

/** Everything the UI shows. Every nutrient is optional — OFF products are crowdsourced and frequently partial. */
export interface OffNutrimentsPer100g {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  saturatedFat?: number;
  sugar?: number;
  fiber?: number;
  /** Grams of salt per 100 g, as OFF reports it. */
  salt?: number;
  /** Milligrams of sodium per 100 g — converted from OFF's grams. */
  sodium?: number;
}

export interface OffProduct {
  barcode: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  /** Package size as written on the pack, e.g. "500 g". */
  quantity: string | null;
  /** Serving size as written, e.g. "150 g". */
  servingSize: string | null;
  /** Serving size in grams when OFF could parse one. */
  servingGrams: number | null;
  nutriScore: string | null;
  ingredients: string | null;
  allergens: string[];
  categories: string[];
  per100g: OffNutrimentsPer100g;
  /** False when OFF has the product but no usable energy figure. */
  hasNutrition: boolean;
}

export type OffLookup =
  | { status: 'found'; product: OffProduct }
  | { status: 'not_found' }
  | { status: 'rate_limited' }
  | { status: 'unavailable'; reason: string };

/** A nutriment value, or undefined when OFF does not carry it. Never guessed. */
function num(source: Record<string, unknown>, key: string): number | undefined {
  const raw = source?.[key];
  const value = typeof raw === 'string' ? parseFloat(raw) : raw;
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Energy per 100 g in kcal.
 *
 * Most products carry `energy-kcal_100g` directly. Some — European entries
 * especially — carry only kilojoules, so convert rather than showing nothing:
 * 1 kcal = 4.184 kJ is a definition, not an estimate.
 */
function energyKcal(n: Record<string, unknown>): number | undefined {
  const kcal = num(n, 'energy-kcal_100g') ?? num(n, 'energy-kcal');
  if (kcal !== undefined) return kcal;
  const kj = num(n, 'energy-kj_100g') ?? num(n, 'energy_100g');
  return kj !== undefined ? kj / 4.184 : undefined;
}

function normalize(raw: Record<string, any>, barcode: string): OffProduct {
  const n = (raw.nutriments ?? {}) as Record<string, unknown>;

  // OFF reports salt and sodium in grams per 100 g. The rest of this app
  // stores sodium in milligrams, so convert at the boundary.
  const saltG = num(n, 'salt_100g') ?? num(n, 'salt');
  const sodiumG = num(n, 'sodium_100g') ?? num(n, 'sodium');

  const per100g: OffNutrimentsPer100g = {
    calories: energyKcal(n),
    protein: num(n, 'proteins_100g') ?? num(n, 'proteins'),
    carbs: num(n, 'carbohydrates_100g') ?? num(n, 'carbohydrates'),
    fat: num(n, 'fat_100g') ?? num(n, 'fat'),
    saturatedFat: num(n, 'saturated-fat_100g') ?? num(n, 'saturated-fat'),
    sugar: num(n, 'sugars_100g') ?? num(n, 'sugars'),
    fiber: num(n, 'fiber_100g') ?? num(n, 'fiber'),
    salt: saltG,
    sodium: sodiumG !== undefined ? sodiumG * 1000 : undefined,
  };

  const name: string | null =
    raw.product_name || raw.product_name_en || raw.product_name_fr || raw.generic_name || null;

  const servingGrams = num(raw, 'serving_quantity');

  return {
    barcode,
    name: name ? String(name).trim() || null : null,
    brand: raw.brands ? String(raw.brands).split(',')[0].trim() : null,
    imageUrl: raw.image_front_url || raw.image_url || raw.image_front_small_url || null,
    quantity: raw.quantity ? String(raw.quantity) : null,
    servingSize: raw.serving_size ? String(raw.serving_size) : null,
    servingGrams: servingGrams && servingGrams > 0 ? servingGrams : null,
    nutriScore: raw.nutriscore_grade ? String(raw.nutriscore_grade).toLowerCase() : null,
    ingredients:
      raw.ingredients_text || raw.ingredients_text_en || raw.ingredients_text_fr || null,
    allergens: Array.isArray(raw.allergens_tags) ? raw.allergens_tags : [],
    categories: Array.isArray(raw.categories_tags) ? raw.categories_tags : [],
    per100g,
    // Energy is the one figure the serving maths cannot do without. A product
    // that has none is reported as found-but-unusable so the UI can offer
    // manual entry instead of showing a card full of blanks.
    hasNutrition: per100g.calories !== undefined,
  };
}

export async function fetchProductByBarcode(barcode: string): Promise<OffLookup> {
  const code = barcode.replace(/\D/g, '');
  if (code.length < 6 || code.length > 14) return { status: 'not_found' };

  let response: Response;
  try {
    response = await fetch(`${BASE}/${code}.json?fields=${FIELDS}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      // Next's fetch cache would hold this indefinitely; the route in front of
      // this owns caching, with a TTL.
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    return {
      status: 'unavailable',
      reason: err instanceof Error ? err.message : 'network error',
    };
  }

  if (response.status === 404) return { status: 'not_found' };
  if (response.status === 429) return { status: 'rate_limited' };
  if (!response.ok) return { status: 'unavailable', reason: `HTTP ${response.status}` };

  let body: any;
  try {
    body = await response.json();
  } catch {
    return { status: 'unavailable', reason: 'malformed response' };
  }

  // v2 answers with status 0 and no product for an unknown barcode.
  if (!body?.product || body.status === 0) return { status: 'not_found' };

  return { status: 'found', product: normalize(body.product, code) };
}
