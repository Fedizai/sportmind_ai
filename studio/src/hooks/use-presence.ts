"use client";

import { useEffect } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { PRESENCE_HEARTBEAT_MS } from '@/lib/presence';

/**
 * Keeps `lastSeenAt` fresh on the signed-in user's profile.
 *
 * Mounted once, at the dashboard layout, so the heartbeat runs wherever the
 * athlete happens to be in the app. It pauses while the tab is hidden and
 * beats once immediately on return, so a backgrounded tab stops claiming to
 * be online without needing any disconnect handler.
 *
 * updateDoc, not setDoc: this must never create a profile document. Profiles
 * are created deliberately, by signup or by the server-side backfill.
 */
export function usePresence(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const beat = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      try {
        await updateDoc(doc(db, 'users', userId), { lastSeenAt: serverTimestamp() });
      } catch (err) {
        // Presence is decoration; a failed heartbeat must stay silent.
        console.debug('Presence heartbeat failed:', err);
      }
    };

    beat();
    const timer = setInterval(beat, PRESENCE_HEARTBEAT_MS);
    document.addEventListener('visibilitychange', beat);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', beat);
    };
  }, [userId]);
}
