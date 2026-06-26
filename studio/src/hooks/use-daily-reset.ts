
"use client";

import { useEffect, useRef } from 'react';
import { useNutritionStore } from '@/stores/nutrition-store';
import { usePlanStore } from '@/stores/plan-store';
import { useShoppingListStore } from '@/stores/shopping-list-store';
import { useUser } from './use-user';
import { useNutritionPlanStore } from '@/stores/nutrition-plan-store';
import { useStreakStore } from '@/stores/streak-store';

const getTodayDateString = () => new Date().toLocaleDateString();

export function useDailyReset() {
    const { user } = useUser();
    const resetNutrition = useNutritionStore(state => state.resetDailyData);
    const rehydratePlan = usePlanStore(state => state._rehydrate);
    const resetShoppingList = useShoppingListStore(state => state.resetDailyData);
    const resetMealPlan = useNutritionPlanStore(state => state.resetDailyData);
    const calculateStreak = useStreakStore(state => state.calculateStreak);
    
    // Use a ref to store the last checked date to avoid re-renders
    const lastCheckedDateRef = useRef<string | null>(null);

    useEffect(() => {
        const checkAndResetData = () => {
            const today = getTodayDateString();
            
            // On first load, set the current date
            if (lastCheckedDateRef.current === null) {
                lastCheckedDateRef.current = today;
                return;
            }

            // If the date has changed since the last check
            if (lastCheckedDateRef.current !== today) {
                console.log("New day detected. Resetting daily data...");
                
                // Call reset functions from stores
                if (user?.uid) {
                    resetNutrition(user.uid);
                    calculateStreak(user.uid);
                }
                rehydratePlan();
                resetShoppingList();
                resetMealPlan();

                // Update the ref to the new day
                lastCheckedDateRef.current = today;
            }
        };

        // Check immediately when the hook mounts
        checkAndResetData();

        // Also check when the window regains focus (e.g., user comes back to the tab)
        window.addEventListener('focus', checkAndResetData);

        return () => {
            window.removeEventListener('focus', checkAndResetData);
        };
    }, [user, resetNutrition, rehydratePlan, resetShoppingList, resetMealPlan, calculateStreak]);
}
