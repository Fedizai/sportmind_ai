"use client";

import { Flame } from 'lucide-react';

import { StreakCard } from '@/components/streak-card';
import { useTranslation } from '@/hooks/use-translation';

/**
 * The streak's own page.
 *
 * Reached from the header counter and from the streak card on the insights
 * dashboard, both of which were previously dead ends: they showed a number
 * with nothing behind it. Everything about the streak — the tier held, the
 * perks it carries, the badge ladder, and recovery when it lapses — lives in
 * StreakCard, so this page is a frame around it rather than a second copy.
 */
export default function StreakPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-3 font-headline text-3xl font-bold tracking-tight">
          <Flame className="h-8 w-8 text-primary" />
          {t('streakTitle')}
        </h1>
        <p className="text-muted-foreground">{t('streakSubtitle')}</p>
      </div>

      <StreakCard />
    </div>
  );
}
