"use client";

import Link from 'next/link';
import {
  ArrowRight, ClipboardList, Dumbbell, FileText, Library, Swords, Users, Video,
} from 'lucide-react';

import { useTranslation } from '@/hooks/use-translation';
import type { TranslationKey } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';

/**
 * The coach's tools, all in one place.
 *
 * Most of these pages existed but nothing linked to them. Reports was the
 * worst case: its only route in was an entry in the recent-activity feed,
 * which appears once a report exists — so a coach could not reach the page to
 * write their first one. Building the feature and never giving it a door is
 * the same as not building it.
 */

const TOOLS: Array<{
  href: string;
  icon: typeof Users;
  labelKey: TranslationKey;
  descKey: TranslationKey;
}> = [
  { href: '/coach/team',      icon: Users,         labelKey: 'coachToolTeam',      descKey: 'coachToolTeamDesc' },
  { href: '/coach/training',  icon: Dumbbell,      labelKey: 'coachToolTraining',  descKey: 'coachToolTrainingDesc' },
  { href: '/coach/matches',   icon: Swords,        labelKey: 'coachToolMatches',   descKey: 'coachToolMatchesDesc' },
  { href: '/coach/reports',   icon: FileText,      labelKey: 'coachToolReports',   descKey: 'coachToolReportsDesc' },
  { href: '/coach/video',     icon: Video,         labelKey: 'coachToolVideo',     descKey: 'coachToolVideoDesc' },
  { href: '/coach/resources', icon: Library,       labelKey: 'coachToolResources', descKey: 'coachToolResourcesDesc' },
];

export function CoachTools() {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div>
        <h2 className="flex items-center gap-2 font-headline text-xl font-bold tracking-tight">
          <ClipboardList className="h-5 w-5 text-primary" />
          {t('coachToolsTitle')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('coachToolsSubtitle')}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => (
          <Link key={tool.href} href={tool.href} className="group">
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardContent className="flex h-full flex-col p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <tool.icon className="h-4 w-4" />
                  </span>
                  <p className="font-semibold">{t(tool.labelKey)}</p>
                </div>
                <p className="mt-2 flex-grow text-sm text-muted-foreground">{t(tool.descKey)}</p>
                <span className="mt-3 flex items-center gap-1.5 text-sm font-medium text-primary">
                  {t('open')}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
