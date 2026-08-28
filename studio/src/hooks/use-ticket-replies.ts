"use client";

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { TicketReply } from './use-support-tickets';

/** Live thread for a single support ticket. */
export function useTicketReplies(ticketId: string | undefined) {
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!ticketId) {
      setReplies([]);
      setIsLoading(false);
      return;
    }
    const q = query(collection(db, 'supportTickets', ticketId, 'replies'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setReplies(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TicketReply)));
        setIsLoading(false);
      },
      (err) => {
        console.error('Error loading ticket replies:', err);
        setIsLoading(false);
      }
    );
    return () => unsub();
  }, [ticketId]);

  return { replies, isLoading };
}
