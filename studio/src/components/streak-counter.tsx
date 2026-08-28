"use client";

import { Flame } from 'lucide-react';

import { useStreakStore } from '@/stores/streak-store';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

/**
 * Compact streak pill for the dashboard header.
 *
 * The flame is lit once today is logged and hollow while the streak is still
 * at risk, so a glance tells the athlete whether they've already banked the day.
 */
export function StreakCounter() {
  const { current, activeToday, isLoading } = useStreakStore();
  const { t } = useTranslation();

  // Nothing to celebrate yet, and no spinner in the chrome while it loads.
  if (isLoading || current === 0) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors',
        activeToday
          ? 'bg-primary/15 text-foreground'
          : 'bg-muted text-muted-foreground'
      )}
      title={activeToday ? t('streakSafe') : t('streakAtRisk')}
    >
      <Flame
        className={cn('h-5 w-5', activeToday ? 'fill-primary text-primary' : 'text-muted-foreground')}
      />
      <span className="text-sm font-bold tabular-nums">{current}</span>
      <span className="sr-only">{t('streakDays')}</span>
    </div>
  );
}
