import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { NutritionPlanOutput } from '@/ai/schemas';
import {
  aggregateIngredients, foodKey, toIngredients,
  type Ingredient, type IngredientUnit,
} from '@/lib/ingredients';

export interface ShoppingListItem {
  id: string;
  name: string;
  checked: boolean;
  /**
   * Where the line came from. Plan-derived lines are replaced wholesale when
   * the plan is imported again; hand-typed ones are never touched.
   */
  source?: 'plan' | 'custom';
  /**
   * How much to buy. Zero on items typed in by hand and on entries saved
   * before the list carried quantities — those still show and still tick, they
   * simply cannot be priced.
   */
  quantity: number;
  unit: IngredientUnit;
}

interface ShoppingListState {
  items: ShoppingListItem[];
  addItemsFromPlan: (plan: NutritionPlanOutput) => void;
  addIngredient: (ingredient: Ingredient) => void;
  addCustomItem: (name: string) => void;
  toggleItemChecked: (itemId: string) => void;
  clearCompletedItems: () => void;
  clearList: () => void;
  resetDailyData: () => void;
}

/**
 * Fold one ingredient into an existing list.
 *
 * The same food arriving twice — chicken from Monday's lunch and Thursday's —
 * becomes one line with the amounts added, which is how a shopping list is
 * actually used. Previously each occurrence was appended as its own entry and
 * a duplicate name was dropped entirely, so the list said "Chicken breast"
 * once with no idea how much to buy.
 */
function merge(
  items: ShoppingListItem[],
  ingredient: Ingredient,
  source: 'plan' | 'custom' = 'plan'
): ShoppingListItem[] {
  const key = foodKey(ingredient.name);
  const index = items.findIndex(
    (i) => foodKey(i.name) === key && (i.unit ?? 'piece') === ingredient.unit
  );

  if (index === -1) {
    return [...items, {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: ingredient.name,
      checked: false,
      source,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
    }];
  }

  const next = [...items];
  next[index] = { ...next[index], quantity: (next[index].quantity ?? 0) + ingredient.quantity };
  return next;
}

export const useShoppingListStore = create<ShoppingListState>()(
  persist(
    (set, get) => ({
      items: [],
      addItemsFromPlan: (plan) => {
        // Importing the same plan twice must not double every quantity, so the
        // previous import is dropped first and the plan re-applied. Custom
        // lines, and their checked state, survive untouched.
        const fromPlan = aggregateIngredients(
          plan.meals.flatMap((meal) => toIngredients(meal.items as any))
        );
        let items = get().items.filter((i) => i.source !== 'plan');
        for (const ingredient of fromPlan) items = merge(items, ingredient, 'plan');
        set({ items });
      },
      addIngredient: (ingredient) => {
        if (!ingredient?.name) return;
        set({ items: merge(get().items, ingredient, 'plan') });
      },
      addCustomItem: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        // Typed by hand, so there is no reliable quantity to attach.
        set({ items: merge(get().items, { name: trimmed, quantity: 0, unit: 'piece' }, 'custom') });
      },
      toggleItemChecked: (itemId) => {
        set({
          items: get().items.map(item =>
            item.id === itemId ? { ...item, checked: !item.checked } : item
          ),
        });
      },
      clearCompletedItems: () => {
        set({ items: get().items.filter(item => !item.checked) });
      },
      clearList: () => {
        set({ items: [] });
      },
      resetDailyData: () => {
        set({ items: get().items.map(item => ({ ...item, checked: false })) });
      }
    }),
    {
      name: 'shopping-list-storage',
      storage: createJSONStorage(() => localStorage),
      /**
       * Entries saved before quantities existed have neither field. Fill them
       * in on load so every reader can assume they are there.
       */
      migrate: (persisted: any) => ({
        ...persisted,
        items: (persisted?.items ?? []).map((item: any) => ({
          ...item,
          quantity: typeof item?.quantity === 'number' ? item.quantity : 0,
          unit: item?.unit === 'g' || item?.unit === 'ml' ? item.unit : 'piece',
          // Anything saved before this existed is treated as hand-typed, so a
          // plan import never silently deletes it.
          source: item?.source === 'plan' ? 'plan' : 'custom',
        })),
      }),
      version: 1,
    }
  )
);
