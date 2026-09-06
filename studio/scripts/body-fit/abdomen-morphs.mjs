/**
 * The abdomen deformation system.
 *
 * `Waist_Large` moves the trunk 1 cm sideways at full influence and pulls it
 * very slightly *backwards* — it is a waist thickener, not a belly. No amount
 * of extrapolation turns it into one: driven to its fold point it gives a
 * 134 cm waist on a torso that is still flat from the side, and that is the
 * shape a 150 kg athlete was being shown.
 *
 * These seven targets are authored here, procedurally, against each mesh's own
 * measured trunk profile. Six of them displace the abdominal surface radially
 * outward from the trunk axis, which cannot self-intersect however far it is
 * driven: every horizontal section stays star-shaped about the axis and no
 * vertex changes height, so the surface stays a graph over (angle, height).
 * That is why the caps below are limits of *anatomy and clearance*, not of the
 * mesh. The seventh, the pannus drop, is the one that moves vertices
 * vertically, and the one whose range therefore has to be measured.
 *
 * Anatomy, not a scale factor:
 *   AbdomenWidth       sideways, across the whole abdomen
 *   AbdomenDepth       front and back — torso depth, front-weighted 3:1
 *   UpperAbdomen       the epigastrium, under the ribs
 *   LowerAbdomen       the hypogastrium, below the navel
 *   Flanks             posterolateral, the love handles
 *   BellyProjection    forward only, apex below the navel where it really sits
 *   LowerBellyDrop     the apron: the lower front sheet falls and overhangs
 */

import { trunkProfile, abdomenLandmarks, trunkMask, armInnerProfile, bodyHeight } from './abdomen-profile.mjs';

export const ABDOMEN_MORPHS = [
  'AbdomenWidth_Large',
  'AbdomenDepth_Large',
  'UpperAbdomen_Large',
  'LowerAbdomen_Large',
  'Flanks_Large',
  'BellyProjection_Large',
  'LowerBellyDrop_Large',
];

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/**
 * How much of a target acts at height `f`: a raised cosine, asymmetric.
 *
 * It was a trapezoid, and the trapezoid was wrong. A plateau with smoothstep
 * shoulders puts the whole of a target's travel into a short run of height —
 * at the extreme end the lower abdomen was rising 16 cm over 6 cm of body — and
 * a surface that climbs faster than it rises reads as a ledge. Rendered, the
 * belly came out as two stacked lobes with a groove between them and a shelf
 * under the ribs.
 *
 * A raised cosine has zero slope at its peak *and* at both edges, so targets
 * blend into each other and into the untouched body instead of meeting it at a
 * corner. The spans below are long and heavily overlapped for the same reason:
 * an abdomen this size is one continuous form from the costal margin to the
 * pubis, not a stack of bands.
 */
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a || 1e-9), 0, 1); return t * t * (3 - 2 * t); };

const bump = (f, centre, spanDown, spanUp) => {
  const span = f < centre ? spanDown : spanUp;
  const u = Math.abs(f - centre) / (span || 1e-9);
  return u >= 1 ? 0 : 0.5 * (1 + Math.cos(Math.PI * u));
};

/**
 * The staged belly.
 *
 * One number goes in — how much abdomen the athlete has — and seven influences
 * come out. It is staged rather than proportional because an abdomen does not
 * grow uniformly: a moderately full belly is a fairly even swelling, but past
 * roughly a 130 cm waist the growth is overwhelmingly *forward and downward*.
 * Width and flanks flatten off, projection and the lower abdomen keep going,
 * and the apron only appears at the top of the range. That is both what a very
 * large abdomen looks like and what the A-pose allows: the forearm passes
 * 42 cm from the centreline at the navel and 25 cm at the ribs, so a belly that
 * kept widening at the same rate would grow straight through the arm.
 *
 *   t = 1  full belly    t = 2  large    t = 3  very large    t = 4  extreme
 */
