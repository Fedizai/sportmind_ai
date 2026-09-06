/**
 * Does every field visibly move its own region, across realistic extremes?
 *
 * Each measurement is swept on its own while the others stay neutral. The
 * fitted influences are applied to the real mesh and measured back, so the
 * column headed "mesh" is what the avatar actually is, not what the fitter
 * hoped for.
 */
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { loadBody } from './measure.mjs';
import { findLandmarks, measureAt } from './measure-all.mjs';

const require = createRequire(import.meta.url);
const OUT = fileURLToPath(new URL('../../.photo-validation', import.meta.url));
const Module = require('node:module');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request.startsWith('@/')) request = `${OUT}/${request.slice(2)}`;
  return resolve.call(this, request, ...rest);
};
const { fitBodyMeasurements } = require(`${OUT}/lib/body-fit/index.js`);

const DIR = fileURLToPath(new URL('../../../datasets/glb-body', import.meta.url));
const AXIS = [-1, -0.5, 0, 0.5, 1];
const hW = (v) => (v < 0 ? { Height_Short: -v } : v > 0 ? { Height_Tall: v } : {});
const K = { chest: 'chestCm', waist: 'waistCm', hips: 'hipsCm', upperArm: 'upperArmCm', thigh: 'thighCm' };
const FIELD = { chest: 'chestCm', waist: 'waistCm', hips: 'hipsCm', upperArm: 'upperArmCm', thigh: 'thighCm' };

const SWEEPS = {
  chest:    [70, 80, 90, 100, 110, 120, 130, 150],
  waist:    [55, 65, 75, 85, 95, 110, 130, 150],
  hips:     [70, 85, 95, 105, 120, 140, 160, 200],
  upperArm: [20, 25, 30, 35, 40, 45, 55, 70],
  thigh:    [40, 50, 60, 70, 80, 90, 110, 130],
};

const bodies = { male: loadBody(`${DIR}/sportmind-male.glb`), female: loadBody(`${DIR}/sportmind-female.glb`) };
const frames = {
  male: AXIS.map((h) => findLandmarks(bodies.male, hW(h), 'male')),
  female: AXIS.map((h) => findLandmarks(bodies.female, hW(h), 'female')),
};
const frameFor = (w) => {
  const h = (w.Height_Tall ?? 0) - (w.Height_Short ?? 0);
  let i = 0, best = Infinity;
  AXIS.forEach((a, k) => { const d = Math.abs(a - h); if (d < best) { best = d; i = k; } });
  return i;
};

let failures = 0;
for (const sex of ['male', 'female']) {
  const heightCm = sex === 'male' ? 178 : 165;
  console.log(`\n================ ${sex.toUpperCase()} @ ${heightCm} cm ================`);
  for (const region of Object.keys(SWEEPS)) {
    console.log(`\n  ${region}`);
    console.log('    asked    mesh     diff   influence            verdict');
    let previous = null;
    for (const asked of SWEEPS[region]) {
      const fit = fitBodyMeasurements({ modelSex: sex, heightCm, weightKg: 75, [FIELD[region]]: asked });
      const got = measureAt(bodies[sex], fit.weights, frames[sex][frameFor(fit.weights)])[K[region]];
      const pair = Object.entries(fit.weights)
        .filter(([k]) => k.toLowerCase().startsWith(region.toLowerCase().replace('upperarm', 'upperarm')))
        .map(([k, v]) => `${k.split('_')[1]}=${v.toFixed(2)}`).join(' ') || '-';
      const out = fit.outOfRange.includes(region);
      const moved = previous === null || Math.abs(got - previous) > 0.4 || out;
      if (!moved) failures++;
      const claimed = fit.predicted[region];
      const lie = Math.abs(claimed - got) > 1.5;
      console.log(`    ${String(asked).padStart(5)} ${(got ?? NaN).toFixed(1).padStart(8)} ${(got - asked >= 0 ? '+' : '') + (got - asked).toFixed(1).padStart(6)}   ${pair.padEnd(20)} ${out ? 'AT LIMIT' : moved ? 'moves' : 'STUCK'}${lie ? `  TABLE SAYS ${claimed.toFixed(1)}` : ''}`);
      previous = got;
    }
  }
}
console.log(`\nstuck steps (a change in the field that did not change the mesh): ${failures}`);
