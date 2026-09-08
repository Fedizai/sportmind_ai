import { BarChart2, CalendarClock, ClipboardList, ScanLine, Target, type LucideIcon } from 'lucide-react';

import type { TranslationKey } from '@/lib/i18n';

/**
 * The secondary tools, in one place.
 *
 * Both the Autres page and the dashboard's Favoris row read this list, so a
 * favourite is a shortcut to the same route rather than a second copy of the
 * feature. Adding a tool here makes it appear in both, and nowhere else needs
 * to know about it.
 *
 * Removing one is equally self-contained: `useFavorites` builds its list with
 * `TOOLS.filter(t => ids.includes(t.id))`, so an id still sitting in somebody's
 * saved favourites simply stops matching and drops out. No migration, and
 * nothing to crash on an id that no longer exists.
 */
export interface Tool {
  /** Stable key. This is what gets stored in the user's favourites. */
  id: string;
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  icon: LucideIcon;
  /** The existing route. Never a new one. */
  path: string;
}

export const TOOLS: Tool[] = [
  {
    id: 'fixtures',
    titleKey: 'fixturesCardTitle',
    subtitleKey: 'fixturesCardSubtitle',
    icon: CalendarClock,
    path: '/dashboard/fixtures',
  },
  {
    id: 'team-hub',
    titleKey: 'teamHubCardTitle',
    subtitleKey: 'teamHubCardSubtitle',
    icon: ClipboardList,
    path: '/dashboard/sports-assistant',
  },
  {
    id: 'reports',
    titleKey: 'myReportsCardTitle',
    subtitleKey: 'myReportsCardSubtitle',
    icon: BarChart2,
    path: '/dashboard/progress',
  },
  {
    id: 'goals',
    titleKey: 'myGoalsCardTitle',
    subtitleKey: 'myGoalsCardSubtitle',
    icon: Target,
    path: '/dashboard/goals',
  },
  {
    id: 'body-scan',
    titleKey: 'bodyScanCardTitle',
    subtitleKey: 'bodyScanCardSubtitle',
    icon: ScanLine,
    path: '/dashboard/body-scan',
  },
];

export function toolById(id: string): Tool | undefined {
  return TOOLS.find((t) => t.id === id);
}
