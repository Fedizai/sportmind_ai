"use client";

import { useEffect, useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';

import { useStreakStore } from '@/stores/streak-store';
import { useTranslation } from '@/hooks/use-translation';
import { pick } from '@/lib/bilingual';
import { STREAK_TIERS, tierIndex } from '@/lib/streak-tiers';
import { StreakFlame } from '@/components/streak-flame';
import { Button } from '@/components/ui/button';

/** Particles in the burst. Enough to feel generous, few enough to stay at 60fps. */
const PARTICLE_COUNT = 18;

/**
 * The celebration always runs on a dark ground, in both themes.
 *
 * Tier colours are fixed hex values chosen to glow — Spark's bright stop is
 * #fde68a, all but white. On a light background the kicker, the tier name and a
 * white-on-gradient button all fall under 3:1. Committing to a dark stage keeps
 * every tier legible, and is what a full-screen celebration wants to look like
 * anyway.
 */
const STAGE = 'rgba(8, 9, 15, 0.93)';

/**
 * Full-screen celebration when the athlete crosses into a new streak tier.
 *
 * Mounted once in the dashboard layout so it can fire from wherever the streak
 * happens to be recalculated. It is driven by `pendingLevelUp` in the streak
 * store, which is set only when the computed tier is *above* the last one the
 * athlete was congratulated for.
 */
export function StreakLevelUp() {
  const pendingLevelUp = useStreakStore((s) => s.pendingLevelUp);
  const dismissLevelUp = useStreakStore((s) => s.dismissLevelUp);
  const current = useStreakStore((s) => s.current);
  const { t, language } = useTranslation();
  const reduceMotion = useReducedMotion();

  const tier = pendingLevelUp
    ? STREAK_TIERS.find((x) => x.id === pendingLevelUp) ?? null
    : null;

  // Fixed per opening, so a re-render mid-animation doesn't reshuffle the burst.
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
        const distance = 90 + ((i * 37) % 70);
        return {
          id: i,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          size: 5 + ((i * 13) % 7),
          delay: 0.16 + (i % 6) * 0.025,
        };
      }),
    // A new tier means a new burst.
    [pendingLevelUp]
  );

  // Escape closes it, like any other modal surface.
  useEffect(() => {
    if (!tier) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissLevelUp();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tier, dismissLevelUp]);

  // The page behind must not scroll while the celebration owns the screen.
  useEffect(() => {
    if (!tier) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [tier]);

  if (!tier) return null;

  const [deep, bright] = tier.gradient;
  const isTopTier = tierIndex(tier.id) === STREAK_TIERS.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        key={tier.id}
        role="dialog"
        aria-modal="true"
        aria-label={t('streakLevelUpKicker')}
        className="fixed inset-0 z-[100] flex items-center justify-center p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={dismissLevelUp}
      >
        {/* Scrim — deliberately not a theme token; see STAGE. */}
        <div className="absolute inset-0 backdrop-blur-md" style={{ background: STAGE }} />

        {/* Tier-coloured wash, so the whole screen takes the new colour */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 42%, ${bright}40 0%, transparent 62%)`,
          }}
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />

        <motion.div
          className="relative flex w-full max-w-sm flex-col items-center text-center"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={
            reduceMotion
              ? { duration: 0.2 }
              : { type: 'spring', stiffness: 260, damping: 18, mass: 0.9 }
          }
          // Clicks inside must not fall through to the dismiss handler.
          onClick={(e) => e.stopPropagation()}
        >
          {/* Badge, halo and particle burst */}
          <div className="relative mb-6 flex h-40 w-40 items-center justify-center">
            {!reduceMotion && (
              <>
                {/* Expanding ring */}
                <motion.span
                  aria-hidden
                  className="absolute rounded-full border-2"
                  style={{ borderColor: bright }}
                  initial={{ width: 60, height: 60, opacity: 0.9 }}
                  animate={{ width: 210, height: 210, opacity: 0 }}
                  transition={{ duration: 1.1, ease: 'easeOut', delay: 0.1 }}
                />
                {particles.map((p) => (
                  <motion.span
                    key={p.id}
                    aria-hidden
                    className="absolute rounded-full"
                    style={{
                      width: p.size,
                      height: p.size,
                      background: p.id % 2 === 0 ? bright : deep,
                    }}
                    initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                    animate={{ x: p.x, y: p.y, opacity: [0, 1, 0], scale: [0, 1, 0.4] }}
                    transition={{ duration: 0.95, delay: p.delay, ease: 'easeOut' }}
                  />
                ))}
              </>
            )}

            {/* Soft glow under the flame */}
            <span
              aria-hidden
              className="absolute h-28 w-28 rounded-full opacity-45 blur-2xl"
              style={{ background: bright }}
            />

            <motion.div
              animate={
                reduceMotion
                  ? {}
                  : { scale: [1, 1.06, 1], rotate: [0, -2.5, 2.5, 0] }
              }
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
            >
              <StreakFlame tier={tier} className="h-28 w-28 drop-shadow-lg" />
            </motion.div>
          </div>

          <motion.p
            className="text-xs font-bold uppercase tracking-[0.2em]"
            style={{ color: bright }}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
          >
            {isTopTier ? t('streakLevelUpMaxKicker') : t('streakLevelUpKicker')}
          </motion.p>

          <motion.h2
            className="mt-1 text-4xl font-extrabold tracking-tight text-white"
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion
                ? { delay: 0.3 }
                : { type: 'spring', stiffness: 300, damping: 20, delay: 0.3 }
            }
          >
            {pick(tier.name, language)}
          </motion.h2>

          <motion.p
            className="mt-2 text-sm text-white/60"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {t('streakLevelUpDays', { days: current })}
          </motion.p>

          {tier.perks.length > 0 && (
            <motion.ul
              className="mt-5 w-full space-y-2 rounded-lg bg-white/[0.07] p-4 text-left ring-1 ring-white/15"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.48 }}
            >
              {tier.perks.map((perk, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-white/90">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: bright }} />
                  {pick(perk, language)}
                </li>
              ))}
            </motion.ul>
          )}

          <motion.div
            className="mt-6 w-full"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.56 }}
          >
            <Button
              className="w-full bg-white font-semibold text-neutral-900 hover:bg-white/90"
              onClick={dismissLevelUp}
              autoFocus
            >
              {t('streakLevelUpCta')}
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
