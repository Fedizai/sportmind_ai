"use client";

import { useCallback, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';

import {
  createSession, deleteSession, listSessions, setSessionCompleted,
  type SessionRow,
} from '@/app/dashboard/_components/session-actions';

/**
 * An athlete's own planned training sessions, per sport.
 *
 * These used to live in `useState` alone — added, ticked off and deleted
 * entirely in the browser's memory — so every session an athlete planned
 * disappeared the moment they refreshed the page. Tennis, football, the gym
 * and the generic sport module each carried their own copy of that
 * non-persistence.
 *
 * They now go through the Admin SDK rather than the browser SDK. The browser
 * SDK needed the `athlete_sessions` rules to be deployed, and an App Hosting
 * rollout does not deploy rules — under the default-deny catch-all every write
 * was refused and every read came back empty, which is what an athlete saw as
 * "rien de prévu" no matter how much they had planned.
 *
 * Distinct from `use-training-sessions`, which is the coach's team-wide
 * schedule in `trainingSessions` with assigned players and attendance. This is
 * one athlete planning their own week.
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

/** Proof of who is calling. The server ignores any uid sent alongside it. */
async function idToken(): Promise<string | null> {
  // The initialised `auth` from the app's own module rather than `getAuth()`:
  // a bare getAuth() throws when this module happens to load before Firebase
  // has been initialised.
  const current = auth?.currentUser;
  return current ? current.getIdToken() : null;
}

export function useAthleteSessions(userId: string | undefined, sport: string) {
  const [all, setAll] = useState<AthleteSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const toSession = (row: SessionRow): AthleteSession => ({
    id: row.id,
    sport: row.sport,
    title: row.title,
    type: row.type as AthleteSessionType,
    date: row.date ? new Date(row.date) : null,
    duration: row.duration,
    notes: row.notes,
    completed: row.completed,
  });

  /**
   * Always clears the loading flag, including on failure.
   *
   * A server action can reject rather than return — a cold start, a bad
   * deploy, a missing credential — and a fetch that only clears the flag on
   * the happy path leaves the schedule spinning forever with no way to tell
   * that anything went wrong.
   */
  const load = useCallback(async () => {
    try {
      const token = await idToken();
      if (!token) {
        setAll([]);
        return;
      }
      setAll((await listSessions(token)).map(toSession));
    } catch (error) {
      console.error('Could not read your sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = load;

  useEffect(() => {
    if (!userId) {
      setAll([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    void load();
  }, [userId, load]);

  // `sport` of 'all' is used by the insights view, which needs every sport's
  // sessions rather than one page's. Filtering here rather than in the query
  // means one fetch serves every caller.
  const sessions = (sport === 'all' ? all : all.filter((r) => r.sport === sport))
    .slice()
    .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));

  const addSession = useCallback(
    async (values: NewAthleteSession) => {
      const token = await idToken();
      if (!token) throw new Error('You must be signed in to plan a session.');
      const result = await createSession(token, sport, {
        title: values.title,
        type: values.type,
        date: values.date.toISOString(),
        duration: values.duration,
        notes: values.notes,
      });
      if (!result.success) throw new Error(result.error ?? 'Could not save the session.');
      await refresh();
    },
    [sport, refresh]
  );

  const toggleSession = useCallback(
    async (id: string) => {
      const token = await idToken();
      if (!token) throw new Error('You must be signed in.');
      const result = await setSessionCompleted(token, id);
      if (!result.success) throw new Error(result.error ?? 'Could not update the session.');
      await refresh();
    },
    [refresh]
  );

  const removeSession = useCallback(
    async (id: string) => {
      const token = await idToken();
      if (!token) throw new Error('You must be signed in.');
      const result = await deleteSession(token, id);
      if (!result.success) throw new Error(result.error ?? 'Could not remove the session.');
      await refresh();
    },
    [refresh]
  );

  return { sessions, isLoading, addSession, toggleSession, removeSession, refresh };
}
