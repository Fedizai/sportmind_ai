import type { MeasurementId, MeasurementUnitSystem } from '@/lib/body-zones';

/**
 * Body-composition + physique-score estimates for the Genetic Report.
 * These are heuristic estimates derived from the entered measurements and the
 * AI's body-fat figure — clearly labelled as estimates in the UI, not medical
 * readings.
 */

type Meas = Partial<Record<MeasurementId, number>>;

const toCm = (v: number, system: MeasurementUnitSystem) => (system === 'imperial' ? v * 2.54 : v);
const toKg = (v: number, system: MeasurementUnitSystem) => (system === 'imperial' ? v * 0.453592 : v);

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export interface Composition {
  bmi: number | null;
  fatPct: number;
  musclePct: number;
  waterPct: number;
  bonePct: number;
}

export function computeComposition(
  measurements: Meas,
  bodyFat: number,
  system: MeasurementUnitSystem
): Composition {
  const lean = Math.max(0, 100 - bodyFat);
  let bmi: number | null = null;
  if (measurements.height && measurements.weight) {
    const m = toCm(measurements.height, system) / 100;
    const kg = toKg(measurements.weight, system);
    if (m > 0) bmi = Math.round((kg / (m * m)) * 10) / 10;
  }
  return {
    bmi,
    fatPct: Math.round(bodyFat * 10) / 10,
    musclePct: Math.round(lean * 0.55),
    waterPct: Math.round(lean * 0.73),
    bonePct: Math.round(lean * 0.05 * 10) / 10,
  };
}

/** 0–100 physique score blending body-fat, V-taper and waist-to-hip. */
export function computePhysiqueScore(measurements: Meas, bodyFat: number): number {
  // Body-fat sub-score peaks around an athletic ~13%.
  const fatScore = clamp(100 - Math.abs(bodyFat - 13) * 4, 30, 100);

  let taperScore = 60;
  if (measurements.chest && measurements.waist && measurements.waist > 0) {
    const ratio = measurements.chest / measurements.waist;
    taperScore = clamp(((ratio - 1.1) / 0.4) * 70 + 30, 30, 100);
  }

  let whrScore = 60;
  if (measurements.waist && measurements.hips && measurements.hips > 0) {
    const whr = measurements.waist / measurements.hips;
    whrScore = clamp(((0.95 - whr) / 0.25) * 70 + 30, 30, 100);
  }

  const hasShape = Boolean(measurements.chest && measurements.waist);
  const score = hasShape
    ? 0.4 * fatScore + 0.35 * taperScore + 0.25 * whrScore
    : fatScore;
  return Math.round(clamp(score, 0, 100));
}

export function physiqueGrade(score: number): { label: string; tone: 'top' | 'good' | 'mid' | 'low' } {
  if (score >= 85) return { label: 'Elite', tone: 'top' };
  if (score >= 70) return { label: 'Advanced', tone: 'good' };
  if (score >= 50) return { label: 'Developing', tone: 'mid' };
  return { label: 'Foundation', tone: 'low' };
}
