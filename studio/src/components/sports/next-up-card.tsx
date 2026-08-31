"use client";

import { format, isAfter, startOfDay } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { CalendarClock, Swords } from 'lucide-react';

import { useUser } from '@/hooks/use-user';
import { useTranslation } from '@/hooks/use-translation';
import { useAthleteSessions } from '@/hooks/use-athlete-sessions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * What is coming next in this sport: the next planned session and the next
 * fixture.
 *
 * Both existed as data and neither was surfaced — a session could be planned
 * and a match could be scheduled, and the athlete's own sport page said
 * nothing about either.
 */
export function NextUpCard({
  sport,
  nextMatchLabel,
  nextMatchDate,
}: {
  sport: string;
  /** Opponent or event, when a fixture is on the books. */
  nextMatchLabel?: string | null;
  nextMatchDate?: Date | null;
}) {
  const { user } = useUser();
  const { t, language } = useTranslation();
  const { sessions } = useAthleteSessions(user?.uid, sport);
  const locale = language === 'fr' ? fr : enUS;

  const today = startOfDay(new Date());
  const nextSession = sessions
    .filter((s) => !s.completed && s.date && isAfter(s.date, today))
    .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0))[0];

  const hasMatch = !!nextMatchLabel && !!nextMatchDate;
  // Renders even when both are empty. Hiding it entirely meant an athlete with
  // nothing scheduled saw no trace of the feature and no hint that planning a
  // session or a fixture would fill it in.

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('nextUpTitle')}</CardTitle>
        <CardDescription>{t('nextUpSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-lg border p-3">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('nextTraining')}
            </p>
            {nextSession ? (
              <>
                <p className="truncate text-sm font-medium">{nextSession.title}</p>
                <p className="text-xs text-muted-foreground">
                  {nextSession.date ? format(nextSession.date, 'PPP', { locale }) : ''}
                  {nextSession.duration ? ` · ${nextSession.duration} ${t('mins')}` : ''}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t('nextNoneScheduled')}</p>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border p-3">
          <Swords className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('nextMatch')}
            </p>
            {hasMatch ? (
              <>
                <p className="truncate text-sm font-medium">{nextMatchLabel}</p>
                <p className="text-xs text-muted-foreground">
                  {format(nextMatchDate!, 'PPP', { locale })}
                </p>
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
