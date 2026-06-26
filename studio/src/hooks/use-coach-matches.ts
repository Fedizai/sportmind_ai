"use client";

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { stripUndefined } from '@/lib/utils';
import { useToast } from './use-toast';

export type MatchSport = 'football' | 'tennis' | 'gym';
export type MatchStatus = 'upcoming' | 'completed';

export interface CoachMatch {
  id: string;
  opponent: string;
  date: string;
  time?: string;
  venue: string;
  homeAway: 'home' | 'away';
  sport: MatchSport;
  status: MatchStatus;
  score?: { home: number; away: number };
  lineup: Record<string, string>;
  formation?: string;
  tacticsNotes?: string;
  createdBy: string;
  createdAt: Timestamp;
}

export interface CoachMatchInput {
  opponent: string;
  date: string;
  time?: string;
  venue: string;
  homeAway: 'home' | 'away';
  sport: MatchSport;
}

export function useCoachMatches() {
  const [matches, setMatches] = useState<CoachMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db, 'coachMatches'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: CoachMatch[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          data.push({
            id: docSnap.id,
            opponent: d.opponent,
            date: d.date,
            time: d.time,
            venue: d.venue,
            homeAway: d.homeAway,
            sport: d.sport,
            status: d.status || 'upcoming',
            score: d.score,
            lineup: d.lineup || {},
            formation: d.formation,
            tacticsNotes: d.tacticsNotes,
            createdBy: d.createdBy,
            createdAt: d.createdAt,
          });
        });
        setMatches(data);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching matches:', err);
        setError(err);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const createMatch = async (input: CoachMatchInput) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await addDoc(collection(db, 'coachMatches'), {
        ...stripUndefined(input),
        status: 'upcoming',
        lineup: {},
        createdBy: uid,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Match scheduled', description: `Fixture against ${input.opponent} has been added.` });
    } catch (err) {
      console.error('Error creating match:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not schedule the match.' });
    }
  };

  const updateMatch = async (id: string, input: Partial<CoachMatchInput>) => {
    try {
      await updateDoc(doc(db, 'coachMatches', id), stripUndefined(input));
    } catch (err) {
      console.error('Error updating match:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update the match.' });
    }
  };

  const deleteMatch = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'coachMatches', id));
      toast({ title: 'Match removed', description: 'The fixture has been deleted.' });
    } catch (err) {
      console.error('Error deleting match:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the match.' });
    }
  };

  const setLineupSlot = async (matchId: string, slotId: string, playerUid: string | null) => {
    try {
      await updateDoc(doc(db, 'coachMatches', matchId), {
        [`lineup.${slotId}`]: playerUid === null ? deleteField() : playerUid,
      });
    } catch (err) {
      console.error('Error updating lineup:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update the lineup.' });
    }
  };

  const saveTacticsNotes = async (matchId: string, notes: string, formation?: string) => {
    try {
      await updateDoc(doc(db, 'coachMatches', matchId), {
        tacticsNotes: notes,
        ...(formation ? { formation } : {}),
      });
      toast({ title: 'Notes saved', description: 'Your tactics notes have been saved.' });
    } catch (err) {
      console.error('Error saving tactics notes:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save the notes.' });
    }
  };

  const recordResult = async (matchId: string, score: { home: number; away: number }) => {
    try {
      await updateDoc(doc(db, 'coachMatches', matchId), {
        score,
        status: 'completed',
      });
      toast({ title: 'Result recorded', description: 'The match result has been saved.' });
    } catch (err) {
      console.error('Error recording result:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not record the result.' });
    }
  };

  return {
    matches,
    isLoading,
    error,
    createMatch,
    updateMatch,
    deleteMatch,
    setLineupSlot,
    saveTacticsNotes,
    recordResult,
  };
}
