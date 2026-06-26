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

export type SessionType = 'training' | 'recovery' | 'tactical' | 'fitness' | 'match-prep';
export type AttendanceStatus = 'present' | 'absent' | 'excused';

export interface TrainingSession {
  id: string;
  date: string;
  startTime: string;
  endTime?: string;
  type: SessionType;
  sport: 'football' | 'tennis' | 'gym';
  location: string;
  notes?: string;
  assignedPlayers: string[];
  attendance: Record<string, AttendanceStatus>;
  createdBy: string;
  createdAt: Timestamp;
}

export interface TrainingSessionInput {
  date: string;
  startTime: string;
  endTime?: string;
  type: SessionType;
  sport: 'football' | 'tennis' | 'gym';
  location: string;
  notes?: string;
  assignedPlayers: string[];
}

export function useTrainingSessions() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db, 'trainingSessions'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: TrainingSession[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          data.push({
            id: docSnap.id,
            date: d.date,
            startTime: d.startTime,
            endTime: d.endTime,
            type: d.type,
            sport: d.sport,
            location: d.location,
            notes: d.notes,
            assignedPlayers: d.assignedPlayers || [],
            attendance: d.attendance || {},
            createdBy: d.createdBy,
            createdAt: d.createdAt,
          });
        });
        setSessions(data);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching training sessions:', err);
        setError(err);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const createSession = async (input: TrainingSessionInput) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await addDoc(collection(db, 'trainingSessions'), {
        ...stripUndefined(input),
        attendance: {},
        createdBy: uid,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Session created', description: 'The training session has been scheduled.' });
    } catch (err) {
      console.error('Error creating session:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not create the session.' });
    }
  };

  const updateSession = async (id: string, input: Partial<TrainingSessionInput>) => {
    try {
      await updateDoc(doc(db, 'trainingSessions', id), stripUndefined(input));
      toast({ title: 'Session updated', description: 'The training session has been updated.' });
    } catch (err) {
      console.error('Error updating session:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update the session.' });
    }
  };

  const deleteSession = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'trainingSessions', id));
      toast({ title: 'Session deleted', description: 'The training session has been removed.' });
    } catch (err) {
      console.error('Error deleting session:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the session.' });
    }
  };

  const setAttendance = async (sessionId: string, playerUid: string, status: AttendanceStatus | null) => {
    try {
      await updateDoc(doc(db, 'trainingSessions', sessionId), {
        [`attendance.${playerUid}`]: status === null ? deleteField() : status,
      });
    } catch (err) {
      console.error('Error updating attendance:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update attendance.' });
    }
  };

  return { sessions, isLoading, error, createSession, updateSession, deleteSession, setAttendance };
}
