import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { collection, query, where, getDocs, Timestamp, doc, getDoc, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { startOfDay, format } from 'date-fns';
import { usePlanStore } from './plan-store';
import { summariseStreak } from '@/lib/streak-math';
import { freezesRemaining, type RestoreMethod } from '@/lib/streak-tiers';

/**
 * Training streak — consecutive calendar days with any logged activity.
 *
 * "Activity" is deliberately broad: a completed gym day, a logged match or
 * session in any of the six sports, a nutrition log, or a bodyweight entry.
 * Anything the athlete does inside the product should keep the streak alive.
 *
 * Day comparison uses `differenceInCalendarDays`, never raw millisecond gaps —
 * a 23h or 25h daylight-saving day would otherwise silently break a streak.
 */

export interface StreakState {
  /** Consecutive days ending today, or yesterday if today isn't logged yet. */
  current: number;
  /** Best run the athlete has ever put together. */
  longest: number;
  /** Whether something has already been logged today. */
  activeToday: boolean;
  /** Recent active days as yyyy-MM-dd, newest first — drives the week strip. */
  activeDays: string[];
  /** Days credited on top of logged activity — from restores or an admin edit. */
  bonusDays: number;
  /** Admin-imposed streak length. When set it replaces the computed value. */
  overrideDays: number | null;
  /** Recovery credits already spent at the current tier. */
  freezesUsed: number;
  isLoading: boolean;
  lastCalculated: string | null;
  /** Recalculate from Firestore. Throttled; pass `force` to bypass. */
  calculateStreak: (userId: string, force?: boolean) => Promise<void>;
  /** Bring a broken streak back. Returns false when no credit is available. */
  restoreStreak: (userId: string, method: RestoreMethod, days: number) => Promise<boolean>;
}

/** Module-level so it is never persisted and never survives a reload. */
let lastRunAt = 0;
const MIN_INTERVAL_MS = 20_000;

const dayKey = (d: Date) => format(d, 'yyyy-MM-dd');
const todayKey = () => dayKey(new Date());

/** Collections keyed by the field holding the activity date. */
const SPORT_SOURCES: { path: string; dateField: string }[] = [
  { path: 'football_matches', dateField: 'date' },
  { path: 'tennis_matches', dateField: 'date' },
  { path: 'basketball_games', dateField: 'date' },
  { path: 'boxing_bouts', dateField: 'date' },
  { path: 'swimming_sessions', dateField: 'date' },
  { path: 'nutritionLogs', dateField: 'createdAt' },
];

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export const useStreakStore = create<StreakState>()(
  persist(
    (set, get) => ({
      current: 0,
      longest: 0,
      activeToday: false,
      activeDays: [],
      bonusDays: 0,
      overrideDays: null,
      freezesUsed: 0,
      isLoading: true,
      lastCalculated: null,

      calculateStreak: async (userId: string, force = false) => {
        if (!userId) return;
        // Callers fire this on mount, focus and navigation; throttle so a burst
        // of route changes doesn't re-query seven collections each time.
        if (!force && Date.now() - lastRunAt < MIN_INTERVAL_MS) return;
        lastRunAt = Date.now();
        set({ isLoading: true });

        try {
          const dates: Date[] = [];

          // Completed days from the locally-held gym plan.
          const { plan } = usePlanStore.getState();
          (plan?.days || []).forEach((d) => {
            const parsed = toDate(d.completed_at);
            if (parsed) dates.push(startOfDay(parsed));
          });

          // One failing collection (missing index, rules) must not zero the streak.
          const results = await Promise.allSettled(
            SPORT_SOURCES.map((src) =>
              getDocs(query(collection(db, src.path), where('userId', '==', userId)))
            )
          );

          results.forEach((res, i) => {
            if (res.status !== 'fulfilled') {
              console.warn(`Streak: skipped ${SPORT_SOURCES[i].path}`, res.reason);
              return;
            }
            res.value.docs.forEach((docSnap) => {
              const parsed = toDate(docSnap.data()[SPORT_SOURCES[i].dateField]);
              if (parsed) dates.push(startOfDay(parsed));
            });
          });

          // Bodyweight logs live in a per-user subcollection (no userId field).
          try {
            const bw = await getDocs(collection(db, `users/${userId}/bodyweightLogs`));
            bw.docs.forEach((docSnap) => {
              const parsed = toDate(docSnap.data().date);
              if (parsed) dates.push(startOfDay(parsed));
            });
          } catch (err) {
            console.warn('Streak: skipped bodyweightLogs', err);
          }

          // Restores and admin adjustments live on the user document so they
          // survive a new device and can be edited from the admin panel.
          let bonusDays = 0;
          let freezesUsed = 0;
          let overrideDays: number | null = null;
          try {
            const userSnap = await getDoc(doc(db, 'users', userId));
            const streak = userSnap.data()?.streak ?? {};
            bonusDays = Number(streak.bonusDays) || 0;
            freezesUsed = Number(streak.freezesUsed) || 0;
            overrideDays =
              streak.overrideDays === null || streak.overrideDays === undefined
                ? null
                : Number(streak.overrideDays);
          } catch (err) {
            console.warn('Streak: could not read saved streak state', err);
          }

          const summary = summariseStreak(dates);
          // An admin override wins outright; otherwise activity plus any bonus.
          const current =
            overrideDays !== null && !Number.isNaN(overrideDays)
              ? Math.max(0, overrideDays)
              : summary.current + Math.max(0, bonusDays);
          set({
            current,
            longest: Math.max(summary.longest, current),
            activeToday: summary.activeToday,
            activeDays: summary.activeDays,
            bonusDays,
            overrideDays,
            freezesUsed,
            isLoading: false,
            lastCalculated: todayKey(),
          });
        } catch (error) {
          console.error('Error calculating streak:', error);
          set({ isLoading: false });
        }
      },

      restoreStreak: async (userId, method, days) => {
        if (!userId || days <= 0) return false;
        const { bonusDays, freezesUsed, longest } = get();

        // A free recovery spends one of the tier's credits; paid and
        // support-granted restores don't.
        if (method === 'freeze') {
          if (freezesRemaining(longest, freezesUsed) <= 0) return false;
        }

        try {
          // setDoc-with-merge, not updateDoc: an athlete whose profile document
          // was never created would otherwise get a hard failure here.
          await setDoc(
            doc(db, 'users', userId),
            {
              streak: {
                bonusDays: increment(days),
                ...(method === 'freeze' ? { freezesUsed: increment(1) } : {}),
                lastRestoreAt: serverTimestamp(),
                lastRestoreMethod: method,
              },
            },
            { merge: true }
          );
          set({
            bonusDays: bonusDays + days,
            freezesUsed: method === 'freeze' ? freezesUsed + 1 : freezesUsed,
            current: get().current + days,
          });
          await get().calculateStreak(userId, true);
          return true;
        } catch (err) {
          console.error('Streak restore failed:', err);
          return false;
        }
      },
    }),
    {
      name: 'streak-storage',
      storage: createJSONStorage(() => localStorage),
      // `isLoading` must never be restored — a persisted `true` used to leave the
      // counter spinning forever whenever the day's calculation was already done.
      partialize: (state) => ({
        current: state.current,
        longest: state.longest,
        activeToday: state.activeToday,
        activeDays: state.activeDays,
        bonusDays: state.bonusDays,
        overrideDays: state.overrideDays,
        freezesUsed: state.freezesUsed,
        lastCalculated: state.lastCalculated,
      }),
    }
  )
);
