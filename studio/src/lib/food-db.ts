import fs from 'node:fs';
import path from 'node:path';

/**
 * Local food database (server-side only).
 *
 * Built from the Kaggle "Global Food & Nutrition Database 2026" export by
 * `scripts/build-food-db.mjs`. Holding it in memory removes every downside of
 * the hosted APIs: no rate limit, no per-call cost, no IP allow-list, and a
 * search that returns without a network round trip.
 *
 * The file is optional — when it is absent the nutrition flow simply falls
 * through to the remote providers, so the app still works without it.
 */

/** Compact on-disk record. Short keys keep the JSON small. */
interface RawFood {
  i: string;      // id
  n: string;      // name
  b?: string;     // brand
  c: number;      // calories
  p: number;      // protein g
  f: number;      // fat g
  g: number;      // carbs g
  s?: number;     // sugar g
  so?: number;    // sodium mg
  ir?: number;    // iron mg
  pt?: number;    // portion g
  ns?: string;    // nutri-score
  nv?: number;    // NOVA group
  al?: string;    // allergens
}

export interface LocalFood extends RawFood {
  /** Lower-cased "name brand", precomputed so search does no per-query work. */
  haystack: string;
}

let cache: LocalFood[] | null = null;
let loadFailed = false;

/** Load once per server instance; subsequent calls reuse the parsed array. */
function load(): LocalFood[] {
  if (cache) return cache;
  if (loadFailed) return [];

  try {
    const file = path.join(process.cwd(), 'data', 'food-db.json');
    if (!fs.existsSync(file)) {
      loadFailed = true;
      return [];
    }
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as RawFood[];
    cache = raw.map((r) => ({
      ...r,
      haystack: `${r.n} ${r.b ?? ''}`.toLowerCase(),
    }));
    console.log(`Food DB: ${cache.length} entries loaded`);
    return cache;
  } catch (err) {
    console.error('Food DB: failed to load', err);
    loadFailed = true;
    return [];
  }
}

export function isLocalDbAvailable(): boolean {
  return load().length > 0;
}

/** The parsed dataset, for callers that need to rank it their own way. */
export function getLocalFoods(): LocalFood[] {
  return load();
}

/**
 * Rank matches so the most useful result is first:
 * exact name > name starts with > word starts with > contains.
 */
function score(food: LocalFood, term: string): number {
  const name = food.n.toLowerCase();
  if (name === term) return 0;
  if (name.startsWith(term)) return 1;
  if (new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(food.haystack)) return 2;
  if (food.haystack.includes(term)) return 3;
  return 99;
}

export function searchLocalFoods(query: string, limit = 12): LocalFood[] {
  const term = query.trim().toLowerCase();
  if (!term) return [];

  const foods = load();
  if (foods.length === 0) return [];

  const hits: { food: LocalFood; rank: number }[] = [];
  for (const food of foods) {
    if (!food.haystack.includes(term)) continue;
    hits.push({ food, rank: score(food, term) });
    // Plenty of candidates to rank well without scanning the whole file.
    if (hits.length >= limit * 40) break;
  }

  return hits
    .sort((a, b) => a.rank - b.rank || a.food.n.length - b.food.n.length)
    .slice(0, limit)
    .map((h) => h.food);
}
