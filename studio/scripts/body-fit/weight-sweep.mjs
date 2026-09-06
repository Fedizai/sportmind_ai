/**
 * The same athlete at four weights, measured on the real mesh.
 *
 * Weight used to drive one control, which saturated at a 93 cm waist and left
 * every heavy body looking merely stocky. Each row here should be clearly and
 * progressively larger than the one above it, and anything the mesh cannot
 * reach has to be reported rather than quietly clamped.
 */
import { fileURLToPath } from 'node:url';
import { loadBody } from './measure.mjs';
import { findLandmarks, measureAt } from './measure-all.mjs';

import { fitBodyMeasurements, impliedCircumferences, calibratedFrame } from './engine.mjs';

// The built meshes — the ones the scanner downloads.
const DIR = fileURLToPath(new URL('../../public/models', import.meta.url));
const AXIS = [-1,-0.5,0,0.5,1];
const hW = (v)=> v<0?{Height_Short:-v}:v>0?{Height_Tall:v}:{};
const K = { chest:'chestCm', waist:'waistCm', hips:'hipsCm', upperArm:'upperArmCm', thigh:'thighCm' };
const R = ['chest','waist','hips','upperArm','thigh'];

const bodies = { male: loadBody(`${DIR}/sportmind-male.glb`), female: loadBody(`${DIR}/sportmind-female.glb`) };
const frames = {
  male: AXIS.map(h=>findLandmarks(bodies.male, hW(h), 'male')),
  female: AXIS.map(h=>findLandmarks(bodies.female, hW(h), 'female')),
};
const frameFor = (w) => { const h=(w.Height_Tall??0)-(w.Height_Short??0); let i=0,b=Infinity;
  AXIS.forEach((a,k)=>{const d=Math.abs(a-h); if(d<b){b=d;i=k;}}); return i; };

for (const [sex, heightCm] of [['male',178],['female',165]]) {
  console.log(`\n================ ${sex.toUpperCase()} @ ${heightCm} cm — weight only, no tape ================`);
  console.log('   kg   BMI   region      anthropometric  mesh   short-by   morphs');
  let previous = null;
  for (const kg of [75, 100, 120, 150, 180]) {
    const fit = fitBodyMeasurements({ modelSex: sex, heightCm, weightKg: kg });
    const want = impliedCircumferences(sex, heightCm, kg);
    const got = measureAt(bodies[sex], fit.weights, calibratedFrame(sex, fit.weights));
    const bmi = kg / Math.pow(heightCm/100, 2);
    R.forEach((r, i) => {
      const g = got[K[r]];
      const shortBy = Number.isFinite(g) ? want[r] - g : NaN;
      const flag = Number.isFinite(shortBy) && shortBy > 3 ? `  SHORT ${shortBy.toFixed(0)}cm` : '';
      console.log(`  ${(i===0?String(kg):'').padStart(4)} ${(i===0?bmi.toFixed(1):'').padStart(5)}   ${r.padEnd(10)} ${want[r].toFixed(1).padStart(10)} ${(g??NaN).toFixed(1).padStart(9)}${flag}`);
    });
    // Only regions the rig can actually read are compared; a NaN means the
    // measurement was lost on a heavy build, not that the body failed to grow.
    const comparable = R.filter(r => Number.isFinite(got[K[r]]) && (previous === null || Number.isFinite(previous[K[r]])));
    const grew = previous === null ? true : comparable.every(r => got[K[r]] >= previous[K[r]] - 0.2);
    const unmeasured = R.filter(r => !Number.isFinite(got[K[r]]));
    console.log(`        -> ${grew ? 'larger than the row above' : 'DID NOT GROW'}` +
      `${unmeasured.length ? `   (unverifiable: ${unmeasured.join(', ')})` : ''}`);
    console.log(`           ${Object.entries(fit.weights).filter(([,v])=>v>0.01).map(([k,v])=>k.replace('_','.')+'='+v.toFixed(2)).join(' ')}`);
    previous = got;
  }
}
