"use client";

import { useEffect, useMemo, useRef, useState } from 'react';

import { foodKey, type Ingredient } from '@/lib/ingredients';
import { costOf } from '@/lib/price-basis';
import type { ShoppingRegion } from '@/stores/shopping-region-store';

/**
 * Estimated regional prices for a set of ingredients.
 *
 * One POST covers the whole list rather than one request per row, and the
 * results are held in a module-level cache keyed by food + region + unit, so
 * switching between the Plan and Shopping tabs — or simply re-rendering —
 * re-uses what has already been fetched instead of asking again.
 *
 * The cache expires: a grocery price is not a constant, and a value cached
 * forever would eventually be a lie told confidently.
 */

const TTL_MS = 60 * 60 * 1000; // one hour on the device; the server holds twelve

export interface PriceEstimateView {
  value: number;
  low: number;
  high: number;
  basis: 'kg' | 'l' | 'unit';
  currency: string;
  source: 'open-prices';
  scope: 'nearby' | 'country' | 'global';
  region: string;
  observationCount: number;
  lastObservedAt: string | null;
  confidence: 'low' | 'medium' | 'high';
  categoryTag: string;
}

export interface IngredientPrice {
  estimate: PriceEstimateView;
  /** What the requested amount costs. Null when the estimate's basis cannot price it. */
  cost: { value: number; low: number; high: number; currency: string } | null;
}

const cache = new Map<string, { at: number; value: IngredientPrice | null }>();

function regionKey(region: ShoppingRegion | null): string {
  if (!region) return '';
  const geo =
    typeof region.latitude === 'number' && typeof region.longitude === 'number'
      ? `${region.latitude.toFixed(1)},${region.longitude.toFixed(1)}`
      : '';
  return `${region.countryCode ?? ''}|${geo}`;
}

/** food + region + unit, as the caching plan specified. */
function keyFor(item: Ingredient, region: ShoppingRegion | null): string {
  return `${foodKey(item.name)}|${item.unit}|${regionKey(region)}`;
}

/**
 * The server returns one entry per distinct food+unit; the cost inside it is
 * for the quantity that was asked about, so a different quantity of the same
 * food is scaled here rather than by asking again.
 *
 * `costOf` is the shared one, so a rate whose basis cannot price this unit
 * comes back null here exactly as it does on the server.
 */
function rescale(cached: IngredientPrice, item: Ingredient): IngredientPrice {
  return { estimate: cached.estimate, cost: costOf(cached.estimate, item.quantity, item.unit) };
}

export function useIngredientPrices(
  ingredients: Ingredient[],
  region: ShoppingRegion | null
) {
  const [, forceRender] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inFlight = useRef<Set<string>>(new Set());

  /**
   * Whether this hook is still on screen.
   *
   * The effect below used to guard its final setState with a flag set by its
   * own cleanup, which is wrong: cleanup also runs when the dependencies
   * change, and React's development Strict Mode runs it immediately after the
   * first mount. The in-flight request then finished into a "cancelled"
   * effect, `setIsLoading(false)` never ran, and every ingredient without a
   * price sat on "Estimating…" forever instead of saying it had none. Only
   * unmounting should stop the update.
   */
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // A stable description of what is being priced, so the effect below runs
  // when the list genuinely changes rather than on every parent render.
  const signature = useMemo(
    () => ingredients.map((i) => `${foodKey(i.name)}|${i.unit}`).sort().join(';'),
    [ingredients]
  );
  const scope = regionKey(region);

  useEffect(() => {
    if (!region || ingredients.length === 0) return;

    const wanted = new Map<string, Ingredient>();
    for (const item of ingredients) {
      const key = keyFor(item, region);
      const hit = cache.get(key);
      if (hit && Date.now() - hit.at < TTL_MS) continue;
      if (inFlight.current.has(key)) continue;
      if (!wanted.has(key)) wanted.set(key, item);
    }

    if (wanted.size === 0) return;

    const keys = [...wanted.keys()];
    keys.forEach((k) => inFlight.current.add(k));
    setIsLoading(true);

    (async () => {
      try {
        const response = await fetch('/api/prices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            region: {
              countryCode: region.countryCode,
              city: region.city,
              latitude: region.latitude,
              longitude: region.longitude,
              label: region.label,
            },
            items: [...wanted.values()].map((i) => ({
              name: i.name,
              quantity: i.quantity,
              unit: i.unit,
            })),
          }),
        });

        const body = await response.json();
        const results = (body?.results ?? {}) as Record<string, IngredientPrice | null>;

        for (const [key, item] of wanted) {
          const found = results[`${foodKey(item.name)}|${item.unit}`] ?? null;
          cache.set(key, { at: Date.now(), value: found });
        }
      } catch {
        // Leave the misses uncached so a later render retries rather than
        // remembering a network blip as "no price exists".
      } finally {
        keys.forEach((k) => inFlight.current.delete(k));
        if (mounted.current) {
          setIsLoading(false);
          forceRender((n) => n + 1);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, scope]);

  /** The estimate for one ingredient, scaled to its quantity, or null. */
  const priceOf = (item: Ingredient): IngredientPrice | null => {
    if (!region) return null;
    const hit = cache.get(keyFor(item, region));
    if (!hit || Date.now() - hit.at >= TTL_MS || !hit.value) return null;
    return rescale(hit.value, item);
  };

  /**
   * Added-up cost of a list.
   *
   * `priced` and `total` are reported separately from the list length so the
   * UI can say a total is partial instead of presenting the sum of what
   * happened to be available as if it were the whole bill.
   */
  const totalOf = (items: Ingredient[]) => {
    let value = 0, low = 0, high = 0, priced = 0;
    let currency: string | null = null;

    for (const item of items) {
      const price = priceOf(item);
      if (!price?.cost) continue;
      // Never add two currencies together; the first one seen sets the total's.
      if (currency === null) currency = price.cost.currency;
      else if (currency !== price.cost.currency) continue;
      value += price.cost.value;
      low += price.cost.low;
      high += price.cost.high;
      priced++;
    }

    if (!currency || priced === 0) return null;
    return { value, low, high, currency, priced, of: items.length };
  };

  return { priceOf, totalOf, isLoading };
}
