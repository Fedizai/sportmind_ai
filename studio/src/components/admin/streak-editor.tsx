"use client";

import { useEffect, useState } from 'react';
import { Flame, RotateCcw } from 'lucide-react';
import { doc, setDoc, getDoc, deleteField } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { pick } from '@/lib/bilingual';
import { STREAK_TIERS, tierForStreak } from '@/lib/streak-tiers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * Admin control for one athlete's streak.
 *
 * Setting a length writes an override that replaces the computed streak
 * outright, so the number an admin types is exactly what the athlete sees.
 * Clearing it hands the streak back to the activity-based calculation.
 */
export function StreakEditor({
  uid,
  displayName,
}: {
  uid: string;
  displayName: string | null;
}) {
  const { t, language } = useTranslation();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [days, setDays] = useState('');
  const [freezesUsed, setFreezesUsed] = useState('0');
  const [hasOverride, setHasOverride] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load whatever is currently stored each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        const streak = snap.data()?.streak ?? {};
        const override = streak.overrideDays;
        setHasOverride(override !== undefined && override !== null);
        setDays(override !== undefined && override !== null ? String(override) : '');
        setFreezesUsed(String(Number(streak.freezesUsed) || 0));
      } catch (err) {
        console.error('Could not read streak state:', err);
      }
    })();
  }, [open, uid]);

  const parsedDays = Math.max(0, Number(days) || 0);
  const resultingTier = tierForStreak(parsedDays);

  // setDoc-with-merge rather than updateDoc: updateDoc rejects outright when the
  // profile document does not exist yet, which is exactly the case for accounts
  // that never went through the checkout signup flow.
  const save = async () => {
    setSaving(true);
    try {
      await setDoc(
        doc(db, 'users', uid),
        {
          streak: {
            overrideDays: parsedDays,
            freezesUsed: Math.max(0, Number(freezesUsed) || 0),
          },
        },
        { merge: true }
      );
      toast({ title: t('adminStreakSaved') });
      setOpen(false);
    } catch (err) {
      console.error('Streak update failed:', err);
      toast({
        variant: 'destructive',
        title: t('supportSendFailed'),
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const clearOverride = async () => {
    setSaving(true);
    try {
      await setDoc(
        doc(db, 'users', uid),
        { streak: { overrideDays: deleteField() } },
        { merge: true }
      );
      toast({ title: t('adminStreakSaved') });
      setOpen(false);
    } catch (err) {
      console.error('Streak reset failed:', err);
      toast({
        variant: 'destructive',
        title: t('supportSendFailed'),
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Flame className="mr-2 h-4 w-4" />
          {t('adminStreakEdit')}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('adminStreakEdit')} — {displayName || uid}</DialogTitle>
          <DialogDescription>{t('adminStreakTierHint')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {hasOverride && (
            <p className="rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">
              {t('adminStreakOverrideOn')}
            </p>
          )}

          {/* Type / tier — selecting one fills in its threshold */}
          <div className="space-y-2">
            <Label>{t('adminStreakTier')}</Label>
            <Select
              value={resultingTier.id}
              onValueChange={(id) => {
                const tier = STREAK_TIERS.find((x) => x.id === id);
                if (tier) setDays(String(tier.minDays));
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STREAK_TIERS.map((tier) => (
                  <SelectItem key={tier.id} value={tier.id}>
                    {pick(tier.name, language)} · {tier.minDays}+ · {tier.freezes} 🛡
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Exact number of days */}
          <div className="space-y-2">
            <Label htmlFor={`days-${uid}`}>{t('adminStreakDays')}</Label>
            <Input
              id={`days-${uid}`}
              type="number"
              min={0}
              value={days}
              placeholder={t('adminStreakAuto')}
              onChange={(e) => setDays(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t('adminStreakResulting')}:{' '}
              <span className={cn('font-semibold', resultingTier.text)}>
                {pick(resultingTier.name, language)}
              </span>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`freezes-${uid}`}>{t('adminStreakFreezesUsed')}</Label>
            <Input
              id={`freezes-${uid}`}
              type="number"
              min={0}
              value={freezesUsed}
              onChange={(e) => setFreezesUsed(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={clearOverride} disabled={saving || !hasOverride}>
            <RotateCcw className="mr-2 h-4 w-4" />
            {t('adminStreakClear')}
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? t('supportSending') : t('adminStreakSave')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
