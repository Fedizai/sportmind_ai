"use client";

import { useState } from 'react';
import { Flame } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';

/**
 * Admin control for a single athlete's streak.
 *
 * Bonus days are added on top of whatever their logged activity earns, which is
 * how a granted restore is represented — so this is also the manual lever for
 * approving a restore request from the support queue.
 */
export function StreakEditor({
  uid,
  displayName,
  initialBonusDays = 0,
  initialFreezesUsed = 0,
}: {
  uid: string;
  displayName: string | null;
  initialBonusDays?: number;
  initialFreezesUsed?: number;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [bonusDays, setBonusDays] = useState(String(initialBonusDays));
  const [freezesUsed, setFreezesUsed] = useState(String(initialFreezesUsed));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', uid), {
        'streak.bonusDays': Math.max(0, Number(bonusDays) || 0),
        'streak.freezesUsed': Math.max(0, Number(freezesUsed) || 0),
      });
      toast({ title: t('adminStreakSaved') });
      setOpen(false);
    } catch (err) {
      console.error('Streak update failed:', err);
      toast({ variant: 'destructive', title: t('supportSendFailed') });
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
          <DialogTitle>
            {t('adminStreakEdit')} — {displayName || uid}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`bonus-${uid}`}>{t('adminStreakBonus')}</Label>
            <Input id={`bonus-${uid}`} type="number" min={0}
              value={bonusDays} onChange={(e) => setBonusDays(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`freezes-${uid}`}>{t('adminStreakFreezesUsed')}</Label>
            <Input id={`freezes-${uid}`} type="number" min={0}
              value={freezesUsed} onChange={(e) => setFreezesUsed(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={save} disabled={saving}>
            {saving ? t('supportSending') : t('adminStreakSave')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
