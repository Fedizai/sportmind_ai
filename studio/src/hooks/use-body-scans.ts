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

/**
 * Reads a stored analysis back into the one shape the rest of the page expects.
 *
 * `analyzeBody` used to return the analysis itself and now returns
 * `{ ok, analysis }`. A browser tab loaded before that deploy went on calling
 * the new server action with the old expectations, and stored the wrapper as
 * though it were the analysis: the scan looked saved, the chart plotted it at
 * zero, and Results crashed reading `zoneScores` off an object that had none.
 *
 * Unwrapping on the way in repairs those documents wherever they are read —
 * nothing is rewritten, so nothing can be lost — and the same call on the way
 * out means a stale tab cannot write another one.
 */
export function normaliseAnalysis(raw: unknown): ScanAnalysis | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  if ('ok' in value && 'analysis' in value) return normaliseAnalysis(value.analysis);

  // A document from a shape nobody recognises is not an analysis. Saying so is
  // better than a report made entirely of blanks.
  const recognisable =
    typeof value.bodyFatEstimate === 'number' ||
    Array.isArray(value.zoneScores) ||
    typeof value.summary === 'string';
  if (!recognisable) return null;

  const strings = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);
  return {
    bodyFatEstimate: typeof value.bodyFatEstimate === 'number' ? value.bodyFatEstimate : 0,
    bodyFatRange: typeof value.bodyFatRange === 'string' ? value.bodyFatRange : '',
    zoneScores: Array.isArray(value.zoneScores) ? (value.zoneScores as ScanAnalysis['zoneScores']) : [],
    strongPoints: strings(value.strongPoints),
    weakPoints: strings(value.weakPoints),
    recommendations: strings(value.recommendations),
    summary: typeof value.summary === 'string' ? value.summary : '',
  };
}

/**
 * Newest first, with a scan that has not been acknowledged yet at the top.
 *
 * `serverTimestamp()` is resolved by the server, so the local echo of a scan
 * the athlete has just saved arrives with `createdAt: null`. Reading that as
 * second zero sorted the freshest scan to the *bottom*, and until the round
 * trip finished the page showed the previous analysis — which reads exactly
 * like pressing Analyse a second time and having nothing happen.
 */
function byNewestFirst(a: BodyScan, b: BodyScan): number {
  const at = a.createdAt?.seconds;
  const bt = b.createdAt?.seconds;
  if (at === undefined && bt === undefined) return 0;
  if (at === undefined) return -1;
  if (bt === undefined) return 1;
  return bt - at;
}

export function useBodyScans(userId: string | undefined) {
  const [scans, setScans] = useState<BodyScan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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
          const raw = docSnap.data();
          data.push({
            ...raw,
            id: docSnap.id,
            analysis: normaliseAnalysis(raw.analysis),
          } as BodyScan);
        });
        data.sort(byNewestFirst);
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
        // Written through the same normaliser as the read, so a tab that is a
        // deploy behind cannot store a shape this app will not understand.
        analysis: normaliseAnalysis(input.analysis),
        userId: uid,
        createdAt: serverTimestamp(),
      });
      return ref.id;
    } catch (err) {
      console.error('Error saving body scan:', err);
      // Reported by the caller, in the athlete's own language.
      return null;
    }
  };

  /**
   * Deletes one scan, and says whether it worked.
   *
   * The outcome is reported by the caller rather than here: this hook has no
   * translation function, and an athlete reading the app in French should not
   * be told "Scan removed" in English.
   */
  const deleteScan = async (id: string): Promise<boolean> => {
    try {
      await deleteDoc(doc(db, 'bodyScans', id));
      return true;
    } catch (err) {
      console.error('Error deleting body scan:', err);
      return false;
    }
  };

  return { scans, isLoading, error, addScan, deleteScan, latest: scans[0] ?? null };
}
