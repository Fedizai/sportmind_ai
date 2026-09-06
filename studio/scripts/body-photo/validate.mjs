/**
 * Photo-measurement validation, in two clearly separated modes.
 *
 *   synthetic  — orthographic silhouettes rendered from the GLB at known
 *                measurements. Tests the geometry: height scaling, band
 *                statistics, torso/limb separation, the ellipse model. It does
 *                NOT test MediaPipe, camera perspective, clothing, hair,
 *                lighting or real segmentation noise, and a number from it is
 *                not evidence of real-world accuracy.
 *
 *   real       — front photo + side photo + tape measurements supplied by a
 *                human. This is the only mode whose MAE means anything about
 *                the product.
 *
 * Usage:
 *   node scripts/body-photo/validate.mjs synthetic
 *   node scripts/body-photo/validate.mjs real path/to/cases.json
 */

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import { loadBody, deform } from '../body-fit/measure.mjs';
import { findLandmarks, measureAt } from '../body-fit/measure-all.mjs';
import { rasterize, syntheticLandmarks } from './silhouette-render.mjs';

const require = createRequire(import.meta.url);
const DIR = fileURLToPath(new URL('../../../datasets/glb-body', import.meta.url));
const OUT = fileURLToPath(new URL('../../.photo-validation', import.meta.url));

/**
 * `paths` in tsconfig is a type-level alias — tsc still emits
 * `require('@/lib/...')`, which Node cannot resolve. Point it at the compiled
 * tree so the harness runs the same modules the app ships.
 */
const Module = require('node:module');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request.startsWith('@/')) request = `${OUT}/${request.slice(2)}`;
  return resolve.call(this, request, ...rest);
};

const { fitBodyMeasurements } = require(`${OUT}/lib/body-fit/index.js`);
const { measureFromPhotos } = require(`${OUT}/lib/body-photo/measure.js`);
const { silhouetteExtent } = require(`${OUT}/lib/body-photo/silhouette.js`);

const REGIONS = ['chest', 'waist', 'hips', 'upperArm', 'thigh'];
const TRUE_KEY = { chest: 'chestCm', waist: 'waistCm', hips: 'hipsCm', upperArm: 'upperArmCm', thigh: 'thighCm' };

const AXIS = [-1, -0.5, 0, 0.5, 1];
const hW = (v) => (v < 0 ? { Height_Short: -v } : v > 0 ? { Height_Tall: v } : {});

const PROFILES = [
  ['average male',        { modelSex: 'male',   heightCm: 178, weightKg: 76 }],
  ['short + slim',        { modelSex: 'male',   heightCm: 165, weightKg: 58, chestCm: 90,  waistCm: 72, hipsCm: 90,  upperArmCm: 29, thighCm: 51 }],
  ['tall + slim',         { modelSex: 'male',   heightCm: 194, weightKg: 78, chestCm: 99,  waistCm: 81, hipsCm: 100, upperArmCm: 33, thighCm: 56 }],
  ['muscular',            { modelSex: 'male',   heightCm: 180, weightKg: 88, chestCm: 108, waistCm: 79, hipsCm: 99,  upperArmCm: 39, thighCm: 60 }],
  ['heavier build',       { modelSex: 'male',   heightCm: 175, weightKg: 96, chestCm: 108, waistCm: 96, hipsCm: 107, upperArmCm: 36, thighCm: 61 }],
  ['average female',      { modelSex: 'female', heightCm: 165, weightKg: 60 }],
  ['female, wider hips',  { modelSex: 'female', heightCm: 168, weightKg: 68, chestCm: 89,  waistCm: 68, hipsCm: 106, upperArmCm: 28, thighCm: 59 }],
  ['female, taller',      { modelSex: 'female', heightCm: 178, weightKg: 66, chestCm: 90,  waistCm: 71, hipsCm: 101, upperArmCm: 29, thighCm: 57 }],
];

function frameFor(body, weights) {
  const h = (weights.Height_Tall ?? 0) - (weights.Height_Short ?? 0);
  let i = 0, best = Infinity;
  AXIS.forEach((a, k) => { const d = Math.abs(a - h); if (d < best) { best = d; i = k; } });
  return { index: i, weights: hW(AXIS[i]) };
}

