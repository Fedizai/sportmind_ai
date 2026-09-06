#!/usr/bin/env node
/**
 * Does the avatar actually have the waist the athlete typed?
 *
 *   node scripts/body-fit/belly-sweep.mjs
 *
 * Nothing here trusts the calibration table. Each profile is put through the
 * shipping fitter, the influences that come out are applied to the shipping
 * mesh, and the abdomen is then measured off that mesh — circumference at the
 * waist landmark, sagittal depth at the navel, and how far the belly stands in
 * front of the spine. The last three columns are the ones that say the belly is
 * a belly rather than a wider tube.
 */
import { fileURLToPath } from 'node:url';
import { loadBody, deform, hullPerimeter, heightOf } from './measure.mjs';
import { findLandmarks, measureAt } from './measure-all.mjs';
import { trunkMask, sliceTrunk, trunkProfile, abdomenLandmarks } from './abdomen-profile.mjs';
import { geometryFaults, armClearanceCm } from './geometry-check.mjs';

import { fitBodyMeasurements, calibratedFrame } from './engine.mjs';

const DIR = fileURLToPath(new URL('../../public/models', import.meta.url));
const bodies = { male: loadBody(`${DIR}/sportmind-male.glb`), female: loadBody(`${DIR}/sportmind-female.glb`) };
const AXIS = [-1, -0.5, 0, 0.5, 1];
const hW = (v) => (v < 0 ? { Height_Short: -v } : v > 0 ? { Height_Tall: v } : {});
const FRAMES = Object.fromEntries(Object.entries(bodies).map(([s, b]) => [s, AXIS.map((h) => findLandmarks(b, hW(h), s))]));
const ABD = Object.fromEntries(Object.entries(bodies).map(([s, b]) => {
  const mask = trunkMask(b);
  return [s, { mask, L: abdomenLandmarks(trunkProfile(b, { mask })) }];
}));

function abdomen(sex, weights) {
  const b = bodies[sex], { mask, L } = ABD[sex];
  const pos = deform(b, weights);
  const H = heightOf(pos);
  let yMin = Infinity;
  for (let i = 1; i < pos.length; i += 3) if (pos[i] < yMin) yMin = pos[i];
  const cut = (f) => sliceTrunk(b, pos, yMin + f * H, mask);
  const navel = cut(L.navel);
  const zs = navel.map((p) => p[1]), xs = navel.map((p) => p[0]);
  return {
    waistCm: hullPerimeter(cut(L.waist)) * 100,
    sagittalCm: (Math.max(...zs) - Math.min(...zs)) * 100,
    frontCm: Math.max(...zs) * 100,
    widthCm: (Math.max(...xs) - Math.min(...xs)) * 100,
  };
}

// The exact plane the calibration would have used at this stature, not the
// nearest sampled one — see calibratedFrame in engine.mjs.
const frameFor = (sex, w) => calibratedFrame(sex, w);

const WAISTS = [80, 100, 120, 140, 160, 180, 200];
let fails = 0;

for (const sex of ['male', 'female']) {
  for (const heightCm of [160, 178]) {
    console.log(`\n== ${sex} at ${heightCm} cm — waist requested vs measured on the mesh`);
    console.log('  asked   got   err   stage        width  depth  front   chest   hips    arm  thigh  folds  armGap');
    let previous = -Infinity;
    for (const waistCm of WAISTS) {
      const fit = fitBodyMeasurements({ modelSex: sex, heightCm, waistCm });
      const a = abdomen(sex, fit.weights);
      const m = measureAt(bodies[sex], fit.weights, frameFor(sex, fit.weights));
      const g = geometryFaults(bodies[sex], fit.weights);
      const c = armClearanceCm(bodies[sex], fit.weights, { lo: 0.48, hi: 0.72 });
      /**
       * Measured at the calibration's own waist landmark, not the abdomen
       * builder's. The two differ by 7 mm of stature and that is enough to put
       * a 2 cm bias on a 200 cm waist — an artefact of which plane the tape is
       * held at, not of the fit.
       */
      const got = m.waistCm ?? a.waistCm;
      const err = got - waistCm;
      const reached = fit.outOfRange.includes('waist') ? ' (model limit)' : '';
      if (got <= previous + 1) { console.log('    MONOTONIC FAIL — no bigger than the step below'); fails++; }
      previous = got;
      if (!reached && Math.abs(err) > 3) { console.log(`    ACCURACY FAIL ${err.toFixed(1)} cm`); fails++; }
      if (g.inverted > (sex === 'female' ? 2 : 0)) { console.log(`    FOLD FAIL ${g.inverted}`); fails++; }
      if (c.cm !== null && c.cm < 0) { console.log(`    ARM INTERSECTION ${c.cm.toFixed(1)} cm`); fails++; }
      console.log(
        `  ${String(waistCm).padStart(5)} ${got.toFixed(1).padStart(6)} ${err.toFixed(1).padStart(6)}` +
        `  ${fit.bellyStage.padEnd(11)} ${a.widthCm.toFixed(1).padStart(5)} ${a.sagittalCm.toFixed(1).padStart(6)} ${a.frontCm.toFixed(1).padStart(6)}` +
        ` ${(m.chestCm ?? NaN).toFixed(1).padStart(7)} ${(m.hipsCm ?? NaN).toFixed(1).padStart(6)} ${(m.upperArmCm ?? NaN).toFixed(1).padStart(6)} ${(m.thighCm ?? NaN).toFixed(1).padStart(6)}` +
        ` ${String(g.inverted).padStart(6)} ${(c.cm === null ? 'n/a' : c.cm.toFixed(1)).padStart(7)}${reached}`,
      );
    }
  }
}

console.log(`\nfailures: ${fails}`);
process.exit(fails ? 1 : 0);
