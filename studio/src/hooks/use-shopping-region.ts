"use client";

import { useCallback, useEffect, useState } from 'react';

import { useShoppingRegionStore, type ShoppingRegion } from '@/stores/shopping-region-store';

/**
 * The shopping region in force, and the ability to change it.
 *
 * A manual choice always wins. Otherwise the coarse IP-derived region is used,
 * re-checked at most once a day — people do not usually move country between
 * two visits to a nutrition tab, and a network address is not worth asking a
 * third party about more often than that.
 */

const REDETECT_AFTER_MS = 24 * 60 * 60 * 1000;

export function useShoppingRegion() {
  const manual = useShoppingRegionStore((s) => s.manual);
  const detected = useShoppingRegionStore((s) => s.detected);
  const detectedAt = useShoppingRegionStore((s) => s.detectedAt);
  const setManual = useShoppingRegionStore((s) => s.setManual);
  const setDetected = useShoppingRegionStore((s) => s.setDetected);

  const [isDetecting, setIsDetecting] = useState(false);

  const detect = useCallback(async () => {
    setIsDetecting(true);
    try {
      const response = await fetch('/api/region');
      const body = await response.json();
      setDetected((body?.region as ShoppingRegion) ?? null);
    } catch {
      // Detection failing is not an error worth showing: the picker is right
      // there, and an unset region simply means prices are not shown yet.
      setDetected(null);
    } finally {
      setIsDetecting(false);
    }
  }, [setDetected]);

  useEffect(() => {
    if (manual) return;
    const fresh = detectedAt !== null && Date.now() - detectedAt < REDETECT_AFTER_MS;
    if (fresh) return;
    detect();
    // `detect` is stable and the freshness check reads the store directly, so
    // this runs once per mount at most.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manual]);

  const region = manual ?? detected;

  return {
    region,
    /** True when the athlete chose this region rather than it being inferred. */
    isManual: !!manual,
    isDetecting: isDetecting && !region,
    setManual,
    redetect: () => { setManual(null); return detect(); },
  };
}
