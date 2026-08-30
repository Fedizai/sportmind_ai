"use client";

import { useMemo } from 'react';
import { Loader2, Plus, ShoppingCart } from 'lucide-react';

import { useTranslation } from '@/hooks/use-translation';
import { useShoppingRegion } from '@/hooks/use-shopping-region';
import { useIngredientPrices } from '@/hooks/use-ingredient-prices';
import { formatQuantity, toIngredients, type Ingredient, type RawPlanItem } from '@/lib/ingredients';
import { PriceTag, PriceTotal } from '@/components/nutrition/price-tag';
import { RegionPicker } from '@/components/nutrition/region-picker';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

/**
 * The generated day's meals, each ingredient priced beside it.
 *
 * The split matters: the model writes the meal, and a deterministic price
 * service costs it from real Open Prices observations. The model is never
 * asked what anything costs, and a food with no observations shows "price
 * unavailable" rather than a plausible-looking number.
 *
 * Prices for the whole day are fetched in one request from this level, so
 * opening four meals does not mean four round trips, and the daily total is
 * summed from exactly the figures the rows show.
 */

export interface PlanMeal {
  name: string;
  description: string;
  calories: number;
  protein?: number;
  items: RawPlanItem[];
  completed?: boolean;
}

interface PlanMealsProps {
  meals: PlanMeal[];
  onToggleCompleted: (index: number) => void;
  onLogMeal: (meal: PlanMeal, ingredients: Ingredient[]) => void;
  onAddToShoppingList: (ingredient: Ingredient) => void;
  isLogging: boolean;
}

export function PlanMeals({
  meals, onToggleCompleted, onLogMeal, onAddToShoppingList, isLogging,
}: PlanMealsProps) {
  const { t } = useTranslation();
  const { region } = useShoppingRegion();

  // Parsed once. Plans generated before ingredients were structured hold plain
  // strings, which `toIngredients` reads too, so an old saved plan still
  // renders — with whatever quantity its text carried.
  const byMeal = useMemo(
    () => meals.map((meal) => toIngredients(meal.items)),
    [meals]
  );
  const everything = useMemo(() => byMeal.flat(), [byMeal]);

  const { priceOf, totalOf, isLoading } = useIngredientPrices(everything, region);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-3">
        <RegionPicker />
      </div>

      <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
        {meals.map((meal, index) => {
          const ingredients = byMeal[index];
          const mealTotal = totalOf(ingredients);

          return (
            <AccordionItem value={`item-${index}`} key={`${meal.name}-${index}`}>
              <AccordionTrigger className="capitalize">
                <div className="flex flex-grow items-center gap-4 pr-3">
                  <Checkbox
                    checked={meal.completed}
                    onCheckedChange={() => onToggleCompleted(index)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={meal.name}
                  />
                  <span className="flex-grow text-left">{meal.name}</span>
                  <span className="shrink-0 text-sm font-normal text-muted-foreground tabular-nums">
                    {Math.round(meal.calories)} kcal
                  </span>
                </div>
              </AccordionTrigger>

              <AccordionContent>
                <p className="mb-3 font-medium">{meal.description}</p>

                {ingredients.length > 0 && (
                  <div className="rounded-lg border">
                    {/* Column headings on desktop only; on a phone each row
                        stacks and headings would cost more than they explain. */}
                    <div className="hidden grid-cols-[1fr_auto_auto] gap-3 border-b px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
                      <span>{t('planColumnFood')}</span>
                      <span className="text-right">{t('planColumnQuantity')}</span>
                      <span className="min-w-24 text-right">{t('planColumnPrice')}</span>
                    </div>

                    <ul>
                      {ingredients.map((ingredient, i) => (
                        <li
                          key={`${ingredient.name}-${i}`}
                          className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-0.5 border-b px-3 py-2 last:border-0 sm:grid-cols-[1fr_auto_auto]"
                        >
                          <span className="col-span-2 text-sm sm:col-span-1">{ingredient.name}</span>
                          <span className="text-xs text-muted-foreground tabular-nums sm:text-right sm:text-sm">
                            {formatQuantity(ingredient)}
                          </span>
                          <PriceTag
                            price={priceOf(ingredient)}
                            loading={isLoading}
                            className="min-w-24 text-right text-sm"
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="tabular-nums">{Math.round(meal.calories)} kcal</span>
                  {typeof meal.protein === 'number' && (
                    <span className="tabular-nums">{Math.round(meal.protein)} g {t('protein')}</span>
                  )}
                </div>

                <PriceTotal
                  total={mealTotal}
                  label={t('estimatedMealPrice')}
                  loading={isLoading}
                  className="mt-3"
                />

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => onLogMeal(meal, ingredients)} disabled={isLogging}>
                    {isLogging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    {t('addToLog')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => ingredients.forEach(onAddToShoppingList)}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {t('addToShoppingList')}
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <PriceTotal
        total={totalOf(everything)}
        label={t('estimatedDailyCost')}
        loading={isLoading}
      />
    </div>
  );
}
