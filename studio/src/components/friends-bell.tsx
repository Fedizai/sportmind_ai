"use client";

import Link from 'next/link';
import { UserPlus } from 'lucide-react';

import { useUser } from '@/hooks/use-user';
import { useFriends } from '@/hooks/use-friends';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

/**
 * Pending friend requests, reachable from every page.
 *
 * A request that nobody sees is a conversation that never starts, and this is
 * now the only route to messaging someone new.
 */
export function FriendsBell({ className }: { className?: string }) {
  const { user } = useUser();
  const { incoming } = useFriends(user?.uid);
  const { t } = useTranslation();

  if (!user) return null;

  return (
    <Link
      href="/dashboard/social"
      aria-label={t('friendsTitle')}
      title={t('friendsTitle')}
      className={cn(
        'relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground',
        'transition-colors hover:bg-accent hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      <UserPlus className="h-5 w-5" />
      {incoming.length > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
          {incoming.length > 9 ? '9+' : incoming.length}
        </span>
      )}
    </Link>
  );
}
