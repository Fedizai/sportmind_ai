"use client";

import { useMemo, useState } from 'react';
import { CalendarDays, Check, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';

import { useTranslation } from '@/hooks/use-translation';
import { useShoppingRegion } from '@/hooks/use-shopping-region';
import { useIngredientPrices } from '@/hooks/use-ingredient-prices';
import { useShoppingListStore, type ShoppingListItem } from '@/stores/shopping-list-store';
import { formatQuantity, groupOf, type FoodGroup, type Ingredient } from '@/lib/ingredients';
import { PriceTag, PriceTotal } from '@/components/nutrition/price-tag';
import { RegionPicker } from '@/components/nutrition/region-picker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

/**
 * The shopping list, grouped by shelf and costed.
 *
 * Aggregation happens in the store as items go in, so chicken appearing in
 * three meals is one line of 580 g rather than three lines that each say
 * "Chicken breast". This component groups those lines by what they are and
 * puts an estimated regional price next to each.
 *
 * The checkbox behaviour that was already here is untouched.
 */

const GROUP_ORDER: FoodGroup[] = ['protein', 'carbs', 'produce', 'fats', 'other'];

const GROUP_LABEL: Record<FoodGroup, string> = {
  protein: 'shoppingGroupProtein',
  carbs: 'shoppingGroupCarbs',
  produce: 'shoppingGroupProduce',
  fats: 'shoppingGroupFats',
  other: 'shoppingGroupOther',
};

/** A list row, in the shape the price engine takes. */
const asIngredient = (item: ShoppingListItem): Ingredient => ({
  name: item.name,
  quantity: item.quantity ?? 0,
  unit: item.unit ?? 'piece',
});

interface ShoppingListPanelProps {
  onPopulateFromPlan: () => void;
}

export function ShoppingListPanel({ onPopulateFromPlan }: ShoppingListPanelProps) {
  const { t } = useTranslation();
  const { region } = useShoppingRegion();
  const store = useShoppingListStore();
  const [draft, setDraft] = useState('');
  /** The row currently being edited inline, if any. */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editQty, setEditQty] = useState('');

  const ingredients = useMemo(() => store.items.map(asIngredient), [store.items]);
  const { priceOf, totalOf, isLoading } = useIngredientPrices(ingredients, region);

  const grouped = useMemo(() => {
    const buckets = new Map<FoodGroup, ShoppingListItem[]>();
    for (const item of store.items) {
      const group = groupOf(item.name);
      const bucket = buckets.get(group);
      if (bucket) bucket.push(item);
      else buckets.set(group, [item]);
    }
    return GROUP_ORDER
      .filter((g) => buckets.has(g))
      .map((g) => ({ group: g, items: buckets.get(g)! }));
  }, [store.items]);

  const addDraft = () => {
    if (!draft.trim()) return;
    store.addCustomItem(draft);
    setDraft('');
  };

  // Only the items that can carry a price count toward the total, and the
  // total says so — see PriceTotal.
  const total = totalOf(ingredients);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('shoppingListTitle')}</CardTitle>
        <CardDescription>{t('shoppingListSubtitle')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-lg border p-3">
          <RegionPicker />
        </div>

        {/* The plan is one day. Shopping for one day at a time means shopping
            every day, so the import scales to however long you are buying for. */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('shoppingDaysLabel')}
              </p>
              <p className="text-sm">{t('shoppingDaysHint')}</p>
            </div>
          </div>
          <Select
            value={String(store.planDays)}
            onValueChange={(v) => store.setPlanDays(Number(v))}
          >
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6, 7, 10, 14, 30].map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {t('shoppingDaysValue', { count: d })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder={t('shoppingAddCustom')}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addDraft()}
          />
          <Button onClick={addDraft} aria-label={t('shoppingAddCustom')}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {store.items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t('shoppingListEmpty')}</p>
        ) : (
          <div className="space-y-5">
            {grouped.map(({ group, items }) => (
              <div key={group}>
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t(GROUP_LABEL[group] as any)}
                </p>
                <ul className="rounded-lg border">
                  {items.map((item) => {
                    const ingredient = asIngredient(item);
                    const quantity = formatQuantity(ingredient);
                    return (
                      <li key={item.id} className="border-b last:border-0">
                        {editingId === item.id ? (
                          <div className="flex items-end gap-2 p-3">
                            <div className="min-w-0 flex-grow space-y-1">
                              <Label className="text-xs text-muted-foreground">{t('editMealFoodName')}</Label>
                              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                            </div>
                            <div className="w-24 space-y-1">
                              <Label className="text-xs text-muted-foreground">{t('planColumnQuantity')}</Label>
                              <Input
                                type="number"
                                inputMode="decimal"
                                value={editQty}
                                onChange={(e) => setEditQty(e.target.value)}
                              />
                            </div>
                            <Button
                              size="icon"
                              aria-label={t('save')}
                              onClick={() => {
                                const q = parseFloat(editQty);
                                store.updateItem(item.id, {
                                  name: editName.trim() || item.name,
                                  quantity: Number.isFinite(q) && q >= 0 ? q : item.quantity,
                                });
                                setEditingId(null);
                              }}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label={t('cancel')}
                              onClick={() => setEditingId(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3 p-3">
                            <Checkbox
                              id={`shopping-${item.id}`}
                              checked={item.checked}
                              onCheckedChange={() => store.toggleItemChecked(item.id)}
                              className="mt-0.5"
                            />
                            {/* The whole row crosses the item off. Aiming for a
                                16px checkbox in a supermarket with one hand is
                                the wrong thing to ask of anyone. */}
                            <button
                              type="button"
                              onClick={() => store.toggleItemChecked(item.id)}
                              className="min-w-0 flex-grow text-left"
                            >
                              <span
                                className={cn(
                                  'block text-sm font-medium leading-snug',
                                  item.checked && 'text-muted-foreground line-through'
                                )}
                              >
                                {item.name}
                              </span>
                              {quantity && (
                                <span className={cn(
                                  'text-xs text-muted-foreground tabular-nums',
                                  item.checked && 'line-through'
                                )}>
                                  {quantity}
                                </span>
                              )}
                            </button>
                            <PriceTag
                              price={priceOf(ingredient)}
                              loading={isLoading}
                              // A hand-typed item has no quantity, so it can
                              // never be priced; saying "unavailable" on every
                              // one of them would be noise.
                              hideWhenUnknown={ingredient.quantity <= 0}
                              className="mt-0.5 text-sm"
                            />
                            <div className="flex shrink-0 items-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label={t('shoppingEditItem')}
                                onClick={() => {
                                  setEditingId(item.id);
                                  setEditName(item.name);
                                  setEditQty(String(item.quantity ?? 0));
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label={t('shoppingRemoveItem')}
                                onClick={() => store.removeItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            <PriceTotal total={total} label={t('estimatedShoppingTotal')} loading={isLoading} />
          </div>
        )}
      </CardContent>

      <CardFooter className="flex-col gap-2 sm:flex-row">
        <Button variant="outline" className="w-full sm:w-auto" onClick={onPopulateFromPlan}>
          <RefreshCw className="mr-2 h-4 w-4" /> {t('shoppingAddFromPlan')}
        </Button>
        <Button variant="secondary" className="w-full sm:w-auto" onClick={store.clearCompletedItems}>
          <Trash2 className="mr-2 h-4 w-4" /> {t('shoppingClearChecked')}
        </Button>
        <Button variant="destructive" className="w-full sm:w-auto" onClick={store.clearList}>
          <Trash2 className="mr-2 h-4 w-4" /> {t('shoppingClearList')}
        </Button>
      </CardFooter>
    </Card>
  );
}
