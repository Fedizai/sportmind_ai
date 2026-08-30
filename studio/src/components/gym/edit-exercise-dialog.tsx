"use client";

import { useEffect, useState } from 'react';
import { Loader2, Pencil } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { usePlanStore, type Exercise, type WeightUnit } from '@/stores/plan-store';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

/**
 * Change what an exercise is, not just how heavy it is.
 *
 * The generated plan was effectively a printout: an athlete could tick a set
 * off and adjust the load, but not swap a movement they cannot do, fix a rep
 * range, or drop something. All of that is theirs to change now — it is their
 * training, and the generator only ever proposed a starting point.
 */
export function EditExerciseDialog({
  dayIndex,
  exerciseIndex,
  exercise,
}: {
  dayIndex: number;
  exerciseIndex: number;
  exercise: Exercise;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const updateExercise = usePlanStore((s) => s.updateExercise);
  const removeExercise = usePlanStore((s) => s.removeExercise);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState(exercise.name);
  const [sets, setSets] = useState(String(exercise.sets));
  const [reps, setReps] = useState(exercise.reps);
  const [weight, setWeight] = useState(String(exercise.weight?.value ?? 0));
  const [unit, setUnit] = useState<WeightUnit>(exercise.weight?.unit ?? 'kg');
  const [saving, setSaving] = useState(false);

  // Re-seed on open so an abandoned edit does not carry into the next one.
  useEffect(() => {
    if (!open) return;
    setName(exercise.name);
    setSets(String(exercise.sets));
    setReps(exercise.reps);
    setWeight(String(exercise.weight?.value ?? 0));
    setUnit(exercise.weight?.unit ?? 'kg');
  }, [open, exercise]);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const parsedSets = parseInt(sets, 10);
      const parsedWeight = parseFloat(weight);
      await updateExercise(dayIndex, exerciseIndex, {
        name: name.trim(),
        sets: Number.isFinite(parsedSets) && parsedSets > 0 ? parsedSets : exercise.sets,
        reps: reps.trim() || exercise.reps,
        weight: {
          // Bodyweight carries no number, so a stale figure is not kept around.
          value: unit === 'bodyweight' ? 0 : (Number.isFinite(parsedWeight) ? parsedWeight : 0),
          unit,
        },
      });
      toast({ title: t('editExerciseSaved') });
      setOpen(false);
    } catch (error) {
      console.error('Could not update exercise:', error);
      toast({ variant: 'destructive', title: t('editExerciseFailed') });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await removeExercise(dayIndex, exerciseIndex);
      toast({ title: t('editExerciseRemoved') });
      setOpen(false);
    } catch (error) {
      console.error('Could not remove exercise:', error);
      toast({ variant: 'destructive', title: t('editExerciseFailed') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t('edit')}>
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('editExerciseTitle')}</DialogTitle>
          <DialogDescription>{t('editExerciseSubtitle')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ex-name">{t('editExerciseName')}</Label>
            <Input id="ex-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ex-sets">{t('editExerciseSets')}</Label>
              <Input
                id="ex-sets"
                type="number"
                inputMode="numeric"
                value={sets}
                onChange={(e) => setSets(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ex-reps">{t('editExerciseReps')}</Label>
              <Input
                id="ex-reps"
                value={reps}
                placeholder="8-12"
                onChange={(e) => setReps(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ex-weight">{t('editExerciseWeight')}</Label>
              <Input
                id="ex-weight"
                type="number"
                inputMode="decimal"
                value={weight}
                disabled={unit === 'bodyweight'}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('editExerciseUnit')}</Label>
              <Select value={unit} onValueChange={(v) => setUnit(v as WeightUnit)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="lbs">lbs</SelectItem>
                  <SelectItem value="bodyweight">{t('editExerciseBodyweight')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="destructive" onClick={remove} disabled={saving}>
            {t('editExerciseRemove')}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              {t('cancel')}
            </Button>
            <Button onClick={save} disabled={saving || !name.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('save')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
