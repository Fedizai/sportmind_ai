"use client";

import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from './use-toast';
import type { AppUser } from './use-all-users';

export interface PlayerProfile extends AppUser {
  status?: 'available' | 'injured' | 'suspended';
}

export function useUserProfile(uid: string | null) {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const unsubscribe = onSnapshot(
      doc(db, 'users', uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile({
            uid: docSnap.id,
            displayName: data.displayName || 'Unknown Player',
            email: data.email || null,
            role: data.role || 'player',
            plan: data.plan || 'athlete',
            photoUrl: data.photoUrl || null,
            onboardingComplete: data.onboardingComplete || false,
            sports: data.sports || [],
            age: data.age,
            trainingFrequency: data.trainingFrequency,
            mainGoal: data.mainGoal,
            tennisProfile: data.tennisProfile,
            gymProfile: data.gymProfile,
            footballProfile: data.footballProfile,
            status: data.status || 'available',
          });
        } else {
          setProfile(null);
        }
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching user profile:', err);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [uid]);

  const updateStatus = async (status: 'available' | 'injured' | 'suspended') => {
    if (!uid) return;
    try {
      await updateDoc(doc(db, 'users', uid), { status });
      toast({ title: 'Status updated', description: `Player status set to ${status}.` });
    } catch (err) {
      console.error('Error updating status:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update player status.' });
    }
  };

  return { profile, isLoading, updateStatus };
}
