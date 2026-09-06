import { readGlb, accessor } from './parse.mjs';

/** Base positions + the 20 relative morph deltas, decoded once. */
export function loadBody(file) {
  const gltf = readGlb(file);
  const node = gltf.json.nodes.find((n) => n.mesh !== undefined);
  const mesh = gltf.json.meshes[node.mesh];
  const prim = mesh.primitives[0];
  const base = accessor(gltf, gltf.bin, prim.attributes.POSITION).data;
  const index = accessor(gltf, gltf.bin, prim.indices).data;
  const names = mesh.extras.targetNames;
  const deltas = prim.targets.map((t) => accessor(gltf, gltf.bin, t.POSITION).data);
  return { name: mesh.name, base, index, names, deltas, vertexCount: base.length / 3 };
}

/** Apply morph weights: relative targets, so out = base + Σ w_i · delta_i. */
export function deform(body, weights) {
  const out = Float64Array.from(body.base);
  for (const [name, w] of Object.entries(weights)) {
    if (!w) continue;
    const i = body.names.indexOf(name);
    if (i < 0) throw new Error(`unknown morph target: ${name}`);
    const d = body.deltas[i];
    for (let k = 0; k < out.length; k++) out[k] += w * d[k];
  }
  return out;
}

export function heightOf(pos) {
  let lo = Infinity, hi = -Infinity;
  for (let i = 1; i < pos.length; i += 3) { if (pos[i] < lo) lo = pos[i]; if (pos[i] > hi) hi = pos[i]; }
  return hi - lo;
}

/** Points where the mesh crosses the horizontal plane y, as [x,z] pairs. */
export function sliceY(body, pos, y, keep = () => true) {
  const pts = [];
  const idx = body.index;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    const tri = [a, b, c];
    for (let e = 0; e < 3; e++) {
      const p = tri[e], q = tri[(e + 1) % 3];
      const y0 = pos[p + 1], y1 = pos[q + 1];
      if ((y0 - y) * (y1 - y) > 0) continue;      // same side
      if (y0 === y1) continue;                     // in-plane edge
      const s = (y - y0) / (y1 - y0);
      if (s < 0 || s > 1) continue;
      const x = pos[p] + s * (pos[q] - pos[p]);
      const z = pos[p + 2] + s * (pos[q + 2] - pos[p + 2]);
      if (keep(x, z)) pts.push([x, z]);
    }
  }
  return pts;
}

/** Andrew's monotone chain. A tape measure cannot enter a concavity, so the
 *  hull perimeter is the anatomically right model for a circumference. */
export function hullPerimeter(points) {
  if (points.length < 3) return 0;
  const p = points.slice().sort((u, v) => (u[0] - v[0]) || (u[1] - v[1]));
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const build = (src) => {
    const st = [];
    for (const pt of src) {
      while (st.length >= 2 && cross(st[st.length - 2], st[st.length - 1], pt) <= 0) st.pop();
      st.push(pt);
    }
    st.pop();
    return st;
  };
  const hull = [...build(p), ...build(p.slice().reverse())];
  let per = 0;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i], b = hull[(i + 1) % hull.length];
    per += Math.hypot(a[0] - b[0], a[1] - b[1]);
  }
  return per;
}

/** Circumference in cm of a region's cross-section at height y. */
export const circumferenceCm = (body, pos, y, keep) => hullPerimeter(sliceY(body, pos, y, keep)) * 100;

/** Torso only: drop anything far enough out on X to be an arm. */
export const torsoOnly = (armX) => (x) => Math.abs(x) < armX;
/** One limb: the athlete's left, at positive X, beyond the torso edge. */
export const limbOnly = (minX) => (x) => x > minX;

/**
 * Split a slice into limbs/torso by gaps along X.
 *
 * In the A-pose the arms hang clear of the ribs, so at chest height a naive
 * hull spans fingertip to fingertip. Clustering on the X gap separates the
 * torso (the cluster straddling the centreline) from each arm.
 */
export function clustersByX(points, gap = 0.015) {
  if (!points.length) return [];
  const sorted = points.slice().sort((a, b) => a[0] - b[0]);
  const groups = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i][0] - sorted[i - 1][0] > gap) groups.push([]);
    groups[groups.length - 1].push(sorted[i]);
  }
  return groups;
}

/** The cluster containing the centreline — the torso, or the merged pelvis. */
export function torsoCluster(points, gap = 0.015) {
  const groups = clustersByX(points, gap);
  const mid = groups.find((g) => g[0][0] <= 0 && g[g.length - 1][0] >= 0);
  return mid ?? groups.sort((a, b) => b.length - a.length)[0] ?? [];
}

/** The outermost cluster on the athlete's left (+X) — one arm. */
export function limbCluster(points, gap = 0.015) {
  const groups = clustersByX(points, gap);
  const right = groups.filter((g) => g[0][0] > 0.02);
  return right.length ? right[right.length - 1] : [];
}

/** The +X leg below the crotch, where the two legs are separate clusters. */
export function legCluster(points, gap = 0.008) {
  const groups = clustersByX(points, gap).filter((g) => g[g.length - 1][0] > 0);
  return groups.length ? groups[groups.length - 1] : [];
}
