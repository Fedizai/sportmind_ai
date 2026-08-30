"use client";

import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';

import { useTranslation } from '@/hooks/use-translation';
import type { Ingredient, IngredientUnit } from '@/lib/ingredients';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

/**
 * Correct a generated meal.
 *
 * The plan is a proposal. An athlete who dislikes an ingredient, cannot buy
 * one, or eats a different amount could previously only regenerate the whole
 * day — losing every other meal in it. Editing one meal leaves the rest alone,
 * and the prices beside each ingredient re-estimate from the new quantities.
 */
export function EditPlanMealDialog({
  mealName,
  calories,
  protein,
  ingredients,
  onSave,
}: {
  mealName: string;
  calories: number;
  protein?: number;
  ingredients: Ingredient[];
  onSave: (patch: {
    name: string;
    calories: number;
    protein?: number;
    items: Array<{ name: string; quantity: number; unit: IngredientUnit }>;
  }) => void;
}) {
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState(mealName);
  const [kcal, setKcal] = useState(String(Math.round(calories)));
  const [prot, setProt] = useState(protein === undefined ? '' : String(Math.round(protein)));
  const [rows, setRows] = useState<Ingredient[]>(ingredients);

  useEffect(() => {
    if (!open) return;
    setName(mealName);
    setKcal(String(Math.round(calories)));
    setProt(protein === undefined ? '' : String(Math.round(protein)));
    setRows(ingredients.map((i) => ({ ...i })));
  }, [open, mealName, calories, protein, ingredients]);

  const setRow = (index: number, patch: Partial<Ingredient>) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const save = () => {
    const parsedKcal = parseFloat(kcal);
    const parsedProt = parseFloat(prot);
    onSave({
      name: name.trim() || mealName,
      calories: Number.isFinite(parsedKcal) ? parsedKcal : calories,
      protein: prot.trim() === '' ? undefined : (Number.isFinite(parsedProt) ? parsedProt : protein),
      items: rows
        .filter((r) => r.name.trim())
        .map((r) => ({ name: r.name.trim(), quantity: r.quantity, unit: r.unit })),
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="mr-2 h-4 w-4" />
          {t('edit')}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('editPlanMealTitle')}</DialogTitle>
          <DialogDescription>{t('editPlanMealSubtitle')}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3 space-y-1">
            <Label className="text-xs text-muted-foreground">{t('editPlanMealName')}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t('calories')}</Label>
            <Input type="number" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t('protein')} (g)</Label>
            <Input type="number" inputMode="numeric" value={prot} onChange={(e) => setProt(e.target.value)} />
          </div>
        </div>

        <ScrollArea className="max-h-[40vh] pr-3">
          <div className="space-y-2">
            {rows.map((row, index) => (
              <div key={index} className="grid grid-cols-[1fr_5rem_6rem_auto] items-end gap-2">
                <div className="space-y-1">
                  {index === 0 && <Label className="text-xs text-muted-foreground">{t('planColumnFood')}</Label>}
                  <Input value={row.name} onChange={(e) => setRow(index, { name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  {index === 0 && <Label className="text-xs text-muted-foreground">{t('planColumnQuantity')}</Label>}
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={String(row.quantity)}
                    onChange={(e) => setRow(index, { quantity: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  {index === 0 && <Label className="text-xs text-muted-foreground">{t('editExerciseUnit')}</Label>}
                  <Select
                    value={row.unit}
                    onValueChange={(v) => setRow(index, { unit: v as IngredientUnit })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                      <SelectItem value="piece">{t('editPlanMealPiece')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('delete')}
                  onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setRows((prev) => [...prev, { name: '', quantity: 100, unit: 'g' }])}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('editMealAddFood')}
            </Button>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{t('cancel')}</Button>
          <Button onClick={save}>{t('save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
