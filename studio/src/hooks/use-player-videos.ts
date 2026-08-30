"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, Timestamp,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { deleteStoredFile } from '@/lib/media-upload';

/**
 * Match and training clips an athlete submits for review.
 *
 * Reviewed by a coach, not by a model. Football used to hand every upload
 * straight to a vision model and write its answer back as "feedback"; tennis
 * had no video feature at all. Both now put the clip in front of a person,
 * which is what the athlete actually wants from footage of themselves.
 *
 * One top-level collection rather than a subcollection under each user,
 * because a coach has to list submissions across every athlete and a
 * subcollection would make that a collection-group query for no benefit.
 */

export type VideoReviewStatus = 'awaiting_review' | 'reviewed';

export interface PlayerVideo {
  id: string;
  userId: string;
  sport: string;
  title: string;
  url: string;
  /** Set only when the clip was uploaded rather than linked. */
  storagePath: string | null;
  /** What the athlete wants looked at. */
  note: string;
  status: VideoReviewStatus;
  coachFeedback: string | null;
  coachName: string | null;
  reviewedAt: Date | null;
  createdAt: Date | null;
  /** False once a coach has replied and the athlete has not yet looked. */
  feedbackSeen: boolean;
}

export interface NewPlayerVideo {
  title: string;
  url: string;
  storagePath?: string | null;
  note?: string;
}

function toVideo(id: string, data: any): PlayerVideo {
  return {
    id,
    userId: data.userId ?? '',
    sport: data.sport ?? '',
    title: data.title ?? '',
    url: data.url ?? '',
    storagePath: data.storagePath ?? null,
    note: data.note ?? '',
    status: data.status === 'reviewed' ? 'reviewed' : 'awaiting_review',
    coachFeedback: data.coachFeedback ?? null,
    coachName: data.coachName ?? null,
    reviewedAt: data.reviewedAt instanceof Timestamp ? data.reviewedAt.toDate() : null,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null,
    feedbackSeen: data.feedbackSeen !== false,
  };
}

/**
 * One athlete's own submissions for one sport.
 *
 * Deliberately queried on `userId` alone, then narrowed and sorted in memory.
 * Filtering on userId AND sport while ordering by createdAt needs a composite
 * index, and when that index is missing Firestore rejects the whole
 * subscription — which is exactly what happened: a player submitted a clip,
 * the listener errored, the list stayed empty, and the "no videos yet" empty
 * state sat there as though nothing had been sent. One athlete's clips number
 * in the tens, so sorting them here costs nothing and removes a way for this
 * to break silently again.
 */
export function usePlayerVideos(userId: string | undefined, sport: string) {
  const [all, setAll] = useState<PlayerVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setAll([]);
      setIsLoading(false);
      return;
    }
    const q = query(collection(db, 'player_videos'), where('userId', '==', userId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setAll(snap.docs.map((d) => toVideo(d.id, d.data())));
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        // Surfaced rather than swallowed. A console line is invisible to the
        // person looking at an empty list wondering where their video went.
        console.error('Could not read player videos:', err);
        setError(err as Error);
        setIsLoading(false);
      }
    );
    return () => unsub();
  }, [userId]);

  const videos = useMemo(
    () =>
      all
        .filter((v) => v.sport === sport)
        .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)),
    [all, sport]
  );

  const submitVideo = useCallback(
    async (values: NewPlayerVideo) => {
      if (!userId) throw new Error('You must be signed in to submit a video.');
      await addDoc(collection(db, 'player_videos'), {
        userId,
        sport,
        title: values.title,
        url: values.url,
        storagePath: values.storagePath ?? null,
        note: values.note ?? '',
        status: 'awaiting_review',
        coachFeedback: null,
        coachName: null,
        reviewedAt: null,
        feedbackSeen: true,
        createdAt: Timestamp.now(),
      });
    },
    [userId, sport]
  );

  const removeVideo = useCallback(async (video: PlayerVideo) => {
    await deleteDoc(doc(db, 'player_videos', video.id));
    // The Storage object outlives the document otherwise.
    await deleteStoredFile(video.storagePath);
  }, []);

  /**
   * Mark a coach's reply as seen.
   *
   * Called when the athlete has the reviewed clip on screen, which is what
   * clears the header badge — the same shape as a read receipt.
   */
  const markFeedbackSeen = useCallback(async (videoId: string) => {
    try {
      await updateDoc(doc(db, 'player_videos', videoId), { feedbackSeen: true });
    } catch (err) {
      // Cosmetic; a badge that lingers is better than a thrown error.
      console.debug('Could not mark feedback seen:', err);
    }
  }, []);

  return { videos, isLoading, error, submitVideo, removeVideo, markFeedbackSeen };
}

/**
 * Everything submitted, for the coach.
 *
 * Ordered oldest-first so the clip that has been waiting longest is the one a
 * coach sees at the top — a newest-first queue quietly starves the backlog.
 */
export function useVideoReviewQueue(enabled: boolean) {
  const [videos, setVideos] = useState<PlayerVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setVideos([]);
      setIsLoading(false);
      return;
    }
    const q = query(collection(db, 'player_videos'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setVideos(snap.docs.map((d) => toVideo(d.id, d.data())));
        setIsLoading(false);
      },
      (error) => {
        console.error('Could not read the review queue:', error);
        setIsLoading(false);
      }
    );
    return () => unsub();
  }, [enabled]);

  const saveFeedback = useCallback(
    async (videoId: string, feedback: string, coachName: string) => {
      await updateDoc(doc(db, 'player_videos', videoId), {
        coachFeedback: feedback,
        coachName,
        status: feedback.trim() ? 'reviewed' : 'awaiting_review',
        reviewedAt: Timestamp.now(),
        // Unread until the athlete opens it — this is what lights the badge.
        feedbackSeen: false,
      });
    },
    []
  );

  return { videos, isLoading, saveFeedback };
}

/**
 * Coach replies the athlete has not looked at yet.
 *
 * Backs the header badge. Queried on `userId` alone for the same reason as
 * above — adding status and feedbackSeen to the filter would need another
 * composite index, and a missing one fails the whole subscription rather than
 * degrading.
 */
export function useUnseenVideoFeedback(userId: string | undefined) {
  const [unseen, setUnseen] = useState<PlayerVideo[]>([]);

  useEffect(() => {
    if (!userId) {
      setUnseen([]);
      return;
    }
    const unsub = onSnapshot(
      query(collection(db, 'player_videos'), where('userId', '==', userId)),
      (snap) => {
        const rows = snap.docs
          .map((d) => toVideo(d.id, d.data()))
          .filter((v) => v.status === 'reviewed' && !v.feedbackSeen)
          // Newest reply first, so the badge points at the freshest one.
          .sort((a, b) => (b.reviewedAt?.getTime() ?? 0) - (a.reviewedAt?.getTime() ?? 0));
        setUnseen(rows);
      },
      (err) => {
        console.error('Could not read video feedback alerts:', err);
        setUnseen([]);
      }
    );
    return () => unsub();
  }, [userId]);

  return {
    count: unseen.length,
    /**
     * Which sport's video tab to open. The badge should land on the clip that
     * was replied to, not on a sport picker the athlete then has to navigate
     * from — they already chose their sports when they signed up.
     */
    sport: unseen[0]?.sport ?? null,
  };
}
