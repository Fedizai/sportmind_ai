
"use client";

import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, setDoc, increment, Timestamp } from 'firebase/firestore';
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
      // The parent conversation must exist first: the security rule on the
      // messages subcollection reads `participants` off this document, so
      // writing the message first made every new thread's opening message fail.
      const conversationDocRef = doc(db, "conversations", conversationId);
      await setDoc(conversationDocRef, {
        participants: [userId1, userId2],
        lastMessageText: text,
        lastMessageTimestamp: serverTimestamp(),
        lastMessageSenderId: userId1,
        // A counter held on the conversation, incremented for the recipient
        // and cleared for the sender. Counting unread messages by querying the
        // subcollection instead would mean one extra query per conversation
        // every time the list renders.
        unreadBy: {
          ...(userId2 ? { [userId2]: increment(1) } : {}),
          [userId1]: 0,
        },
      }, { merge: true });

      const messagesCollectionRef = collection(db, "conversations", conversationId, "messages");
      await addDoc(messagesCollectionRef, {
        senderId: userId1,
        text: text,
        timestamp: serverTimestamp(),
      });

    } catch (err) {
      console.error("Error sending message:", err);
      toast({
        variant: 'destructive',
        title: 'Send Error',
        description: 'Could not send your message. Please try again.',
      });
    }
  };

  /**
   * Record that this thread has been opened, so it stops counting as unread.
   *
   * Only written once a message exists: the conversation document is created
   * by the first send, and a merge that carried only `lastReadBy` would fail
   * the create rule, which requires the writer to be listed in `participants`.
   * Sending those along keeps the write valid either way.
   */
  const markAsRead = async () => {
    if (!conversationId || !userId1 || !userId2 || messages.length === 0) return;
    try {
      await setDoc(
        doc(db, 'conversations', conversationId),
        {
          participants: [userId1, userId2],
          lastReadBy: { [userId1]: serverTimestamp() },
          unreadBy: { [userId1]: 0 },
        },
        { merge: true }
      );
    } catch (err) {
      // Never surfaced: failing to clear a badge must not interrupt reading.
      console.error('Could not mark the conversation as read:', err);
    }
  };

  return { messages, isLoading, error, sendMessage, markAsRead };
}