export const PROGRAM_STOPS = [0, 1, 2, 3, 4];
export const PROGRAM = {
  AbdomenWidth_Large:    [0, 1.05, 1.75, 2.05, 2.20],
  AbdomenDepth_Large:    [0, 1.05, 2.10, 3.15, 4.25],
  UpperAbdomen_Large:    [0, 0.90, 1.60, 2.05, 2.35],
  LowerAbdomen_Large:    [0, 0.90, 1.75, 2.50, 3.10],
  Flanks_Large:          [0, 0.75, 1.40, 1.80, 2.00],
  BellyProjection_Large: [0, 0.85, 2.00, 3.35, 4.80],
  // Saturates early: the apron is the one target that moves a vertex downward,
  // and it is the one that turns a smooth underside into a ledge if overdone.
  LowerBellyDrop_Large:  [0, 0.12, 0.48, 0.75, 0.90],
};

/**
 * What to call a belly of a given amount, in the interface.
 *
 * Keyed on its own thresholds rather than on the program stops, because the
 * two answer different questions: the stops are where the *schedule* changes
 * slope, and by the first of them the abdomen is already at a 130 cm waist.
 * These are the boundaries a person would recognise looking at the avatar.
 */
export const PROGRAM_STAGES = [
  { from: 0,    name: 'flat' },
  { from: 0.25, name: 'full' },
  { from: 0.90, name: 'large' },
  { from: 1.80, name: 'very large' },
  { from: 2.80, name: 'extreme' },
];

/** The largest `t` the abdomen is authored for. Everything below is sized for it. */
export const PROGRAM_MAX = PROGRAM_STOPS[PROGRAM_STOPS.length - 1];

/** Influences for one belly amount. Linear between the stops, held past the end. */
export function bellyProgram(t) {
  const amount = clamp(t, 0, PROGRAM_MAX);
  const out = {};
  for (const name of ABDOMEN_MORPHS) {
    const row = PROGRAM[name];
    let v = row[row.length - 1];
    for (let i = 1; i < PROGRAM_STOPS.length; i++) {
      if (amount <= PROGRAM_STOPS[i]) {
        const u = (amount - PROGRAM_STOPS[i - 1]) / (PROGRAM_STOPS[i] - PROGRAM_STOPS[i - 1]);
        v = row[i - 1] + u * (row[i] - row[i - 1]);
        break;
      }
    }
    if (v > 0.0005) out[name] = +v.toFixed(4);
  }
  return out;
}

/**
 * Metres of surface travel per unit of influence, at each target's own peak,
 * quoted for a 178 cm frame and scaled with stature — so the female mesh gets
 * the same shape change rather than the same absolute displacement.
 */
const AMPLITUDE = {
  AbdomenWidth_Large: 0.062,
  AbdomenDepth_Large: 0.060,
  UpperAbdomen_Large: 0.044,
  LowerAbdomen_Large: 0.052,
  Flanks_Large: 0.052,
  BellyProjection_Large: 0.065,
  LowerBellyDrop_Large: 0.048,
};
const AMPLITUDE_REFERENCE_HEIGHT = 1.78;

/** How close the belly may come to the arm at the top of the program. */
const ARM_MARGIN = 0.035;

/**
 * Angular weighting, in the plane of the section.
 *
 * `c` is how lateral the point is (±1 at the sides), `s` how anterior
 * (+1 dead front, −1 dead back).
 */
