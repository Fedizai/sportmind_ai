"use client";

import { useState, useEffect } from 'react';
import {
  collection, query, where, orderBy, onSnapshot, addDoc,
  updateDoc, deleteDoc, doc, serverTimestamp, Timestamp, getDocs,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

/** What the athlete is writing in about. */
export type TicketKind = 'problem' | 'help' | 'streak_restore';
export type TicketStatus = 'open' | 'in_progress' | 'resolved';

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  kind: TicketKind;
  subject: string;
  message: string;
  /** Free-form context, e.g. the page the report came from. */
  context?: string;
  /** Screenshot URLs uploaded with the report. */
  attachments?: string[];
  status: TicketStatus;
  adminReply?: string;
  createdAt: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface NewTicket {
  kind: TicketKind;
  subject: string;
  message: string;
  context?: string;
  attachments?: string[];
}

/** One message in a ticket's back-and-forth thread. */
export interface TicketReply {
  id: string;
  authorId: string;
  authorName: string | null;
  isAdmin: boolean;
  text: string;
  attachments?: string[];
  createdAt: Timestamp | null;
}

/**
 * Upload screenshots for a ticket and return their download URLs.
 * Images land under the author's own uid, which is what the storage rule allows.
 */
export async function uploadTicketImages(userId: string, files: File[]): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const path = `supportAttachments/${userId}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    urls.push(await getDownloadURL(storageRef));
  }
  return urls;
}

/**
 * Support tickets — problem reports, help requests and streak-restore appeals.
 *
 * Pass `allForAdmin` to read every ticket (the security rules only allow that
 * for admins); otherwise the caller sees just their own.
 */
export function useSupportTickets(
  userId: string | undefined,
  opts: { allForAdmin?: boolean } = {}
) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setTickets([]);
      setIsLoading(false);
      return;
    }

    const base = collection(db, 'supportTickets');
    const q = opts.allForAdmin
      ? query(base, orderBy('createdAt', 'desc'))
      : query(base, where('userId', '==', userId));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SupportTicket));
        // The per-user query skips orderBy so it needs no composite index.
        rows.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
        setTickets(rows);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error loading support tickets:', err);
        setError(err);
        setIsLoading(false);
      }
    );
    return () => unsub();
  }, [userId, opts.allForAdmin]);

  const submitTicket = async (
    input: NewTicket,
    author: { uid: string; email: string | null; displayName: string | null }
  ) => {
    await addDoc(collection(db, 'supportTickets'), {
      ...input,
      userId: author.uid,
      userEmail: author.email,
      userName: author.displayName,
      status: 'open' as TicketStatus,
      createdAt: serverTimestamp(),
    });
  };

  /** Admin-only: triage a ticket. */
  const updateTicket = async (
    ticketId: string,
    patch: { status?: TicketStatus; adminReply?: string }
  ) => {
    await updateDoc(doc(db, 'supportTickets', ticketId), {
      ...patch,
      updatedAt: serverTimestamp(),
    });
  };

  /** Post into a ticket's thread — used by both the author and admins. */
  const addReply = async (
    ticketId: string,
    text: string,
    author: { uid: string; displayName: string | null; isAdmin: boolean },
    attachments: string[] = []
  ) => {
    await addDoc(collection(db, 'supportTickets', ticketId, 'replies'), {
      authorId: author.uid,
      authorName: author.displayName,
      isAdmin: author.isAdmin,
      text,
      attachments,
      createdAt: serverTimestamp(),
    });
    // Surface activity on the parent so the queue can be sorted by freshness.
    await updateDoc(doc(db, 'supportTickets', ticketId), { updatedAt: serverTimestamp() });
  };

  /** Admin-only: remove a ticket entirely (spam, tests, duplicates). */
  const deleteTicket = async (ticketId: string) => {
    // Clear the thread first so no orphaned replies are left behind.
    const replies = await getDocs(collection(db, 'supportTickets', ticketId, 'replies'));
    await Promise.all(replies.docs.map((r) => deleteDoc(r.ref)));
    await deleteDoc(doc(db, 'supportTickets', ticketId));
  };

  return { tickets, isLoading, error, submitTicket, updateTicket, deleteTicket, addReply };
}
