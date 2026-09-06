import calibration from './calibration.json';
import {
    FIT_REGIONS, type BodyMeasurements, type FitRegion, type FitResult,
    type ModelSex, type MorphName, type MorphWeights,
} from './types';

export * from './types';

/**
 * Turning tape measurements into morph influences.
 *
 * The GLBs carry no kg-to-morph conversion and no measurement landmarks — the
 * report is explicit that `Chest_Large = 0.5` does not mean 108 cm. So the
 * numbers in `calibration.json` were *measured off these meshes*, offline:
 * each state is deformed, sliced at a horizontal plane, the cross-section is
 * split along X to separate torso from arms, and the convex-hull perimeter of
 * the right cluster is the circumference — a tape measure cannot enter a
 * concavity, so the hull is the anatomically correct model. Landmarks are
 * found by searching for the extremum on the deformed mesh (waist = the local
 * minimum, chest/hips/arm/thigh = local maxima) rather than at fixed heights,
 * because the height morph moves them.
 *
 * That rig reproduces the report's documented heights to 0.05 cm, which is the
 * evidence that it measures what the asset authors measured.
 *
 * Everything expensive happens offline. At runtime this is table lookup and
 * interpolation, so refitting is cheap enough to run on every keystroke.
 */

type SexTable = (typeof calibration)['sexes']['male'];

const TABLE: Record<ModelSex, SexTable> = {
    male: calibration.sexes.male,
    female: calibration.sexes.female as SexTable,
};

const AXIS = calibration.axis;
/** The morph weights the response curves were sampled at, with 0 inserted. */
const RESPONSE_W = [...calibration.responseWeights.slice(0, 4), 0, ...calibration.responseWeights.slice(4)];

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Region → the opposing pair it drives. Only one member is ever non-zero. */
const REGION_MORPHS: Record<FitRegion, { low: MorphName; high: MorphName }> = {
    chest: { low: 'Chest_Small', high: 'Chest_Large' },
    waist: { low: 'Waist_Small', high: 'Waist_Large' },
    hips: { low: 'Hips_Small', high: 'Hips_Large' },
    upperArm: { low: 'UpperArm_Small', high: 'UpperArm_Large' },
    thigh: { low: 'Thigh_Small', high: 'Thigh_Large' },
};

/**
 * Where a height sits on the calibration's height axis.
 *
 * The sampled heights are the mesh's own: 159.1 / 168.6 / 178 / 192.9 / 207.8
 * for the male. Interpolating between them rather than assuming a linear
 * kg-style scale is the whole point — Height_Tall is authored asymmetrically,
 * adding 29.8 cm where Height_Short removes 18.9.
 */
function heightAxisPosition(sex: ModelSex, heightCm: number): number {
    const heights = TABLE[sex].heights;
    if (heightCm <= heights[0]) return AXIS[0];
    if (heightCm >= heights[heights.length - 1]) return AXIS[AXIS.length - 1];
    for (let i = 1; i < heights.length; i++) {
        if (heightCm <= heights[i]) {
            const t = (heightCm - heights[i - 1]) / (heights[i] - heights[i - 1] || 1);
            return AXIS[i - 1] + t * (AXIS[i] - AXIS[i - 1]);
        }
    }
    return 0;
}

/**
 * BMI to the body-composition axis.
 *
 * Documented approximation, not a measured one: the meshes carry no weight
 * calibration at all, so this maps a lean BMI to the low target and an obese
 * BMI to the high one and interpolates. It is only ever a starting point —
 * every circumference the athlete actually measured overrides it below.
 */
const BMI_ANCHORS = [
    { bmi: 17, axis: -1 },
    { bmi: 21, axis: -0.35 },
    { bmi: 23.5, axis: 0 },
    { bmi: 28, axis: 0.5 },
    { bmi: 34, axis: 1 },
];

