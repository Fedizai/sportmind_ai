import type { MeasurementId, MeasurementUnitSystem } from '@/lib/body-zones';
import type { BodyMorph, BodySex } from '@/components/body-scan/three/human-geometry';

/**
 * Turns tape-measure input into the 3D avatar's shape parameters.
 *
 * Pure and dependency-free (types only) so the mapping can be reasoned about
 * and tested on its own, away from React and Three.js.
 */

/** Height the untouched base mesh represents, and its reference circumferences. */
export const REF_HEIGHT_CM = 178;
export const REF_CIRCUM = { chest: 102, waist: 84, hips: 99, arms: 35, thighs: 56 } as const;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * Reshape the holographic body toward the athlete's entered proportions.
 *
 * A circumference only means something relative to the frame carrying it — a
 * 102 cm chest is broad at 165 cm and slim at 195 cm — so every tape value is
 * compared against a reference scaled by the athlete's height. Height itself
 * stretches the figure, and height+weight give a BMI that thickens the soft
 * tissue wherever no tape measure was entered.
 */
export function deriveMorph(
  values: Partial<Record<MeasurementId, number>>,
  system: MeasurementUnitSystem,
  sex: BodySex
): BodyMorph {
  const toCm = (v?: number) => (v === undefined ? undefined : system === 'imperial' ? v * 2.54 : v);
  const toKg = (v?: number) => (v === undefined ? undefined : system === 'imperial' ? v * 0.453592 : v);

  const heightCm = toCm(values.height);
  const weightKg = toKg(values.weight);

  const rawHeight = heightCm ? heightCm / REF_HEIGHT_CM : 1;
  // Damped so a very tall athlete still frames inside the viewport.
  const heightScale = clamp(1 + (rawHeight - 1) * 0.55, 0.9, 1.1);
  const frame = clamp(rawHeight, 0.85, 1.18);

  const ratio = (raw: number | undefined, key: keyof typeof REF_CIRCUM) => {
    const cm = toCm(raw);
    if (cm === undefined || cm <= 0) return undefined;
    return clamp(cm / (REF_CIRCUM[key] * frame), 0.72, 1.45);
  };

  // Soft-tissue thickness where no circumference was given.
  let mass = 1;
  if (heightCm && weightKg && heightCm > 0) {
    const bmi = weightKg / Math.pow(heightCm / 100, 2);
    mass = clamp(Math.pow(bmi / 23, 0.62), 0.85, 1.3);
  }

  const chest = ratio(values.chest, 'chest');

  return {
    sex,
    heightScale,
    // No shoulder tape in the form: shoulders track the chest, damped.
    shoulders: chest === undefined ? 1 : 1 + (chest - 1) * 0.72,
    chest: chest ?? 1,
    waist: ratio(values.waist, 'waist') ?? 1,
    hips: ratio(values.hips, 'hips') ?? 1,
    arms: ratio(values.arms, 'arms') ?? 1,
    legs: ratio(values.thighs, 'thighs') ?? 1,
    mass,
  };
}
