import { Flame, CalendarCheck, Target, Trophy, type LucideIcon } from 'lucide-react';
import type { TranslationKey } from '@/lib/i18n';

export interface AchievementDef {
  id: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  n: number;
  icon: LucideIcon;
}

export interface AchievementResult extends AchievementDef {
  unlocked: boolean;
}

export interface AchievementInput {
  streak: number;
  sessionsAttended: number;
  goalsCreated: number;
  goalsCompleted: number;
}

const STREAK_TIERS = [3, 7, 30];
const SESSION_TIERS = [1, 10, 25, 50];
const GOALS_COMPLETED_TIERS = [1, 5, 10];

export function computeAchievements(input: AchievementInput): AchievementResult[] {
  const results: AchievementResult[] = [];

  for (const n of STREAK_TIERS) {
    results.push({
      id: `streak-${n}`,
      titleKey: 'achStreakTitle',
      descKey: 'achStreakDesc',
      n,
      icon: Flame,
      unlocked: input.streak >= n,
    });
  }

  for (const n of SESSION_TIERS) {
    results.push({
      id: `sessions-${n}`,
      titleKey: n === 1 ? 'achFirstSessionTitle' : 'achSessionsTitle',
      descKey: n === 1 ? 'achFirstSessionDesc' : 'achSessionsDesc',
      n,
      icon: CalendarCheck,
      unlocked: input.sessionsAttended >= n,
    });
  }

  results.push({
    id: 'goal-setter',
    titleKey: 'achGoalSetterTitle',
    descKey: 'achGoalSetterDesc',
    n: 1,
    icon: Target,
    unlocked: input.goalsCreated >= 1,
  });

  for (const n of GOALS_COMPLETED_TIERS) {
    results.push({
      id: `goals-completed-${n}`,
      titleKey: n === 1 ? 'achFirstGoalCompletedTitle' : 'achGoalsCompletedTitle',
      descKey: n === 1 ? 'achFirstGoalCompletedDesc' : 'achGoalsCompletedDesc',
      n,
      icon: Trophy,
      unlocked: input.goalsCompleted >= n,
    });
  }

  return results;
}
