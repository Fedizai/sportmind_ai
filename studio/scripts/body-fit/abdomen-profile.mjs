/**
 * Where the abdomen is, on a mesh that never says so.
 *
 * The GLBs carry no skeleton and no landmarks, so every band below is found by
 * measuring the trunk itself: the natural waist is the narrowest torso level
 * between ribs and pelvis, the costal margin is where the trunk starts widening
 * again above it, and the pelvis is where it stops narrowing below. Reading them
 * off each mesh rather than hard-coding male numbers is what lets one authoring
 * pass serve both bodies.
 */

/** Arms never come inside this at abdomen height on either mesh — see the
 *  slice table in scripts/body-fit/README.md. Vertices outside it are limbs. */
export const TRUNK_HALF_X = 0.21;

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/** Cross-section of the trunk at every height, sampled and smoothed. */
export function trunkProfile(body, { step = 0.0025, lo = 0.40, hi = 0.78, mask } = {}) {
  const H = bodyHeight(body);
  const m = mask ?? trunkMask(body);
  const rows = [];
  for (let f = lo; f <= hi + 1e-9; f += step) {
    const pts = sliceTrunk(body, body.base, f * H, m);
    if (pts.length < 6) { rows.push(null); continue; }
    let xh = -Infinity, zf = -Infinity, zb = Infinity;
    for (const [x, z] of pts) {
      if (Math.abs(x) > xh) xh = Math.abs(x);
      if (z > zf) zf = z;
      if (z < zb) zb = z;
    }
    rows.push({ f, halfX: xh, zFront: zf, zBack: zb, cz: (zf + zb) / 2, halfZ: (zf - zb) / 2 });
  }
  // Three-tap smoothing: the raw profile is noisy at the mesh's own resolution
  // and the masks differentiate it.
  const smooth = rows.map((r, i) => {
    if (!r) return null;
    const near = [rows[i - 1], r, rows[i + 1]].filter(Boolean);
    const avg = (k) => near.reduce((s, n) => s + n[k], 0) / near.length;
    return { f: r.f, halfX: avg('halfX'), zFront: avg('zFront'), zBack: avg('zBack'), cz: avg('cz'), halfZ: avg('halfZ') };
  });
  const valid = smooth.filter(Boolean);
  const at = (f) => {
    const t = clamp(f, valid[0].f, valid[valid.length - 1].f);
    const i = clamp(Math.round((t - valid[0].f) / step), 0, valid.length - 1);
    return valid[i];
  };
  return { rows: valid, at, step, H };
}

export function bodyHeight(body) {
  let lo = Infinity, hi = -Infinity;
  for (let i = 1; i < body.base.length; i += 3) {
    if (body.base[i] < lo) lo = body.base[i];
    if (body.base[i] > hi) hi = body.base[i];
  }
  return hi - lo;
}

/**
 * Which vertices are trunk, decided once on the base mesh.
 *
 * Membership must not change when the belly grows: a vertex that starts on the
 * abdomen at |x| = 0.14 and ends up at 0.38 is still abdomen. Deciding it from
 * the *deformed* position would drop exactly the vertices that carry the
 * measurement. The arms never come inside TRUNK_HALF_X at abdomen height on
 * either mesh, so the base position settles it.
 */
export function trunkMask(body) {
  const n = body.vertexCount;
  const mask = new Uint8Array(n);
  for (let i = 0; i < n; i++) mask[i] = Math.abs(body.base[i * 3]) < TRUNK_HALF_X ? 1 : 0;
  return mask;
}

/** Slice the trunk only — the limbs are cut off before the plane is taken. */
export function sliceTrunk(body, pos, y, mask) {
  const pts = [];
  const idx = body.index;
  for (let t = 0; t < idx.length; t += 3) {
    const v = [idx[t], idx[t + 1], idx[t + 2]];
    if (mask && !(mask[v[0]] && mask[v[1]] && mask[v[2]])) continue;
    const tri = [v[0] * 3, v[1] * 3, v[2] * 3];
    for (let e = 0; e < 3; e++) {
      const p = tri[e], q = tri[(e + 1) % 3];
      const y0 = pos[p + 1], y1 = pos[q + 1];
      if ((y0 - y) * (y1 - y) > 0 || y0 === y1) continue;
      const s = (y - y0) / (y1 - y0);
      if (s < 0 || s > 1) continue;
      pts.push([pos[p] + s * (pos[q] - pos[p]), pos[p + 2] + s * (pos[q + 2] - pos[p + 2])]);
    }
  }
  return pts;
}

