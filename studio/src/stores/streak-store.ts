import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { collection, query, where, getDocs, Timestamp, doc, getDoc, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { listSessions } from '@/app/dashboard/_components/session-actions';
import { listWorkoutDays } from '@/app/dashboard/insights/actions';
import { startOfDay, format } from 'date-fns';
import { usePlanStore } from './plan-store';
import { summariseStreak } from '@/lib/streak-math';
import {
  monthlyRestoreAllowance, restoresRemaining, tierForStreak, tierIndex,
  type RestoreMethod, type StreakTierId,
} from '@/lib/streak-tiers';

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
  /**
   * An admin's requested streak length, waiting to be applied.
   *
   * Not a value the athlete's streak is pinned to — see the calculation for
   * why. Cleared as soon as it has been converted into `bonusDays`.
   */
  pendingSetTo: number | null;
  /** Recovery credits already spent at the current tier. */
  freezesUsed: number;
  /**
   * Highest tier the athlete has already been congratulated for.
   *
   * Persisted, and seeded silently the first time a streak is calculated: an
   * athlete who already has a 40-day streak when this shipped should not be
   * ambushed by a celebration for a tier they passed weeks ago.
   */
  celebratedTierId: StreakTierId | null;
  /** A tier just crossed and not yet celebrated. Never persisted. */
  pendingLevelUp: StreakTierId | null;
  isLoading: boolean;
  lastCalculated: string | null;
  /**
   * When a calculation last read *every* source, as a timestamp.
   *
   * `null` means nothing trustworthy has ever been computed, which is the only
   * situation in which a partial read is allowed to publish.
   */
  lastCompleteAt: number | null;
  /** Recalculate from Firestore. Throttled; pass `force` to bypass. */
  calculateStreak: (userId: string, force?: boolean) => Promise<void>;
  /** Bring a broken streak back. Returns false when no credit is available. */
  restoreStreak: (userId: string, method: RestoreMethod, days: number) => Promise<boolean>;
  /** Close the celebration and record the tier as seen. */
  dismissLevelUp: () => void;
  /** Replay a celebration on demand — used by the admin preview control. */
  previewLevelUp: (tierId: StreakTierId) => void;
}

/** Module-level so they are never persisted and never survive a reload. */
let lastRunAt = 0;
/**
 * One calculation at a time.
 *
 * The throttle only stops a *burst*; two calls a second apart both passed it
 * and then interleaved their awaits, so the slower one could finish last and
 * overwrite the newer answer with an older one.
 */
let inFlight: Promise<void> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
/**
 * Consecutive partial reads that have been retried.
 *
 * Capped, because a source can be missing *permanently* — an undeployed
 * security rule, an index that was never built — and an uncapped retry would
 * then re-query seven collections every two seconds for as long as the tab is
 * open. Three attempts covers the transient cases this exists for (a store
 * hydrating, a token arriving); beyond that the read is not going to get
 * better on its own, and the next navigation or focus can try again.
 */
let retriesLeft = 3;
const MIN_INTERVAL_MS = 20_000;
/** How soon to try again after a read that was missing a source. */
const RETRY_MS = 2_000;

/** Ask for another go, unless we have already asked enough times. */
function scheduleRetry(run: () => void) {
  if (retryTimer !== null || retriesLeft <= 0) return;
  retriesLeft -= 1;
  retryTimer = setTimeout(() => { retryTimer = null; run(); }, RETRY_MS);
}

const dayKey = (d: Date) => format(d, 'yyyy-MM-dd');
const todayKey = () => dayKey(new Date());
/** yyyy-MM, the bucket the monthly recovery allowance is counted in. */
const currentMonthKey = () => format(new Date(), 'yyyy-MM');

/** Collections keyed by the field holding the activity date. */
const SPORT_SOURCES: {
  path: string;
  dateField: string;
  completedOnly?: boolean;
  /** Skip rows still waiting to happen — a fixture is not training. */
  playedOnly?: boolean;
}[] = [
  // `playedOnly` matters more than it looks: a scheduled match is a row in
  // this same collection with a future date, and counting one used to end the
  // streak outright rather than extend it.
  { path: 'football_matches', dateField: 'date', playedOnly: true },
  { path: 'tennis_matches', dateField: 'date', playedOnly: true },
  { path: 'basketball_games', dateField: 'date', playedOnly: true },
  { path: 'boxing_bouts', dateField: 'date', playedOnly: true },
  { path: 'swimming_sessions', dateField: 'date', playedOnly: true },
  { path: 'nutritionLogs', dateField: 'createdAt' },
];

/**
 * Ticked-off sessions and finished workouts, read server-side.
 *
 * Both live in collections whose security rules have never been deployed — an
 * App Hosting rollout does not deploy firestore.rules — so a browser read of
 * either is refused under the default-deny catch-all. They were being skipped
 * silently, which meant a week of training the athlete had ticked off counted
 * for nothing.
 */
