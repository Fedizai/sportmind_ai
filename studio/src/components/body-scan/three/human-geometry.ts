import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BODY_BOTTOM_Y } from './human-landmarks';

/**
 * Continuous lofted humanoid mesh for the holographic body scanner.
 *
 * The body is built by *lofting* — stacking elliptical cross-sections along each
 * part and skinning a continuous triangulated surface between them. Anatomy is
 * driven by real proportional landmarks (a ~7.5-head canon): cranium and jaw,
 * neck, trapezius slope, deltoid caps, pectoral swell, a lat V-taper into the
 * waist, glutes, quadriceps and calf bellies, ankles, feet and hands.
 *
 * Measurements reshape the body through *smoothly blended* region factors
 * (gaussian influence around each landmark) rather than hard height bands, so
 * the surface never steps or creases where two regions meet.
 *
 * Model space: Y up, X = left↔right, +Z = front. Symmetric across X.
 */

/** A horizontal cross-section: centre (cx,cz) at height y, elliptical radii. */
interface SectionY {
  y: number;
  cx: number;
  cz: number;
  rx: number;
  rz: number;
}

/** A cross-section stacked along Z (for the feet): centre (cx,cy) at depth z. */
interface SectionZ {
  z: number;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Densify control sections to ~uniform vertical spacing with smoothed radii. */
function resampleY(controls: SectionY[], ds = 0.045): SectionY[] {
  const out: SectionY[] = [];
  for (let i = 0; i < controls.length - 1; i++) {
    const a = controls[i];
    const b = controls[i + 1];
    const steps = Math.max(1, Math.round(Math.abs(b.y - a.y) / ds));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const te = smooth(t);
      out.push({
        y: a.y + (b.y - a.y) * t,
        cx: a.cx + (b.cx - a.cx) * te,
        cz: a.cz + (b.cz - a.cz) * te,
        rx: a.rx + (b.rx - a.rx) * te,
        rz: a.rz + (b.rz - a.rz) * te,
      });
    }
  }
  out.push(controls[controls.length - 1]);
  return out;
}

/** Superellipse profile — squares off the torso slightly so it isn't a tube. */
function profile(angle: number, squareness: number): { cx: number; sz: number } {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const n = squareness;
  return {
    cx: Math.sign(c) * Math.pow(Math.abs(c), n),
    sz: Math.sign(s) * Math.pow(Math.abs(s), n),
  };
}

interface LoftResult {
  geometry: THREE.BufferGeometry;
  rings: SectionY[];
}

/** Skin a vertical loft (rings in the XZ plane) into a continuous surface. */
function loftY(
  controls: SectionY[],
  radial: number,
  capStart: boolean,
  capEnd: boolean,
  squareness = 1
): LoftResult {
  const rings = resampleY(controls);
  const positions: number[] = [];
  const indices: number[] = [];

  for (const ring of rings) {
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const p = profile(a, squareness);
      positions.push(ring.cx + ring.rx * p.cx, ring.y, ring.cz + ring.rz * p.sz);
    }
  }

  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const jn = (j + 1) % radial;
      const a = i * radial + j;
      const b = i * radial + jn;
      const c = (i + 1) * radial + j;
      const d = (i + 1) * radial + jn;
      indices.push(a, c, b, b, c, d);
    }
  }

  const fan = (ring: SectionY, ringStart: number, flip: boolean) => {
    const ci = positions.length / 3;
    positions.push(ring.cx, ring.y, ring.cz);
    for (let j = 0; j < radial; j++) {
      const jn = (j + 1) % radial;
      if (flip) indices.push(ci, ringStart + jn, ringStart + j);
      else indices.push(ci, ringStart + j, ringStart + jn);
    }
  };
  if (capStart) fan(rings[0], 0, false);
  if (capEnd) fan(rings[rings.length - 1], (rings.length - 1) * radial, true);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  return { geometry: geo, rings };
}

/** Skin a forward loft (rings in the XY plane, stacked along Z) — used for feet. */
function loftZ(controls: SectionZ[], radial: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  for (const ring of controls) {
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      positions.push(ring.cx + ring.rx * Math.cos(a), ring.cy + ring.ry * Math.sin(a), ring.z);
    }
  }
  for (let i = 0; i < controls.length - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const jn = (j + 1) % radial;
      const a = i * radial + j;
      const b = i * radial + jn;
      const c = (i + 1) * radial + j;
      const d = (i + 1) * radial + jn;
      indices.push(a, c, b, b, c, d);
    }
  }
  const capFan = (ring: SectionZ, ringStart: number, flip: boolean) => {
    const ci = positions.length / 3;
    positions.push(ring.cx, ring.cy, ring.z);
    for (let j = 0; j < radial; j++) {
      const jn = (j + 1) % radial;
      if (flip) indices.push(ci, ringStart + jn, ringStart + j);
      else indices.push(ci, ringStart + j, ringStart + jn);
    }
  };
  capFan(controls[0], 0, false);
  capFan(controls[controls.length - 1], (controls.length - 1) * radial, true);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  return geo;
}

