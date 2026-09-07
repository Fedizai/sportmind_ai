import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ConsentChoice = 'granted' | 'denied';

interface ConsentState {
    /** `null` means the visitor has not been asked yet, or has reset the choice. */
    analytics: ConsentChoice | null;
    /** When the choice was made — a consent you cannot date is hard to defend. */
    decidedAt: string | null;
    setAnalytics: (choice: ConsentChoice) => void;
    reset: () => void;
}

/**
 * The measurement consent, and nothing else.
 *
 * Deliberately narrow: the only non-essential thing this site does is
 * measurement, so a single yes/no is the honest shape. A five-category modal
 * for one category would be theatre, and theatre is what teaches people to
 * click "accept all" without reading.
 *
 * `null` is meaningful and is not the same as `denied`: nothing may load before
 * a choice, but the banner must keep asking until one is made.
 */
export const useConsentStore = create<ConsentState>()(
    persist(
        (set) => ({
            analytics: null,
            decidedAt: null,
            setAnalytics: (choice) => set({ analytics: choice, decidedAt: new Date().toISOString() }),
            reset: () => set({ analytics: null, decidedAt: null }),
        }),
        { name: 'sportmind-consent' },
    ),
);
