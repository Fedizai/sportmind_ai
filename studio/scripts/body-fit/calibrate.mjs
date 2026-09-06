import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadBody } from './measure.mjs';
import { findLandmarks, measureAt, usableCap, GEOMETRY_CAP, SAFETY } from './measure-all.mjs';

// fileURLToPath, not URL.pathname: the repo lives under a directory with a
// space in its name, which percent-encodes into a path that does not exist.
const DIR = fileURLToPath(new URL('../../../datasets/glb-body', import.meta.url));

const HEIGHT_AXIS = [-1, -0.5, 0, 0.5, 1];
const MID = HEIGHT_AXIS.indexOf(0);

const REGIONS = {
  chest:    { key: 'chestCm',    lo: 'Chest_Small',    hi: 'Chest_Large' },
  waist:    { key: 'waistCm',    lo: 'Waist_Small',    hi: 'Waist_Large' },
  hips:     { key: 'hipsCm',     lo: 'Hips_Small',     hi: 'Hips_Large' },
  upperArm: { key: 'upperArmCm', lo: 'UpperArm_Small', hi: 'UpperArm_Large' },
  thigh:    { key: 'thighCm',    lo: 'Thigh_Small',    hi: 'Thigh_Large' },
};
const KEYS = ['chestCm', 'waistCm', 'hipsCm', 'upperArmCm', 'thighCm'];

const hW = (v) => (v < 0 ? { Height_Short: -v } : v > 0 ? { Height_Tall: v } : {});
const wW = (v) => (v < 0 ? { BodyWeight_Low: -v } : v > 0 ? { BodyWeight_High: v } : {});
const rW = (r, v) => (v < 0 ? { [REGIONS[r].lo]: -v } : v > 0 ? { [REGIONS[r].hi]: v } : {});
const r1 = (n) => Math.round(n * 10) / 10;
const r3 = (n) => Math.round(n * 1000) / 1000;

/** Sample points from -lo to +hi, denser near zero where most bodies sit. */
function samples(lo, hi, perSide = 8) {
    const out = [];
    for (let i = perSide; i >= 1; i--) out.push(-r3(lo * Math.pow(i / perSide, 1.35)));
    out.push(0);
    for (let i = 1; i <= perSide; i++) out.push(r3(hi * Math.pow(i / perSide, 1.35)));
    return out;
}

const out = {
    generatedAt: new Date().toISOString(),
    axis: HEIGHT_AXIS,
    safety: SAFETY,
    note: 'Response weights may exceed 1: extrapolation is allowed up to the measured fold point of each target. See scripts/body-fit/README.md.',
    sexes: {},
};
let warnings = 0;
let repaired = 0;

/** Fill a gap in a sampled curve from its neighbours. */
function repairRow(values, weights) {
    const res = values.slice();
    for (let i = 0; i < res.length; i++) {
        if (res[i] !== null) continue;
        let a = i - 1; while (a >= 0 && res[a] === null) a--;
        let b = i + 1; while (b < res.length && res[b] === null) b++;
        if (a < 0 && b >= res.length) { res[i] = 0; continue; }
        if (a < 0) res[i] = res[b] * (weights[i] / (weights[b] || 1));
        else if (b >= res.length) res[i] = res[a] * (weights[i] / (weights[a] || 1));
        else {
            const t = (weights[i] - weights[a]) / (weights[b] - weights[a]);
            res[i] = res[a] + (res[b] - res[a]) * t;
        }
        repaired++;
    }
    return res;
}