/* ----------------------------- anatomy controls ---------------------------- */

/**
 * Torso, crown → pelvis. Landmarks follow a ~7.5-head canon for a figure whose
 * crown sits at y≈2.36 and soles at y≈-2.06: chin 1.80, shoulder line 1.48,
 * nipple 1.18, navel 0.58, crotch 0.0.
 */
const TORSO: SectionY[] = [
  { y: 2.36, cx: 0, cz: 0.005, rx: 0.085, rz: 0.095 }, // crown
  { y: 2.31, cx: 0, cz: 0.008, rx: 0.145, rz: 0.165 },
  { y: 2.24, cx: 0, cz: 0.01, rx: 0.175, rz: 0.205 },
  { y: 2.14, cx: 0, cz: 0.012, rx: 0.185, rz: 0.215 }, // cranium max
  { y: 2.04, cx: 0, cz: 0.012, rx: 0.18, rz: 0.212 },
  { y: 1.96, cx: 0, cz: 0.008, rx: 0.166, rz: 0.198 }, // brow / cheekbone
  { y: 1.88, cx: 0, cz: 0.0, rx: 0.14, rz: 0.168 }, // jaw
  { y: 1.82, cx: 0, cz: -0.005, rx: 0.108, rz: 0.125 }, // chin
  { y: 1.77, cx: 0, cz: -0.008, rx: 0.096, rz: 0.1 }, // neck top
  { y: 1.69, cx: 0, cz: -0.012, rx: 0.103, rz: 0.104 }, // neck
  { y: 1.62, cx: 0, cz: -0.015, rx: 0.122, rz: 0.115 }, // neck base
  { y: 1.56, cx: 0, cz: -0.012, rx: 0.2, rz: 0.14 }, // trapezius
  { y: 1.5, cx: 0, cz: -0.005, rx: 0.3, rz: 0.165 }, // clavicle span
  { y: 1.44, cx: 0, cz: 0.0, rx: 0.335, rz: 0.182 },
  { y: 1.36, cx: 0, cz: 0.008, rx: 0.34, rz: 0.198 }, // armpit
  { y: 1.26, cx: 0, cz: 0.018, rx: 0.338, rz: 0.222 }, // pectoral swell
  { y: 1.18, cx: 0, cz: 0.02, rx: 0.33, rz: 0.226 }, // nipple line
  { y: 1.08, cx: 0, cz: 0.018, rx: 0.316, rz: 0.216 },
  { y: 0.96, cx: 0, cz: 0.014, rx: 0.296, rz: 0.202 }, // lower ribcage
  { y: 0.84, cx: 0, cz: 0.01, rx: 0.272, rz: 0.187 },
  { y: 0.72, cx: 0, cz: 0.008, rx: 0.255, rz: 0.176 }, // waist minimum
  { y: 0.58, cx: 0, cz: 0.01, rx: 0.258, rz: 0.178 }, // navel
  { y: 0.46, cx: 0, cz: 0.008, rx: 0.278, rz: 0.19 },
  { y: 0.34, cx: 0, cz: 0.004, rx: 0.315, rz: 0.212 }, // iliac crest
  { y: 0.22, cx: 0, cz: 0.0, rx: 0.35, rz: 0.234 }, // hip max
  { y: 0.12, cx: 0, cz: -0.004, rx: 0.348, rz: 0.236 },
  { y: 0.04, cx: 0, cz: -0.006, rx: 0.318, rz: 0.224 },
  // Close the trunk as a narrow gusset. Depth collapses faster than width so
  // the cap sits inside the thighs instead of bulging through the gap between
  // them — at the centreline the legs are only ~0.07 deep.
  { y: -0.005, cx: 0, cz: -0.004, rx: 0.24, rz: 0.145 },
  { y: -0.035, cx: 0, cz: 0.0, rx: 0.15, rz: 0.072 },
];

