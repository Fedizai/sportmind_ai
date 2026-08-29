"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection, query, where, onSnapshot, doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { pairId, otherUid, type Friendship } from '@/lib/friendship';

/**
 * The signed-in athlete's friendships, live.
 *
 * One document per pair covers all three states the UI needs — a friend, a
 * request they sent you, a request you sent them — so this is a single
 * listener rather than three collections kept in step with each other.
 */
export function useFriends(userId: string | undefined) {
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setFriendships([]);
      setIsLoading(false);
      return;
    }

    const q = query(collection(db, 'friendships'), where('users', 'array-contains', userId));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setFriendships(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Friendship));
        setIsLoading(false);
      },
      (err) => {
        console.error('Error loading friendships:', err);
        setError(err);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [userId]);

  const { friendUids, incoming, outgoing } = useMemo(() => {
    const friendUids = new Set<string>();
    const incoming: Friendship[] = [];
    const outgoing: Friendship[] = [];

    for (const f of friendships) {
      if (f.status === 'accepted') {
        const other = otherUid(f.users, userId ?? '');
        if (other) friendUids.add(other);
      } else if (f.status === 'pending') {
        (f.requestedBy === userId ? outgoing : incoming).push(f);
      }
    }
    return { friendUids, incoming, outgoing };
  }, [friendships, userId]);

  /** 'none' | 'pending-sent' | 'pending-received' | 'friends' */
  const statusWith = useCallback(
    (otherId: string) => {
      const f = friendships.find((x) => x.users.includes(otherId));
      if (!f) return 'none' as const;
      if (f.status === 'accepted') return 'friends' as const;
      return f.requestedBy === userId ? ('pending-sent' as const) : ('pending-received' as const);
    },
    [friendships, userId]
  );

  const sendRequest = useCallback(
    async (otherId: string) => {
      if (!userId || otherId === userId) return;
      const id = pairId(userId, otherId);
      const ref = doc(db, 'friendships', id);

      // If they already asked you, sending back is simply accepting — anything
      // else would leave two people each waiting on the other.
      const existing = await getDoc(ref);
      if (existing.exists()) {
        const data = existing.data() as Friendship;
        if (data.status === 'pending' && data.requestedBy !== userId) {
          await updateDoc(ref, { status: 'accepted', respondedAt: serverTimestamp() });
        }
        return;
      }

      await setDoc(ref, {
        users: [userId, otherId].sort(),
        requestedBy: userId,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
    },
    [userId]
  );

  const accept = useCallback(
    async (friendshipId: string) => {
      await updateDoc(doc(db, 'friendships', friendshipId), {
        status: 'accepted',
        respondedAt: serverTimestamp(),
      });
    },
    []
  );

  /**
   * Declining, cancelling and unfriending are all the same write: the pair
   * document goes away. Keeping a 'declined' row would only mean the sender
   * could never ask again after a mistap.
   */
  const remove = useCallback(async (friendshipId: string) => {
    await deleteDoc(doc(db, 'friendships', friendshipId));
  }, []);

  return {
    friendships, friendUids, incoming, outgoing,
    isLoading, error,
    statusWith, sendRequest, accept, remove,
  };
}
