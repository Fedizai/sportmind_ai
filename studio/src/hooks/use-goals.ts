"use client";

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { stripUndefined } from '@/lib/utils';
import { useToast } from './use-toast';

export type GoalSport = 'football' | 'tennis' | 'gym' | 'nutrition' | 'general';

export interface Goal {
  id: string;
  userId: string;
  title: string;
  sport: GoalSport;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline?: string;
  createdAt: Timestamp;
}

export interface GoalInput {
  title: string;
  sport: GoalSport;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline?: string;
}

export function useGoals(userId: string | undefined) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) {
      setGoals([]);
      setIsLoading(false);
      return;
    }

    const q = query(collection(db, 'goals'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: Goal[] = [];
        snapshot.forEach((docSnap) => {
          data.push({ id: docSnap.id, ...docSnap.data() } as Goal);
        });
        data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setGoals(data);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching goals:', err);
        setError(err);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [userId]);

  const addGoal = async (input: GoalInput) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await addDoc(collection(db, 'goals'), {
        ...stripUndefined(input),
        userId: uid,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Goal added', description: `"${input.title}" is now being tracked.` });
    } catch (err) {
      console.error('Error adding goal:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not add the goal.' });
    }
  };

  const updateGoalProgress = async (id: string, currentValue: number) => {
    try {
      await updateDoc(doc(db, 'goals', id), { currentValue });
    } catch (err) {
      console.error('Error updating goal:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update the goal.' });
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'goals', id));
      toast({ title: 'Goal removed', description: 'The goal has been deleted.' });
    } catch (err) {
      console.error('Error deleting goal:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the goal.' });
    }
  };

  return { goals, isLoading, error, addGoal, updateGoalProgress, deleteGoal };
}