function runSynthetic() {
  const bodies = { male: loadBody(`${DIR}/sportmind-male.glb`), female: loadBody(`${DIR}/sportmind-female.glb`) };
  const frames = {
    male: AXIS.map((h) => findLandmarks(bodies.male, hW(h))),
    female: AXIS.map((h) => findLandmarks(bodies.female, hW(h))),
  };

  const W = 512, H = 1024;
  const errors = Object.fromEntries(REGIONS.map((r) => [r, []]));
  const rows = [];

  for (const [name, req] of PROFILES) {
    const body = bodies[req.modelSex];
    const fit = fitBodyMeasurements(req);
    const positions = deform(body, fit.weights);

    // Ground truth: the same hull-perimeter rig the GLB calibration uses.
    const frame = frameFor(body, fit.weights);
    const truth = measureAt(body, fit.weights, frames[req.modelSex][frame.index]);

    const frontMask = rasterize(body, positions, { axis: 'front', width: W, height: H });
    const sideMask = rasterize(body, positions, { axis: 'side', width: W, height: H });
    const frontExtent = silhouetteExtent(frontMask);
    const sideExtent = silhouetteExtent(sideMask);

    const shot = (kind, mask, extent, rotationZ) => ({
      kind, mask,
      landmarks: syntheticLandmarks(mask, extent, { rotationZ }),
      poseCount: 1,
      // Rendered masks are perfectly sharp; a real photo is not, and the
      // harness does not pretend otherwise — it only says the geometry is fed
      // clean input here.
      blurVariance: 400,
    });

    const result = measureFromPhotos(
      shot('front', frontMask, frontExtent, 0),
      // A profile shot is a turned torso, which is what the side check expects.
      shot('side', sideMask, sideExtent, 0.9),
      truth.heightCm,
    );

    if (!result.ok) {
      rows.push({ name, failed: result.rejections.map((r) => `${r.code}(${r.shot})`).join(' ') });
      continue;
    }

    const row = { name, values: {} };
    for (const r of REGIONS) {
      const got = result.regions[r].valueCm;
      const exp = truth[TRUE_KEY[r]];
      if (!Number.isFinite(got) || !Number.isFinite(exp)) { row.values[r] = null; continue; }
      const err = got - exp;
      errors[r].push(Math.abs(err));
      row.values[r] = { got, exp, err, conf: result.regions[r].confidence };
    }
    row.confidence = result.overallConfidence;
    rows.push(row);
  }

  console.log('\n=== SYNTHETIC VALIDATION (rendered GLB silhouettes — NOT real-world accuracy) ===\n');
  console.log('profile                estimated vs true, cm      (chest / waist / hips / arm / thigh)');
  for (const row of rows) {
    if (row.failed) { console.log(`${row.name.padEnd(22)} REJECTED: ${row.failed}`); continue; }
    const cells = REGIONS.map((r) => {
      const v = row.values[r];
      return v ? `${v.got.toFixed(0)}/${v.exp.toFixed(0)}${v.err >= 0 ? '+' : ''}${v.err.toFixed(1)}`.padStart(15) : '           n/a';
    }).join(' ');
    console.log(`${row.name.padEnd(22)}${cells}  conf ${row.confidence.toFixed(2)}`);
  }

  /**
   * Shape factors, and an honest estimate of what they are worth.
   *
   * The ellipse under-reads every torso loop by a consistent amount, because a
   * real cross-section has flatter sides than an ellipse of the same width and
   * depth, so its perimeter is longer. That is a geometric property of body
   * shape, not a fit to human data, and it is what SHAPE_FACTOR exists for.
   *
   * Reporting the MAE after fitting a factor on the same profiles would be
   * circular, so each profile is scored with a factor derived from the *other*
   * profiles only. That leave-one-out number is the one worth quoting.
   */
  console.log('\nShape factor (true perimeter / ellipse), and leave-one-out error:');
  const factors = {};
  for (const r of REGIONS) {
    const pairs = rows.filter((x) => x.values?.[r]).map((x) => x.values[r]);
    if (pairs.length < 3) { console.log(`  ${r.padEnd(10)} too few samples`); continue; }
    const ratios = pairs.map((v) => v.exp / v.got);
    const all = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    factors[r] = all;

    let looErr = 0;
    for (let i = 0; i < pairs.length; i++) {
      const others = ratios.filter((_, k) => k !== i);
      const f = others.reduce((a, b) => a + b, 0) / others.length;
      looErr += Math.abs(pairs[i].got * f - pairs[i].exp);
    }
    const loo = looErr / pairs.length;
    const spread = Math.sqrt(ratios.reduce((a, b) => a + (b - all) ** 2, 0) / ratios.length);
    console.log(`  ${r.padEnd(10)} factor ${all.toFixed(3)} (sd ${spread.toFixed(3)})   leave-one-out MAE ${loo.toFixed(2)} cm   n=${pairs.length}`);
  }
  console.log('\n  SHAPE_FACTOR = ' + JSON.stringify(Object.fromEntries(
    Object.entries(factors).map(([k, v]) => [k, +v.toFixed(3)])), null, 0));

  console.log('\nMAE by region (synthetic, as shipped):');
  let worst = 0;
  for (const r of REGIONS) {
    const e = errors[r];
    if (!e.length) { console.log(`  ${r.padEnd(10)} no samples`); continue; }
    const mae = e.reduce((a, b) => a + b, 0) / e.length;
    const max = Math.max(...e);
    worst = Math.max(worst, mae);
    console.log(`  ${r.padEnd(10)} MAE ${mae.toFixed(2)} cm   max ${max.toFixed(2)} cm   n=${e.length}`);
  }
  console.log(`\nlabel: synthetic — geometry only. Says nothing about photographs of people.`);
  return worst;
}

