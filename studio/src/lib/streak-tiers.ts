import type { Bi } from '@/lib/bilingual';

/**
 * Streak tiers.
 *
 * The streak changes identity as it grows: a new colour, a new name, more
 * recovery credits, and a perk the athlete keeps while the streak survives.
 * Higher tiers are harder to reach, so they also grant more ways back from a
 * missed day — that is what makes a long streak feel worth protecting.
 *
 * The first two days are blue: the streak has started but has not caught yet.
 * From day three it ignites and runs as one continuous heat scale — amber,
 * orange, red, pink, magenta, violet, indigo — so the badge row reads as a
 * temperature climbing rather than as eight unrelated colours.
 */

export type StreakTierId =
  | 'none' | 'spark' | 'ember' | 'blaze' | 'inferno'
  | 'molten' | 'diamond' | 'legend' | 'eternal';

export interface StreakTier {
  id: StreakTierId;
  /** Inclusive lower bound, in consecutive days. */
  minDays: number;
  name: Bi;
  /**
   * Tailwind classes, written as whole literals so the JIT compiler can see
   * them. That is necessary but not sufficient: this file also has to be
   * inside tailwind.config's `content` globs, which for a long time covered
   * only app/components/pages.
   */
  text: string;
  bg: string;
  ring: string;
  /** Raw colour for canvas/inline styling (charts, the flame gradient). */
  hex: string;
  /** Flame fill stops, [deep, bright]. Drives the badge and the unlock burst. */
  gradient: [string, string];
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
    gradient: ['#9aa3b2', '#c3c9d4'],
    freezes: 0,
    perks: [],
  },
  {
    // Days 1-2. Blue, not yet fire: the streak exists but has not caught.
    id: 'spark', minDays: 1,
    name: { en: 'Spark', fr: 'Étincelle' },
    text: 'text-blue-500', bg: 'bg-blue-500/15', ring: 'ring-blue-400/35', hex: '#3b82f6',
    gradient: ['#2563eb', '#93c5fd'],
    freezes: 0,
    perks: [{ en: 'Daily streak tracking', fr: 'Suivi quotidien de la série' }],
  },
  {
    // Day 3: it catches. This is where the heat scale starts.
    id: 'ember', minDays: 3,
    name: { en: 'Ember', fr: 'Braise' },
    // amber-600, not 500: at 2.15:1 on a white card the 500 failed even the
    // 3:1 bar for large text, and this class now carries a 5xl streak count.
    text: 'text-amber-600', bg: 'bg-amber-400/15', ring: 'ring-amber-400/35', hex: '#f59e0b',
    gradient: ['#d97706', '#fcd34d'],
    freezes: 1,
    perks: [{ en: '1 streak freeze', fr: '1 gel de série' }],
  },
  {
    id: 'blaze', minDays: 7,
    name: { en: 'Blaze', fr: 'Flamme' },
    text: 'text-orange-600', bg: 'bg-orange-500/15', ring: 'ring-orange-500/35', hex: '#f97316',
    gradient: ['#ea580c', '#fb923c'],
    freezes: 2,
    perks: [
      { en: '2 streak freezes', fr: '2 gels de série' },
      { en: 'Weekly performance recap', fr: 'Récap hebdo de performance' },
    ],
  },
  {
    id: 'inferno', minDays: 30,
    name: { en: 'Inferno', fr: 'Brasier' },
    text: 'text-red-500', bg: 'bg-red-500/15', ring: 'ring-red-400/35', hex: '#ef4444',
    gradient: ['#dc2626', '#f87171'],
    freezes: 3,
    perks: [
      { en: '3 streak freezes', fr: '3 gels de série' },
      { en: 'Priority support replies', fr: 'Réponses support prioritaires' },
    ],
  },
  {
    id: 'molten', minDays: 60,
    name: { en: 'Molten', fr: 'Incandescent' },
    text: 'text-pink-500', bg: 'bg-pink-500/15', ring: 'ring-pink-400/35', hex: '#ec4899',
    gradient: ['#db2777', '#f472b6'],
    freezes: 4,
    perks: [
      { en: '4 streak freezes', fr: '4 gels de série' },
      { en: 'Monthly progress report', fr: 'Rapport de progression mensuel' },
    ],
  },
  {
    id: 'diamond', minDays: 100,
    name: { en: 'Diamond', fr: 'Diamant' },
    text: 'text-fuchsia-500', bg: 'bg-fuchsia-500/15', ring: 'ring-fuchsia-400/35', hex: '#d946ef',
    gradient: ['#c026d3', '#e879f9'],
    freezes: 5,
    perks: [
      { en: '5 streak freezes', fr: '5 gels de série' },
      { en: 'Free streak restore each month', fr: 'Une restauration gratuite par mois' },
    ],
  },
  {
    id: 'legend', minDays: 200,
    name: { en: 'Legend', fr: 'Légende' },
    text: 'text-violet-500', bg: 'bg-violet-500/15', ring: 'ring-violet-400/40', hex: '#8b5cf6',
    gradient: ['#7c3aed', '#a78bfa'],
    freezes: 6,
    perks: [
      { en: '6 streak freezes', fr: '6 gels de série' },
      { en: 'Legend badge on your profile', fr: 'Badge Légende sur votre profil' },
    ],
  },
  {
    id: 'eternal', minDays: 365,
    name: { en: 'Eternal', fr: 'Éternel' },
    text: 'text-indigo-500', bg: 'bg-indigo-500/15', ring: 'ring-indigo-400/40', hex: '#6366f1',
    gradient: ['#3730a3', '#818cf8'],
    freezes: 7,
    perks: [
      { en: '7 streak freezes', fr: '7 gels de série' },
      { en: 'A full year, unbroken', fr: 'Une année entière, sans rupture' },
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

/** Position on the ladder. Higher means a longer streak. */
export function tierIndex(id: StreakTierId): number {
  return STREAK_TIERS.findIndex((t) => t.id === id);
}

/** The next tier up, or null once the athlete is at Eternal. */
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

// --- Monthly recovery allowance ---------------------------------------------

/** Recoveries everyone gets, refreshed every calendar month. */
export const MONTHLY_RESTORES_BASE = 3;
/** Recoveries once a streak has proven itself past VETERAN_STREAK_DAYS. */
export const MONTHLY_RESTORES_VETERAN = 5;
/** The streak length that earns the larger allowance. */
export const VETERAN_STREAK_DAYS = 200;

/**
 * How many recoveries this athlete gets per month.
 *
 * Deliberately a monthly allowance rather than a lifetime one tied to the
 * tier: a recovery is for the week you were ill or travelling, and something
 * you can only ever use a fixed number of times stops being useful the moment
 * it runs out — which for a long-running streak was almost immediately.
 */
export function monthlyRestoreAllowance(longest: number): number {
  return longest >= VETERAN_STREAK_DAYS ? MONTHLY_RESTORES_VETERAN : MONTHLY_RESTORES_BASE;
}

/** What is left this month. */
export function restoresRemaining(longest: number, usedThisMonth: number): number {
  return Math.max(0, monthlyRestoreAllowance(longest) - Math.max(0, usedThisMonth));
}
