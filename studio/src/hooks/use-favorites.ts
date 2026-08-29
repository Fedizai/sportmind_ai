"use client";

import { useCallback, useMemo } from 'react';
import { arrayRemove, arrayUnion, doc, updateDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { TOOLS, toolById, type Tool } from '@/lib/tools';

/**
 * Favourite tools, stored as an array of ids on the athlete's own profile.
 *
 * The user document is already loaded and kept live by the user context, so
 * favourites arrive with it — no second listener, and no second store to keep
 * in step with the account. Writing with arrayUnion / arrayRemove rather than
 * replacing the whole array means two devices toggling different tools at the
 * same moment cannot overwrite one another.
 */
export function useFavorites() {
  const { user } = useUser();
  const { toast } = useToast();
  const { t } = useTranslation();

  const ids = useMemo(() => user?.favorites ?? [], [user?.favorites]);

  /** The favourite tools, in the order they are declared, not the order added. */
  const favorites: Tool[] = useMemo(
    () => TOOLS.filter((tool) => ids.includes(tool.id)),
    [ids]
  );

  const isFavorite = useCallback((toolId: string) => ids.includes(toolId), [ids]);

  const toggleFavorite = useCallback(
    async (toolId: string) => {
      if (!user?.uid || !toolById(toolId)) return;
      const adding = !ids.includes(toolId);
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          favorites: adding ? arrayUnion(toolId) : arrayRemove(toolId),
        });
      } catch (err) {
        console.error('Could not update favourites:', err);
        toast({
          variant: 'destructive',
          title: t('favoritesUpdateFailed'),
          description: err instanceof Error ? err.message : undefined,
        });
      }
    },
    [user?.uid, ids, toast, t]
  );

  return { favorites, isFavorite, toggleFavorite };
}
