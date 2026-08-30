import { NextResponse } from 'next/server';

import { foodKey } from '@/lib/ingredients';
import {
  estimatePrice, costOf, basisForUnit,
  type PriceEstimate, type RegionQuery,
} from '@/lib/open-prices';

/**
 * Estimated regional prices for a list of ingredients.
 *
 * POST, not GET, because a shopping list is a body's worth of ingredients and
 * a query string is the wrong place for it.
 *
 * A model is never consulted here. The plan generator decides *what* is in a
 * meal; this route decides what those things cost, entirely from Open Prices
 * observations. An ingredient with too little data comes back null and is
 * shown as unavailable rather than filled in with something plausible.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Grocery prices drift over weeks, not minutes, so a working day of caching is
 * safe — and it is what keeps a shopping list of twenty ingredients from
 * hammering Open Prices every time the tab is opened.
 */
const TTL_MS = 12 * 60 * 60 * 1000;
const MAX_ENTRIES = 2_000;
/** Open Prices is a volunteer-run service; four in flight is plenty. */
const CONCURRENCY = 4;
const MAX_ITEMS = 60;

const cache = new Map<string, { at: number; estimate: PriceEstimate | null }>();

/**
 * normalisedFood + region + basis, exactly as the caching plan called for.
 *
 * Coordinates are rounded to a tenth of a degree — around 11 km — so two
 * athletes in the same city share one cache entry instead of each opening
 * their own.
 */
function cacheKey(name: string, region: RegionQuery, basis: string): string {
  const geo =
    typeof region.latitude === 'number' && typeof region.longitude === 'number'
      ? `${region.latitude.toFixed(1)},${region.longitude.toFixed(1)}`
      : '';
  return `${foodKey(name)}|${region.countryCode ?? ''}|${geo}|${basis}`;
}

function remember(key: string, estimate: PriceEstimate | null) {
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), estimate });
}

type Unit = 'g' | 'ml' | 'piece';

interface RequestItem {
  name: string;
  quantity: number;
  unit: Unit;
}

function readItems(raw: unknown): RequestItem[] {
  if (!Array.isArray(raw)) return [];
  const out: RequestItem[] = [];
  for (const entry of raw.slice(0, MAX_ITEMS)) {
    const name = String((entry as any)?.name ?? '').trim();
    if (!name) continue;
    const quantity = Number((entry as any)?.quantity);
    const unitRaw = String((entry as any)?.unit ?? 'piece');
    const unit: Unit = unitRaw === 'g' || unitRaw === 'ml' ? unitRaw : 'piece';
    out.push({ name, quantity: Number.isFinite(quantity) ? quantity : 0, unit });
  }
  return out;
}

function readRegion(raw: unknown): RegionQuery {
  const region = (raw ?? {}) as Record<string, unknown>;
  const latitude = Number(region.latitude);
  const longitude = Number(region.longitude);
  return {
    countryCode: region.countryCode ? String(region.countryCode).toUpperCase() : null,
    city: region.city ? String(region.city) : null,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    label: region.label ? String(region.label) : null,
  };
}

/** Run `worker` over every item with a bounded number in flight. */
async function pool<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const items = readItems(body?.items);
  const region = readRegion(body?.region);

  if (items.length === 0) return NextResponse.json({ results: {} });
  if (!region.countryCode && region.latitude === null) {
    // Without any region there is nothing to be regional about.
    return NextResponse.json({ results: {}, reason: 'no_region' });
  }

  // One lookup per distinct food, not per line: a plan with chicken in two
  // meals asks Open Prices once.
  const distinct = new Map<string, RequestItem>();
  for (const item of items) {
    const key = cacheKey(item.name, region, basisForUnit(item.unit));
    if (!distinct.has(key)) distinct.set(key, item);
  }

  const keys = [...distinct.keys()];
  await pool(keys, CONCURRENCY, async (key) => {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL_MS) return;
    const item = distinct.get(key)!;
    try {
      const estimate = await estimatePrice(item.name, item.unit, region);
      remember(key, estimate);
    } catch (err) {
      console.error('Open Prices lookup failed:', err);
      // Cache nothing on an error, so the next request retries.
    }
  });

  const results: Record<string, unknown> = {};
  for (const item of items) {
    const key = cacheKey(item.name, region, basisForUnit(item.unit));
    const hit = cache.get(key);
    const estimate = hit && Date.now() - hit.at < TTL_MS ? hit.estimate : null;

    results[`${foodKey(item.name)}|${item.unit}`] = estimate
      ? { estimate, cost: costOf(estimate, item.quantity, item.unit) }
      : null;
  }

  return NextResponse.json({ results });
}
