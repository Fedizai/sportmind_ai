"use client";

import { useCallback, useEffect, useState } from 'react';
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, Timestamp,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';

/**
 * An athlete's own planned training sessions, per sport.
 *
 * These used to live in `useState` alone — added, ticked off and deleted
 * entirely in the browser's memory — so every session an athlete planned
 * disappeared the moment they refreshed the page. Tennis, football and the
 * generic sport module each carried their own copy of that non-persistence.
 *
 * Distinct from `use-training-sessions`, which is the coach's team-wide
 * schedule in `trainingSessions` with assigned players and attendance. This is
 * one athlete planning their own week, in `athlete_sessions`.
 */

/**
 * Includes the gym's own vocabulary alongside the sports' — the gym schedule
 * speaks in strength/cardio/flexibility, and it stores its sessions here too.
 */
export type AthleteSessionType =
  | 'technical' | 'tactical' | 'physical'
  | 'strength' | 'cardio' | 'flexibility'
  | 'other';

export interface AthleteSession {
  id: string;
  /** Which sport this session belongs to. */
  sport: string;
  title: string;
  type: AthleteSessionType;
  /** Null only for a malformed row; the form always supplies a date. */
  date: Date | null;
  duration: number;
  notes?: string;
  completed: boolean;
}

/** What the add-session forms hand over. */
export interface NewAthleteSession {
  title: string;
  type: AthleteSessionType;
  date: Date;
  duration: number;
  notes?: string;
}

export function useAthleteSessions(userId: string | undefined, sport: string) {
  const [sessions, setSessions] = useState<AthleteSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setSessions([]);
      setIsLoading(false);
      return;
    }

    // userId alone, ordered in memory. Filtering on userId while ordering by
    // date needs its own composite index, and a missing one fails the entire
    // subscription rather than degrading — which has already emptied two lists
    // in this app. One athlete's sessions number in the tens.
    const q = query(collection(db, 'athlete_sessions'), where('userId', '==', userId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rows: AthleteSession[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          rows.push({
            id: docSnap.id,
            sport: data.sport ?? '',
            title: data.title ?? '',
            type: (data.type ?? 'other') as AthleteSessionType,
            date: data.date instanceof Timestamp ? data.date.toDate() : null,
            duration: typeof data.duration === 'number' ? data.duration : 0,
            notes: data.notes ?? '',
            completed: !!data.completed,
          });
        });
        // `sport` of 'all' is used by the insights view, which needs every
        // sport's sessions rather than one page's.
        const scoped = sport === 'all' ? rows : rows.filter((r) => r.sport === sport);
        scoped.sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));
        setSessions(scoped);
        setIsLoading(false);
      },
      (error) => {
        console.error('Could not read athlete sessions:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, sport]);

  const addSession = useCallback(
    async (values: NewAthleteSession) => {
      if (!userId) throw new Error('You must be signed in to plan a session.');
      await addDoc(collection(db, 'athlete_sessions'), {
        userId,
        sport,
        title: values.title,
        type: values.type,
        date: Timestamp.fromDate(values.date),
        duration: values.duration,
        notes: values.notes ?? '',
        completed: false,
        createdAt: Timestamp.now(),
      });
    },
    [userId, sport]
  );

  const toggleSession = useCallback(
    async (id: string) => {
      const current = sessions.find((s) => s.id === id);
      if (!current) return;
      await updateDoc(doc(db, 'athlete_sessions', id), { completed: !current.completed });
    },
    [sessions]
  );

  const removeSession = useCallback(async (id: string) => {
    await deleteDoc(doc(db, 'athlete_sessions', id));
  }, []);

  return { sessions, isLoading, addSession, toggleSession, removeSession };
}
