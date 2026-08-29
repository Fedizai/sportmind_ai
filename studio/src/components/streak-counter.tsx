"use client";

import { useStreakStore } from '@/stores/streak-store';
import { useTranslation } from '@/hooks/use-translation';
import { tierForStreak } from '@/lib/streak-tiers';
import { pick } from '@/lib/bilingual';
import { StreakFlame } from '@/components/streak-flame';
import { cn } from '@/lib/utils';

/**
 * Compact streak pill for the dashboard header.
 *
 * The flame takes the colour of the athlete's current tier and is only filled
 * once today is logged, so a glance says both "how far have I come" and
 * "is today already banked".
 */
export function StreakCounter() {
  const { current, activeToday, isLoading } = useStreakStore();
  const { language } = useTranslation();

  if (isLoading || current === 0) return null;

  const tier = tierForStreak(current);

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-md px-3 py-1.5 ring-1 transition-colors',
        activeToday ? tier.bg : 'bg-muted',
        activeToday ? tier.ring : 'ring-transparent'
      )}
      title={`${pick(tier.name, language)} — ${current}`}
    >
      <StreakFlame tier={tier} locked={!activeToday} className="h-5 w-5" />
      <span className={cn('text-sm font-bold tabular-nums', activeToday ? tier.text : 'text-muted-foreground')}>
        {current}
      </span>
    </div>
  );
}
