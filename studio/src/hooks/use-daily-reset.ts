"use client";

import { useEffect, useRef } from 'react';
import { format } from 'date-fns';

import { useNutritionStore } from '@/stores/nutrition-store';
import { usePlanStore } from '@/stores/plan-store';
import { useShoppingListStore } from '@/stores/shopping-list-store';
import { useNutritionPlanStore } from '@/stores/nutrition-plan-store';
import { useStreakStore } from '@/stores/streak-store';
import { useUser } from './use-user';

const dayKey = () => format(new Date(), 'yyyy-MM-dd');
const STORAGE_KEY = 'sportmind:lastDailyReset';

/**
 * A new day clears what was done, never what was planned.
 *
 * The plan is the athlete's — a generated meal plan or gym programme stays
 * exactly as it is until they change it. What resets is the record of having
 * done it: meals untick, shopping lines uncheck, the current workout's sets
 * clear. Nothing is ever marked done on the athlete's behalf.
 *
 * The day was previously tracked in a ref, which is null on every page load, so
 * the hook's own first-load branch returned before resetting anything. Opening
 * the app fresh the next morning — the normal case — therefore never triggered
 * a reset at all, and yesterday's ticks carried over: breakfast showed as
 * already eaten. The day is persisted now, so a reload the next day resets and
 * a reload the same day does not.
 */
export function useDailyReset() {
    const { user } = useUser();
    const resetNutrition = useNutritionStore(state => state.resetDailyData);
    const startNewGymDay = usePlanStore(state => state.startNewDay);
    const resetShoppingList = useShoppingListStore(state => state.resetDailyData);
    const resetMealPlan = useNutritionPlanStore(state => state.resetDailyData);
    const calculateStreak = useStreakStore(state => state.calculateStreak);

    // Guards against running twice within one mount; the durable record of
    // which day was last reset lives in storage.
    const ranFor = useRef<string | null>(null);

    useEffect(() => {
        const check = () => {
            const today = dayKey();
            if (ranFor.current === today) return;

            let last: string | null = null;
            try {
                last = window.localStorage.getItem(STORAGE_KEY);
            } catch {
                // Private browsing with storage blocked: fall back to resetting
                // once per mount, which is the safer of the two mistakes.
            }

            ranFor.current = today;
            if (last === today) return;

            try {
                window.localStorage.setItem(STORAGE_KEY, today);
            } catch { /* nothing to do */ }

            // The plans survive; only what was ticked off goes.
            resetMealPlan();
            resetShoppingList();
            startNewGymDay();
            if (user?.uid) {
                resetNutrition(user.uid);
                calculateStreak(user.uid);
            }
        };

        check();
        // A tab left open across midnight resets when it comes back to focus.
        window.addEventListener('focus', check);
        return () => window.removeEventListener('focus', check);
    }, [user, resetNutrition, startNewGymDay, resetShoppingList, resetMealPlan, calculateStreak]);
}
