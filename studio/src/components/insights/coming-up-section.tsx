"use client";

import Link from 'next/link';
import { format, isAfter, startOfDay } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { ArrowRight, CalendarClock, Swords } from 'lucide-react';

import { useUser } from '@/hooks/use-user';
import { useTranslation } from '@/hooks/use-translation';
import { useAthleteSessions } from '@/hooks/use-athlete-sessions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * The next session and the next fixture, across every sport, on the insights
 * page.
 *
 * Both were stored and neither reached insights: sessions lived only on the
 * sport page that created them, and fixtures could not be created at all
 * until matches gained a status. Insights is where an athlete looks to see
 * where they stand, so what is coming belongs here rather than only on the
 * individual sport pages.
 */

export interface UpcomingFixture {
  sport: string;
  opponent: string;
  date: Date;
}

const SPORT_ROUTE: Record<string, string> = {
  football: '/dashboard/football',
  tennis: '/dashboard/tennis',
  basketball: '/dashboard/basketball',
  boxing: '/dashboard/boxing',
  swimming: '/dashboard/swimming',
  gym: '/dashboard/gym',
};

export function ComingUpSection({ fixtures }: { fixtures: UpcomingFixture[] }) {
  const { user } = useUser();
  const { t, language } = useTranslation();
  // 'all' — insights spans every sport, not the one page you happen to be on.
  const { sessions } = useAthleteSessions(user?.uid, 'all');
  const locale = language === 'fr' ? fr : enUS;

  const today = startOfDay(new Date());

  const nextSession = sessions
    .filter((s) => !s.completed && s.date && isAfter(s.date, today))
    .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0))[0];

  const nextFixture = [...fixtures]
    .filter((f) => f.date && isAfter(f.date, today))
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('nextUpTitle')}</CardTitle>
        <CardDescription>{t('nextUpSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-lg border p-3">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-grow">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('nextTraining')}
            </p>
            {nextSession ? (
              <>
                <p className="truncate text-sm font-medium">{nextSession.title}</p>
                <p className="text-xs text-muted-foreground">
                  {nextSession.date ? format(nextSession.date, 'PPP', { locale }) : ''}
                  {nextSession.sport ? ` · ${nextSession.sport}` : ''}
                </p>
                {SPORT_ROUTE[nextSession.sport] && (
                  <Button asChild variant="ghost" size="sm" className="mt-1 -ml-2 h-7 px-2">
                    <Link href={SPORT_ROUTE[nextSession.sport]}>
                      {t('open')}
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t('nextNoneScheduled')}</p>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border p-3">
          <Swords className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-grow">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('nextMatch')}
            </p>
            {nextFixture ? (
              <>
                <p className="truncate text-sm font-medium">{nextFixture.opponent}</p>
                <p className="text-xs text-muted-foreground">
                  {format(nextFixture.date, 'PPP', { locale })} · {nextFixture.sport}
                </p>
                {SPORT_ROUTE[nextFixture.sport] && (
                  <Button asChild variant="ghost" size="sm" className="mt-1 -ml-2 h-7 px-2">
                    <Link href={SPORT_ROUTE[nextFixture.sport]}>
                      {t('open')}
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t('nextNoneScheduled')}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