/**
 * Real-human harness.
 *
 * cases.json is an array of:
 *   { "name": "...", "heightCm": 178, "weightKg": 76, "sex": "male",
 *     "front": "path/front.png", "side": "path/side.png",
 *     "truth": { "chest": 101, "waist": 84, "hips": 99, "upperArm": 33, "thigh": 57 } }
 *
 * The photographs are reduced to masks and landmarks in the browser and
 * exported as JSON — the images themselves never reach this script, and there
 * is no headless MediaPipe runtime for Node in this project.
 */
function runReal(casesPath) {
  if (!casesPath || !fs.existsSync(casesPath)) {
    console.log('\n=== REAL-HUMAN VALIDATION ===\n');
    console.log('No case file supplied, so there is no real-world MAE to report.');
    console.log('That is the honest state of this project: the pipeline has never');
    console.log('been measured against a tape.\n');
    console.log('To populate it:');
    console.log('  1. Open the scanner with ?validate=1 on the URL.');
    console.log('  2. Capture front and side; a case JSON downloads when measuring ends.');
    console.log('  3. Write cases.json with the tape measurements — see');
    console.log('     scripts/body-photo/README.md for the shape.');
    console.log('  4. node scripts/body-photo/validate.mjs real cases.json\n');
    return 0;
  }

  const cases = JSON.parse(fs.readFileSync(casesPath, 'utf8'));
  const errors = Object.fromEntries(REGIONS.map((r) => [r, []]));
  console.log('\n=== REAL-HUMAN VALIDATION ===\n');

  for (const c of cases) {
    const bundle = JSON.parse(fs.readFileSync(c.analysis, 'utf8'));
    const revive = (s) => ({ ...s, mask: { ...s.mask, data: Uint8Array.from(s.mask.data) } });
    const result = measureFromPhotos(revive(bundle.front), revive(bundle.side), c.heightCm);
    if (!result.ok) {
      console.log(`${String(c.name).padEnd(22)} REJECTED: ${result.rejections.map((r) => r.code).join(' ')}`);
      continue;
    }
    const cells = REGIONS.map((r) => {
      const got = result.regions[r].valueCm;
      const exp = c.truth?.[r];
      if (!Number.isFinite(got) || !Number.isFinite(exp)) return '           n/a';
      errors[r].push(Math.abs(got - exp));
      return `${got.toFixed(0)}/${exp.toFixed(0)}${got - exp >= 0 ? '+' : ''}${(got - exp).toFixed(1)}`.padStart(15);
    }).join(' ');
    console.log(`${String(c.name).padEnd(22)}${cells}`);
  }

  console.log('\nMAE by region (real photographs):');
  for (const r of REGIONS) {
    const e = errors[r];
    if (!e.length) { console.log(`  ${r.padEnd(10)} no samples`); continue; }
    console.log(`  ${r.padEnd(10)} MAE ${(e.reduce((a, b) => a + b, 0) / e.length).toFixed(2)} cm   n=${e.length}`);
  }
  return 0;
}

const mode = process.argv[2] || 'synthetic';
if (mode === 'real') runReal(process.argv[3]);
else runSynthetic();
