/**
 * The shipping fitter, loaded into a plain Node harness.
 *
 * Every check in this directory runs the same compiled engine the app runs,
 * rather than a re-implementation of it — a rig that agrees with itself proves
 * nothing. `tsc` emits `require('@/lib/...')` from the path alias, which Node
 * cannot resolve, so the resolver is pointed at the compiled tree.
 *
 * Build it first:  npx tsc -p tsconfig.json --outDir .photo-validation --noEmit false
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../../.photo-validation', import.meta.url));
// tsc roots the output at the common directory of everything in the program,
// which is the project when tailwind.config.ts is included and `src` when it
// is not. Accept either rather than depending on which files exist.
export const OUT = fs.existsSync(`${root}/src/lib`) ? `${root}/src` : root;

if (!fs.existsSync(`${OUT}/lib/body-fit/index.js`)) {
  throw new Error('compile the engine first: npx tsc -p tsconfig.json --outDir .photo-validation --noEmit false');
}

const Module = require('node:module');
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request.startsWith('@/')) request = `${OUT}/${request.slice(2)}`;
  return resolveFilename.call(this, request, ...rest);
};

export const engine = require(`${OUT}/lib/body-fit/index.js`);
export const calibration = require(`${OUT}/lib/body-fit/calibration.json`);
export const abdomenProgram = require(`${OUT}/lib/body-fit/abdomen-program.json`);
export const { fitBodyMeasurements, impliedCircumferences } = engine;

/**
 * The plane the calibration would have measured this body at.
 *
 * The response tables are sampled at five stature frames, each with its own
 * landmark heights, and the fitter interpolates between two of them. A harness
 * that snapped to the nearest frame instead was reading a 200 cm waist as
 * 208.6 — not because the fit was wrong but because on an abdomen this size the
 * circumference falls about 11 cm for every centimetre the tape rides up, and
 * the two frames' waist planes are 1.6 cm apart. Measuring somewhere the
 * calibration never measured is not a check on the calibration.
 */
export function calibratedFrame(sex, weights) {
  const table = calibration.sexes[sex];
  const axis = calibration.axis;
  const h = (weights.Height_Tall ?? 0) - (weights.Height_Short ?? 0);
  if (h <= axis[0]) return table.frames[0];
  if (h >= axis[axis.length - 1]) return table.frames[axis.length - 1];
  for (let i = 1; i < axis.length; i++) {
    if (h <= axis[i]) {
      const t = (h - axis[i - 1]) / (axis[i] - axis[i - 1] || 1);
      const a = table.frames[i - 1], b = table.frames[i];
      const out = {};
      for (const k of Object.keys(a)) {
        out[k] = a[k] === undefined || b[k] === undefined ? (a[k] ?? b[k]) : a[k] + (b[k] - a[k]) * t;
      }
      return out;
    }
  }
  return table.frames[axis.indexOf(0)];
}
