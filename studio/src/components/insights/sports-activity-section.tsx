"use client";

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { ArrowRight, Activity, Loader2 } from 'lucide-react';

import { useUser } from '@/hooks/use-user';
import { useTranslation } from '@/hooks/use-translation';
import { useSportActivity, type SportId } from '@/hooks/use-sport-activity';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Every sport the athlete actually logs, with real counts.
 *
 * Insights used to read football and tennis only, so someone who boxes or
 * swims saw a dashboard containing none of their own work, while the sports
 * they had never touched still took up the page. This lists what they have
 * actually done, and nothing they have not.
 */

const SPORT_ROUTE: Record<SportId, string> = {
  football: '/dashboard/football',
  tennis: '/dashboard/tennis',
  basketball: '/dashboard/basketball',
  boxing: '/dashboard/boxing',
  swimming: '/dashboard/swimming',
  gym: '/dashboard/gym',
};

const SPORT_LABEL: Record<SportId, { en: string; fr: string }> = {
  football: { en: 'Football', fr: 'Football' },
  tennis: { en: 'Tennis', fr: 'Tennis' },
  basketball: { en: 'Basketball', fr: 'Basketball' },
  boxing: { en: 'Boxing', fr: 'Boxe' },
  swimming: { en: 'Swimming', fr: 'Natation' },
  gym: { en: 'Gym', fr: 'Gym' },
};

export function SportsActivitySection() {
  const { user } = useUser();
  const { t, language } = useTranslation();
  const { active, totalEntries, isLoading } = useSportActivity(user?.uid);
  const locale = language === 'fr' ? fr : enUS;

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (active.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <Activity className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
          <p className="font-semibold">{t('insightsNoActivityTitle')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('insightsNoActivityBody')}</p>
          <Button asChild size="sm" className="mt-4">
            <Link href="/dashboard/sports">{t('insightsPickSport')}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t('insightsLoggedTotal', { count: totalEntries, sports: active.length })}
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {active.map((sport) => (
          <Card key={sport.sport} className="transition-colors hover:border-primary/40">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{SPORT_LABEL[sport.sport][language === 'fr' ? 'fr' : 'en']}</p>
                <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary tabular-nums">
                  {sport.count}
                </span>
              </div>

              {sport.lastActivity && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('insightsLastEntry', {
                    when: formatDistanceToNow(sport.lastActivity, { addSuffix: true, locale }),
                  })}
                </p>
              )}

              {sport.entries[0]?.label && (
                <p className="mt-2 truncate text-sm text-muted-foreground">
                  {sport.entries[0].label}
                  {sport.entries[0].result ? ` · ${sport.entries[0].result}` : ''}
                </p>
              )}

              <Button asChild variant="ghost" size="sm" className="mt-2 -ml-2 h-8 px-2">
                <Link href={SPORT_ROUTE[sport.sport]}>
                  {t('open')}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
