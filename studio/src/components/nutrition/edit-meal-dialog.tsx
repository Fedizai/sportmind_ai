"use client";

import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { updateNutritionLog } from '@/app/dashboard/nutrition/actions';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * Correct a meal after it was logged.
 *
 * A logged meal could only be deleted and re-entered from scratch, so one
 * mistyped portion cost the whole entry. Every number the log stores is
 * editable here, including the calorie figure itself — a scanned product or an
 * AI estimate is often close but not right, and the athlete is the one who
 * knows what they actually ate.
 */

export interface EditableMealItem {
  name: string;
  portion: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar: number;
  sodium: number;
  iron?: number;
  potassium?: number;
}

/** Field order matches how the log renders them, so nothing moves under the eye. */
const NUMERIC_FIELDS: Array<{ key: keyof EditableMealItem; labelKey: string; unit: string }> = [
  { key: 'portion',  labelKey: 'editMealPortion', unit: 'g' },
  { key: 'calories', labelKey: 'calories',        unit: 'kcal' },
  { key: 'protein',  labelKey: 'protein',         unit: 'g' },
  { key: 'carbs',    labelKey: 'carbs',           unit: 'g' },
  { key: 'fat',      labelKey: 'fat',             unit: 'g' },
  { key: 'sugar',    labelKey: 'sugar',           unit: 'g' },
];

export function EditMealDialog({
  logId,
  items,
  onSaved,
}: {
  logId: string;
  items: EditableMealItem[];
  onSaved?: () => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<EditableMealItem[]>(items);
  const [saving, setSaving] = useState(false);

  // Re-seed each time it opens, so an abandoned edit does not persist into the
  // next one and a change made elsewhere is picked up.
  useEffect(() => {
    if (open) setDraft(items.map((i) => ({ ...i })));
  }, [open, items]);

  const setField = (index: number, key: keyof EditableMealItem, value: string) => {
    setDraft((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (key === 'name') return { ...item, name: value };
        const parsed = parseFloat(value);
        return { ...item, [key]: Number.isFinite(parsed) ? parsed : 0 };
      })
    );
  };

  const removeItem = (index: number) =>
    setDraft((prev) => prev.filter((_, i) => i !== index));

  const addItem = () =>
    setDraft((prev) => [
      ...prev,
      { name: '', portion: 100, calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 0 },
    ]);

  const total = draft.reduce((sum, i) => sum + (i.calories || 0), 0);
  const canSave = draft.length > 0 && draft.every((i) => i.name.trim()) && !saving;

  const save = async () => {
    setSaving(true);
    try {
      await updateNutritionLog(
        logId,
        draft.map((i) => ({
          name: i.name.trim(),
          portion: i.portion,
          calories: i.calories,
          protein: i.protein,
          carbs: i.carbs,
          fat: i.fat,
          sugar: i.sugar,
          sodium: i.sodium,
        }))
      );
      toast({ title: t('editMealSaved') });
      setOpen(false);
      onSaved?.();
    } catch (error) {
      console.error('Could not update meal:', error);
      toast({
        variant: 'destructive',
        title: t('editMealFailed'),
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0"
          aria-label={t('edit')}
          onClick={(e) => e.stopPropagation()}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('editMealTitle')}</DialogTitle>
          <DialogDescription>{t('editMealSubtitle')}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] pr-3">
          <div className="space-y-4">
            {draft.map((item, index) => (
              <div key={index} className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={item.name}
                    onChange={(e) => setField(index, 'name', e.target.value)}
                    placeholder={t('editMealFoodName')}
                    className="font-medium"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('delete')}
                    disabled={draft.length === 1}
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {NUMERIC_FIELDS.map(({ key, labelKey, unit }) => (
                    <div key={String(key)} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        {t(labelKey as any)} ({unit})
                      </Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={String(item[key] ?? 0)}
                        onChange={(e) => setField(index, key, e.target.value)}
                        className="tabular-nums"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={addItem} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              {t('editMealAddFood')}
            </Button>
          </div>
        </ScrollArea>

        <div className="rounded-lg bg-muted/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('editMealNewTotal')}
          </p>
          <p className="text-2xl font-bold tabular-nums">{Math.round(total)} kcal</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {t('cancel')}
          </Button>
          <Button onClick={save} disabled={!canSave}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
