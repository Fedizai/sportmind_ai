
"use client";

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Conversation {
  id: string;
  participants: string[];
  lastMessageText: string;
  /** Null while a just-sent message's serverTimestamp is still pending. */
  lastMessageTimestamp: Timestamp | null;
  lastMessageSenderId: string;
  /** When each participant last opened this thread, keyed by uid. */
  lastReadBy?: Record<string, Timestamp | null>;
  /** Messages waiting for each participant, keyed by uid. */
  unreadBy?: Record<string, number>;
  /**
   * When each participant's device last received a message, keyed by uid.
   *
   * Stamped by the recipient's own listener below, so this is actual delivery
   * — their client held the message — rather than something inferred from a
   * presence heartbeat, which would only say they had the app open.
   */
  lastDeliveredTo?: Record<string, Timestamp | null>;
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
        
        // Sort by most recent message. The timestamp has to be read
        // defensively: serverTimestamp() resolves to null in the local
        // snapshot that fires immediately after a send, so reading .seconds
        // straight off it threw before setConversations ever ran — the list
        // simply stopped updating at the moment you sent a message. A document
        // written before this field existed does the same thing, permanently.
        const seconds = (c: Conversation) => c.lastMessageTimestamp?.seconds ?? 0;
        convos.sort((a, b) => seconds(b) - seconds(a));

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

  /**
   * Mark incoming messages as delivered.
   *
   * This listener firing *is* the delivery event: the message is on this
   * device. Stamping it here rather than when the thread is opened keeps
   * "delivered" and "read" genuinely different — one says it arrived, the
   * other says they looked at it.
   *
   * Only stamps threads where someone else wrote last and the mark is behind
   * that message, so the write it triggers cannot re-trigger itself.
   */
  useEffect(() => {
    if (!userId) return;
    for (const c of conversations) {
      const last = c.lastMessageTimestamp;
      if (!last || c.lastMessageSenderId === userId) continue;
      const delivered = c.lastDeliveredTo?.[userId];
      if (delivered && delivered.seconds >= last.seconds) continue;
      setDoc(
        doc(db, 'conversations', c.id),
        { lastDeliveredTo: { [userId]: serverTimestamp() } },
        { merge: true }
      ).catch((err) => {
        // A missed delivery tick is cosmetic; never surface it.
        console.debug('Could not mark conversation delivered:', err);
      });
    }
  }, [conversations, userId]);

  /**
   * How many messages are waiting for you in this thread.
   *
   * Reads the counter the sender maintains. Conversations that predate that
   * counter have none, so they fall back to the timestamp comparison and
   * report 1 — enough to show the thread as unread without inventing a count.
   */
  const unreadIn = (conversation: Conversation) => {
    if (!userId) return 0;
    const counted = conversation.unreadBy?.[userId];
    if (typeof counted === 'number') return Math.max(0, counted);

    const last = conversation.lastMessageTimestamp;
    // A pending timestamp means the write is still your own, in flight.
    if (!last) return 0;
    if (conversation.lastMessageSenderId === userId) return 0;
    const read = conversation.lastReadBy?.[userId];
    return !read || read.seconds < last.seconds ? 1 : 0;
  };

  const isUnread = (conversation: Conversation) => unreadIn(conversation) > 0;

  /** Conversation with this person, if one has been started. */
  const conversationWith = (otherUid: string) =>
    conversations.find((c) => c.participants.includes(otherUid));

  /** Threads with something waiting — what the nav badge counts. */
  const unreadConversations = conversations.filter(isUnread).length;
  /** Every waiting message across every thread. */
  const unreadCount = conversations.reduce((sum, c) => sum + unreadIn(c), 0);

  return {
    conversations, isLoading, error,
    isUnread, unreadIn, conversationWith,
    unreadCount, unreadConversations,
  };
}
