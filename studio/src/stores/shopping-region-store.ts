import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Where the athlete shops, for price estimates.
 *
 * Only two things are kept: what they picked by hand, and the coarse region
 * derived from their IP on this device. Both are city-level at finest. No IP
 * address is stored, no browser Geolocation permission is requested, and none
 * of this reaches Firestore — it is a per-device preference, like the language
 * and the shopping list beside it.
 */

export interface ShoppingRegion {
  country: string | null;
  countryCode: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  /** "Liège, Belgium" */
  label: string;
}

interface ShoppingRegionState {
  /** Chosen explicitly. Always wins over detection. */
  manual: ShoppingRegion | null;
  /** Last IP-derived guess, cached so the route is not called on every mount. */
  detected: ShoppingRegion | null;
  detectedAt: number | null;
  setManual: (region: ShoppingRegion | null) => void;
  setDetected: (region: ShoppingRegion | null) => void;
}

export const useShoppingRegionStore = create<ShoppingRegionState>()(
  persist(
    (set) => ({
      manual: null,
      detected: null,
      detectedAt: null,
      setManual: (region) => set({ manual: region }),
      setDetected: (region) => set({ detected: region, detectedAt: Date.now() }),
    }),
    {
      name: 'shopping-region-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
