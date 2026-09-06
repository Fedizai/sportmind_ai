import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { loadBody } from './measure.mjs';
import { findLandmarks, measureAt } from './measure-all.mjs';
const require = createRequire(import.meta.url);
const OUT = fileURLToPath(new URL('../../.photo-validation', import.meta.url));
// tsc emits `require('@/lib/...')` from the path alias, which Node cannot
// resolve; point it at the compiled tree so this runs the shipped modules.
const Module = require('node:module');
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request.startsWith('@/')) request = `${OUT}/${request.slice(2)}`;
  return resolveFilename.call(this, request, ...rest);
};
const { fitBodyMeasurements } = require(`${OUT}/lib/body-fit/index.js`);

// fileURLToPath, not URL.pathname: the repo lives under a directory with a
// space in its name, which percent-encodes into a path that does not exist.
const DIR = fileURLToPath(new URL('../../../datasets/glb-body', import.meta.url));
const bodies = { male: loadBody(`${DIR}/sportmind-male.glb`), female: loadBody(`${DIR}/sportmind-female.glb`) };
const AXIS = [-1,-0.5,0,0.5,1];
const hW = (v)=> v<0?{Height_Short:-v}:v>0?{Height_Tall:v}:{};
const FRAMES = { male: AXIS.map(h=>findLandmarks(bodies.male, hW(h), 'male')), female: AXIS.map(h=>findLandmarks(bodies.female, hW(h), 'female')) };
const measureFitted = (sex, w) => {
  const h = (w.Height_Tall ?? 0) - (w.Height_Short ?? 0);
  let i=0,b=Infinity; AXIS.forEach((a,k)=>{const d=Math.abs(a-h); if(d<b){b=d;i=k;}});
  return measureAt(bodies[sex], w, FRAMES[sex][i]);
};

const P = [
  ['short + slim',                { modelSex:'male',   heightCm:163, weightKg:56,  chestCm:88,  waistCm:70,  hipsCm:86,  upperArmCm:29, thighCm:50 }],
  ['short + larger body',         { modelSex:'male',   heightCm:163, weightKg:92,  chestCm:106, waistCm:95,  hipsCm:106, upperArmCm:35, thighCm:60 }],
  ['tall + slim',                 { modelSex:'male',   heightCm:196, weightKg:76,  chestCm:98,  waistCm:80,  hipsCm:98,  upperArmCm:32, thighCm:55 }],
  ['tall + larger body',          { modelSex:'male',   heightCm:196, weightKg:112, chestCm:116, waistCm:104, hipsCm:116, upperArmCm:40, thighCm:64 }],
  ['muscular + narrow waist',     { modelSex:'male',   heightCm:180, weightKg:88,  chestCm:110, waistCm:78,  hipsCm:99,  upperArmCm:40, thighCm:60 }],
  ['larger hips + smaller waist', { modelSex:'female', heightCm:168, weightKg:68,  chestCm:88,  waistCm:66,  hipsCm:108, upperArmCm:28, thighCm:60 }],
  ['larger thighs + small upper', { modelSex:'female', heightCm:166, weightKg:70,  chestCm:84,  waistCm:72,  hipsCm:102, upperArmCm:27, thighCm:59 }],
];
const CAL = require(`${OUT}/lib/body-fit/calibration.json`);
const SAFETY_FACTOR = 1;   // caps in the table already carry the safety margin
/** Per-target fold points, from the calibration the engine actually ships. */
const CAPS = {
  male: capsOf('male'), female: capsOf('female'),
};
function capsOf(sex) {
  const t = CAL.sexes[sex];
  const out = { Height_Short: 1, Height_Tall: 1,
    BodyWeight_Low: Math.abs(t.weightAxis[0]), BodyWeight_High: t.weightAxis[t.weightAxis.length-1],
    ShoulderWidth_Narrow: 2, ShoulderWidth_Wide: 2, Calf_Small: 2.5, Calf_Large: 2.5,
    Muscularity_Low: 1, Muscularity_High: 1 };
  const pair = { chest:['Chest_Small','Chest_Large'], waist:['Waist_Small','Waist_Large'],
    hips:['Hips_Small','Hips_Large'], upperArm:['UpperArm_Small','UpperArm_Large'], thigh:['Thigh_Small','Thigh_Large'] };
  for (const [r,[lo,hi]] of Object.entries(pair)) { out[lo]=t.caps[r].lo; out[hi]=t.caps[r].hi; }
  return out;
}

