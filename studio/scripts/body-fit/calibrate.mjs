import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadBody } from './measure.mjs';
import { findLandmarks, measureAt } from './measure-all.mjs';

// fileURLToPath, not URL.pathname: the repo lives under a directory with a
// space in its name, which percent-encodes into a path that does not exist.
const DIR = fileURLToPath(new URL('../../../datasets/glb-body', import.meta.url));
const AXIS = [-1, -0.5, 0, 0.5, 1];
const RESP = [-1, -0.75, -0.5, -0.25, 0.25, 0.5, 0.75, 1];
const MID = AXIS.indexOf(0);

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

const out = { generatedAt: new Date().toISOString(), axis: AXIS, responseWeights: RESP, sexes: {} };
let warnings = 0;
let repaired = 0;

/**
 * Fill a gap in a sampled response curve from its neighbours.
 *
 * A handful of intermediate weights land on a slice that fragments — the thigh
 * at half deflection on a tall male, where the legs touch just enough to stop
 * yielding two clean clusters. The endpoints either side measure fine and the
 * curve is monotone between them, so the sample is reconstructed rather than
 * written as a zero, which would put a step in the middle of the curve.
 */
function repairRow(values, weights) {
  const out = values.slice();
  for (let i = 0; i < out.length; i++) {
    if (out[i] !== null) continue;
    let a = i - 1; while (a >= 0 && out[a] === null) a--;
    let b = i + 1; while (b < out.length && out[b] === null) b++;
    if (a < 0 && b >= out.length) { out[i] = 0; continue; }
    if (a < 0) { out[i] = out[b] * (weights[i] / weights[b]); }
    else if (b >= out.length) { out[i] = out[a] * (weights[i] / weights[a]); }
    else {
      const t = (weights[i] - weights[a]) / (weights[b] - weights[a]);
      out[i] = out[a] + (out[b] - out[a]) * t;
    }
    repaired++;
  }
  return out;
}

for (const [sex, file] of [['male', 'sportmind-male.glb'], ['female', 'sportmind-female.glb']]) {
  const body = loadBody(`${DIR}/${file}`);

  // Landmarks per height frame: the height morph moves every level, which is
  // why the report says to re-evaluate the loops after setting height.
  const frames = AXIS.map((h) => findLandmarks(body, hW(h)));
  const M = (weights, frame = MID) => measureAt(body, weights, frames[frame]);
  const warn = (m, what) => KEYS.forEach((k) => {
    if (!Number.isFinite(m[k])) { warnings++; console.warn(`  !! ${sex} ${what} ${k} missing`); }
  });

  const neutral = M({});
  warn(neutral, 'neutral');
  const heights = AXIS.map((h, i) => r1(M(hW(h), i).heightCm));

  const baseline = AXIS.map((h, hi) => AXIS.map((w) => {
    const m = M({ ...hW(h), ...wW(w) }, hi);
    warn(m, `baseline h=${h} w=${w}`);
    return KEYS.map((k) => r1(m[k] ?? 0));
  }));

  const response = {};
  const coupling = {};
  for (const region of Object.keys(REGIONS)) {
    response[region] = AXIS.map((h, hi) => {
      const base = M(hW(h), hi);
      const raw = RESP.map((r) => {
        const m = M({ ...hW(h), ...rW(region, r) }, hi);
        const d = (m[REGIONS[region].key] ?? NaN) - (base[REGIONS[region].key] ?? NaN);
        return Number.isFinite(d) ? d : null;
      });
      return repairRow(raw, RESP).map(r1);
    });
    const lo = M(rW(region, -1));
    const hi = M(rW(region, 1));
    coupling[region] = {
      lo: KEYS.map((k) => r1((lo[k] ?? neutral[k]) - neutral[k])),
      hi: KEYS.map((k) => r1((hi[k] ?? neutral[k]) - neutral[k])),
    };
  }

  out.sexes[sex] = {
    mesh: body.name,
    neutral: { heightCm: r1(neutral.heightCm), ...Object.fromEntries(KEYS.map((k) => [k, r1(neutral[k] ?? 0)])) },
    landmarks: frames[MID],
    frames,
    heights, keys: KEYS, baseline, response, coupling,
  };
  console.log(`${sex}:`, out.sexes[sex].neutral, '\n  heights', heights);
}

out.warnings = warnings;
out.repairedSamples = repaired;
fs.writeFileSync('calibration.json', JSON.stringify(out, null, 1));
console.log(`\nwarnings: ${warnings}   repaired samples: ${repaired}   bytes: ${fs.statSync('calibration.json').size}`);
