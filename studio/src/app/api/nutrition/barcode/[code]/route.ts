import { NextResponse } from 'next/server';

import { fetchProductByBarcode, type OffProduct } from '@/lib/openfoodfacts';

/**
 * Barcode -> packaged product, proxied through the server.
 *
 * Two reasons this is not a direct browser fetch to Open Food Facts:
 *
 *  - OFF asks callers to identify themselves with a User-Agent, and a browser
 *    cannot set that header at all.
 *  - Their documented limit is 15 product reads per minute per IP. The cache
 *    below means a product scanned twice — or scanned by two athletes — costs
 *    one read, not two.
 *
 * The cache is per server instance and deliberately short: nutrition facts on
 * a package do change when a manufacturer reformulates.
 */

export const runtime = 'nodejs';
/** Each request must reach this handler so the cache below is the one in charge. */
export const dynamic = 'force-dynamic';

const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const MAX_ENTRIES = 500;

const cache = new Map<string, { at: number; product: OffProduct }>();

function remember(code: string, product: OffProduct) {
  // Cheap bound: drop the oldest insertion when full. Map preserves insertion
  // order, so the first key is the oldest.
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(code, { at: Date.now(), product });
}

export async function GET(
  _request: Request,
  { params }: { params: { code: string } }
) {
  const code = (params.code ?? '').replace(/\D/g, '');

  if (code.length < 6 || code.length > 14) {
    return NextResponse.json({ status: 'invalid' }, { status: 400 });
  }

  const hit = cache.get(code);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return NextResponse.json({ status: 'found', product: hit.product, cached: true });
  }

  const result = await fetchProductByBarcode(code);

  switch (result.status) {
    case 'found':
      remember(code, result.product);
      return NextResponse.json({ status: 'found', product: result.product });
    case 'not_found':
      return NextResponse.json({ status: 'not_found' }, { status: 404 });
    case 'rate_limited':
      return NextResponse.json({ status: 'rate_limited' }, { status: 429 });
    default:
      // Never fabricate a product. The client shows "service unavailable" and
      // offers manual entry.
      console.error('Open Food Facts unavailable:', result.reason);
      return NextResponse.json({ status: 'unavailable' }, { status: 503 });
  }
}