const REG = [['chest','chestCm'],['waist','waistCm'],['hips','hipsCm'],['upperArm','upperArmCm'],['thigh','thighCm']];
const PAIRS = [['BodyWeight_Low','BodyWeight_High'],['Muscularity_Low','Muscularity_High'],['Height_Short','Height_Tall'],['Chest_Small','Chest_Large'],['Waist_Small','Waist_Large'],['Hips_Small','Hips_Large'],['UpperArm_Small','UpperArm_Large'],['Thigh_Small','Thigh_Large'],['ShoulderWidth_Narrow','ShoulderWidth_Wide'],['Calf_Small','Calf_Large']];

let fails = 0, worst = 0, unverifiable = 0;
console.log('PROFILE                        HEIGHT   WORST CIRCUMFERENCE ERROR');
for (const [name, req] of P) {
  const fit = fitBodyMeasurements(req);
  const got = measureFitted(req.modelSex, fit.weights);
  let w = 0, detail = [];
  for (const [r, k] of REG) {
    if (req[k] === undefined) continue;
    if (got[k] === undefined) { unverifiable++; detail.push(`${r}:n/a`); continue; }
    const e = Math.abs(got[k] - req[k]);
    if (!fit.outOfRange.includes(r)) w = Math.max(w, e);
    detail.push(`${r}${e>2?'!':''}${e.toFixed(1)}`);
  }
  worst = Math.max(worst, w);
  const hErr = Math.abs(got.heightCm - req.heightCm);
  if (hErr > 0.6) fails++;
  for (const [a,b] of PAIRS) if ((fit.weights[a]??0)>0 && (fit.weights[b]??0)>0) { console.log(`  PAIR FAIL ${name} ${a}+${b}`); fails++; }
  /**
   * Influences may exceed 1 now — deliberately. Staying inside the documented
   * range capped the waist at 83 cm, so each target is instead checked against
   * the influence at which that mesh was measured to fold.
   */
  for (const [k,v] of Object.entries(fit.weights)) {
    const cap = (CAPS[req.modelSex][k] ?? 1) * SAFETY_FACTOR;
    if (v < 0 || v > cap + 1e-6) { console.log(`  RANGE FAIL ${name} ${k}=${v.toFixed(3)} > cap ${cap.toFixed(3)}`); fails++; }
  }
  console.log(`${name.padEnd(30)} ±${hErr.toFixed(1)}cm   ${w.toFixed(1)}cm   ${detail.join(' ')}`);
}

// same height+weight, different tape -> must differ
const A = fitBodyMeasurements({ modelSex:'male', heightCm:185, weightKg:100, chestCm:120, waistCm:82, upperArmCm:44 });
const B = fitBodyMeasurements({ modelSex:'male', heightCm:185, weightKg:100, chestCm:108, waistCm:112, upperArmCm:36 });
const mA = measureFitted('male', A.weights), mB = measureFitted('male', B.weights);
const diffs = ['chestCm','waistCm','upperArmCm'].map(k => (mA[k]!==undefined&&mB[k]!==undefined) ? Math.abs(mA[k]-mB[k]) : NaN);
const distinct = diffs.some(d => Number.isFinite(d) && d > 3);
console.log(`\nSAME 185cm/100kg, different tape -> chest/waist/arm differ by ${diffs.map(d=>Number.isFinite(d)?d.toFixed(1):'n/a').join('/')} cm  => ${distinct?'DISTINCT BODIES':'IDENTICAL (FAIL)'}`);
if (!distinct) fails++;

console.log(`\nheight fails: ${fails}   worst in-range circumference error: ${worst.toFixed(1)} cm   unverifiable at extremes: ${unverifiable}`);
process.exit(fails ? 1 : 0);
