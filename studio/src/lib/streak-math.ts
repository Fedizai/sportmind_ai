import { startOfDay, format, differenceInCalendarDays } from 'date-fns';

/**
 * Pure day-math behind the training streak.
 *
 * Kept free of Firebase and zustand so the rules can be reasoned about and
 * tested on their own. Every comparison goes through `differenceInCalendarDays`
 * rather than a millisecond subtraction — a 23h or 25h daylight-saving day
 * would otherwise silently break an athlete's streak.
 */

export const dayKey = (d: Date) => format(d, 'yyyy-MM-dd');

export interface StreakSummary {
  /** Consecutive days ending today, or yesterday if today isn't logged yet. */
  current: number;
  /** Best run the athlete has ever put together. */
  longest: number;
  /** Whether something has already been logged today. */
  activeToday: boolean;
  /** Unique active days as yyyy-MM-dd, newest first. */
  activeDays: string[];
}

/** Parse a yyyy-MM-dd key back to a local day-start. */
const fromKey = (k: string) => startOfDay(new Date(`${k}T00:00:00`));

/** Longest run of consecutive days in an ascending list of day-starts. */
function longestRun(ascending: Date[]): number {
  if (ascending.length === 0) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < ascending.length; i++) {
    if (differenceInCalendarDays(ascending[i], ascending[i - 1]) === 1) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }
  return best;
}

/**
 * Summarise a set of activity dates into streak numbers.
 *
 * Yesterday still counts toward `current`, so a streak survives until the day
 * actually ends rather than resetting at midnight.
 */
export function summariseStreak(dates: Date[], now: Date = new Date()): StreakSummary {
  if (dates.length === 0) {
    return { current: 0, longest: 0, activeToday: false, activeDays: [] };
  }

  const uniqueKeys = Array.from(new Set(dates.map((d) => dayKey(d)))).sort().reverse();
  const descending = uniqueKeys.map(fromKey);

  const today = startOfDay(now);
  const gap = differenceInCalendarDays(today, descending[0]);
  const activeToday = gap === 0;

  let current = 0;
  if (gap === 0 || gap === 1) {
    current = 1;
    for (let i = 1; i < descending.length; i++) {
      if (differenceInCalendarDays(descending[i - 1], descending[i]) === 1) current += 1;
      else break;
    }
  }

  const longest = Math.max(longestRun([...descending].reverse()), current);

  return { current, longest, activeToday, activeDays: uniqueKeys.slice(0, 60) };
}
