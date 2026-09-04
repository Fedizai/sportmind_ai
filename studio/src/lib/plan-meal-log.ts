import { deleteDoc, doc, setDoc, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';

import { db } from '@/lib/firebase';
import type { Meal } from '@/stores/nutrition-plan-store';

/**
 * Ticking off a planned meal logs it.
 *
 * The tick used to be a flag in browser storage and nothing else, so an
 * athlete could work through the whole day's plan and watch the nutrition ring
 * stay at zero — the ring is fed by `nutritionLogs`, and nothing was writing
 * there. Marking a meal eaten now writes the entry, and unticking removes it.
 *
 * The id is deterministic — one athlete, one day, one position in the plan —
 * so ticking and unticking the same meal updates one document instead of
 * piling up duplicates, and re-ticking after a reload finds the same row.
 */

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

/** A generated plan names its meals; anything unrecognised is a snack. */
export function mealTypeFor(name: string): MealType {
    const key = name.trim().toLowerCase();
    const match = MEAL_TYPES.find((type) => key.includes(type));
    if (match) return match;
    // The generator answers in the athlete's language.
    if (key.includes('petit')) return 'breakfast';
    if (key.includes('déjeuner') || key.includes('dejeuner') || key.includes('midi')) return 'lunch';
    if (key.includes('dîner') || key.includes('diner') || key.includes('soir')) return 'dinner';
    return 'snack';
}

export const plannedMealLogId = (userId: string, index: number, when: Date = new Date()) =>
    `${userId}_${format(when, 'yyyy-MM-dd')}_plan${index}`;

export async function setPlannedMealLogged(
    userId: string,
    index: number,
    meal: Meal,
    logged: boolean,
): Promise<void> {
    const ref = doc(db, 'nutritionLogs', plannedMealLogId(userId, index));

    if (!logged) {
        await deleteDoc(ref);
        return;
    }

    // A generated plan states calories and protein and nothing else, so carbs
    // and fat are recorded as zero rather than guessed from the calorie count.
    await setDoc(ref, {
        userId,
        mealType: mealTypeFor(meal.name),
        source: 'plan',
        items: [{
            name: meal.name,
            calories: Math.max(0, Math.round(meal.calories ?? 0)),
            protein: Math.max(0, Math.round(meal.protein ?? 0)),
            carbs: 0,
            fat: 0,
            portion: 1,
        }],
        createdAt: Timestamp.now(),
    });
}
