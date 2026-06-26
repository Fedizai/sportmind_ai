
"use client";

import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from './use-toast';

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Timestamp;
}

export function useMessages(userId1: string | undefined, userId2: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const conversationId = useMemo(() => {
    if (!userId1 || !userId2) return null;
    return [userId1, userId2].sort().join('_');
  }, [userId1, userId2]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    const messagesCollectionRef = collection(db, "conversations", conversationId, "messages");
    const q = query(messagesCollectionRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const msgs: Message[] = [];
        querySnapshot.forEach((doc) => {
          msgs.push({ id: doc.id, ...doc.data() } as Message);
        });
        setMessages(msgs);
        setIsLoading(false);
      }, 
      (err) => {
        console.error("Error fetching messages:", err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [conversationId]);

  const sendMessage = async (text: string) => {
    if (!conversationId || !userId1) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Cannot send message. Invalid user or conversation.',
      });
      return;
    }

    try {
      const messagesCollectionRef = collection(db, "conversations", conversationId, "messages");
      await addDoc(messagesCollectionRef, {
        senderId: userId1,
        text: text,
        timestamp: serverTimestamp(),
      });

      // Also update the parent conversation document for the conversation list preview
      const conversationDocRef = doc(db, "conversations", conversationId);
      await setDoc(conversationDocRef, {
        participants: [userId1, userId2],
        lastMessageText: text,
        lastMessageTimestamp: serverTimestamp(),
        lastMessageSenderId: userId1,
      }, { merge: true }); // Use merge to create if it doesn't exist, or update if it does

    } catch (err) {
      console.error("Error sending message:", err);
      toast({
        variant: 'destructive',
        title: 'Send Error',
        description: 'Could not send your message. Please try again.',
      });
    }
  };

  return { messages, isLoading, error, sendMessage };
}
