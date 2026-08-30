"use client";

import { useCallback, useEffect, useState } from 'react';
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
  };
}

/** One athlete's own submissions for one sport. */
export function usePlayerVideos(userId: string | undefined, sport: string) {
  const [videos, setVideos] = useState<PlayerVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setVideos([]);
      setIsLoading(false);
      return;
    }
    const q = query(
      collection(db, 'player_videos'),
      where('userId', '==', userId),
      where('sport', '==', sport),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setVideos(snap.docs.map((d) => toVideo(d.id, d.data())));
        setIsLoading(false);
      },
      (error) => {
        console.error('Could not read player videos:', error);
        setIsLoading(false);
      }
    );
    return () => unsub();
  }, [userId, sport]);

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

  return { videos, isLoading, submitVideo, removeVideo };
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
      });
    },
    []
  );

  return { videos, isLoading, saveFeedback };
}
