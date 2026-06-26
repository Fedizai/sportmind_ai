"use client";

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
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
import type { BodyZoneId, Measurements, MeasurementUnitSystem } from '@/lib/body-zones';

export interface ScanAnalysis {
  bodyFatEstimate: number;
  bodyFatRange: string;
  zoneScores: { zone: BodyZoneId; score: number }[];
  strongPoints: string[];
  weakPoints: string[];
  recommendations: string[];
  summary: string;
}

export interface BodyScan {
  id: string;
  userId: string;
  unitSystem: MeasurementUnitSystem;
  sport?: string;
  measurements: Partial<Measurements>;
  analysis: ScanAnalysis | null;
  createdAt: Timestamp;
}

export interface BodyScanInput {
  unitSystem: MeasurementUnitSystem;
  sport?: string;
  measurements: Partial<Measurements>;
  analysis: ScanAnalysis | null;
}

export function useBodyScans(userId: string | undefined) {
  const [scans, setScans] = useState<BodyScan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) {
      setScans([]);
      setIsLoading(false);
      return;
    }

    const q = query(collection(db, 'bodyScans'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: BodyScan[] = [];
        snapshot.forEach((docSnap) => {
          data.push({ id: docSnap.id, ...docSnap.data() } as BodyScan);
        });
        data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setScans(data);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching body scans:', err);
        setError(err);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [userId]);

  const addScan = async (input: BodyScanInput): Promise<string | null> => {
    const uid = auth.currentUser?.uid;
    if (!uid) return null;
    try {
      const ref = await addDoc(collection(db, 'bodyScans'), {
        ...stripUndefined(input),
        userId: uid,
        createdAt: serverTimestamp(),
      });
      return ref.id;
    } catch (err) {
      console.error('Error saving body scan:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save the scan.' });
      return null;
    }
  };

  const deleteScan = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'bodyScans', id));
      toast({ title: 'Scan removed' });
    } catch (err) {
      console.error('Error deleting body scan:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the scan.' });
    }
  };

  return { scans, isLoading, error, addScan, deleteScan, latest: scans[0] ?? null };
}
