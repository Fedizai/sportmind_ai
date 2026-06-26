"use client";

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useToast } from './use-toast';

export interface CoachNote {
  id: string;
  text: string;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
}

export function useCoachNotes(playerUid: string | null) {
  const [notes, setNotes] = useState<CoachNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!playerUid) {
      setNotes([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const q = query(collection(db, 'users', playerUid, 'coachNotes'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: CoachNote[] = [];
        snapshot.forEach((docSnap) => {
          data.push({ id: docSnap.id, ...docSnap.data() } as CoachNote);
        });
        setNotes(data);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching coach notes:', err);
        setError(err);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [playerUid]);

  const addNote = async (text: string) => {
    const user = auth.currentUser;
    if (!playerUid || !user || !text.trim()) return;
    try {
      await addDoc(collection(db, 'users', playerUid, 'coachNotes'), {
        text: text.trim(),
        createdBy: user.uid,
        createdByName: user.displayName || 'Coach',
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error adding note:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not add the note.' });
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!playerUid) return;
    try {
      await deleteDoc(doc(db, 'users', playerUid, 'coachNotes', noteId));
    } catch (err) {
      console.error('Error deleting note:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the note.' });
    }
  };

  return { notes, isLoading, error, addNote, deleteNote };
}