const PROFILE = {
  AbdomenWidth_Large: (c) => c * c,
  // Obesity deepens the lumbar too, but nothing like the front does.
  AbdomenDepth_Large: (c, s) => (s > 0 ? s * s : 0.22 * s * s),
  /**
   * Front-weighted, with a floor rather than a constant.
   *
   * They used to give the back of the body more than half of what they gave
   * the front, and at the bottom of the abdomen the back of the body is the
   * gluteal cleft: eight centimetres of backward push into a groove turned four
   * faces inside out. The lower abdomen is a front structure — the seat at that
   * level belongs to `Hips_Large`.
   */
  UpperAbdomen_Large: (c, s) => Math.max(0.14, 0.36 + 0.64 * s),
  LowerAbdomen_Large: (c, s) => Math.max(0.10, 0.32 + 0.68 * s),
  // Two posterolateral lobes: a love handle sits behind the side, not on it.
  Flanks_Large: (c, s) => {
    const th = Math.atan2(s, c);
    const lobe = (centre) => Math.max(0, Math.cos(th - centre)) ** 2;
    return lobe(-0.42) + lobe(Math.PI + 0.42);
  },
  BellyProjection_Large: (c, s) => Math.max(0, s) ** 1.6,
  LowerBellyDrop_Large: (c, s) => Math.max(0, s) ** 1.2,
};

/**
 * Where each target sits and how far it reaches, as fractions of the abdomen's
 * own height — pubis to costal margin, which is 22 cm on the male mesh and
 * 23 cm on the female. Quoting them this way is what lets one set of numbers
 * fit two bodies with differently placed landmarks.
 */
function windows(L) {
  const A = L.rib - L.pubis;
  const at = (k) => L.pubis + k * A;
  return {
    AbdomenWidth_Large: { c: at(0.47), down: 0.52 * A, up: 0.57 * A },
    AbdomenDepth_Large: { c: at(0.47), down: 0.54 * A, up: 0.62 * A },
    UpperAbdomen_Large: { c: at(0.82), down: 0.52 * A, up: 0.34 * A },
    LowerAbdomen_Large: { c: at(0.27), down: 0.34 * A, up: 0.52 * A },
    Flanks_Large: { c: at(0.47), down: 0.34 * A, up: 0.36 * A },
    /**
     * The apex of a large abdomen sits below the navel, not at it.
     *
     * All six inflating targets stop at the pubis. They used to run on into the
     * top of the thigh, to round off the underside, and on the female mesh that
     * put the belly straight through the hip plane — a 100 cm hip came out as
     * 140 with the waist at 200, and `Hips_Small` cannot take 40 cm back. The
     * underside is the apron's job instead, and the apron is anterior.
     */
    BellyProjection_Large: { c: at(0.41), down: 0.46 * A, up: 0.70 * A },
    // The apron is the only target that moves a vertex downward, so its own
    // surface folds if the fall-off is steeper than the mesh's vertical
    // spacing — see scripts/body-fit/README.md.
    LowerBellyDrop_Large: { c: at(0.23), down: 0.42 * A, up: 0.48 * A },
  };
}

/**
 * Build the seven POSITION delta fields for one mesh.
 *
 * Two passes. The first lays down the anatomy; the second scales the sideways
 * component, level by level, so that at the top of the program the widest point
 * of the abdomen still clears the arm by ARM_MARGIN. Scaling only the outward
 * X component keeps every section star-shaped, so the fold-proof property
 * survives the correction.
 */
