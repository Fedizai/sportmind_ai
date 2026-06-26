
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { NutritionPlanOutput } from '@/ai/schemas';

export interface ShoppingListItem {
  id: string;
  name: string;
  checked: boolean;
}

interface ShoppingListState {
  items: ShoppingListItem[];
  addItemsFromPlan: (plan: NutritionPlanOutput) => void;
  addCustomItem: (name: string) => void;
  toggleItemChecked: (itemId: string) => void;
  clearCompletedItems: () => void;
  clearList: () => void;
  resetDailyData: () => void;
}

export const useShoppingListStore = create<ShoppingListState>()(
  persist(
    (set, get) => ({
      items: [],
      addItemsFromPlan: (plan) => {
        const currentItems = get().items;
        const currentItemNames = new Set(currentItems.map(item => item.name.toLowerCase()));
        
        const newItemsFromPlan: ShoppingListItem[] = [];
        plan.meals.forEach(meal => {
          meal.items.forEach(foodItem => {
            if (!currentItemNames.has(foodItem.toLowerCase())) {
              newItemsFromPlan.push({
                id: `plan-${Date.now()}-${foodItem}`,
                name: foodItem,
                checked: false,
              });
              currentItemNames.add(foodItem.toLowerCase()); // Avoid adding duplicates from the same plan
            }
          });
        });
        
        set({ items: [...currentItems, ...newItemsFromPlan] });
      },
      addCustomItem: (name) => {
        const newItem: ShoppingListItem = {
          id: `custom-${Date.now()}`,
          name: name,
          checked: false,
        };
        set({ items: [...get().items, newItem] });
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
        set({ items: get().items.map(item => ({...item, checked: false})) });
      }
    }),
    {
      name: 'shopping-list-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
