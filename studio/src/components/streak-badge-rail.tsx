"use client";

import { motion, useReducedMotion } from 'framer-motion';

import { useTranslation } from '@/hooks/use-translation';
import { pick } from '@/lib/bilingual';
import { STREAK_TIERS, tierForStreak } from '@/lib/streak-tiers';
import { StreakFlame } from '@/components/streak-flame';
import { cn } from '@/lib/utils';

/**
 * The badge ladder: one flame per tier, lit up to wherever the athlete is.
 *
 * Reached tiers carry their own gradient, locked ones stay a dim silhouette,
 * and the tier currently held is enlarged with a soft halo so the eye lands on
 * "where am I" before "what is left". The connector between two badges fills
 * only when the tier on its right has been reached, so the row doubles as a
 * progress track.
 */
export function StreakBadgeRail({ current }: { current: number }) {
  const { t, language } = useTranslation();
  const reduceMotion = useReducedMotion();
  const activeTier = tierForStreak(current);

  // The ladder starts at the first badge worth earning, three days in.
  // 'none' is the absence of a streak, and 'spark' is days 1-2 — the streak
  // has started but has not caught yet, which is a state rather than a badge.
  const tiers = STREAK_TIERS.filter(
    (tier) => tier.id !== 'none' && tier.id !== 'spark'
  );

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">{t('streakBadgesTitle')}</p>

      {/* Seven badges never fit a phone; let the row scroll rather than crush it. */}
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <ol className="flex min-w-max items-start gap-0">
          {tiers.map((tier, index) => {
            const reached = current >= tier.minDays;
            const isActive = tier.id === activeTier.id;

            return (
              <li key={tier.id} className="flex items-start">
                {index > 0 && (
                  <span
                    aria-hidden
                    className={cn(
                      'mt-6 h-1 w-6 rounded-full transition-colors sm:w-9',
                      reached ? 'bg-current' : 'bg-muted'
                    )}
                    style={reached ? { color: tier.gradient[1] } : undefined}
                  />
                )}

                <div className="flex w-16 flex-col items-center gap-1.5 sm:w-[4.5rem]">
                  <motion.div
                    className="relative flex h-11 items-center justify-center"
                    initial={false}
                    animate={
                      reduceMotion
                        ? {}
                        : { scale: isActive ? 1.18 : 1, y: isActive ? -2 : 0 }
                    }
                    transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                  >
                    {/* Halo behind the tier the athlete currently holds. */}
                    {isActive && (
                      <span
                        aria-hidden
                        className="absolute inset-0 -z-10 rounded-full blur-md opacity-40"
                        style={{ background: tier.gradient[1] }}
                      />
                    )}
                    <StreakFlame
                      tier={tier}
                      locked={!reached}
                      className={cn('h-9 w-9', isActive && 'drop-shadow-sm')}
                    />
                  </motion.div>

                  <span
                    className={cn(
                      'text-xs tabular-nums',
                      isActive
                        ? 'font-bold text-foreground'
                        : reached
                          ? 'font-medium text-foreground/70'
                          : 'text-muted-foreground'
                    )}
                  >
                    {t('streakDaysShort', { days: tier.minDays })}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] leading-tight',
                      reached ? 'text-muted-foreground' : 'text-muted-foreground/60'
                    )}
                  >
                    {pick(tier.name, language)}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
