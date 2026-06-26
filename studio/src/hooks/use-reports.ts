"use client";

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { stripUndefined } from '@/lib/utils';
import { useToast } from './use-toast';

export type ReportType = 'weekly-summary' | 'match-review' | 'progress-note';

export interface Report {
  id: string;
  title: string;
  type: ReportType;
  targetPlayerUid: string | null;
  targetPlayerName?: string;
  body: string;
  createdBy: string;
  createdAt: Timestamp;
}

export interface ReportInput {
  title: string;
  type: ReportType;
  targetPlayerUid: string | null;
  targetPlayerName?: string;
  body: string;
}

export function useReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: Report[] = [];
        snapshot.forEach((docSnap) => {
          data.push({ id: docSnap.id, ...docSnap.data() } as Report);
        });
        setReports(data);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching reports:', err);
        setError(err);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const createReport = async (input: ReportInput) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await addDoc(collection(db, 'reports'), {
        ...stripUndefined(input),
        createdBy: uid,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Report created', description: `"${input.title}" has been saved.` });
    } catch (err) {
      console.error('Error creating report:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not create the report.' });
    }
  };

  const deleteReport = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'reports', id));
      toast({ title: 'Report deleted', description: 'The report has been removed.' });
    } catch (err) {
      console.error('Error deleting report:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the report.' });
    }
  };

  return { reports, isLoading, error, createReport, deleteReport };
}