export function buildAbdomenDeltas(body) {
  const H = bodyHeight(body);
  const mask = trunkMask(body);
  const profile = trunkProfile(body, { mask });
  const L = abdomenLandmarks(profile);
  const armInner = armInnerProfile(body, mask);
  const win = windows(L);
  const scale = H / AMPLITUDE_REFERENCE_HEIGHT;
  const N = body.vertexCount;
  const top = bellyProgram(PROGRAM_MAX);
  /**
   * Where the surface faces, so the creases are left alone.
   *
   * Radial inflation is fold-proof only where the section is star-shaped about
   * the trunk axis, and two places on these meshes are not: the perineum and
   * the gluteal cleft, both of which face *inward*. Once the abdomen's lower
   * tails were lengthened to reach the top of the thigh they started pushing
   * on those, and four faces turned inside out. Weighting by how far the base
   * surface already faces outward removes the displacement exactly there and
   * changes nothing on the belly, which faces outward everywhere.
   */
  const normals = vertexNormals(body.index, body.base, weldByPosition(body.base));

  const out = {};
  for (const name of ABDOMEN_MORPHS) out[name] = new Float64Array(N * 3);
  const touched = [];

  for (let i = 0; i < N; i++) {
    if (!mask[i]) continue;
    const x = body.base[i * 3], y = body.base[i * 3 + 1], z = body.base[i * 3 + 2];
    const f = y / H;
    if (f < L.pubis - 0.08 || f > L.rib + 0.06) continue;

    const row = profile.at(f);
    const rx = x, rz = z - row.cz;
    // Normalised by the section's own half-axes, so "front" means front on a
    // deep torso and on a flat one alike.
    const ex = rx / (row.halfX || 1e-6), ez = rz / (row.halfZ || 1e-6);
    const elen = Math.hypot(ex, ez) || 1e-9;
    const c = ex / elen, s = ez / elen;

    const rlen = Math.hypot(rx, rz) || 1e-9;
    const ux = rx / rlen, uz = rz / rlen;

    const nx = normals[i * 3], nz = normals[i * 3 + 2];
    const nlen = Math.hypot(nx, nz);
    const facing = nlen > 1e-6 ? (nx * ux + nz * uz) / nlen : 1;
    /**
     * Below the pubis the body stops being one trunk and becomes two legs, and
     * a radial push near the centreline down there drives the perineum forward
     * into a spike — four faces on the female mesh. Away from the centreline
     * the same heights are the front of the thigh, which is exactly where the
     * apron is supposed to reach, so the gate is on distance from the midline
     * rather than on height alone.
     */
    const belowPubis = 1 - smoothstep(L.pubis - 0.045, L.pubis + 0.010, f);
    const clearOfMidline = smoothstep(0.020, 0.100, Math.abs(rx));
    const outward = smoothstep(-0.05, 0.35, facing) * (1 - belowPubis * (1 - clearOfMidline));
    if (outward <= 0) continue;

    let any = false;
    for (const name of ABDOMEN_MORPHS) {
      const w = win[name];
      const m = bump(f, w.c, w.down, w.up);
      if (m <= 0) continue;
      const p = PROFILE[name](c, s);
      if (p <= 0) continue;
      const a = AMPLITUDE[name] * scale * m * p * outward;
      const d = out[name];
      any = true;

      if (name === 'LowerBellyDrop_Large') {
        // The apron falls and swings forward. More forward than down, which is
        // both what an apron does over the pubis and what keeps the vertical
        // gradient under the mesh's own spacing.
        d[i * 3 + 1] -= a;
        d[i * 3 + 2] += a * 1.0;
        continue;
      }
      let dx = ux, dz = uz;
      if (name === 'BellyProjection_Large') {
        // Biased toward the sagittal axis so the belly forms an apex rather
        // than a wider tube.
        dx = ux * 0.42; dz = uz * 0.42 + 0.58;
        const n = Math.hypot(dx, dz) || 1e-9; dx /= n; dz /= n;
      }
      d[i * 3] += dx * a;
      d[i * 3 + 2] += dz * a;
    }
    if (any) touched.push(i);
  }

  // ---- pass two: give the arm its room back ----
  const BUCKET = 0.005;
  const reach = new Map();          // height bucket -> widest |x| at full program
  for (const i of touched) {
    const f = body.base[i * 3 + 1] / H;
    let sideways = 0;
    for (const name of ABDOMEN_MORPHS) sideways += (top[name] ?? 0) * out[name][i * 3];
    const k = Math.round(f / BUCKET);
    const width = Math.abs(body.base[i * 3] + sideways);
    if (width > (reach.get(k) ?? 0)) reach.set(k, width);
  }
  const rawScale = new Map();
  for (const [k, width] of reach) {
    const f = k * BUCKET;
    const room = armInner(f) - ARM_MARGIN;
    const grown = width - Math.abs(0);
    rawScale.set(k, grown <= room ? 1 : clamp(room / (grown || 1e-9), 0, 1));
  }
  /**
   * Eroded, then smoothed.
   *
   * Averaging alone let a level that needed a 0.6 correction sit next to two
   * that needed none and come out at 0.84, which put the widest part of the
   * belly a centimetre inside the forearm. Taking the strictest correction in
   * the neighbourhood first and blurring that keeps the limit while still
   * leaving no step for the surface to crease on.
   */
  const eroded = new Map();
  for (const k of rawScale.keys()) {
    let worst = 1;
    for (let j = k - 2; j <= k + 2; j++) worst = Math.min(worst, rawScale.get(j) ?? 1);
    eroded.set(k, worst);
  }
  const sideScale = (f) => {
    const k = Math.round(f / BUCKET);
    let sum = 0, n = 0;
    for (let j = k - 2; j <= k + 2; j++) { sum += eroded.get(j) ?? 1; n++; }
    return sum / n;
  };
  for (const i of touched) {
    const sc = sideScale(body.base[i * 3 + 1] / H);
    if (sc >= 0.9999) continue;
    for (const name of ABDOMEN_MORPHS) out[name][i * 3] *= sc;
  }

  return { deltas: out, landmarks: L, profile, mask, height: H, armInner, sideScale };
}

