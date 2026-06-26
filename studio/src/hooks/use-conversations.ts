
"use client";

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Conversation {
  id: string;
  participants: string[];
  lastMessageText: string;
  lastMessageTimestamp: Timestamp;
  lastMessageSenderId: string;
}

export function useConversations(userId: string | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", userId)
    );

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const convos: Conversation[] = [];
        querySnapshot.forEach((doc) => {
          convos.push({ id: doc.id, ...doc.data() } as Conversation);
        });
        
        // Sort conversations by the most recent message
        convos.sort((a, b) => b.lastMessageTimestamp.seconds - a.lastMessageTimestamp.seconds);

        setConversations(convos);
        setIsLoading(false);
      }, 
      (err) => {
        console.error("Error fetching conversations:", err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { conversations, isLoading, error };
}