const armControls = (s: number): SectionY[] => [
  { y: 1.53, cx: 0.3 * s, cz: 0.0, rx: 0.088, rz: 0.1 }, // deltoid cap start
  { y: 1.47, cx: 0.34 * s, cz: 0.0, rx: 0.125, rz: 0.135 },
  { y: 1.4, cx: 0.365 * s, cz: 0.0, rx: 0.142, rz: 0.148 }, // deltoid max
  { y: 1.3, cx: 0.385 * s, cz: 0.004, rx: 0.134, rz: 0.14 },
  { y: 1.16, cx: 0.402 * s, cz: 0.008, rx: 0.125, rz: 0.129 }, // biceps belly
  { y: 1.02, cx: 0.418 * s, cz: 0.012, rx: 0.115, rz: 0.119 },
  { y: 0.88, cx: 0.432 * s, cz: 0.016, rx: 0.101, rz: 0.104 }, // elbow
  { y: 0.76, cx: 0.446 * s, cz: 0.022, rx: 0.104, rz: 0.101 }, // forearm belly
  { y: 0.58, cx: 0.468 * s, cz: 0.028, rx: 0.092, rz: 0.087 },
  { y: 0.4, cx: 0.489 * s, cz: 0.032, rx: 0.076, rz: 0.071 },
  { y: 0.25, cx: 0.505 * s, cz: 0.034, rx: 0.06, rz: 0.052 }, // wrist
  { y: 0.16, cx: 0.512 * s, cz: 0.036, rx: 0.072, rz: 0.056 }, // palm
  { y: 0.04, cx: 0.517 * s, cz: 0.038, rx: 0.073, rz: 0.052 },
  { y: -0.1, cx: 0.519 * s, cz: 0.038, rx: 0.06, rz: 0.041 }, // fingers
  { y: -0.22, cx: 0.519 * s, cz: 0.036, rx: 0.036, rz: 0.026 },
  { y: -0.28, cx: 0.519 * s, cz: 0.034, rx: 0.014, rz: 0.011 },
];

const legControls = (s: number): SectionY[] => [
  { y: 0.3, cx: 0.155 * s, cz: 0.0, rx: 0.198, rz: 0.222 }, // glute
  { y: 0.14, cx: 0.168 * s, cz: -0.004, rx: 0.196, rz: 0.216 },
  { y: 0.0, cx: 0.176 * s, cz: -0.002, rx: 0.186, rz: 0.203 }, // upper thigh
  { y: -0.2, cx: 0.181 * s, cz: 0.0, rx: 0.172, rz: 0.187 },
  { y: -0.45, cx: 0.184 * s, cz: 0.002, rx: 0.154, rz: 0.166 }, // mid thigh
  { y: -0.7, cx: 0.185 * s, cz: 0.004, rx: 0.134, rz: 0.143 },
  { y: -0.89, cx: 0.185 * s, cz: 0.006, rx: 0.121, rz: 0.128 }, // knee
  { y: -1.02, cx: 0.185 * s, cz: 0.002, rx: 0.114, rz: 0.124 },
  { y: -1.22, cx: 0.186 * s, cz: -0.008, rx: 0.128, rz: 0.142 }, // calf belly
  { y: -1.45, cx: 0.186 * s, cz: -0.006, rx: 0.109, rz: 0.119 },
  { y: -1.7, cx: 0.187 * s, cz: -0.002, rx: 0.084, rz: 0.09 },
  { y: -1.88, cx: 0.188 * s, cz: 0.0, rx: 0.068, rz: 0.072 }, // ankle
  { y: -1.96, cx: 0.188 * s, cz: 0.004, rx: 0.062, rz: 0.066 },
];

const footControls = (s: number): SectionZ[] => [
  { z: -0.11, cx: 0.188 * s, cy: -1.99, rx: 0.06, ry: 0.068 }, // heel
  { z: -0.02, cx: 0.19 * s, cy: -2.018, rx: 0.072, ry: 0.044 },
  { z: 0.1, cx: 0.192 * s, cy: -2.034, rx: 0.079, ry: 0.031 }, // midfoot
  { z: 0.22, cx: 0.194 * s, cy: -2.042, rx: 0.076, ry: 0.025 }, // ball
  { z: 0.32, cx: 0.194 * s, cy: -2.047, rx: 0.055, ry: 0.019 },
  { z: 0.38, cx: 0.194 * s, cy: -2.05, rx: 0.028, ry: 0.013 }, // toe
];

/* ------------------------------ morph controls ----------------------------- */

export type BodySex = 'male' | 'female' | 'neutral';