function bodyCompositionAxis(heightCm: number, weightKg?: number): number {
    if (!weightKg || !heightCm) return 0;
    const bmi = weightKg / Math.pow(heightCm / 100, 2);
    if (bmi <= BMI_ANCHORS[0].bmi) return -1;
    const last = BMI_ANCHORS[BMI_ANCHORS.length - 1];
    if (bmi >= last.bmi) return 1;
    for (let i = 1; i < BMI_ANCHORS.length; i++) {
        if (bmi <= BMI_ANCHORS[i].bmi) {
            const a = BMI_ANCHORS[i - 1], b = BMI_ANCHORS[i];
            const t = (bmi - a.bmi) / (b.bmi - a.bmi);
            return a.axis + t * (b.axis - a.axis);
        }
    }
    return 0;
}

/** Position on a sampled axis, as a fractional index. */
function axisIndex(value: number): { i: number; j: number; t: number } {
    const v = clamp(value, AXIS[0], AXIS[AXIS.length - 1]);
    for (let i = 1; i < AXIS.length; i++) {
        if (v <= AXIS[i]) {
            const t = (v - AXIS[i - 1]) / (AXIS[i] - AXIS[i - 1]);
            return { i: i - 1, j: i, t };
        }
    }
    return { i: AXIS.length - 1, j: AXIS.length - 1, t: 0 };
}

/** Circumferences of the un-regionalised body at this height and composition. */
function baselineAt(sex: ModelSex, hAxis: number, wAxis: number): Record<FitRegion, number> {
    const h = axisIndex(hAxis);
    const w = axisIndex(wAxis);
    const grid = TABLE[sex].baseline;
    const out = {} as Record<FitRegion, number>;
    FIT_REGIONS.forEach((region, k) => {
        const v00 = grid[h.i][w.i][k], v01 = grid[h.i][w.j][k];
        const v10 = grid[h.j][w.i][k], v11 = grid[h.j][w.j][k];
        const a = v00 + (v01 - v00) * w.t;
        const b = v10 + (v11 - v10) * w.t;
        out[region] = a + (b - a) * h.t;
    });
    return out;
}

/** How far this region's morph moves its own measurement, at this height. */
function responseCurve(sex: ModelSex, region: FitRegion, hAxis: number): number[] {
    const h = axisIndex(hAxis);
    const rows = (TABLE[sex].response as Record<string, number[][]>)[region];
    const lo = rows[h.i], hi = rows[h.j];
    // The sampled rows have no entry for weight 0; it is 0 cm by definition.
    const withZero = (row: number[]) => [...row.slice(0, 4), 0, ...row.slice(4)];
    const a = withZero(lo), b = withZero(hi);
    return a.map((v, i) => v + (b[i] - v) * h.t);
}

/**
 * Smallest morph weight whose response reaches `deltaCm`.
 *
 * The curve is sampled, so this walks its segments and interpolates. Outside
 * the sampled range the answer is the endpoint — never an extrapolation past
 * ±1, which the report warns is not certified.
 */
function invertResponse(curve: number[], deltaCm: number): { weight: number; reachable: boolean } {
    const first = curve[0], last = curve[curve.length - 1];
    if (deltaCm <= first) return { weight: RESPONSE_W[0], reachable: deltaCm >= first - 0.05 };
    if (deltaCm >= last) return { weight: RESPONSE_W[RESPONSE_W.length - 1], reachable: deltaCm <= last + 0.05 };

    for (let i = 1; i < curve.length; i++) {
        const lo = curve[i - 1], hi = curve[i];
        if (deltaCm >= Math.min(lo, hi) && deltaCm <= Math.max(lo, hi)) {
            const span = hi - lo;
            const t = Math.abs(span) < 1e-6 ? 0 : (deltaCm - lo) / span;
            return { weight: RESPONSE_W[i - 1] + t * (RESPONSE_W[i] - RESPONSE_W[i - 1]), reachable: true };
        }
    }
    return { weight: 0, reachable: false };
}

