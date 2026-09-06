/**
 * Is the deformed surface still a body?
 *
 * Three failure modes matter, and they are the ones used to measure every cap
 * in this directory: a triangle whose normal has flipped relative to the
 * neutral mesh (the surface has turned inside out), a triangle that has
 * collapsed to nothing, and an edge stretched far past its neighbours (the
 * surface has torn open). A fourth is specific to the abdomen: the belly
 * growing sideways into the arm, which no per-triangle test can see because
 * the two surfaces never share a vertex.
 */
import { deform, heightOf } from './measure.mjs';
import { trunkMask } from './abdomen-profile.mjs';
import { vertexNormals, weldByPosition } from './abdomen-morphs.mjs';

export function geometryFaults(body, weights, { flipTolerance = 0.0 } = {}) {
  const base = body.base;
  const pos = deform(body, weights);
  const idx = body.index;
  let flipped = 0, degenerate = 0, stretched = 0, worstStretch = 0, inverted = 0;
  const normals = vertexNormals(idx, pos, body.weld ?? (body.weld = weldByPosition(base)));

  const areaNormal = (p, a, b, c) => {
    const e1 = [p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]];
    const e2 = [p[c] - p[a], p[c + 1] - p[a + 1], p[c + 2] - p[a + 2]];
    return [
      e1[1] * e2[2] - e1[2] * e2[1],
      e1[2] * e2[0] - e1[0] * e2[2],
      e1[0] * e2[1] - e1[1] * e2[0],
    ];
  };

  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    const n0 = areaNormal(base, a, b, c);
    const n1 = areaNormal(pos, a, b, c);
    const l0 = Math.hypot(...n0), l1 = Math.hypot(...n1);
    if (l1 < l0 * 0.02) { degenerate++; continue; }
    const dot = (n0[0] * n1[0] + n0[1] * n1[1] + n0[2] * n1[2]) / ((l0 * l1) || 1);
    if (dot < flipTolerance) flipped++;
    /**
     * The test that actually decides whether the surface is broken.
     *
     * `flipped` compares against the neutral pose, and an apron is *supposed*
     * to end up facing a different way than it started — the underside of an
     * overhang legitimately turns from front-facing to down-facing. What can
     * never happen on a sound surface is a face pointing against its own
     * neighbourhood, which is what a fold is.
     */
    let vx = 0, vy = 0, vz = 0;
    for (const v of [a, b, c]) { vx += normals[v]; vy += normals[v + 1]; vz += normals[v + 2]; }
    const lv = Math.hypot(vx, vy, vz) || 1;
    if ((n1[0] * vx + n1[1] * vy + n1[2] * vz) / (l1 * lv) < 0) inverted++;
    for (const [p, q] of [[a, b], [b, c], [c, a]]) {
      const d0 = Math.hypot(base[p] - base[q], base[p + 1] - base[q + 1], base[p + 2] - base[q + 2]);
      const d1 = Math.hypot(pos[p] - pos[q], pos[p + 1] - pos[q + 1], pos[p + 2] - pos[q + 2]);
      const r = d0 > 1e-6 ? d1 / d0 : 1;
      if (r > worstStretch) worstStretch = r;
      if (r > 2.5) stretched++;
    }
  }
  return { flipped, inverted, degenerate, stretched, worstStretch, positions: pos };
}

/**
 * Smallest gap, in cm, between the trunk and either arm.
 *
 * Measured level by level over the abdomen: on each horizontal plane, the
 * outermost trunk point and the innermost arm point on the same side. Negative
 * means the belly has grown through the arm.
 */
export function armClearanceCm(body, weights, { lo = 0.46, hi = 0.76, step = 0.005 } = {}) {
  const mask = trunkMask(body);
  const pos = deform(body, weights);
  const H = heightOf(pos);
  const yMin = (() => { let m = Infinity; for (let i = 1; i < pos.length; i += 3) if (pos[i] < m) m = pos[i]; return m; })();
  const idx = body.index;
  let worst = Infinity, worstF = null;

  for (let f = lo; f <= hi + 1e-9; f += step) {
    const y = yMin + f * H;
    let trunkOut = -Infinity, armIn = Infinity;
    for (let t = 0; t < idx.length; t += 3) {
      const v = [idx[t], idx[t + 1], idx[t + 2]];
      const isTrunk = mask[v[0]] && mask[v[1]] && mask[v[2]];
      const isArm = !mask[v[0]] && !mask[v[1]] && !mask[v[2]];
      if (!isTrunk && !isArm) continue;
      for (let e = 0; e < 3; e++) {
        const p = v[e] * 3, q = v[(e + 1) % 3] * 3;
        const y0 = pos[p + 1], y1 = pos[q + 1];
        if ((y0 - y) * (y1 - y) > 0 || y0 === y1) continue;
        const s = (y - y0) / (y1 - y0);
        if (s < 0 || s > 1) continue;
        const x = Math.abs(pos[p] + s * (pos[q] - pos[p]));
        if (isTrunk) { if (x > trunkOut) trunkOut = x; }
        else if (x > 0.02 && x < armIn) armIn = x;
      }
    }
    if (!Number.isFinite(trunkOut) || !Number.isFinite(armIn)) continue;
    const gap = (armIn - trunkOut) * 100;
    if (gap < worst) { worst = gap; worstF = f; }
  }
  return { cm: Number.isFinite(worst) ? worst : null, atFraction: worstF };
}
