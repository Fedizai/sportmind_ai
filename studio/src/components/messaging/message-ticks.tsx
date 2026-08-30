"use client";

import { Check, CheckCheck } from 'lucide-react';

import { useTranslation } from '@/hooks/use-translation';
import type { MessageStatus } from '@/lib/message-status';
import { cn } from '@/lib/utils';

/**
 * The sent / delivered / read tick.
 *
 * One tick for sent, two for delivered, two highlighted for read.
 *
 * The highlight colour depends on what the tick sits on. Inside the thread it
 * is on the blue message bubble, where white reads clearly. In the
 * conversation list it is on the card, which is near-white in light mode — so
 * white would disappear there and the accent colour carries the same meaning.
 * A tick is a graphical object, so 3:1 is its contrast bar rather than the
 * 4.5:1 that applies to text.
 */
export function MessageTicks({
  status,
  variant = 'onPrimary',
  className,
}: {
  status: MessageStatus;
  variant?: 'onPrimary' | 'onSurface';
  className?: string;
}) {
  const { t } = useTranslation();

  const label = t(
    status === 'read' ? 'msgRead' : status === 'delivered' ? 'msgDelivered' : 'msgSent'
  );

  const dim = variant === 'onPrimary' ? 'text-primary-foreground/60' : 'text-muted-foreground';
  const lit = variant === 'onPrimary' ? 'text-white' : 'text-primary';

  return (
    <span className={cn('inline-flex shrink-0', className)} title={label} aria-label={label}>
      {status === 'sent' ? (
        <Check className={cn('h-3 w-3', dim)} />
      ) : (
        <CheckCheck className={cn('h-3 w-3', status === 'read' ? lit : dim)} />
      )}
    </span>
  );
}
