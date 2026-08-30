/**
 * Structured plan ingredients: parsing, normalising, aggregating, formatting.
 *
 * The plan generator now returns `{ name, quantity, unit }` per item, so the
 * shopping list can add 200 g + 180 g + 200 g of chicken into one 580 g line
 * and the price engine has a real quantity to multiply a per-kilo price by.
 *
 * Everything here is deterministic string and number work. No model is asked
 * anything, and nothing is invented: an item that cannot be parsed keeps its
 * text and reports no quantity, which downstream renders as "no price".
 */

export type IngredientUnit = 'g' | 'ml' | 'piece';

export interface Ingredient {
  /** The food itself, without the quantity: "Rolled oats". */
  name: string;
  /** Amount in `unit`. Zero when the source text carried no number. */
  quantity: number;
  unit: IngredientUnit;
}

/** What a plan meal may hold — new structured items, or strings from a plan generated before this existed. */
export type RawPlanItem = string | { name?: string; quantity?: number; unit?: string };

/** Units the parser understands, mapped to a factor into the canonical unit. */
const UNIT_TABLE: Record<string, { unit: IngredientUnit; factor: number }> = {
  g: { unit: 'g', factor: 1 },
  gr: { unit: 'g', factor: 1 },
  gram: { unit: 'g', factor: 1 },
  grams: { unit: 'g', factor: 1 },
  grammes: { unit: 'g', factor: 1 },
  kg: { unit: 'g', factor: 1000 },
  kilo: { unit: 'g', factor: 1000 },
  kilos: { unit: 'g', factor: 1000 },
  oz: { unit: 'g', factor: 28.3495 },
  ounce: { unit: 'g', factor: 28.3495 },
  ounces: { unit: 'g', factor: 28.3495 },
  lb: { unit: 'g', factor: 453.592 },
  lbs: { unit: 'g', factor: 453.592 },
  ml: { unit: 'ml', factor: 1 },
  cl: { unit: 'ml', factor: 10 },
  dl: { unit: 'ml', factor: 100 },
  l: { unit: 'ml', factor: 1000 },
  litre: { unit: 'ml', factor: 1000 },
  liter: { unit: 'ml', factor: 1000 },
};

/** Leading words that describe the packaging rather than the food. */
const NOISE_WORDS = new Set([
  'of', 'de', "d'", 'fresh', 'frais', 'raw', 'cru', 'cooked', 'cuit', 'cuite',
  'chopped', 'sliced', 'diced', 'whole', 'plain', 'nature',
]);

/** Vulgar fractions the model occasionally emits instead of decimals. */
const FRACTIONS: Record<string, number> = {
  '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3,
};

function parseNumber(token: string): number | null {
  if (FRACTIONS[token] !== undefined) return FRACTIONS[token];
  // "1/2"
  const fraction = token.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    return denominator ? Number(fraction[1]) / denominator : null;
  }
  const value = parseFloat(token.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

/**
 * Best-effort read of a free-text food line.
 *
 * Handles the shapes the plan generator used to produce: "80 g oats",
 * "1 cup oatmeal (80g)", "200g chicken breast", "2 bananas", "Greek yogurt".
 * A parenthesised gram figure wins, because that is the precise one.
 */
export function parseIngredient(text: string): Ingredient {
  const original = String(text ?? '').trim();
  if (!original) return { name: '', quantity: 0, unit: 'piece' };

  // "1 cup oatmeal (80g)" -> take the 80 g and drop the parenthetical.
  const parenthetical = original.match(/\((\d+(?:[.,]\d+)?)\s*(kg|g|gr|ml|cl|dl|l)\b[^)]*\)/i);
  let working = original;
  let fromParen: { quantity: number; unit: IngredientUnit } | null = null;
  if (parenthetical) {
    const amount = parseNumber(parenthetical[1]);
    const mapped = UNIT_TABLE[parenthetical[2].toLowerCase()];
    if (amount !== null && mapped) {
      fromParen = { quantity: amount * mapped.factor, unit: mapped.unit };
    }
    working = original.replace(parenthetical[0], ' ').trim();
  }

  // Leading "<number><maybe unit>" prefix.
  const leading = working.match(
    /^(\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+|[½¼¾⅓⅔])\s*([a-zA-Zé]+\.?)?\s*(.*)$/
  );

  let quantity = 0;
  let unit: IngredientUnit = 'piece';
  let name = working;

  if (leading) {
    const amount = parseNumber(leading[1]);
    const word = (leading[2] ?? '').replace(/\.$/, '').toLowerCase();
    const mapped = UNIT_TABLE[word];
    const rest = (leading[3] ?? '').trim();

    if (amount !== null && mapped) {
      quantity = amount * mapped.factor;
      unit = mapped.unit;
      name = rest;
    } else if (amount !== null) {
      // "2 bananas" — the word after the number is part of the food name.
      quantity = amount;
      unit = 'piece';
      name = [leading[2], rest].filter(Boolean).join(' ').trim();
    }
  }

  if (fromParen) {
    quantity = fromParen.quantity;
    unit = fromParen.unit;
  }

  name = name
    .replace(/^[\s,;:-]+/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Strip a leading "of"/"de" left behind by "1 cup of oats".
  const words = name.split(' ');
  while (words.length > 1 && NOISE_WORDS.has(words[0].toLowerCase())) words.shift();
  name = words.join(' ');

  return { name: name || original, quantity, unit };
}

/** Accept either shape a stored plan may hold, and always produce an Ingredient. */
export function toIngredient(item: RawPlanItem): Ingredient {
  if (typeof item === 'string') return parseIngredient(item);
  const name = String(item?.name ?? '').trim();
  const quantity = Number(item?.quantity);
  const rawUnit = String(item?.unit ?? 'piece').toLowerCase();
  const unit: IngredientUnit =
    rawUnit === 'g' || rawUnit === 'ml' || rawUnit === 'piece'
      ? rawUnit
      : UNIT_TABLE[rawUnit]?.unit ?? 'piece';
  const factor = rawUnit === 'g' || rawUnit === 'ml' || rawUnit === 'piece'
    ? 1
    : UNIT_TABLE[rawUnit]?.factor ?? 1;

  if (!name) return parseIngredient(String(item ?? ''));
  return {
    name,
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity * factor : 0,
    unit,
  };
}

export function toIngredients(items: RawPlanItem[] | undefined): Ingredient[] {
  return (items ?? []).map(toIngredient).filter((i) => i.name);
}

/**
 * Canonical key for an ingredient name.
 *
 * Used for shopping aggregation and as part of the price cache key, so
 * "Chicken breast", "chicken breasts" and "Chicken Breast" are one thing.
 */
export function foodKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w))
    .sort()
    .join(' ');
}

