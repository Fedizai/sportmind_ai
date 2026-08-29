"use client";

import { useId } from 'react';
import { cn } from '@/lib/utils';
import type { StreakTier } from '@/lib/streak-tiers';

/**
 * The streak flame, filled with its tier's gradient.
 *
 * Lucide's Flame is a stroked icon, so it cannot carry a two-stop fill. This
 * draws the same silhouette as a closed path instead, with an inner core that
 * lightens toward the tip — which is what makes the badge read as heat rather
 * than as a coloured glyph.
 *
 * The gradient id has to be unique per instance: several flames share one SVG
 * namespace on the badge row, and duplicate ids make every flame adopt the
 * first one's colours.
 */
export function StreakFlame({
  tier,
  locked = false,
  className,
}: {
  tier: StreakTier;
  /** Draw as a dim silhouette — the tier has not been reached yet. */
  locked?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const outerId = `flame-outer-${uid}`;
  const innerId = `flame-inner-${uid}`;

  const [deep, bright] = tier.gradient;

  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('h-8 w-8', className)}
      aria-hidden="true"
      role="presentation"
    >
      <defs>
        <linearGradient id={outerId} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={deep} />
          <stop offset="100%" stopColor={bright} />
        </linearGradient>
        <linearGradient id={innerId} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor={bright} stopOpacity="0.65" />
        </linearGradient>
      </defs>

      {/* Outer flame. Lucide's own flame silhouette reads as a teardrop once
          filled solid — its flame character lives in the stroke outline, which
          a filled badge throws away. This shape carries the lick in the
          silhouette itself, so it still reads as fire at 20px. */}
      <path
        d="M12.4 1.3c.2 2.9-1 4.7-2.6 6.6-1.9 2.2-3.6 4.2-3.6 7.2 0 4 3.1 7.1 6.8 7.1s6.8-3.1 6.8-7.1c0-2.4-1-4.2-2.4-6-.4 1.2-1.1 2-2.1 2.5 1-3.9-.3-7.5-2.9-10.3Z"
        fill={locked ? 'currentColor' : `url(#${outerId})`}
        className={locked ? 'text-muted-foreground/25' : undefined}
      />
      {/* Inner core — omitted when locked so the shape stays a flat silhouette */}
      {!locked && (
        <path
          d="M9.9 13.4c-.9 1-1.5 2-1.5 3.3 0 2 1.6 3.6 3.6 3.6s3.6-1.6 3.6-3.6c0-1.6-.9-2.6-1.9-3.7-.3.8-.8 1.4-1.5 1.7.2-1.3-.1-2.4-.8-3.4-.4 1.1-.8 1.5-1.5 2.1Z"
          fill={`url(#${innerId})`}
        />
      )}
    </svg>
  );
}
