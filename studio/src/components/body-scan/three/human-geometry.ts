import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Continuous lofted humanoid mesh for the holographic body scanner.
 *
 * The body is built by *lofting* — stacking elliptical cross-section rings along
 * each part (torso, arms, legs, feet) and skinning a continuous triangulated
 * surface between them. Radii vary smoothly, so the torso has a real V-taper and
 * the limbs taper organically. No spheres at joints, no uniform cylinders — it
 * reads as one continuous body scan, not a robot. A dense WireframeGeometry over
 * the result gives the fine triangular "scan mesh" look.
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
function resampleY(controls: SectionY[], ds = 0.07): SectionY[] {
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

/** Skin a vertical loft (rings in the XZ plane) into a continuous surface. */
function loftY(controls: SectionY[], radial: number, capStart: boolean, capEnd: boolean): THREE.BufferGeometry {
  const rings = resampleY(controls);
  const positions: number[] = [];
  const indices: number[] = [];

  for (const ring of rings) {
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      positions.push(ring.cx + ring.rx * Math.cos(a), ring.y, ring.cz + ring.rz * Math.sin(a));
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
  return geo;
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
  // cap toe + heel
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

// Torso: continuous crown → jaw → neck → shoulders → chest → waist → hips → pelvis
const TORSO: SectionY[] = [
  { y: 2.36, cx: 0, cz: 0.02, rx: 0.04, rz: 0.04 },
  { y: 2.28, cx: 0, cz: 0.02, rx: 0.16, rz: 0.18 },
  { y: 2.16, cx: 0, cz: 0.02, rx: 0.2, rz: 0.22 },
  { y: 2.03, cx: 0, cz: 0.02, rx: 0.18, rz: 0.2 },
  { y: 1.92, cx: 0, cz: 0.0, rx: 0.11, rz: 0.12 },
  { y: 1.78, cx: 0, cz: 0.0, rx: 0.115, rz: 0.12 },
  { y: 1.68, cx: 0, cz: -0.02, rx: 0.21, rz: 0.16 },
  { y: 1.57, cx: 0, cz: -0.01, rx: 0.4, rz: 0.19 },
  { y: 1.48, cx: 0, cz: 0.0, rx: 0.49, rz: 0.2 },
  { y: 1.34, cx: 0, cz: 0.04, rx: 0.45, rz: 0.22 },
  { y: 1.18, cx: 0, cz: 0.05, rx: 0.42, rz: 0.22 },
  { y: 1.0, cx: 0, cz: 0.04, rx: 0.35, rz: 0.2 },
  { y: 0.82, cx: 0, cz: 0.03, rx: 0.3, rz: 0.18 },
  { y: 0.66, cx: 0, cz: 0.02, rx: 0.31, rz: 0.18 },
  { y: 0.5, cx: 0, cz: 0.0, rx: 0.37, rz: 0.21 },
  { y: 0.34, cx: 0, cz: 0.0, rx: 0.43, rz: 0.24 },
  { y: 0.2, cx: 0, cz: 0.0, rx: 0.4, rz: 0.24 },
  { y: 0.06, cx: 0, cz: 0.0, rx: 0.34, rz: 0.22 },
];

const armControls = (s: number): SectionY[] => [
  { y: 1.5, cx: 0.46 * s, cz: 0.0, rx: 0.15, rz: 0.135 },
  { y: 1.36, cx: 0.53 * s, cz: 0.0, rx: 0.145, rz: 0.13 },
  { y: 1.16, cx: 0.55 * s, cz: 0.02, rx: 0.125, rz: 0.115 },
  { y: 0.96, cx: 0.57 * s, cz: 0.03, rx: 0.11, rz: 0.1 },
  { y: 0.84, cx: 0.58 * s, cz: 0.035, rx: 0.105, rz: 0.095 },
  { y: 0.6, cx: 0.62 * s, cz: 0.05, rx: 0.095, rz: 0.085 },
  { y: 0.38, cx: 0.66 * s, cz: 0.06, rx: 0.08, rz: 0.072 },
  { y: 0.22, cx: 0.68 * s, cz: 0.06, rx: 0.07, rz: 0.064 },
  { y: 0.1, cx: 0.69 * s, cz: 0.075, rx: 0.082, rz: 0.05 },
  { y: -0.02, cx: 0.69 * s, cz: 0.08, rx: 0.06, rz: 0.04 },
  { y: -0.1, cx: 0.69 * s, cz: 0.08, rx: 0.02, rz: 0.018 },
];

const legControls = (s: number): SectionY[] => [
  { y: 0.34, cx: 0.19 * s, cz: 0.0, rx: 0.2, rz: 0.19 },
  { y: 0.1, cx: 0.21 * s, cz: 0.0, rx: 0.2, rz: 0.19 },
  { y: -0.2, cx: 0.22 * s, cz: 0.0, rx: 0.18, rz: 0.17 },
  { y: -0.6, cx: 0.22 * s, cz: 0.0, rx: 0.15, rz: 0.145 },
  { y: -0.98, cx: 0.21 * s, cz: 0.0, rx: 0.12, rz: 0.12 },
  { y: -1.2, cx: 0.21 * s, cz: 0.03, rx: 0.14, rz: 0.135 },
  { y: -1.55, cx: 0.21 * s, cz: 0.01, rx: 0.1, rz: 0.1 },
  { y: -1.85, cx: 0.21 * s, cz: 0.0, rx: 0.075, rz: 0.075 },
  { y: -2.0, cx: 0.21 * s, cz: 0.0, rx: 0.07, rz: 0.07 },
];

const footControls = (s: number): SectionZ[] => [
  { z: -0.06, cx: 0.21 * s, cy: -1.98, rx: 0.06, ry: 0.055 },
  { z: 0.05, cx: 0.21 * s, cy: -2.02, rx: 0.085, ry: 0.06 },
  { z: 0.18, cx: 0.21 * s, cy: -2.05, rx: 0.08, ry: 0.05 },
  { z: 0.3, cx: 0.21 * s, cy: -2.06, rx: 0.05, ry: 0.035 },
];

/** Per-region width multipliers (1 = baseline). Only widths morph, not height,
 *  so measurement rings + camera framing stay aligned. */
export interface BodyMorph {
  shoulders: number;
  chest: number;
  waist: number;
  hips: number;
  arms: number;
  legs: number;
}

export const DEFAULT_MORPH: BodyMorph = {
  shoulders: 1,
  chest: 1,
  waist: 1,
  hips: 1,
  arms: 1,
  legs: 1,
};

function scaleTorso(controls: SectionY[], m: BodyMorph): SectionY[] {
  return controls.map((s) => {
    let f = 1;
    if (s.y >= 1.4 && s.y <= 1.58) f = m.shoulders;
    else if (s.y >= 1.0 && s.y < 1.4) f = m.chest;
    else if (s.y >= 0.55 && s.y < 1.0) f = m.waist;
    else if (s.y < 0.55) f = m.hips;
    return f === 1 ? s : { ...s, rx: s.rx * f, rz: s.rz * f };
  });
}

function scaleLimb(controls: SectionY[], f: number): SectionY[] {
  return f === 1 ? controls : controls.map((s) => ({ ...s, rx: s.rx * f, rz: s.rz * f }));
}

let cached: THREE.BufferGeometry | null = null;
let cacheKey = '';

/** Builds (memoised by morph) the welded continuous body geometry. */
export function buildHumanGeometry(morph: BodyMorph = DEFAULT_MORPH): THREE.BufferGeometry {
  const key = `${morph.shoulders}|${morph.chest}|${morph.waist}|${morph.hips}|${morph.arms}|${morph.legs}`;
  if (cached && cacheKey === key) return cached;
  const parts: THREE.BufferGeometry[] = [
    loftY(scaleTorso(TORSO, morph), 24, true, true),
    loftY(scaleLimb(armControls(-1), morph.arms), 16, false, true),
    loftY(scaleLimb(armControls(1), morph.arms), 16, false, true),
    loftY(scaleLimb(legControls(-1), morph.legs), 18, false, true),
    loftY(scaleLimb(legControls(1), morph.legs), 18, false, true),
    loftZ(footControls(-1), 12),
    loftZ(footControls(1), 12),
  ];
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  merged.computeBoundingSphere();
  cached = merged;
  cacheKey = key;
  return merged;
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
