

"use client";

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Player {
  uid: string;
  displayName: string | null;
  email: string | null;
  role: string | null;
  position?: string; 
  status?: 'available' | 'injured' | 'suspended'; 
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

export function useTeam() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "player"));

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const playersData: Player[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          playersData.push({
            uid: doc.id,
            displayName: data.displayName || 'Unknown Player',
            email: data.email || 'No email',
            role: data.role,
            // Add default or fetched values for other properties
            position: data.footballProfile?.position || 'Not Set',
            status: data.status || 'available',
          });
        });
        setPlayers(playersData);
        setIsLoading(false);
      }, 
      (err) => {
        console.error("Error fetching team:", err);
        setError(err);
        setIsLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return { players, isLoading, error };
}
