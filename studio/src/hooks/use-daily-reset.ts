"use client";

import { useEffect } from 'react';
import { format } from 'date-fns';

import { useNutritionStore } from '@/stores/nutrition-store';
import { usePlanStore } from '@/stores/plan-store';
import { useShoppingListStore } from '@/stores/shopping-list-store';
import { useNutritionPlanStore } from '@/stores/nutrition-plan-store';
import { useStreakStore } from '@/stores/streak-store';
import { useUser } from './use-user';

const dayKey = () => format(new Date(), 'yyyy-MM-dd');

/**
 * What was last rolled over, and when.
 *
 * Two stamps, not one. The plan side needs nobody signed in; the calorie ring
 * reads one athlete's logs and cannot be re-pointed until we know which
 * athlete. With a single stamp the first load of a new day claimed the whole
 * day's rollover before auth had resolved, so the ring was skipped and then
 * blocked from retrying — it kept yesterday's window until something else
 * happened to restart it.
 */
const PLAN_KEY = 'sportmind:lastDailyReset';
const NUTRITION_KEY = 'sportmind:lastNutritionReset';

function readDay(key: string): string | null {
    try {
        return window.localStorage.getItem(key);
    } catch {
        // Private browsing with storage blocked. Rolling over once per mount is
        // the safer of the two mistakes: a stale tick is worse than an extra
        // clear of something that was already clear.
        return null;
    }
}

function writeDay(key: string, day: string) {
    try {
        window.localStorage.setItem(key, day);
    } catch { /* nothing to do */ }
}

/** Milliseconds from now to the next 00:00 on this device's own clock. */
function untilLocalMidnight(now = new Date()): number {
    const midnight = new Date(now);
    // setHours(24, …) is the next day's 00:00 in local time, month ends and
    // daylight-saving shifts included.
    midnight.setHours(24, 0, 0, 0);
    return Math.max(1_000, midnight.getTime() - now.getTime());
}

/**
 * A new day clears what was done, never what was planned — once, at midnight.
 *
 * The plan is the athlete's: a generated meal plan or gym programme stays
 * exactly as it is until they change it. What resets is the record of having
 * done it — meals untick, shopping lines uncheck, the current workout's sets
 * clear. Nothing is ever marked done on the athlete's behalf.
 *
 * The rollover used to be opportunistic: it ran when the app mounted and when
 * a window regained focus, and only a stamp in storage kept it from running
 * again. That made the moment the day turned over depend on when the app
 * happened to be looked at rather than on the clock — a tab left open through
 * the night carried yesterday over until someone clicked on it. It is now
 * scheduled for the next local midnight and re-armed after each one, with the
 * focus check kept only to catch a machine that was asleep when the timer
 * should have fired.
 */
export function useDailyReset() {
    const { user } = useUser();
    const userId = user?.uid;
    const resetNutrition = useNutritionStore(state => state.resetDailyData);
    const startNewGymDay = usePlanStore(state => state.startNewDay);
    const resetShoppingList = useShoppingListStore(state => state.resetDailyData);
    const resetMealPlan = useNutritionPlanStore(state => state.resetDailyData);
    const calculateStreak = useStreakStore(state => state.calculateStreak);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | null = null;

        /** Idempotent: each half runs at most once per calendar day. */
        const rollOver = () => {
            const today = dayKey();

            if (readDay(PLAN_KEY) !== today) {
                writeDay(PLAN_KEY, today);
                // The plans survive; only what was ticked off goes.
                resetMealPlan();
                resetShoppingList();
                startNewGymDay();
            }

            if (userId && readDay(NUTRITION_KEY) !== today) {
                writeDay(NUTRITION_KEY, today);
                resetNutrition(userId);
                calculateStreak(userId);
            }
        };

        const arm = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                rollOver();
                arm();
            }, untilLocalMidnight());
        };

        rollOver();
        arm();

        // A laptop asleep at midnight wakes with a timer that never fired, and
        // a phone may have frozen the tab for hours. Coming back into view is
        // the moment to check the date and re-aim at the next midnight.
        const onWake = () => {
            if (document.visibilityState !== 'visible') return;
            rollOver();
            arm();
        };
        window.addEventListener('focus', onWake);
        document.addEventListener('visibilitychange', onWake);

        return () => {
            if (timer) clearTimeout(timer);
            window.removeEventListener('focus', onWake);
            document.removeEventListener('visibilitychange', onWake);
        };
    }, [userId, resetNutrition, startNewGymDay, resetShoppingList, resetMealPlan, calculateStreak]);
}
