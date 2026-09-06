import { loadBody, deform, heightOf, sliceY, hullPerimeter, clustersByX } from './measure.mjs';
import { trunkMask, sliceTrunk } from './abdomen-profile.mjs';
import { bellyProgram, ABDOMEN_MORPHS, PROGRAM_MAX } from './abdomen-morphs.mjs';

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
    /**
     * One thigh, taken as everything on the athlete's left of the centreline.
     *
     * Clustering on gaps only works while the legs are apart. Enlarge them and
     * they touch, the runs merge or shatter, and the measurement disappeared
     * entirely past about 1.5 — which capped the thigh at 60 cm while the mesh
     * itself stays sound out to 6. Two thighs in contact meet at the
     * centreline, so a half-plane cut separates them whether they touch or not,
     * and the range opens up to 42–87 cm.
     */
    leg: (() => {
      const half = pts.filter(([x]) => x > 0.004);
      return half.length >= 8 ? cm(half) : undefined;
    })(),
    /** The trunk alone, by vertex membership rather than by gap. */
    trunk: (() => {
      const t = sliceTrunk(body, pos, y, body.trunk ?? (body.trunk = trunkMask(body)));
      return t.length >= 8 ? cm(t) : undefined;
    })(),
  };
}

const PICK = {
  chest: (p) => (p.n >= 3 ? p.torso : undefined),
  /**
   * The waist is read off the trunk itself, not off a cluster.
   *
   * Cluster separation asks the mesh to leave a 2 cm gap between the belly and
   * the forearm, and a 190 cm waist does not: the loop then spans from one
   * wrist to the other. Which vertices are trunk is decided once, on the
   * neutral mesh, so a vertex that starts on the abdomen at 14 cm out and ends
   * up at 33 cm is still abdomen and still counted.
   */
  waist: (p) => p.trunk,
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
  waist: { lo: 0.575, hi: 0.665, mode: 'min', probes: ['Waist_Small', 'BodyWeight_Low', 'BodyWeight_High', ...ABDOMEN_MORPHS] },
  // Widest level of the seat, where the legs have merged into one section.
  hips: { lo: 0.465, hi: 0.545, mode: 'max', probes: ['Hips_Small', 'Hips_Large', 'BodyWeight_Low', 'BodyWeight_High'] },
  // Mid upper-arm. The diagonal A-pose arm puts this just below the shoulder,
  // which is also where the targets act: at 0.68 the pair moved the loop by
  // 0.2 cm, at 0.74 by 4.9 cm.
  upperArm: { lo: 0.705, hi: 0.742, mode: 'max', probes: ['UpperArm_Small', 'UpperArm_Large', 'BodyWeight_Low', 'BodyWeight_High'] },
  // Upper thigh. Located from the crotch rather than by taking the widest
  // level in a band: measuring one half-plane makes higher slices score bigger
  // because they take in the seat, so "widest" walked the landmark up into the
  // glute and a 57 cm thigh read 62.
  thigh: { lo: 0.420, hi: 0.470, mode: 'crotch', probes: ['Thigh_Small', 'Thigh_Large', 'BodyWeight_Low', 'BodyWeight_High'] },
};

/**
 * How far past 1.0 each target may be driven before the surface folds.
 *
 * Measured per target on each mesh by walking the influence up until a face
 * normal flips, a triangle collapses, or an edge stretches past 2.5x its
 * neighbours — see scripts/body-fit/tmp/caps.mjs in the commit that introduced
 * this. Landmarks are chosen to keep working across the whole of it.
 */
/**
 * The abdomen targets are not limited by the mesh.
 *
 * Six of the seven displace the surface radially outward from the trunk axis,
 * which cannot fold: every section stays star-shaped about the axis and no
 * vertex changes height. Driven alone they are sound past influence 6. What
 * limits them is the arm — the A-pose forearm passes 42 cm from the centreline
 * at the navel — and that limit is already built into the geometry, level by
 * level, by scripts/body-fit/abdomen-morphs.mjs. The one exception is the
 * apron, the only target that moves a vertex downward, which starts to fold
 * its own surface at 1.5 and is scheduled to stop at 1.25.
 */
