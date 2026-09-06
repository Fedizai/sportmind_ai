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

/** Base skeletal proportions used to reconstruct the 3D avatar. */
export type BodySexInput = 'male' | 'female' | 'neutral';

export interface BodyScan {
  id: string;
  userId: string;
  unitSystem: MeasurementUnitSystem;
  sport?: string;
  sex?: BodySexInput;
  measurements: Partial<Measurements>;
  /**
   * The fitted morph influences, stored alongside the measurements.
   *
   * No per-user `.glb` is ever written: there is one shared male mesh and one
   * shared female mesh, and the body is reconstructed client-side from these
   * numbers. Keeping them means an old scan still renders exactly as it did
   * even after the fitting engine is improved.
   */
  morphWeights?: Record<string, number>;
  /** Whether the measurements came from photo estimation rather than a tape. */
  estimated?: boolean;
  /**
   * Where each stored number came from, per measurement.
   *
   * A tape reading and a photo estimate are not the same evidence, and a value
   * the athlete corrected on the review screen is a third thing again. Keeping
   * them apart means a later validation run can tell which numbers the
   * pipeline actually produced.
   */
  measurementSources?: Partial<Record<string, 'manual' | 'photo_estimated' | 'user_corrected'>>;
  /** Per-measurement confidence, 0..1, for anything photo-derived. */
  measurementConfidence?: Partial<Record<string, number>>;
  analysis: ScanAnalysis | null;
  createdAt: Timestamp;
}

export interface BodyScanInput {
  unitSystem: MeasurementUnitSystem;
  sport?: string;
  sex?: BodySexInput;
  measurements: Partial<Measurements>;
  morphWeights?: Record<string, number>;
  estimated?: boolean;
  measurementSources?: Partial<Record<string, 'manual' | 'photo_estimated' | 'user_corrected'>>;
  measurementConfidence?: Partial<Record<string, number>>;
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
