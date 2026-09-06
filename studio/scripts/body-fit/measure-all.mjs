import { loadBody, deform, heightOf, sliceY, hullPerimeter, clustersByX } from './measure.mjs';

/**
 * The X gap that separates one body part from another, per measurement.
 *
 * It cannot be one number. At 2 cm a full chest beside a full upper arm merges
 * into a single cluster and the loop spans both, so those two need 1.5 cm; but
 * at 1.5 cm the waist fragments on its own soft-tissue concavity and reads
 * 38 cm instead of 77, and the hips and thighs stop resolving at all. The
 * threshold belongs to the level being measured, not to the mesh.
 */
const GAP = { chest: 0.015, waist: 0.02, hips: 0.02, upperArm: 0.015, thigh: 0.02 };
const cm = (pts) => hullPerimeter(pts) * 100;

/**
 * One horizontal slice, split along X.
 *
 * The A-pose hangs the arms clear of the ribs, so a naive hull at chest height
 * spans fingertip to fingertip — 270 cm. Splitting on the X gap separates the
 * torso (the cluster straddling the centreline) from each arm, and below the
 * crotch the same split separates the two legs.
 */
function parts(body, pos, y, gap) {
  const pts = sliceY(body, pos, y);
  const gs = clustersByX(pts, gap);
  if (!gs.length) return { n: 0 };
  const torso = gs.find(g => g[0][0] <= 0 && g[g.length - 1][0] >= 0);
  const outer = gs[gs.length - 1];
  return {
    n: gs.length,
    torso: torso && torso.length >= 8 ? cm(torso) : undefined,
    // Hips: a tape wraps pelvis and seat together, so the loop is the hull of
    // everything within 30 cm of the centreline. The A-pose hands reach into
    // this band at around 45 cm out — taking the raw slice read a 98 cm hip as
    // 271 — while the pelvis itself never passes 20 cm, so the cut is safe.
    // Not depending on cluster counts keeps hips measurable on a lean tall
    // body whose legs have not yet merged at that height.
    pelvis: (() => {
      const inner = pts.filter(([x]) => Math.abs(x) < 0.30);
      return inner.length >= 8 ? cm(inner) : undefined;
    })(),
    // The outermost cluster is an arm as long as it is clearly lateral. Not
    // requiring three clusters keeps it measurable when a heavy build merges
    // the torso with the arm on one side only.
    arm: outer && outer.length >= 8 && outer[0][0] > 0.02 ? cm(outer) : undefined,
    // Below the crotch nothing but legs is in the slice, and a thigh is only
    // measurable where the slice cleanly yields two of them: a fragmented
    // section reads ~40 cm for a 57 cm thigh.
    leg: gs.length === 2 && outer.length >= 8 ? cm(outer) : undefined,
  };
}

const PICK = {
  chest: (p) => (p.n >= 3 ? p.torso : undefined),
  waist: (p) => (p.n >= 3 ? p.torso : undefined),
  hips: (p) => p.pelvis,
  upperArm: (p) => p.arm,
  thigh: (p) => p.leg,
};

/**
 * Anatomical levels, chosen once per body frame — and only where they survive
 * the region's own morph at both extremes.
 *
 * Two failures drove that second condition. Searching for the extremum on
 * every deformed body let a degenerate slice win, so an athlete asking for a
 * 78 cm waist was fitted to a 47 cm one with Waist_Large at full. And a level
 * that measured the neutral thigh perfectly went undefined at Thigh_Large,
 * because the enlarged legs touched and the slice stopped yielding two
 * clusters. A landmark is only useful if it still reads across the range it is
 * meant to control.
 */
const BANDS = {
  // Below 0.745, where the arms come into contact with the ribs and the torso
  // cluster swallows them — that read a 100 cm chest as 148 cm.
  chest: { lo: 0.68, hi: 0.740, mode: 'max', probes: ['Chest_Small', 'Chest_Large', 'BodyWeight_Low', 'BodyWeight_High'] },
  // Natural waist: the narrowest torso level between ribs and pelvis.
  waist: { lo: 0.575, hi: 0.665, mode: 'min', probes: ['Waist_Small', 'Waist_Large', 'BodyWeight_Low', 'BodyWeight_High'] },
  // Widest level of the seat, where the legs have merged into one section.
  hips: { lo: 0.465, hi: 0.545, mode: 'max', probes: ['Hips_Small', 'Hips_Large', 'BodyWeight_Low', 'BodyWeight_High'] },
  // Mid upper-arm. The diagonal A-pose arm puts this just below the shoulder,
  // which is also where the targets act: at 0.68 the pair moved the loop by
  // 0.2 cm, at 0.74 by 4.9 cm.
  upperArm: { lo: 0.705, hi: 0.742, mode: 'max', probes: ['UpperArm_Small', 'UpperArm_Large', 'BodyWeight_Low', 'BodyWeight_High'] },
  // Upper thigh, below both the crotch and the hands.
  thigh: { lo: 0.420, hi: 0.470, mode: 'max', probes: ['Thigh_Small', 'Thigh_Large', 'BodyWeight_Low', 'BodyWeight_High'] },
};

export function findLandmarks(body, frameWeights = {}) {
  const framePos = deform(body, frameWeights);
  const H = heightOf(framePos);
  const probePos = {};
  const out = {};

  for (const [region, band] of Object.entries(BANDS)) {
    for (const probe of band.probes) {
      probePos[probe] ??= deform(body, { ...frameWeights, [probe]: 1 });
    }
    let best = null;
    for (let f = band.lo; f <= band.hi + 1e-9; f += 0.0025) {
      const v = PICK[region](parts(body, framePos, f * H, GAP[region]));
      if (v === undefined || !Number.isFinite(v) || v <= 5) continue;
      // The level has to keep working at both ends of the control it serves.
      const survives = band.probes.every((probe) => {
        const pp = probePos[probe];
        const pv = PICK[region](parts(body, pp, f * heightOf(pp), GAP[region]));
        return pv !== undefined && Number.isFinite(pv) && pv > 5;
      });
      if (!survives) continue;
      if (!best || (band.mode === 'max' ? v > best.v : v < best.v)) best = { v, f };
    }
    out[region] = best?.f;
  }
  return out;
}

/** Measure at fixed anatomical levels — landmarks never chase the morph. */
export function measureAt(body, weights, landmarks) {
  const pos = deform(body, weights);
  const H = heightOf(pos);
  const at = (f, region) => {
    if (f === undefined) return undefined;
    const v = PICK[region](parts(body, pos, f * H, GAP[region]));
    return Number.isFinite(v) && v > 5 ? v : undefined;
  };
  return {
    heightCm: H * 100,
    chestCm: at(landmarks.chest, 'chest'),
    waistCm: at(landmarks.waist, 'waist'),
    hipsCm: at(landmarks.hips, 'hips'),
    upperArmCm: at(landmarks.upperArm, 'upperArm'),
    thighCm: at(landmarks.thigh, 'thigh'),
  };
}
