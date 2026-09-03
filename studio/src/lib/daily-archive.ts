import { format } from 'date-fns';

import type { NutritionPlanState } from '@/stores/nutrition-plan-store';
import type { ShoppingListItem } from '@/stores/shopping-list-store';

/**
 * The day an athlete's plan belongs to, as `yyyy-MM-dd` in their own timezone.
 *
 * A plain string rather than a Timestamp on purpose: history is browsed one
 * calendar day at a time, and a string key means the lookup is a document read
 * by id instead of a range query that needs its own composite index — the kind
 * of index whose absence has already silently emptied lists in this app.
 */
export const dayKey = (date: Date) => format(date, 'yyyy-MM-dd');

/** Deterministic id, so a day is written once and then updated in place. */
export const snapshotId = (userId: string, date: Date) => `${userId}_${dayKey(date)}`;

export const DAILY_SNAPSHOTS = 'daily_snapshots';

/**
 * A day's nutrition plan and shopping list, kept forever.
 *
 * Both used to live only in `localStorage`, which meant three things at once:
 * they vanished when the browser was cleared, they never followed the athlete
 * to a second device, and every past day was overwritten by the next one — so
 * the history page had nothing to show and never could have.
 */
export interface DailySnapshot {
  userId: string;
  /** `yyyy-MM-dd`. */
  day: string;
  mealPlan: NutritionPlanState['generatedPlan'];
  shoppingList: ShoppingListItem[];
  planDays: number;
}

/**
 * Firestore rejects a document containing `undefined` anywhere inside it, and
 * an optional field left unset by a generated plan is exactly that. Dropping
 * them is the whole job — a rejected write is a day of history lost.
 */
export function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? null));
}
