import { getLocalFoods, type LocalFood } from '@/lib/food-db';

/**
 * Matching a food *name* against the bundled database.
 *
 * The substring ranking that backs the search box is wrong for this job. Fed
 * the names a vision model produces, it returned crackers made with rice flour
 * for "white rice" (456 kcal), broccoli raab for "broccoli", and nothing at all
 * for "cooked white rice". Those numbers would have gone straight into an
 * athlete's daily total.
 *
 * This scores on word overlap instead, and rejects records whose own macros
 * cannot account for their calories — the dataset carries a fair number of
 * those, and they are exactly the entries that produce absurd results.
 */

/** Words that carry no identifying weight in a food name. */
const STOP_WORDS = new Set([
  'a', 'of', 'and', 'with', 'in', 'the', 'made', 'style', 'flavor', 'flavored',
]);

/**
 * Crude singularisation, enough to let "banana" reach "Bananas, raw" — which
 * it otherwise missed entirely, landing on a branded entry at 312 kcal.
 */
function stem(word: string): string {
  if (word.length > 3 && word.endsWith('es')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s')) return word.slice(0, -1);
  return word;
}

function tokenise(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .map(stem);
}

/**
 * Do this record's macros account for its calories?
 *
 * Atwater factors: 4 kcal per gram of protein and carbohydrate, 9 for fat. A
 * record that fails this is corrupt whatever its name says — it is how a Greek
 * yogurt ends up listed at 343 kcal and dry rice at 406. About 12% of the
 * dataset fails, and those are the entries worth never matching.
 */
function isSelfConsistent(food: LocalFood): boolean {
  const kcal = Number(food.c) || 0;
  if (kcal <= 0 || kcal > 950) return false;
  const derived =
    4 * (Number(food.p) || 0) + 4 * (Number(food.g) || 0) + 9 * (Number(food.f) || 0);
  if (derived <= 0) return false;
  return Math.abs(derived - kcal) / kcal <= 0.3;
}

interface Candidate {
  food: LocalFood;
  tokens: string[];
  set: Set<string>;
  head: string;
  branded: boolean;
}

let candidates: Candidate[] | null = null;

function getCandidates(): Candidate[] {
  if (candidates) return candidates;
  candidates = getLocalFoods()
    .filter(isSelfConsistent)
    .map((food) => {
      const tokens = tokenise(food.n);
      return {
        food,
        tokens,
        set: new Set(tokens),
        head: tokens[0] ?? '',
        // ALL-CAPS names are branded supermarket rows in this dataset, and are
        // far less likely to be what a photographed plate actually is.
        branded: !!food.b || food.n === food.n.toUpperCase(),
      };
    });
  return candidates;
}

/** Below this the best candidate shares too little with the query to trust. */
const MIN_SCORE = 0.5;

/**
 * The best database entry for a food name, or null when nothing fits.
 *
 * Returning null matters: a wrong match is worse than no match, because the
 * caller can say "no data for this" instead of logging someone else's food.
 */
export function matchFood(name: string): LocalFood | null {
  const query = tokenise(name);
  if (query.length === 0) return null;

  let best: Candidate | null = null;
  let bestScore = -Infinity;

  for (const candidate of getCandidates()) {
    let hits = 0;
    for (const word of query) if (candidate.set.has(word)) hits++;
    if (hits === 0) continue;

    // How much of the query the name covers, less how much of the name is
    // unrelated to it — "Croissants, apple" should lose to "Apples, raw".
    const coverage = hits / query.length;
    const noise = (candidate.tokens.length - hits) / candidate.tokens.length;
    const headBonus = query.includes(candidate.head) ? 1 : 0;
    const score = coverage * 3 - noise * 2 - (candidate.branded ? 1.2 : 0) + headBonus;

    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best && bestScore > MIN_SCORE ? best.food : null;
}
