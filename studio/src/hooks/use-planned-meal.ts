"use client";

import { useCallback } from 'react';

import { setPlannedMealLogged } from '@/lib/plan-meal-log';
import { useNutritionPlanStore } from '@/stores/nutrition-plan-store';
import { toast } from '@/hooks/use-toast';
import { useUser } from './use-user';

/**
 * Tick a planned meal off, and log it while you are there.
 *
 * The tick and the ring were two unrelated things: `toggleMealCompleted` set a
 * flag in browser storage, while the ring counted `nutritionLogs`. Working
 * through the day's plan therefore moved nothing. This keeps them in step —
 * the flag flips immediately so the checkbox feels instant, and the log entry
 * follows; if that write fails the flag goes back rather than claiming a meal
 * was eaten that was never recorded.
 */
export function useTogglePlannedMeal() {
    const { user } = useUser();
    const generatedPlan = useNutritionPlanStore((s) => s.generatedPlan);
    const toggleMealCompleted = useNutritionPlanStore((s) => s.toggleMealCompleted);

    return useCallback(async (index: number) => {
        const meal = generatedPlan?.meals[index];
        if (!meal) return;

        const nowCompleted = !meal.completed;
        toggleMealCompleted(index);

        if (!user?.uid) return;
        try {
            await setPlannedMealLogged(user.uid, index, meal, nowCompleted);
        } catch (error) {
            toggleMealCompleted(index);
            toast({
                variant: 'destructive',
                title: 'Could not update your nutrition log',
                description: error instanceof Error ? error.message : String(error),
            });
        }
    }, [generatedPlan, toggleMealCompleted, user?.uid]);
}