/** Side effects one region's morph has on the other four, at full deflection. */
function couplingFor(sex: ModelSex, region: FitRegion, weight: number): Record<FitRegion, number> {
    const c = (TABLE[sex].coupling as Record<string, { lo: number[]; hi: number[] }>)[region];
    const row = weight < 0 ? c.lo : c.hi;
    const scale = Math.abs(weight);
    const out = {} as Record<FitRegion, number>;
    FIT_REGIONS.forEach((r, k) => { out[r] = row[k] * scale; });
    return out;
}

/** What the calibration says a given set of influences will measure. */
function predictAll(
    sex: ModelSex,
    hAxis: number,
    wAxis: number,
    regionWeight: Record<FitRegion, number>,
    curves: Record<FitRegion, number[]>,
): FitResult['predicted'] {
    const baseline = baselineAt(sex, hAxis, wAxis);
    const out = { heightCm: 0 } as FitResult['predicted'];
    for (const region of FIT_REGIONS) {
        let value = baseline[region];
        for (const other of FIT_REGIONS) {
            if (!regionWeight[other]) continue;
            if (other === region) {
                const curve = curves[region];
                const w = regionWeight[region];
                for (let i = 1; i < RESPONSE_W.length; i++) {
                    if (w <= RESPONSE_W[i]) {
                        const t = (w - RESPONSE_W[i - 1]) / (RESPONSE_W[i] - RESPONSE_W[i - 1] || 1);
                        value += curve[i - 1] + t * (curve[i] - curve[i - 1]);
                        break;
                    }
                }
            } else {
                value += couplingFor(sex, other, regionWeight[other])[region];
            }
        }
        out[region] = value;
    }
    return out;
}

export interface FitInput extends BodyMeasurements {
    modelSex: ModelSex;
}

/**
 * Fit one athlete's measurements to morph influences.
 *
 * Order matters and follows the report: the height morph moves every landmark,
 * so it is solved first and every circumference is then read against the
 * baseline *at that height*. Weight sets a starting fullness, and each measured
 * circumference then overrides it locally — which is why two athletes at
 * 185 cm / 100 kg, one with a 120 cm chest and 82 cm waist and the other with
 * 108 and 112, do not come out as the same body.
 */
