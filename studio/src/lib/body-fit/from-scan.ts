import type { MeasurementId, MeasurementUnitSystem } from '@/lib/body-zones';
import type { BodyMeasurements, ModelSex } from './types';

/**
 * The scanner's form values, normalised into the one body profile.
 *
 * Both input modes come through here — the manual form fills the fields
 * directly, photo estimation fills the same fields — so there is a single
 * fitting engine and a single 3D system behind them rather than one per mode.
 */
export function toBodyMeasurements(
    values: Partial<Record<MeasurementId, number>>,
    system: MeasurementUnitSystem,
): BodyMeasurements {
    const toCm = (v?: number) => (v === undefined ? undefined : system === 'imperial' ? v * 2.54 : v);
    const toKg = (v?: number) => (v === undefined ? undefined : system === 'imperial' ? v * 0.453592 : v);

    return {
        // Falls back to the male mesh's own stature so a body still renders
        // before the athlete has typed a height.
        heightCm: toCm(values.height) ?? 178,
        weightKg: toKg(values.weight),
        chestCm: toCm(values.chest),
        waistCm: toCm(values.waist),
        hipsCm: toCm(values.hips),
        upperArmCm: toCm(values.arms),
        thighCm: toCm(values.thighs),
    };
}

/**
 * Which mesh to fit against.
 *
 * There are two bodies and there will not be a third: a rushed neutral mesh
 * would be the one low-quality body in a set of two good ones. "Neutre" uses
 * the male base, which carries no sex-specific chest targets — the female
 * chest morphs blend breast volume, so the male mesh is the less gendered of
 * the two to stand in for it.
 */
export function modelSexFor(sex: string | undefined | null): ModelSex {
    return sex === 'female' ? 'female' : 'male';
}