/**
 * Per-region shape multipliers (1 = the reference physique). Widths morph, and
 * `heightScale` stretches the figure vertically about the floor plane — the
 * measurement rings apply the identical transform so bands stay on the body.
 */
export interface BodyMorph {
  sex: BodySex;
  /** vertical stretch about the soles (1 = reference height) */
  heightScale: number;
  shoulders: number;
  chest: number;
  waist: number;
  hips: number;
  arms: number;
  legs: number;
  /** overall soft-tissue thickness from BMI; biases depth over width */
  mass: number;
}

export const DEFAULT_MORPH: BodyMorph = {
  sex: 'neutral',
  heightScale: 1,
  shoulders: 1,
  chest: 1,
  waist: 1,
  hips: 1,
  arms: 1,
  legs: 1,
  mass: 1,
};

/** Base skeletal proportions that differ by sex, applied before measurements. */
const SEX_BASE: Record<BodySex, { shoulders: number; chest: number; waist: number; hips: number; legs: number }> = {
  male: { shoulders: 1.05, chest: 1.03, waist: 1.0, hips: 0.94, legs: 0.98 },
  female: { shoulders: 0.92, chest: 0.97, waist: 0.93, hips: 1.11, legs: 1.04 },
  neutral: { shoulders: 1, chest: 1, waist: 1, hips: 1, legs: 1 },
};

/** Gaussian influence bands — centres match the measurement ring heights. */
const REGIONS = [
  { key: 'shoulders', y: 1.47, sigma: 0.15 },
  { key: 'chest', y: 1.18, sigma: 0.2 },
  { key: 'waist', y: 0.66, sigma: 0.22 },
  { key: 'hips', y: 0.18, sigma: 0.22 },
] as const;

/**
 * Smoothly blended width factor at a given height. Each region pulls the
 * surface toward its own multiplier with a gaussian falloff, and whatever
 * weight is left over falls back to 1 — so the mesh eases between regions
 * instead of stepping at a band edge.
 */
function regionFactor(y: number, m: BodyMorph): number {
  const base = SEX_BASE[m.sex];
  let wsum = 0;
  let acc = 0;
  for (const r of REGIONS) {
    const d = y - r.y;
    const w = Math.exp(-(d * d) / (2 * r.sigma * r.sigma));
    const value = m[r.key] * base[r.key];
    wsum += w;
    acc += w * value;
  }
  const rest = Math.max(0, 1 - wsum);
  return (acc + rest) / (wsum + rest);
}

function morphTorso(controls: SectionY[], m: BodyMorph): SectionY[] {
  // Extra depth (front↔back) carries added mass more than width does.
  const depthBias = 1 + (m.mass - 1) * 0.55;
  const widthBias = 1 + (m.mass - 1) * 0.3;
  return controls.map((s) => {
    // The head and neck stay anatomically stable; only the trunk morphs.
    const trunk = Math.min(1, Math.max(0, (1.62 - s.y) / 0.14));
    const f = 1 + (regionFactor(s.y, m) - 1) * trunk;
    return {
      ...s,
      rx: s.rx * f * (1 + (widthBias - 1) * trunk),
      rz: s.rz * f * (1 + (depthBias - 1) * trunk),
    };
  });
}

function morphLimb(controls: SectionY[], f: number, mass: number): SectionY[] {
  const g = f * (1 + (mass - 1) * 0.35);
  return g === 1 ? controls : controls.map((s) => ({ ...s, rx: s.rx * g, rz: s.rz * g }));
}

/** Shoulder joints ride outward with shoulder width so arms stay attached. */
function offsetArm(controls: SectionY[], m: BodyMorph): SectionY[] {
  const spread = 1 + (m.shoulders * SEX_BASE[m.sex].shoulders - 1) * 0.85;
  return controls.map((s) => ({ ...s, cx: s.cx * spread }));
}

/** Leg roots ride outward with hip width. */
function offsetLeg(controls: SectionY[], m: BodyMorph): SectionY[] {
  const spread = 1 + (m.hips * SEX_BASE[m.sex].hips - 1) * 0.7;
  return controls.map((s) => ({ ...s, cx: s.cx * spread }));
}

const stretchY = (y: number, s: number) => BODY_BOTTOM_Y + (y - BODY_BOTTOM_Y) * s;

function applyHeightY(controls: SectionY[], s: number): SectionY[] {
  return s === 1 ? controls : controls.map((c) => ({ ...c, y: stretchY(c.y, s) }));
}
function applyHeightZ(controls: SectionZ[], s: number): SectionZ[] {
  return s === 1 ? controls : controls.map((c) => ({ ...c, cy: stretchY(c.cy, s) }));
}

