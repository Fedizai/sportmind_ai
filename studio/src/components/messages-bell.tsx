"use client";

import Link from 'next/link';
import { MessageSquare } from 'lucide-react';

import { useUser } from '@/hooks/use-user';
import { useConversations } from '@/hooks/use-conversations';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

/**
 * Unread-message indicator for the header.
 *
 * Messages arrive over a live Firestore listener, so a thread that is already
 * open updates by itself — but until now nothing told you a message had landed
 * while you were anywhere else in the app. This is that signal, reachable from
 * every page.
 */
export function MessagesBell({ className }: { className?: string }) {
  const { user } = useUser();
  const { unreadCount } = useConversations(user?.uid);
  const { t } = useTranslation();

  if (!user) return null;

  const label = unreadCount > 0 ? t('unreadMessages', { count: unreadCount }) : t('messages');

  return (
    <Link
      href="/dashboard/messages"
      aria-label={label}
      title={label}
      className={cn(
        'relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground',
        'transition-colors hover:bg-accent hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      <MessageSquare className="h-5 w-5" />
      {unreadCount > 0 && (
        <span
          className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground"
          // Past a certain point the exact number stops being useful and the
          // badge just gets wider than the icon it sits on.
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