const ABDOMEN_CAP = {
  AbdomenWidth_Large: 6, AbdomenDepth_Large: 6, UpperAbdomen_Large: 2.5,
  LowerAbdomen_Large: 6, Flanks_Large: 6, BellyProjection_Large: 6,
  LowerBellyDrop_Large: 1.4,
};

export const GEOMETRY_CAP = {
  male: {
    Chest_Small: 1, Chest_Large: 1.5, Waist_Small: 4.25, Waist_Large: 8,
    ...ABDOMEN_CAP,
    Hips_Small: 6.5, Hips_Large: 6, UpperArm_Small: 2, UpperArm_Large: 4.5,
    Thigh_Small: 4.25, Thigh_Large: 6.25, BodyWeight_Low: 3.25, BodyWeight_High: 3,
  },
  female: {
    Chest_Small: 1.75, Chest_Large: 1.25, Waist_Small: 3.25, Waist_Large: 7.25,
    ...ABDOMEN_CAP,
    Hips_Small: 4.75, Hips_Large: 5.25, UpperArm_Small: 1.5, UpperArm_Large: 3.5,
    Thigh_Small: 3.25, Thigh_Large: 4.75, BodyWeight_Low: 1.5, BodyWeight_High: 3.25,
  },
};

/**
 * Kept below the measured fold point, because the caps were found one target
 * at a time and a fitted body drives several at once.
 */
export const SAFETY = 0.85;

/**
 * How far a target can be driven and still be *verified*.
 *
 * Geometry is only half the question: a mesh can stay perfectly sound while the
 * measurement rig loses track of it — enlarged thighs meet at the centreline,
 * a thick arm touches the ribs. Anything the rig cannot read cannot be shown to
 * match what the athlete typed, so the usable limit is the point where the
 * reading is still finite and still moving the right way.
 */
export function usableCap(body, target, measurementKey, landmarks, geometryCap) {
  const base = measureAt(body, {}, landmarks)[measurementKey];
  if (!Number.isFinite(base)) return 0;
  const sign = /_Large$/.test(target) ? 1 : -1;
  let last = 0;
  let previous = base;
  for (let w = 0.25; w <= geometryCap + 1e-9; w += 0.25) {
    const value = measureAt(body, { [target]: w }, landmarks)[measurementKey];
    if (!Number.isFinite(value)) break;
    // Must keep moving in its own direction; a reversal means the rig has
    // started measuring something else.
    if ((value - previous) * sign < -0.05) break;
    previous = value;
    last = w;
  }
  return last;
}

export function findLandmarks(body, frameWeights = {}, sex = 'male') {
  const framePos = deform(body, frameWeights);
  const H = heightOf(framePos);
  const probePos = {};
  const out = {};

  for (const [region, band] of Object.entries(BANDS)) {
    for (const probe of band.probes) {
      // Probed at influence 1, not at the extrapolated cap. Forcing the level
      // to survive the whole range pushed the arm landmark onto a part of the
      // limb the morph barely touches, and a fully enlarged arm then measured
      // *smaller* than a neutral one. The level stays anatomical; how far each
      // target may be driven is settled separately, by `usableCap` below.
      probePos[probe] ??= deform(body, { ...frameWeights, [probe]: 1 });
    }
    /**
     * The crotch: the highest level at which the slice still resolves two
     * legs. The upper thigh sits just below it, which is where a tape goes.
     */
    if (band.mode === 'crotch') {
      let crotch = null;
      for (let f = band.hi; f >= band.lo - 1e-9; f -= 0.0025) {
        if (clustersByX(sliceY(body, framePos, f * H), GAP[region]).length >= 2) { crotch = f; break; }
      }
      out[region] = crotch === null ? (band.lo + band.hi) / 2 : Math.max(band.lo, crotch - 0.012);
      continue;
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
