"use client";

import { Star } from 'lucide-react';

import { useFavorites } from '@/hooks/use-favorites';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

/**
 * The star that pins a tool to the dashboard.
 *
 * It sits inside a clickable card, so it has to stop the click reaching the
 * card underneath — otherwise favouriting something would navigate away from
 * the page you were favouriting it on.
 */
export function FavoriteStar({ toolId, className }: { toolId: string; className?: string }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { t } = useTranslation();
  const active = isFavorite(toolId);

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? t('favoritesRemove') : t('favoritesAdd')}
      title={active ? t('favoritesRemove') : t('favoritesAdd')}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleFavorite(toolId);
      }}
      className={cn(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors',
        'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'text-primary' : 'text-muted-foreground/60 hover:text-muted-foreground',
        className
      )}
    >
      <Star className={cn('h-[1.15rem] w-[1.15rem]', active && 'fill-current')} />
    </button>
  );
}