export function fitBodyMeasurements(input: FitInput): FitResult {
    const sex = input.modelSex;
    const hAxis = heightAxisPosition(sex, input.heightCm);
    const prior = bodyCompositionAxis(input.heightCm, input.weightKg);

    const requested: Partial<Record<FitRegion, number>> = {
        chest: input.chestCm, waist: input.waistCm, hips: input.hipsCm,
        upperArm: input.upperArmCm, thigh: input.thighCm,
    };
    const measured = FIT_REGIONS.filter((r) => {
        const v = requested[r];
        return v !== undefined && Number.isFinite(v) && v > 0;
    });

    const curves = Object.fromEntries(
        FIT_REGIONS.map((r) => [r, responseCurve(sex, r, hAxis)])
    ) as Record<FitRegion, number[]>;

    /** Solve the five regions against a fixed height and composition. */
    const solve = (wAxis: number) => {
        const baseline = baselineAt(sex, hAxis, wAxis);
        const regionWeight = {} as Record<FitRegion, number>;
        FIT_REGIONS.forEach((r) => { regionWeight[r] = 0; });
        const unreached: FitRegion[] = [];

        /**
         * Hips and thigh move each other — Hips_Large adds 3.5 cm to the thigh
         * — so a single pass leaves both wrong. The measured couplings are
         * small, so three passes settle it.
         */
        for (let pass = 0; pass < 3; pass++) {
            unreached.length = 0;
            for (const region of measured) {
                const target = requested[region]!;
                let spill = 0;
                for (const other of FIT_REGIONS) {
                    if (other === region || !regionWeight[other]) continue;
                    spill += couplingFor(sex, other, regionWeight[other])[region];
                }
                const needed = target - baseline[region] - spill;
                const { weight, reachable } = invertResponse(curves[region], needed);
                regionWeight[region] = clamp(weight, -1, 1);
                if (!reachable) unreached.push(region);
            }
        }

        const predicted = predictAll(sex, hAxis, wAxis, regionWeight, curves);
        const error = measured.reduce((sum, r) => sum + Math.abs(predicted[r] - requested[r]!), 0);
        return { wAxis, baseline, regionWeight, unreached, predicted, error };
    };

    /**
     * Weight is a prior, and the tape wins.
     *
     * A 112 cm waist is past what Waist_Large alone can reach, so leaving the
     * composition axis pinned to the BMI made that athlete unreachable no
     * matter what. Scanning the axis lets a saturated region recruit overall
     * fullness to close the gap. The small penalty keeps the answer near the
     * athlete's actual BMI when the measurements do not care either way — so
     * the prior still decides what the tape leaves open, and never overrides
     * what it does not.
     */
    let best = solve(prior);
    if (measured.length > 0) {
        for (let w = -1; w <= 1.0001; w += 0.1) {
            const candidate = solve(clamp(w, -1, 1));
            const penalty = Math.abs(candidate.wAxis - prior) * 1.5;
            const bestPenalty = Math.abs(best.wAxis - prior) * 1.5;
            if (candidate.error + penalty < best.error + bestPenalty - 1e-9) best = candidate;
        }
    }

    const { wAxis, regionWeight, unreached, predicted } = best;

    // ---- assemble the influences, one member of each pair at a time ----
    const weights: MorphWeights = {};
    const setPair = (low: MorphName, high: MorphName, value: number) => {
        const v = clamp(value, -1, 1);
        if (v < -0.001) weights[low] = clamp(-v, 0, 1);
        else if (v > 0.001) weights[high] = clamp(v, 0, 1);
    };

    setPair('Height_Short', 'Height_Tall', hAxis);
    setPair('BodyWeight_Low', 'BodyWeight_High', wAxis);
    for (const region of FIT_REGIONS) {
        const { low, high } = REGION_MORPHS[region];
        setPair(low, high, regionWeight[region]);
    }

    /**
     * Shoulders, calves and muscularity have no tape field in the scanner, so
     * they are derived rather than left flat — a 120 cm chest on narrow
     * shoulders reads as wrong. Damped, because they are inferences.
     */
    setPair('ShoulderWidth_Narrow', 'ShoulderWidth_Wide', regionWeight.chest * 0.5);
    setPair('Calf_Small', 'Calf_Large', regionWeight.thigh * 0.6);

    // A chest that outruns the waist reads as built rather than heavy. Only
    // inferred when both were actually measured.
    if (requested.chest && requested.waist) {
        const neutral = TABLE[sex].neutral;
        const ratio = requested.chest / requested.waist;
        const neutralRatio = neutral.chestCm / neutral.waistCm;
        setPair('Muscularity_Low', 'Muscularity_High', clamp((ratio / neutralRatio - 1) * 2.2, -0.6, 0.8));
    }

    const heights = TABLE[sex].heights;
    const hi = axisIndex(hAxis);
    predicted.heightCm = heights[hi.i] + (heights[hi.j] - heights[hi.i]) * hi.t;

    const outOfRange = unreached.slice();

    const residuals: Partial<Record<FitRegion, number>> = {};
    for (const region of FIT_REGIONS) {
        const target = requested[region];
        if (target !== undefined && Number.isFinite(target) && target > 0) {
            residuals[region] = predicted[region] - target;
        }
    }

    return { weights, predicted, residuals, outOfRange };
}

/**
 * The anatomical levels the calibration measured, as a fraction of body
 * height, so the viewer can draw its rings exactly where the tape was read
 * rather than at decorative heights.
 */
export function landmarksFor(sex: ModelSex): Partial<Record<FitRegion, number>> {
    return TABLE[sex].landmarks as Partial<Record<FitRegion, number>>;
}

/** Neutral body of the untouched mesh — the numbers every fit starts from. */
export function neutralBody(sex: ModelSex) {
    return TABLE[sex].neutral;
}

/** Height range the mesh can actually reach, in cm. */
export function heightRange(sex: ModelSex): [number, number] {
    const h = TABLE[sex].heights;
    return [h[0], h[h.length - 1]];
}
