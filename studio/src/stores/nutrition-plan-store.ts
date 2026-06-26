import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { NutritionPlanOutput, NutritionPlanInput } from '@/ai/schemas';
import { useShoppingListStore } from './shopping-list-store';

export type Meal = NutritionPlanOutput['meals'][0] & { completed?: boolean };

export interface NutritionPlanState {
  generatedPlan: { 
    meals: Meal[];
    lastOptions: NutritionPlanInput;
  } | null;
  setGeneratedPlan: (plan: NutritionPlanOutput, options: NutritionPlanInput) => void;
  toggleMealCompleted: (mealIndex: number) => void;
  removePlan: () => void;
  resetDailyData: () => void;
}

export const useNutritionPlanStore = create<NutritionPlanState>()(
  persist(
    (set, get) => ({
      generatedPlan: null,
      setGeneratedPlan: (plan, options) => {
        if (plan) {
          const planWithCompletion = {
            ...plan,
            meals: plan.meals.map(meal => ({ ...meal, completed: false })),
            lastOptions: options,
          };
          set({ generatedPlan: planWithCompletion });
        } else {
          set({ generatedPlan: null });
        }
      },
      toggleMealCompleted: (mealIndex) => {
        const currentPlan = get().generatedPlan;
        if (!currentPlan) return;

        const newMeals = [...currentPlan.meals];
        newMeals[mealIndex] = {
            ...newMeals[mealIndex],
            completed: !newMeals[mealIndex].completed
        };
        
        set({ generatedPlan: { ...currentPlan, meals: newMeals } });
      },
      removePlan: () => {
        set({ generatedPlan: null });
      },
      resetDailyData: () => {
        const currentPlan = get().generatedPlan;
        if (currentPlan) {
            const resetMeals = currentPlan.meals.map(meal => ({ ...meal, completed: false }));
            set({ generatedPlan: { ...currentPlan, meals: resetMeals } });
        }
      },
    }),
    {
      name: 'nutrition-plan-storage', // unique name
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
    }
  )
);