for (const [sex, file] of [['male', 'sportmind-male.glb'], ['female', 'sportmind-female.glb']]) {
    const body = loadBody(`${DIR}/${file}`);
    const frames = HEIGHT_AXIS.map((h) => findLandmarks(body, hW(h), sex));
    const M = (weights, frame = MID) => measureAt(body, weights, frames[frame]);
    const neutral = M({});

    /**
     * How far each control may actually be driven.
     *
     * Two limits, and the lower one wins: the influence at which the surface
     * folds, and the influence past which the measurement rig can no longer
     * verify the result. A body nobody can measure cannot be shown to match
     * what the athlete typed.
     */
    const caps = {};
    for (const [region, spec] of Object.entries(REGIONS)) {
        const capOf = (target) => Math.min(
            usableCap(body, target, spec.key, frames[MID], GEOMETRY_CAP[sex][target]),
            GEOMETRY_CAP[sex][target] * SAFETY,
        );
        caps[region] = { lo: r3(capOf(spec.lo)), hi: r3(capOf(spec.hi)) };
    }
    /**
     * Body composition is limited by what stays measurable, not just by what
     * stays sound.
     *
     * A very heavy build brings the arms into contact with the ribs, and the
     * torso loop then spans from one arm to the other: at influence 2.55 the
     * chest read 259 cm. Filling that gap by extrapolation made it worse — the
     * repair scales a delta by its weight ratio, which is meaningless applied
     * to an absolute measurement, and it wrote that 259 straight into the
     * table. The fitter then believed a 120 cm chest was reachable by getting
     * heavier and then *shrinking* the chest to come back down. The axis now
     * stops where every region is still readable.
     */
    const weightMeasurable = (sign) => {
        const geo = GEOMETRY_CAP[sex][sign > 0 ? 'BodyWeight_High' : 'BodyWeight_Low'] * SAFETY;
        let last = 0;
        for (let w = 0.25; w <= geo + 1e-9; w += 0.25) {
            const m = M(wW(sign * w));
            if (!KEYS.every((k) => Number.isFinite(m[k]))) break;
            last = w;
        }
        return r3(last);
    };
    const weightCap = { lo: weightMeasurable(-1), hi: weightMeasurable(1) };

    const weightAxis = samples(weightCap.lo, weightCap.hi, 2);

    /**
     * Baseline over height x body composition, with gaps filled rather than
     * zeroed. A very heavy build brings the arm into contact with the ribs and
     * the rig stops resolving it; writing 0 there would put a cliff in the
     * middle of the table and make a heavy athlete's arm collapse to nothing.
     */
    const baseline = HEIGHT_AXIS.map((h, hi) => {
        const rows = weightAxis.map((w) => {
            const m = M({ ...hW(h), ...wW(w) }, hi);
            return KEYS.map((k) => (Number.isFinite(m[k]) ? m[k] : null));
        });
        for (let k = 0; k < KEYS.length; k++) {
            const column = rows.map((r) => r[k]);
            if (column.every((v) => v === null)) {
                warnings++;
                console.warn(`  !! ${sex} baseline h=${h} ${KEYS[k]} — no value at any weight`);
                continue;
            }
            // Hold the nearest valid reading rather than extrapolating: these
            // are absolute measurements, and scaling one by a weight ratio is
            // how a 101 cm chest became 259.
            let lastGood = null;
            for (let i = 0; i < column.length; i++) {
                if (column[i] !== null) lastGood = column[i];
                else if (lastGood !== null) column[i] = lastGood;
            }
            for (let i = column.length - 1; i >= 0; i--) {
                if (column[i] !== null) lastGood = column[i];
                else if (lastGood !== null) { column[i] = lastGood; repaired++; }
            }
            rows.forEach((r, i) => { r[k] = column[i]; });
        }
        return rows.map((r) => r.map(r1));
    });

    const responseWeights = {};
    const response = {};
    const coupling = {};
    for (const [region, spec] of Object.entries(REGIONS)) {
        const pts = samples(caps[region].lo, caps[region].hi);
        responseWeights[region] = pts;
        response[region] = HEIGHT_AXIS.map((h, hi) => {
            const base = M(hW(h), hi)[spec.key];
            const raw = pts.map((r) => {
                if (r === 0) return 0;
                const v = M({ ...hW(h), ...rW(region, r) }, hi)[spec.key];
                return Number.isFinite(v) && Number.isFinite(base) ? v - base : null;
            });
            return repairRow(raw, pts).map(r1);
        });
        const lo = M(rW(region, -caps[region].lo));
        const hi2 = M(rW(region, caps[region].hi));
        coupling[region] = {
            lo: KEYS.map((k) => r1((lo[k] ?? neutral[k]) - neutral[k])),
            hi: KEYS.map((k) => r1((hi2[k] ?? neutral[k]) - neutral[k])),
            // Couplings were measured at the caps, so they scale by that.
            atLo: caps[region].lo, atHi: caps[region].hi,
        };
    }

    out.sexes[sex] = {
        mesh: body.name,
        neutral: { heightCm: r1(neutral.heightCm), ...Object.fromEntries(KEYS.map((k) => [k, r1(neutral[k] ?? 0)])) },
        landmarks: frames[MID],
        frames,
        heights: HEIGHT_AXIS.map((h, i) => r1(M(hW(h), i).heightCm)),
        keys: KEYS,
        caps, weightCap, weightAxis, responseWeights,
        baseline, response, coupling,
    };

    console.log(`${sex}: neutral`, out.sexes[sex].neutral);
    for (const r of Object.keys(REGIONS)) {
        const lo = M(rW(r, -caps[r].lo))[REGIONS[r].key];
        const hi = M(rW(r, caps[r].hi))[REGIONS[r].key];
        console.log(`  ${r.padEnd(9)} ${lo?.toFixed(1).padStart(6)} .. ${hi?.toFixed(1).padStart(6)} cm  (w -${caps[r].lo} .. +${caps[r].hi})`);
    }
}

out.warnings = warnings;
out.repairedSamples = repaired;
fs.writeFileSync(fileURLToPath(new URL('../../src/lib/body-fit/calibration.json', import.meta.url)), JSON.stringify(out, null, 1));
console.log(`\nwarnings: ${warnings}   repaired: ${repaired}`);
