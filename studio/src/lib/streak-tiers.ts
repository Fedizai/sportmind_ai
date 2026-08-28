import type { Bi } from '@/lib/bilingual';

/**
 * Streak tiers.
 *
 * The streak changes identity as it grows: a new colour, a new name, more
 * recovery credits, and a perk the athlete keeps while the streak survives.
 * Higher tiers are harder to reach, so they also grant more ways back from a
 * missed day — that is what makes a long streak feel worth protecting.
 */

export type StreakTierId =
  | 'none' | 'spark' | 'ember' | 'blaze' | 'inferno' | 'molten' | 'diamond' | 'legend';

export interface StreakTier {
  id: StreakTierId;
  /** Inclusive lower bound, in consecutive days. */
  minDays: number;
  name: Bi;
  /** Tailwind classes — kept as literals so the JIT compiler can see them. */
  text: string;
  bg: string;
  ring: string;
  /** Raw colour for canvas/inline styling (charts, the flame gradient). */
  hex: string;
  /** Recovery credits granted at this tier — a longer streak is worth more. */
  freezes: number;
  /** What the athlete unlocks while the streak holds. */
  perks: Bi[];
}

export const STREAK_TIERS: StreakTier[] = [
  {
    id: 'none', minDays: 0,
    name: { en: 'No streak', fr: 'Aucune série' },
    text: 'text-muted-foreground', bg: 'bg-muted', ring: 'ring-border', hex: '#8b94a7',
    freezes: 0,
    perks: [],
  },
  {
    id: 'spark', minDays: 1,
    name: { en: 'Spark', fr: 'Étincelle' },
    text: 'text-slate-300', bg: 'bg-slate-500/15', ring: 'ring-slate-400/30', hex: '#cbd5e1',
    freezes: 0,
    perks: [{ en: 'Daily streak tracking', fr: 'Suivi quotidien de la série' }],
  },
  {
    id: 'ember', minDays: 3,
    name: { en: 'Ember', fr: 'Braise' },
    text: 'text-amber-400', bg: 'bg-amber-500/15', ring: 'ring-amber-400/35', hex: '#fbbf24',
    freezes: 1,
    perks: [{ en: '1 streak freeze', fr: '1 gel de série' }],
  },
  {
    id: 'blaze', minDays: 7,
    name: { en: 'Blaze', fr: 'Flamme' },
    text: 'text-orange-400', bg: 'bg-orange-500/15', ring: 'ring-orange-400/35', hex: '#fb923c',
    freezes: 2,
    perks: [
      { en: '2 streak freezes', fr: '2 gels de série' },
      { en: 'Weekly performance recap', fr: 'Récap hebdo de performance' },
    ],
  },
  {
    id: 'inferno', minDays: 14,
    name: { en: 'Inferno', fr: 'Brasier' },
    text: 'text-red-400', bg: 'bg-red-500/15', ring: 'ring-red-400/35', hex: '#f87171',
    freezes: 3,
    perks: [
      { en: '3 streak freezes', fr: '3 gels de série' },
      { en: 'Priority support replies', fr: "Réponses support prioritaires" },
    ],
  },
  {
    id: 'molten', minDays: 30,
    name: { en: 'Molten', fr: 'Incandescent' },
    text: 'text-violet-400', bg: 'bg-violet-500/15', ring: 'ring-violet-400/35', hex: '#a78bfa',
    freezes: 4,
    perks: [
      { en: '4 streak freezes', fr: '4 gels de série' },
      { en: 'Monthly progress report', fr: 'Rapport de progression mensuel' },
    ],
  },
  {
    id: 'diamond', minDays: 60,
    name: { en: 'Diamond', fr: 'Diamant' },
    text: 'text-cyan-300', bg: 'bg-cyan-500/15', ring: 'ring-cyan-300/35', hex: '#67e8f9',
    freezes: 5,
    perks: [
      { en: '5 streak freezes', fr: '5 gels de série' },
      { en: 'Free streak restore each month', fr: 'Une restauration gratuite par mois' },
    ],
  },
  {
    id: 'legend', minDays: 100,
    name: { en: 'Legend', fr: 'Légende' },
    text: 'text-yellow-300', bg: 'bg-yellow-400/15', ring: 'ring-yellow-300/40', hex: '#fde047',
    freezes: 6,
    perks: [
      { en: '6 streak freezes', fr: '6 gels de série' },
      { en: 'Legend badge on your profile', fr: 'Badge Légende sur votre profil' },
    ],
  },
];

/** The tier a given streak length sits in. */
export function tierForStreak(days: number): StreakTier {
  let match = STREAK_TIERS[0];
  for (const tier of STREAK_TIERS) {
    if (days >= tier.minDays) match = tier;
  }
  return match;
}

/** The next tier up, or null once the athlete is at Legend. */
export function nextTier(days: number): StreakTier | null {
  return STREAK_TIERS.find((t) => t.minDays > days) ?? null;
}

/** Days still to go before the next tier unlocks. */
export function daysToNextTier(days: number): number | null {
  const next = nextTier(days);
  return next ? next.minDays - days : null;
}

/** How a broken streak can be brought back. */
export type RestoreMethod = 'freeze' | 'payment' | 'support';

/** Recovery credits the tier grants, minus whatever has already been spent. */
export function freezesRemaining(days: number, freezesUsed: number): number {
  return Math.max(0, tierForStreak(days).freezes - Math.max(0, freezesUsed));
}
