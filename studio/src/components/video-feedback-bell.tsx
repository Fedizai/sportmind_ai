"use client";

import Link from 'next/link';
import { Clapperboard } from 'lucide-react';

import { useUser } from '@/hooks/use-user';
import { useUnseenVideoFeedback } from '@/hooks/use-player-videos';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

/**
 * "Your coach replied to a clip."
 *
 * Without this a coach's feedback landed silently on a card the athlete had
 * no reason to revisit — they sent a video, heard nothing, and had to think
 * to go back and look. Sits beside the messages and friend-request badges,
 * which solve the same problem for their own surfaces.
 */
export function VideoFeedbackBell({ className }: { className?: string }) {
  const { user } = useUser();
  const count = useUnseenVideoFeedback(user?.uid);
  const { t } = useTranslation();

  if (!user || count === 0) return null;

  const label = t('videoFeedbackWaiting', { count });

  return (
    <Link
      href="/dashboard/sports"
      aria-label={label}
      title={label}
      className={cn(
        'relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground',
        'transition-colors hover:bg-accent hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      <Clapperboard className="h-5 w-5" />
      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
        {count > 9 ? '9+' : count}
      </span>
    </Link>
  );
}