/** Merge repeated foods into one line, summing quantities that share a unit. */
export function aggregateIngredients(list: Ingredient[]): Ingredient[] {
  const merged = new Map<string, Ingredient>();
  for (const item of list) {
    if (!item.name) continue;
    const key = `${foodKey(item.name)}|${item.unit}`;
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      merged.set(key, { ...item });
    }
  }
  return [...merged.values()];
}

/** "580 g", "1.8 kg", "1.5 L", "18" — the shopping-list quantity column. */
export function formatQuantity(item: Ingredient): string {
  const q = item.quantity;
  if (!q || q <= 0) return '';
  if (item.unit === 'g') {
    return q >= 1000 ? `${(q / 1000).toFixed(q % 1000 === 0 ? 0 : 1)} kg` : `${Math.round(q)} g`;
  }
  if (item.unit === 'ml') {
    return q >= 1000 ? `${(q / 1000).toFixed(q % 1000 === 0 ? 0 : 1)} L` : `${Math.round(q)} ml`;
  }
  return `${Number.isInteger(q) ? q : q.toFixed(1)}`;
}

// --- Shopping-list grouping -------------------------------------------------

export type FoodGroup = 'protein' | 'carbs' | 'produce' | 'fats' | 'other';

/**
 * Which shelf a food belongs on.
 *
 * Keyword matching, in both project languages. It only decides which heading a
 * line sits under, so a miss costs nothing beyond landing in "Other".
 */
const GROUP_WORDS: Array<[FoodGroup, string[]]> = [
  ['protein', [
    'chicken', 'poulet', 'beef', 'boeuf', 'steak', 'pork', 'porc', 'turkey', 'dinde',
    'fish', 'poisson', 'salmon', 'saumon', 'tuna', 'thon', 'cod', 'shrimp', 'crevette',
    'egg', 'oeuf', 'yogurt', 'yoghurt', 'yaourt', 'skyr', 'cottage', 'quark',
    'tofu', 'tempeh', 'seitan', 'lentil', 'lentille', 'bean', 'haricot', 'chickpea',
    'pois chiche', 'protein', 'proteine', 'whey', 'ham', 'jambon', 'cheese', 'fromage',
    'milk', 'lait',
  ]],
  ['carbs', [
    'rice', 'riz', 'pasta', 'pate', 'spaghetti', 'penne', 'noodle', 'bread', 'pain',
    'oat', 'avoine', 'oatmeal', 'porridge', 'quinoa', 'couscous', 'potato', 'pomme de terre',
    'patate', 'tortilla', 'wrap', 'cereal', 'cereale', 'granola', 'bulgur', 'barley',
    'flour', 'farine', 'honey', 'miel', 'sugar', 'sucre',
  ]],
  ['produce', [
    'apple', 'pomme', 'banana', 'banane', 'berry', 'berries', 'baie', 'blueberry',
    'myrtille', 'strawberry', 'fraise', 'raspberry', 'framboise', 'orange', 'lemon',
    'citron', 'grape', 'raisin', 'mango', 'mangue', 'pear', 'poire', 'peach', 'peche',
    'kiwi', 'melon', 'pineapple', 'ananas', 'avocado', 'avocat',
    'broccoli', 'brocoli', 'spinach', 'epinard', 'carrot', 'carotte', 'tomato', 'tomate',
    'cucumber', 'concombre', 'pepper', 'poivron', 'onion', 'oignon', 'garlic', 'ail',
    'lettuce', 'laitue', 'salad', 'salade', 'zucchini', 'courgette', 'aubergine',
    'cabbage', 'chou', 'mushroom', 'champignon', 'pea', 'petit pois', 'corn', 'mais',
    'asparagus', 'asperge', 'celery', 'celeri', 'kale', 'beet', 'betterave',
  ]],
  ['fats', [
    'oil', 'huile', 'olive', 'butter', 'beurre', 'almond', 'amande', 'nut', 'noix',
    'peanut', 'cacahuete', 'cashew', 'walnut', 'seed', 'graine', 'chia', 'flax', 'lin',
    'tahini', 'coconut', 'coco',
  ]],
];

export function groupOf(name: string): FoodGroup {
  const haystack = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  for (const [group, words] of GROUP_WORDS) {
    // First group whose keywords appear wins; the order above is the tie-break.
    if (words.some((w) => haystack.includes(w))) return group;
  }
  return 'other';
}
