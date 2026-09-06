/**
 * Orthographic silhouettes straight from the GLB.
 *
 * Synthetic validation needs a front and a side mask of a body whose true
 * circumferences are known. Rasterising the mesh's triangles into a binary
 * image gives exactly that, without a GPU or a renderer — and an orthographic
 * projection is the right choice here because it isolates the geometry under
 * test from camera perspective, which is a separate error source the harness
 * deliberately does not model.
 */

/** Rasterise the deformed mesh into a binary mask, viewed along +Z or +X. */
export function rasterize(body, positions, { axis, width, height, marginFraction = 0.06 }) {
    // Bounds of the projected outline.
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    const u = (i) => (axis === 'front' ? positions[i * 3] : positions[i * 3 + 2]);
    const v = (i) => positions[i * 3 + 1];

    const count = positions.length / 3;
    for (let i = 0; i < count; i++) {
        const uu = u(i), vv = v(i);
        if (uu < minU) minU = uu; if (uu > maxU) maxU = uu;
        if (vv < minV) minV = vv; if (vv > maxV) maxV = vv;
    }

    // Fit by height, so the vertical scale is identical in both views — the
    // pipeline derives cm/px from stature and would otherwise be handed two
    // different scales for the same body.
    const usable = height * (1 - marginFraction * 2);
    const scale = usable / (maxV - minV);
    const offV = height * marginFraction;
    const centreU = (minU + maxU) / 2;

    const project = (i) => ({
        // Image x grows right; model +X is the athlete's left, which lands on
        // camera-right in a front view, matching a real photograph.
        x: width / 2 + (u(i) - centreU) * scale,
        // Image y grows downward, model y grows upward.
        y: offV + (maxV - v(i)) * scale,
    });

    const data = new Uint8Array(width * height);
    const idx = body.index;

    for (let t = 0; t < idx.length; t += 3) {
        const a = project(idx[t]), b = project(idx[t + 1]), c = project(idx[t + 2]);
        const loX = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x)));
        const hiX = Math.min(width - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
        const loY = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y)));
        const hiY = Math.min(height - 1, Math.ceil(Math.max(a.y, b.y, c.y)));
        if (hiX < loX || hiY < loY) continue;

        const area = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
        if (Math.abs(area) < 1e-12) continue;

        for (let y = loY; y <= hiY; y++) {
            for (let x = loX; x <= hiX; x++) {
                const px = x + 0.5, py = y + 0.5;
                const w0 = ((b.x - a.x) * (py - a.y) - (px - a.x) * (b.y - a.y)) / area;
                const w1 = ((px - a.x) * (c.y - a.y) - (c.x - a.x) * (py - a.y)) / area;
                if (w0 < 0 || w1 < 0 || w0 + w1 > 1) continue;
                data[y * width + x] = 1;
            }
        }
    }

    return { width, height, data };
}

/**
 * Landmarks at standard anthropometric fractions of stature.
 *
 * Deliberately *not* read off the calibration rig's own landmarks: using those
 * would make the test circular, validating the pipeline against the same
 * levels it was built from. Acromion at 81.8% of stature, trochanter at 53%,
 * knee at 28.5%, ankle at 3.9% are population figures, and they stand in for
 * what a pose model would report.
 */
export function syntheticLandmarks(mask, extent, opts = {}) {
    const { rotationZ = 0 } = opts;
    const top = extent.topY, bottom = extent.bottomY;
    const H = bottom - top;
    const atFraction = (f) => (top + (1 - f) * H) / mask.height;

    // Horizontal placement comes from the silhouette itself, which is what a
    // pose model does too.
    const spanAt = (yNorm) => {
        const y = Math.round(yNorm * mask.height);
        let lo = -1, hi = -1;
        for (let x = 0; x < mask.width; x++) {
            if (mask.data[y * mask.width + x]) { if (lo < 0) lo = x; hi = x; }
        }
        return lo < 0 ? { lo: mask.width / 2, hi: mask.width / 2 } : { lo, hi };
    };

    const mk = (xPx, yNorm, z = 0) => ({
        x: xPx / mask.width, y: yNorm, z, visibility: 0.95,
    });

    const shoulderY = atFraction(0.818);
    const hipY = atFraction(0.530);
    const kneeY = atFraction(0.285);
    const ankleY = atFraction(0.039);
    const elbowY = atFraction(0.630);

    const sh = spanAt(shoulderY);
    const hp = spanAt(hipY);
    const kn = spanAt(kneeY);
    const an = spanAt(ankleY);
    const el = spanAt(elbowY);
    const mid = (s) => (s.lo + s.hi) / 2;

    const out = new Array(33).fill(null).map(() => mk(mask.width / 2, 0.5));
    // Shoulders inset from the silhouette edge, which at shoulder height
    // includes the deltoid rather than the joint centre.
    out[11] = mk(mid(sh) + (sh.hi - mid(sh)) * 0.62, shoulderY, rotationZ);
    out[12] = mk(mid(sh) - (mid(sh) - sh.lo) * 0.62, shoulderY, -rotationZ);
    out[13] = mk(el.hi - (el.hi - el.lo) * 0.06, elbowY, rotationZ);
    out[14] = mk(el.lo + (el.hi - el.lo) * 0.06, elbowY, -rotationZ);
    out[15] = mk(el.hi, atFraction(0.485));
    out[16] = mk(el.lo, atFraction(0.485));
    out[23] = mk(mid(hp) + (hp.hi - mid(hp)) * 0.45, hipY, rotationZ);
    out[24] = mk(mid(hp) - (mid(hp) - hp.lo) * 0.45, hipY, -rotationZ);
    out[25] = mk(mid(kn) + (kn.hi - mid(kn)) * 0.5, kneeY);
    out[26] = mk(mid(kn) - (mid(kn) - kn.lo) * 0.5, kneeY);
    out[27] = mk(mid(an) + (an.hi - mid(an)) * 0.5, ankleY);
    out[28] = mk(mid(an) - (mid(an) - an.lo) * 0.5, ankleY);
    return out;
}
