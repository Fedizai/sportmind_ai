
"use client";

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from './use-toast';

export type UserRole = 'player' | 'coach' | 'admin';
export type UserPlan = 'athlete' | 'pro';

// Expanded user interface to include all possible fields from Firestore
export interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  role: UserRole;
  plan?: UserPlan;
  photoUrl?: string | null;
  onboardingComplete?: boolean;
  sports?: string[];
  age?: number;
  trainingFrequency?: string;
  mainGoal?: string;
  tennisProfile?: {
    level?: string;
    hasRanking?: boolean;
    ranking?: string;
    dominantHand?: string;
    playStyle?: string;
  };
  gymProfile?: {
    height?: number;
    weight?: number;
    goal?: string;
  };
  footballProfile?: {
    position?: string;
    inClub?: boolean;
  };
}


export function useAllUsers() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db, "users"));

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const usersData: AppUser[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          usersData.push({
            uid: doc.id,
            displayName: data.displayName || 'Unknown User',
            email: data.email || 'No email',
            role: data.role || 'player',
            plan: data.plan || 'athlete',
            photoUrl: data.photoUrl || null,
            // Map all other available data, providing defaults where necessary
            onboardingComplete: data.onboardingComplete || false,
            sports: data.sports || [],
            age: data.age,
            trainingFrequency: data.trainingFrequency,
            mainGoal: data.mainGoal,
            tennisProfile: data.tennisProfile,
            gymProfile: data.gymProfile,
            footballProfile: data.footballProfile,
          });
        });
        setUsers(usersData);
        setIsLoading(false);
      }, 
      (err) => {
        console.error("Error fetching users:", err);
        setError(err);
        setIsLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const updateUserRole = async (uid: string, newRole: UserRole) => {
    try {
      const userDocRef = doc(db, 'users', uid);
      await updateDoc(userDocRef, { role: newRole });
      toast({
        title: 'Role Updated',
        description: `User role has been successfully changed to ${newRole}.`,
      });
    } catch (err) {
      console.error('Error updating role:', err);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update the user role.',
      });
    }
  };
  
  const updateUserPlan = async (uid: string, newPlan: UserPlan) => {
    try {
      const userDocRef = doc(db, 'users', uid);
      await updateDoc(userDocRef, { plan: newPlan });
      toast({
        title: 'Plan Updated',
        description: `User plan has been successfully changed to ${newPlan}.`,
      });
    } catch (err) {
      console.error('Error updating plan:', err);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update the user plan.',
      });
    }
  };


  return { users, isLoading, error, updateUserRole, updateUserPlan };
}