/**
 * Vertex normals of a position array, area-weighted, welded by position.
 *
 * Welding matters when an export duplicates vertices along a hard edge: taking
 * face normals per index would leave a visible seam down the flank the moment
 * the belly grows. These two meshes happen to be fully welded already.
 */
export function vertexNormals(index, pos, weldMap) {
  const n = pos.length;
  const acc = new Float64Array(n);
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t] * 3, b = index[t + 1] * 3, c = index[t + 2] * 3;
    const e1x = pos[b] - pos[a], e1y = pos[b + 1] - pos[a + 1], e1z = pos[b + 2] - pos[a + 2];
    const e2x = pos[c] - pos[a], e2y = pos[c + 1] - pos[a + 1], e2z = pos[c + 2] - pos[a + 2];
    // Not normalised: the cross product's length is twice the triangle area,
    // which is exactly the weight a smooth normal wants.
    const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    for (const v of [a, b, c]) { acc[v] += nx; acc[v + 1] += ny; acc[v + 2] += nz; }
  }
  if (weldMap) {
    const sums = new Map();
    for (let i = 0; i < n / 3; i++) {
      const k = weldMap[i];
      const s = sums.get(k) ?? [0, 0, 0];
      s[0] += acc[i * 3]; s[1] += acc[i * 3 + 1]; s[2] += acc[i * 3 + 2];
      sums.set(k, s);
    }
    for (let i = 0; i < n / 3; i++) {
      const s = sums.get(weldMap[i]);
      acc[i * 3] = s[0]; acc[i * 3 + 1] = s[1]; acc[i * 3 + 2] = s[2];
    }
  }
  for (let i = 0; i < n; i += 3) {
    const l = Math.hypot(acc[i], acc[i + 1], acc[i + 2]) || 1;
    acc[i] /= l; acc[i + 1] /= l; acc[i + 2] /= l;
  }
  return acc;
}

/** Indices of coincident base vertices, so normals can be averaged across seams. */
export function weldByPosition(base, epsilon = 1e-6) {
  const q = 1 / epsilon;
  const key = new Map();
  const map = new Int32Array(base.length / 3);
  for (let i = 0; i < map.length; i++) {
    const k = `${Math.round(base[i * 3] * q)},${Math.round(base[i * 3 + 1] * q)},${Math.round(base[i * 3 + 2] * q)}`;
    if (!key.has(k)) key.set(k, i);
    map[i] = key.get(k);
  }
  return map;
}