async function serverSideActivity(): Promise<{ dates: Date[]; ok: boolean }> {
  // `useUser` has already resolved by the time a caller has a uid, but the
  // Firebase SDK restores its own session asynchronously and `currentUser` is
  // null for the first moments after a reload. Reading it too early returned
  // no sessions and no workouts at all, which is most of an athlete's streak.
  try {
    await auth?.authStateReady?.();
  } catch { /* older SDK without the helper; fall through to the null check */ }

  const current = auth?.currentUser;
  if (!current) return { dates: [], ok: false };

  const dates: Date[] = [];
  try {
    const token = await current.getIdToken();
    const [sessions, workoutDays] = await Promise.all([
      listSessions(token),
      listWorkoutDays(token),
    ]);

    sessions.forEach((session) => {
      // Scheduling one for next Tuesday is not training; ticking it off is.
      if (!session.completed || !session.date) return;
      const parsed = toDate(session.date);
      if (parsed) dates.push(startOfDay(parsed));
    });

    workoutDays.forEach((day) => {
      const parsed = toDate(`${day}T12:00:00`);
      if (parsed) dates.push(startOfDay(parsed));
    });
  } catch (err) {
    console.warn('Streak: skipped server-side activity', err);
    return { dates, ok: false };
  }
  return { dates, ok: true };
}

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
      pendingSetTo: null,
      freezesUsed: 0,
      celebratedTierId: null,
      pendingLevelUp: null,
      isLoading: true,
      lastCalculated: null,
      lastCompleteAt: null,

      calculateStreak: async (userId: string, force = false) => {
        if (!userId) return;
        // Callers fire this on mount, focus and navigation; throttle so a burst
        // of route changes doesn't re-query seven collections each time.
        if (!force && Date.now() - lastRunAt < MIN_INTERVAL_MS) return;
        // Join the run already happening rather than starting a second one that
        // would race it to the last write.
        if (inFlight) return inFlight;
        lastRunAt = Date.now();
        set({ isLoading: true });

        inFlight = (async () => {

        try {
          const dates: Date[] = [];
          /**
           * Whether every source answered.
           *
           * A streak assembled from six independent reads is only as true as
           * the least reliable of them, and each one here has a quiet failure
           * path: the plan store may not have hydrated, the auth token may not
           * be ready, a collection query may be refused. Each used to log a
           * warning and carry on, and the number computed from whatever
           * survived was written to state as the answer — which is why the
           * same athlete on the same day could be shown 14, 12, 3 or 1.
           * See scripts/streak/reproduce.mjs.
           */
          const missing: string[] = [];

          // Completed days from the locally-held gym plan. `isHydrated` is the
          // point: before it, `plan` is null and every completed gym day is
          // silently absent.
          const planState = usePlanStore.getState();
          if (!planState.isHydrated) missing.push('gym plan (not hydrated yet)');
          (planState.plan?.days || []).forEach((d) => {
            const parsed = toDate(d.completed_at);
            if (parsed) dates.push(startOfDay(parsed));
          });

          const server = await serverSideActivity();
          if (!server.ok) missing.push('sessions and workout days');
          dates.push(...server.dates);

          // One failing collection (missing index, rules) must not zero the streak.
          const results = await Promise.allSettled(
            SPORT_SOURCES.map((src) =>
              getDocs(query(collection(db, src.path), where('userId', '==', userId)))
            )
          );

          results.forEach((res, i) => {
            if (res.status !== 'fulfilled') {
              console.warn(`Streak: skipped ${SPORT_SOURCES[i].path}`, res.reason);
              missing.push(SPORT_SOURCES[i].path);
              return;
            }
            const source = SPORT_SOURCES[i];
            res.value.docs.forEach((docSnap) => {
              const data = docSnap.data();
              // A planned session only counts once it has been ticked off;
              // scheduling one for next Tuesday is not training.
              if (source.completedOnly && data.completed !== true) return;
              // A fixture has a date but has not been played.
              if (source.playedOnly && data.status === 'upcoming') return;
              const parsed = toDate(data[source.dateField]);
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
            missing.push('bodyweightLogs');
          }

          // Restores and admin adjustments live on the user document so they
          // survive a new device and can be edited from the admin panel.
          let bonusDays = 0;
          let freezesUsed = 0;
          let pendingSetTo: number | null = null;
          try {
            const userSnap = await getDoc(doc(db, 'users', userId));
            const streak = userSnap.data()?.streak ?? {};
            bonusDays = Number(streak.bonusDays) || 0;

            // The allowance refreshes each calendar month, so a counter
            // stamped with an earlier month starts again at zero rather than
            // following the athlete around for good.
            const storedMonth = typeof streak.freezeMonth === 'string' ? streak.freezeMonth : null;
            freezesUsed = storedMonth === currentMonthKey()
              ? Number(streak.freezesUsed) || 0
              : 0;

            // `pendingSetTo` is what an admin asked the streak to become.
            // `overrideDays` is the old field that pinned it there forever;
            // any document still carrying one is treated as the same request
            // so existing athletes migrate on their next visit.
            const requested = streak.pendingSetTo ?? streak.overrideDays;
            pendingSetTo =
              requested === null || requested === undefined ? null : Number(requested);
          } catch (err) {
            console.warn('Streak: could not read saved streak state', err);
          }

          const summary = summariseStreak(dates);

          /**
           * An admin adjustment is a restore, not a freeze.
           *
           * It used to replace the computed streak outright, which meant a
           * streak an admin repaired stopped being a streak: it never grew
           * when the athlete trained and never broke when they stopped. The
           * requested number is converted once into the same `bonusDays`
           * credit a normal restore uses, so the count carries on from there
           * under its own steam.
           */
          if (pendingSetTo !== null && !Number.isNaN(pendingSetTo)) {
            bonusDays = Math.max(0, pendingSetTo - summary.current);
            try {
              await setDoc(
                doc(db, 'users', userId),
                { streak: { bonusDays, pendingSetTo: null, overrideDays: null } },
                { merge: true }
              );
            } catch (err) {
              // Applying it again next time is harmless; the arithmetic is the
              // same as long as the athlete has not logged in between.
              console.warn('Streak: could not persist the admin adjustment', err);
            }
          }

          const current = summary.current + Math.max(0, bonusDays);

          /**
           * A partial read is not an answer.
           *
           * If anything failed and we already have a figure from a run that did
           * read everything, keep it. Publishing the lower number is what made
           * the streak flicker — it would drop on a cold load, climb back when
           * the plan hydrated, drop again on the next navigation. The throttle
           * is cleared too, so the very next trigger retries instead of waiting
           * out the interval, and a retry is scheduled in case nothing else
           * happens to fire.
           */
          if (missing.length > 0 && get().lastCompleteAt !== null) {
            console.warn(`Streak: partial read, keeping the last complete value. Missing: ${missing.join(', ')}`);
            lastRunAt = 0;
            scheduleRetry(() => void get().calculateStreak(userId, true));
            set({ isLoading: false });
            return;
          }
          // Did this calculation move the athlete up the ladder?
          const reachedId = tierForStreak(current).id;
          const seenId = get().celebratedTierId;
          let pendingLevelUp = get().pendingLevelUp;
          let celebratedTierId = seenId;

          if (seenId === null) {
            // First ever calculation: record where they stand, celebrate nothing.
            celebratedTierId = reachedId;
          } else if (tierIndex(reachedId) > tierIndex(seenId)) {
            pendingLevelUp = reachedId;
          } else if (tierIndex(reachedId) < tierIndex(seenId)) {
            // The streak fell back a tier. Drop the marker with it so climbing
            // to that tier again is celebrated rather than silently skipped.
            celebratedTierId = reachedId;
          }

          set({
            current,
            longest: Math.max(summary.longest, current),
            activeToday: summary.activeToday,
            activeDays: summary.activeDays,
            bonusDays,
            pendingSetTo: null,
            freezesUsed,
            celebratedTierId,
            pendingLevelUp,
            isLoading: false,
            lastCalculated: todayKey(),
            // Only a run that read every source may claim to be complete. The
            // first-ever calculation still publishes whatever it managed, since
            // a partial number beats an empty dial, but it does not get to
            // block the better answer that follows.
            lastCompleteAt: missing.length === 0 ? Date.now() : get().lastCompleteAt,
          });

          if (missing.length > 0) {
            lastRunAt = 0;
            scheduleRetry(() => void get().calculateStreak(userId, true));
          } else {
            // A clean read earns the next run its full allowance back.
            retriesLeft = 3;
          }
        } catch (error) {
          console.error('Error calculating streak:', error);
          set({ isLoading: false });
        }
        })().finally(() => { inFlight = null; });

        return inFlight;
      },

      restoreStreak: async (userId, method, days) => {
        if (!userId || days <= 0) return false;
        const { bonusDays, freezesUsed, longest } = get();

        // A free recovery spends one of the tier's credits; paid and
        // support-granted restores don't.
        if (method === 'freeze') {
          if (restoresRemaining(longest, freezesUsed) <= 0) return false;
        }

        try {
          // setDoc-with-merge, not updateDoc: an athlete whose profile document
          // was never created would otherwise get a hard failure here.
          await setDoc(
            doc(db, 'users', userId),
            {
              streak: {
                bonusDays: increment(days),
                ...(method === 'freeze'
                  ? { freezesUsed: increment(1), freezeMonth: currentMonthKey() }
                  : {}),
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

      dismissLevelUp: () => {
        const { pendingLevelUp, celebratedTierId } = get();
        if (!pendingLevelUp) return;
        set({
          pendingLevelUp: null,
          // A preview replays a tier already seen; never move the marker back.
          celebratedTierId:
            celebratedTierId && tierIndex(celebratedTierId) > tierIndex(pendingLevelUp)
              ? celebratedTierId
              : pendingLevelUp,
        });
      },

      previewLevelUp: (tierId) => set({ pendingLevelUp: tierId }),
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
        freezesUsed: state.freezesUsed,
        celebratedTierId: state.celebratedTierId,
        // `pendingLevelUp` stays out on purpose: a celebration that was never
        // dismissed should not reappear on every reload for ever after.
        lastCalculated: state.lastCalculated,
        // Persisted, so a reload knows the stored figure was trustworthy and a
        // partial read on the next cold start does not get to replace it.
        lastCompleteAt: state.lastCompleteAt,
      }),
    }
  )
);