/**
 * The four levels the abdomen morphs are built around, as fractions of stature.
 *
 * `waist` is the trunk's own minimum; `rib` is the level above it where the
 * trunk has recovered most of the width it lost, which is the costal margin;
 * `crest` is the matching level below, the iliac crest; `pubis` sits a fixed
 * fraction below the crest, which is where the trunk stops being abdomen.
 */
export function abdomenLandmarks(profile) {
  const inBand = profile.rows.filter((r) => r.f >= 0.55 && r.f <= 0.70);
  const waist = inBand.reduce((a, b) => (b.halfX + b.halfZ < a.halfX + a.halfZ ? b : a));
  const girth = (r) => r.halfX + r.halfZ;
  const w = girth(waist);

  const above = profile.rows.filter((r) => r.f > waist.f && r.f <= 0.74);
  const below = profile.rows.filter((r) => r.f < waist.f && r.f >= 0.46);
  const maxAbove = above.length ? Math.max(...above.map(girth)) : w;
  const maxBelow = below.length ? Math.max(...below.map(girth)) : w;

  // 70% of the way back to full width is the flare of the ribcage / the crest.
  const rib = above.find((r) => girth(r) >= w + 0.70 * (maxAbove - w))?.f ?? waist.f + 0.065;
  const crest = [...below].reverse().find((r) => girth(r) >= w + 0.70 * (maxBelow - w))?.f ?? waist.f - 0.055;

  return {
    waist: waist.f,
    // Capped: on the female mesh the "70% of the width back" test walks up
    // into the bust, which is not abdomen, and an epigastric morph reaching
    // that far reshapes the breast every time the waist changes.
    rib: Math.min(rib, waist.f + 0.075),
    crest,
    // The abdomen ends at the pubis; below it the trunk is pelvis and thigh.
    pubis: Math.max(0.485, crest - 0.065),
    navel: waist.f - 0.012,
  };
}

/**
 * How close the arms come to the centreline, level by level.
 *
 * The A-pose forearm passes about 28 cm out at the navel but only 10 cm out at
 * the costal margin, and nothing in a morph target knows that. Measuring it
 * from the mesh is what lets the abdomen be told how much width it may take
 * before it grows through the arm.
 */
export function armInnerProfile(body, mask, { step = 0.005, lo = 0.44, hi = 0.80 } = {}) {
  const H = bodyHeight(body);
  const idx = body.index;
  const rows = [];
  for (let f = lo; f <= hi + 1e-9; f += step) {
    const y = f * H;
    let inner = Infinity;
    for (let t = 0; t < idx.length; t += 3) {
      const v = [idx[t], idx[t + 1], idx[t + 2]];
      if (mask[v[0]] || mask[v[1]] || mask[v[2]]) continue;   // any trunk vertex: not an arm face
      for (let e = 0; e < 3; e++) {
        const p = v[e] * 3, q = v[(e + 1) % 3] * 3;
        const y0 = body.base[p + 1], y1 = body.base[q + 1];
        if ((y0 - y) * (y1 - y) > 0 || y0 === y1) continue;
        const s = (y - y0) / (y1 - y0);
        if (s < 0 || s > 1) continue;
        const x = Math.abs(body.base[p] + s * (body.base[q] - body.base[p]));
        if (x > 0.02 && x < inner) inner = x;
      }
    }
    rows.push({ f, inner });
  }
  // Below the hands there is no arm at all; hold the nearest measured value so
  // the limit stays defined across the whole abdomen.
  let held = null;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (Number.isFinite(rows[i].inner)) held = rows[i].inner;
    else if (held !== null) rows[i].inner = held;
  }
  const valid = rows.filter((r) => Number.isFinite(r.inner));
  return (f) => {
    const t = clamp(f, valid[0].f, valid[valid.length - 1].f);
    const i = clamp(Math.round((t - valid[0].f) / step), 0, valid.length - 1);
    return valid[i].inner;
  };
}
