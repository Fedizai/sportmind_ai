/**
 * Turning a regional rate into what a specific amount costs.
 *
 * Shared by the price engine on the server and the pricing hook in the
 * browser, because they were two copies of the same arithmetic and the copies
 * did not agree: the client's ignored the basis entirely, so an estimate that
 * priced broccoli *per piece* was happily multiplied by 100 grams and would
 * have shown roughly a hundred times the real figure. One definition removes
 * the possibility.
 */

/** What a price is quoted against. */
export type PriceBasis = 'kg' | 'l' | 'unit';

/** How a recipe measures an ingredient. */
export type IngredientUnitForPricing = 'g' | 'ml' | 'piece';

/** The basis that can price a quantity given in this unit. */
export function basisForUnit(unit: IngredientUnitForPricing): PriceBasis {
  if (unit === 'g') return 'kg';
  if (unit === 'ml') return 'l';
  return 'unit';
}

export interface RateForCosting {
  value: number;
  low: number;
  high: number;
  basis: PriceBasis;
  currency: string;
}

/**
 * What `quantity` of a food costs at this rate, or null when it cannot be
 * known: a per-piece price says nothing about 80 grams, and a per-kilo price
 * says nothing about "one apple". Returning null is what makes the UI show
 * "price unavailable" instead of a number with no meaning behind it.
 */
export function costOf(
  rate: RateForCosting,
  quantity: number,
  unit: IngredientUnitForPricing
): { value: number; low: number; high: number; currency: string } | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  if (rate.basis !== basisForUnit(unit)) return null;

  // g -> kg and ml -> l are both a division by a thousand; pieces map straight
  // onto a per-unit price.
  const multiplier = rate.basis === 'unit' ? quantity : quantity / 1000;

  return {
    value: rate.value * multiplier,
    low: rate.low * multiplier,
    high: rate.high * multiplier,
    currency: rate.currency,
  };
}
