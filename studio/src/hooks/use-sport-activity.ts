"use client";

import { useEffect, useMemo, useState } from 'react';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';

import { db } from '@/lib/firebase';

/**
 * Everything an athlete has logged, across every sport.
 *
 * The insights view read `football_matches` and `tennis_matches` and nothing
 * else, so an athlete who boxes, swims or plays basketball saw a dashboard
 * with none of their own work in it — and the sports they do not play still
 * took up space. This gathers all of it in one place so insights can show the
 * sports someone actually does.
 *
 * Each collection is subscribed live, so logging a match updates the insights
 * without a refresh — the same listener style the individual sport pages use.
 */

export type SportId =
  | 'football' | 'tennis' | 'basketball' | 'boxing' | 'swimming' | 'gym';

interface Source {
  sport: SportId;
  path: string;
  /** Field holding the activity date. */
  dateField: string;
}

/**
 * Where each sport keeps its entries. Gym is absent on purpose: its work is a
 * local training plan rather than a Firestore collection of events, and it is
 * folded in by the caller from the plan store.
 */
const SOURCES: Source[] = [
  { sport: 'football',   path: 'football_matches',   dateField: 'date' },
  { sport: 'tennis',     path: 'tennis_matches',     dateField: 'date' },
  { sport: 'basketball', path: 'basketball_games',   dateField: 'date' },
  { sport: 'boxing',     path: 'boxing_bouts',       dateField: 'date' },
  { sport: 'swimming',   path: 'swimming_sessions',  dateField: 'date' },
];

export interface SportEntrySummary {
  id: string;
  sport: SportId;
  date: Date | null;
  /** Opponent, event or session title — whatever the sport calls its subject. */
  label: string;
  /** "W", "L", a score, or empty when the sport has no result concept. */
  result: string;
}

export interface SportActivity {
  sport: SportId;
  entries: SportEntrySummary[];
  count: number;
  lastActivity: Date | null;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Each sport names its subject differently; this reads whichever it uses. */
function labelOf(data: any): string {
  return data.opponent ?? data.primary ?? data.title ?? data.event ?? '';
}

function resultOf(data: any): string {
  if (typeof data.result === 'string') return data.result;
  if (data.score) return String(data.score);
  return '';
}

export function useSportActivity(userId: string | undefined) {
  const [bySport, setBySport] = useState<Record<string, SportEntrySummary[]>>({});
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!userId) {
      setBySport({});
      setLoaded({});
      return;
    }

    // No orderBy: sorting happens below, which keeps this from needing a
    // composite index per sport just to read a handful of rows.
    const unsubs = SOURCES.map(({ sport, path, dateField }) =>
      onSnapshot(
        query(collection(db, path), where('userId', '==', userId)),
        (snap) => {
          const rows: SportEntrySummary[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              sport,
              date: toDate(data[dateField]),
              label: labelOf(data),
              result: resultOf(data),
            };
          });
          rows.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
          setBySport((prev) => ({ ...prev, [sport]: rows }));
          setLoaded((prev) => ({ ...prev, [sport]: true }));
        },
        (error) => {
          console.error(`Could not read ${path}:`, error);
          setLoaded((prev) => ({ ...prev, [sport]: true }));
        }
      )
    );

    return () => unsubs.forEach((u) => u());
  }, [userId]);

  const activity = useMemo<SportActivity[]>(
    () =>
      SOURCES.map(({ sport }) => {
        const entries = bySport[sport] ?? [];
        return {
          sport,
          entries,
          count: entries.length,
          lastActivity: entries[0]?.date ?? null,
        };
      }),
    [bySport]
  );

  /** Only the sports this athlete has actually logged something in. */
  const active = useMemo(() => activity.filter((a) => a.count > 0), [activity]);

  const totalEntries = useMemo(
    () => activity.reduce((sum, a) => sum + a.count, 0),
    [activity]
  );

  const isLoading = SOURCES.some(({ sport }) => !loaded[sport]) && !!userId;

  return { activity, active, totalEntries, isLoading };
}