/* -------------------------------- build ---------------------------------- */

export interface BodySurfaces {
  geometry: THREE.BufferGeometry;
  /** Horizontal cross-section isolines — the topographic "scan" overlay. */
  contours: THREE.BufferGeometry;
}

let cached: BodySurfaces | null = null;
let cacheKey = '';

function morphKey(m: BodyMorph): string {
  return [m.sex, m.heightScale, m.shoulders, m.chest, m.waist, m.hips, m.arms, m.legs, m.mass]
    .map((v) => (typeof v === 'number' ? v.toFixed(3) : v))
    .join('|');
}

/** Build closed polylines from every Nth loft ring, as a LineSegments buffer. */
function buildContours(ringSets: { rings: SectionY[]; radial: number; every: number; squareness: number }[]): THREE.BufferGeometry {
  const pts: number[] = [];
  for (const set of ringSets) {
    for (let i = 0; i < set.rings.length; i += set.every) {
      const ring = set.rings[i];
      for (let j = 0; j < set.radial; j++) {
        const a1 = (j / set.radial) * Math.PI * 2;
        const a2 = ((j + 1) / set.radial) * Math.PI * 2;
        const p1 = profile(a1, set.squareness);
        const p2 = profile(a2, set.squareness);
        pts.push(ring.cx + ring.rx * p1.cx, ring.y, ring.cz + ring.rz * p1.sz);
        pts.push(ring.cx + ring.rx * p2.cx, ring.y, ring.cz + ring.rz * p2.sz);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return geo;
}

/** Builds (memoised by morph) the welded body surface plus its contour lines. */
export function buildBodySurfaces(morph: BodyMorph = DEFAULT_MORPH): BodySurfaces {
  const key = morphKey(morph);
  if (cached && cacheKey === key) return cached;

  const h = morph.heightScale;
  const torsoSquare = 1.22;

  const torso = loftY(applyHeightY(morphTorso(TORSO, morph), h), 40, true, true, torsoSquare);
  const armL = loftY(applyHeightY(morphLimb(offsetArm(armControls(-1), morph), morph.arms, morph.mass), h), 22, false, true);
  const armR = loftY(applyHeightY(morphLimb(offsetArm(armControls(1), morph), morph.arms, morph.mass), h), 22, false, true);
  const legBase = morph.legs * SEX_BASE[morph.sex].legs;
  const legL = loftY(applyHeightY(morphLimb(offsetLeg(legControls(-1), morph), legBase, morph.mass), h), 26, false, true);
  const legR = loftY(applyHeightY(morphLimb(offsetLeg(legControls(1), morph), legBase, morph.mass), h), 26, false, true);

  const merged = mergeGeometries(
    [
      torso.geometry,
      armL.geometry,
      armR.geometry,
      legL.geometry,
      legR.geometry,
      loftZ(applyHeightZ(footControls(-1), h), 14),
      loftZ(applyHeightZ(footControls(1), h), 14),
    ],
    false
  );
  merged.computeVertexNormals();
  merged.computeBoundingSphere();

  // Sparse enough to read as scanner cross-sections rather than ribbing.
  const contours = buildContours([
    { rings: torso.rings, radial: 40, every: 6, squareness: torsoSquare },
    { rings: armL.rings, radial: 22, every: 7, squareness: 1 },
    { rings: armR.rings, radial: 22, every: 7, squareness: 1 },
    { rings: legL.rings, radial: 26, every: 7, squareness: 1 },
    { rings: legR.rings, radial: 26, every: 7, squareness: 1 },
  ]);

  cached = { geometry: merged, contours };
  cacheKey = key;
  return cached;
}

/** Back-compat: the surface mesh on its own. */
export function buildHumanGeometry(morph: BodyMorph = DEFAULT_MORPH): THREE.BufferGeometry {
  return buildBodySurfaces(morph).geometry;
}

/** Even sampling of surface vertices for the floating particle layer. */
export function sampleSurfacePoints(geometry: THREE.BufferGeometry, count: number): Float32Array {
  const pos = geometry.getAttribute('position');
  const total = pos.count;
  const stride = Math.max(1, Math.floor(total / count));
  const picked: number[] = [];
  for (let i = 0; i < total; i += stride) {
    picked.push(pos.getX(i), pos.getY(i), pos.getZ(i));
  }
  return new Float32Array(picked);
}
