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
  /** Pass null to clear the current plan (options omitted). */
  setGeneratedPlan: (plan: NutritionPlanOutput | null, options?: NutritionPlanInput) => void;
  toggleMealCompleted: (mealIndex: number) => void;
  /** Edit a planned meal — its name, calories, protein, or its ingredients. */
  updateMeal: (mealIndex: number, patch: Partial<Meal>) => void;
  removePlan: () => void;
  resetDailyData: () => void;
}

export const useNutritionPlanStore = create<NutritionPlanState>()(
  persist(
    (set, get) => ({
      generatedPlan: null,
      setGeneratedPlan: (plan, options) => {
        if (plan && options) {
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
      /**
       * Correct a generated meal.
       *
       * The plan is a proposal, not an instruction: an athlete who dislikes an
       * ingredient, cannot get one, or eats a different amount could
       * previously only regenerate the whole day and lose everything else in
       * it. Editing one meal leaves the rest alone.
       */
      updateMeal: (mealIndex, patch) => {
        const currentPlan = get().generatedPlan;
        if (!currentPlan) return;
        const meal = currentPlan.meals[mealIndex];
        if (!meal) return;

        const newMeals = [...currentPlan.meals];
        newMeals[mealIndex] = { ...meal, ...patch };
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
