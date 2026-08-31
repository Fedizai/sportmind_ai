"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Check, Lock, Sparkles, LifeBuoy, CreditCard, Trophy, Info, Flame } from 'lucide-react';

import { useStreakStore } from '@/stores/streak-store';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { useSupportTickets } from '@/hooks/use-support-tickets';
import { pick } from '@/lib/bilingual';
import {
  tierForStreak, nextTier, daysToNextTier, restoresRemaining, monthlyRestoreAllowance,
  type RestoreMethod,
} from '@/lib/streak-tiers';
import { StreakBadgeRail } from '@/components/streak-badge-rail';
import { StreakFlame } from '@/components/streak-flame';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * Full streak panel: current tier, the perks it unlocks, progress toward the
 * next tier, and — when the streak has lapsed — the ways to bring it back.
 */
export function StreakCard() {
  const { user } = useUser();
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const { current, longest, activeToday, freezesUsed, restoreStreak } = useStreakStore();
  const { submitTicket } = useSupportTickets(user?.uid);
  const [busy, setBusy] = useState<RestoreMethod | null>(null);
  const [open, setOpen] = useState(false);

  const tier = tierForStreak(current);
  const next = nextTier(current);
  const toGo = daysToNextTier(current);
  const restoresLeft = restoresRemaining(longest, freezesUsed);
  const restoreAllowance = monthlyRestoreAllowance(longest);

  // How much of the current tier band has been covered.
  const progress = next
    ? Math.min(100, Math.round(((current - tier.minDays) / (next.minDays - tier.minDays)) * 100))
    : 100;

  // The streak lapsed if nothing was logged today and the counter is at zero.
  const lapsed = current === 0 && longest > 0;
  const recoverable = Math.min(longest, 30);

  const handleRestore = async (method: RestoreMethod) => {
    if (!user) return;
    setBusy(method);
    try {
      if (method === 'freeze') {
        const ok = await restoreStreak(user.uid, 'freeze', recoverable);
        toast(ok
          ? { title: t('streakRestored') }
          : { variant: 'destructive', title: t('streakRestoreFailed') });
      } else {
        // No payment provider is wired up, so a paid restore is filed as a
        // ticket an admin reviews and grants — same path as a support appeal.
        await submitTicket(
          {
            kind: 'streak_restore',
            subject: method === 'payment'
              ? `Paid streak restore — ${recoverable} day(s)`
              : `Streak restore help — ${recoverable} day(s)`,
            message: `Requested restore of ${recoverable} day(s). Longest streak: ${longest}. Method: ${method}.`,
            context: 'streak-card',
          },
          { uid: user.uid, email: user.email, displayName: user.displayName }
        );
        toast({ title: t('streakRequestSent') });
      }
      setOpen(false);
    } catch {
      toast({ variant: 'destructive', title: t('streakRestoreFailed') });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StreakFlame tier={tier} locked={!activeToday} className="h-5 w-5" />
          {t('streakTitle')}
        </CardTitle>
        <CardDescription>{t('streakSubtitle')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current tier */}
        <div className={cn('rounded-lg p-5 ring-1', tier.bg, tier.ring)}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('streakCurrentTier')}
              </p>
              <p className={cn('text-2xl font-bold', tier.text)}>{pick(tier.name, language)}</p>
            </div>
            <p className={cn('text-4xl font-bold tabular-nums leading-none', tier.text)}>{current}</p>
          </div>

          {next ? (
            <div className="mt-4 space-y-1.5">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {t('streakNextTier')}: {pick(next.name, language)} — {t('streakDaysToGo', { days: toGo ?? 0 })}
              </p>
            </div>
          ) : (
            <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Trophy className="h-3.5 w-3.5" /> {t('streakMaxTier')}
            </p>
          )}
        </div>

        {/*
          * At zero, the tier panel above is an empty scoreboard: it says
          * "Spark, 0" and nothing about how to make it move. Someone arriving
          * here with no streak needs to know what counts as a day and what
          * breaks the chain, so that is what this says — and only when the
          * count is actually zero, since it is noise to anyone mid-run.
          */}
        {current === 0 && (
          <div className="space-y-3 rounded-lg border border-dashed p-4">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">
                {lapsed ? t('streakHowToRestartTitle') : t('streakHowToStartTitle')}
              </p>
            </div>

            <ol className="space-y-2.5 text-sm text-muted-foreground">
              <li className="flex gap-2.5">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">1</span>
                <span>{t('streakHowStep1')}</span>
              </li>
              <li className="flex gap-2.5">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">2</span>
                <span>{t('streakHowStep2')}</span>
              </li>
              <li className="flex gap-2.5">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">3</span>
                <span>{t('streakHowStep3')}</span>
              </li>
            </ol>

            <div className="rounded-md bg-muted/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('streakHowKeepTitle')}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{t('streakHowKeepBody')}</p>
            </div>

            <Button asChild size="sm" className="w-full sm:w-auto">
              <Link href="/dashboard/sports">
                <Flame className="mr-2 h-4 w-4" />
                {t('streakHowCta')}
              </Link>
            </Button>
          </div>
        )}

        {/* Recoveries. Outside the perks block on purpose: that block only
            renders at tiers that have perks, which hid the count from exactly
            the people most likely to need it. */}
        <div className="flex items-start gap-2 rounded-lg border p-3">
          <LifeBuoy className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium">
              {t('streakRestoresThisMonth', { left: restoresLeft, total: restoreAllowance })}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('streakRestoreAllowanceNote', { total: restoreAllowance })}
            </p>
          </div>
        </div>

        {/* Perks for this tier */}
        {tier.perks.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">{t('streakPerks')}</p>
            <ul className="space-y-1.5">
              {tier.perks.map((perk, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                  {pick(perk, language)}
                </li>
              ))}
            </ul>

          </div>
        )}

        {/* The ladder, as lit-up flames rather than flat text chips */}
        <StreakBadgeRail current={current} />

        {/* Recovery */}
        {lapsed && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <Lock className="h-4 w-4" /> {t('streakBroken')}
            </p>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="mt-3 w-full">{t('streakRestoreTitle')}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('streakRestoreTitle')}</DialogTitle>
                  <DialogDescription>{t('streakRestoreDesc', { days: recoverable })}</DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                  <RestoreOption
                    icon={<Sparkles className="h-4 w-4" />}
                    label={t('streakRestoreFree')}
                    hint={`${t('streakRestoreFreeHint')} · ${t('streakFreezesLeft', { count: restoresLeft })}`}
                    disabled={restoresLeft <= 0 || busy !== null}
                    loading={busy === 'freeze'}
                    onClick={() => handleRestore('freeze')}
                  />
                  <RestoreOption
                    icon={<CreditCard className="h-4 w-4" />}
                    label={t('streakRestorePaid')}
                    hint={t('streakRestorePaidHint')}
                    disabled={busy !== null}
                    loading={busy === 'payment'}
                    onClick={() => handleRestore('payment')}
                  />
                  <RestoreOption
                    icon={<LifeBuoy className="h-4 w-4" />}
                    label={t('streakRestoreSupport')}
                    hint={t('streakRestoreSupportHint')}
                    disabled={busy !== null}
                    loading={busy === 'support'}
                    onClick={() => handleRestore('support')}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RestoreOption({
  icon, label, hint, disabled, loading, onClick,
}: {
  icon: React.ReactNode; label: string; hint: string;
  disabled?: boolean; loading?: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors',
        disabled ? 'cursor-not-allowed opacity-50' : 'hover:border-primary/40 hover:bg-accent'
      )}
    >
      <span className="mt-0.5 text-primary">{icon}</span>
      <span className="flex-grow">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      {loading && <span className="text-xs text-muted-foreground">…</span>}
    </button>
  );
}
