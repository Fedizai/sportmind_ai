import type { Silhouette } from './types';

/**
 * Reading a body off a silhouette.
 *
 * Everything here is pure and pixel-only so the geometry can be tested without
 * a browser, a camera or a model — the validation harness drives these same
 * functions against rendered bodies with known measurements.
 */

/** Horizontal runs of person pixels on one row, as [startX, endXInclusive]. */
export function rowRuns(mask: Silhouette, y: number, minRun = 2): Array<[number, number]> {
    if (y < 0 || y >= mask.height) return [];
    const runs: Array<[number, number]> = [];
    const base = y * mask.width;
    let start = -1;
    for (let x = 0; x < mask.width; x++) {
        const on = mask.data[base + x] !== 0;
        if (on && start === -1) start = x;
        if ((!on || x === mask.width - 1) && start !== -1) {
            const end = on ? x : x - 1;
            if (end - start + 1 >= minRun) runs.push([start, end]);
            start = -1;
        }
    }
    return runs;
}

/**
 * The run belonging to the torso.
 *
 * At chest and waist height the arms hang beside the ribs as their own runs, so
 * the widest run is not the torso and the total row span is arms-included. The
 * run containing the body's centreline is the torso — the same separation the
 * GLB calibration rig needed, for the same reason.
 */
export function torsoRun(mask: Silhouette, y: number, centreX: number): [number, number] | null {
    const runs = rowRuns(mask, y);
    if (!runs.length) return null;
    const containing = runs.find(([a, b]) => centreX >= a && centreX <= b);
    if (containing) return containing;
    // Centreline fell in a gap — take the run nearest to it rather than the
    // widest, which would pick an arm on a wide-stance shot.
    return runs.reduce((best, run) => {
        const d = Math.min(Math.abs(run[0] - centreX), Math.abs(run[1] - centreX));
        const bd = Math.min(Math.abs(best[0] - centreX), Math.abs(best[1] - centreX));
        return d < bd ? run : best;
    });
}

/** The limb run on one side of the centreline — an arm, or one leg. */
export function limbRun(
    mask: Silhouette,
    y: number,
    centreX: number,
    side: 'left' | 'right',
): [number, number] | null {
    const runs = rowRuns(mask, y);
    if (!runs.length) return null;
    // "left" is the athlete's left, which is camera-right on a front shot.
    const candidates = side === 'left'
        ? runs.filter(([a]) => a > centreX)
        : runs.filter(([, b]) => b < centreX);
    if (!candidates.length) return null;
    return side === 'left' ? candidates[candidates.length - 1] : candidates[0];
}

const width = (run: [number, number] | null) => (run ? run[1] - run[0] + 1 : NaN);

/** Median of a numeric sample. */
export function median(values: number[]): number {
    const clean = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
    if (!clean.length) return NaN;
    const mid = clean.length >> 1;
    return clean.length % 2 ? clean[mid] : (clean[mid - 1] + clean[mid]) / 2;
}

/** Median absolute deviation — spread that a single bad row cannot inflate. */
export function mad(values: number[], centre = median(values)): number {
    const dev = values.filter(Number.isFinite).map((v) => Math.abs(v - centre));
    return median(dev);
}

export interface BandSample {
    /** Robust width in pixels across the band. */
    widthPx: number;
    /** Relative spread, 0 = every row agreed. Drives the confidence score. */
    dispersion: number;
    /** Rows that actually produced a measurement. */
    rows: number;
}

/**
 * Measure a horizontal band rather than a single row.
 *
 * One scan line is at the mercy of a single ragged mask row; a band of rows
 * with a median through it is not. The spread across the band is kept, because
 * a band that disagrees with itself is exactly what low confidence means.
 */
export function sampleBand(
    mask: Silhouette,
    yCentre: number,
    halfHeight: number,
    pick: (y: number) => [number, number] | null,
): BandSample {
    const widths: number[] = [];
    const from = Math.max(0, Math.round(yCentre - halfHeight));
    const to = Math.min(mask.height - 1, Math.round(yCentre + halfHeight));
    for (let y = from; y <= to; y++) {
        const w = width(pick(y));
        if (Number.isFinite(w) && w > 0) widths.push(w);
    }
    if (!widths.length) return { widthPx: NaN, dispersion: 1, rows: 0 };

    const m = median(widths);
    // Trim rows more than 3 MADs out, then take the mean of what is left: the
    // median alone throws away real signal when the band is short.
    const spread = mad(widths, m) || 1e-6;
    const kept = widths.filter((w) => Math.abs(w - m) <= 3 * spread);
    const value = kept.length ? kept.reduce((a, b) => a + b, 0) / kept.length : m;

    return {
        widthPx: value,
        dispersion: m > 0 ? Math.min(1, spread / m) : 1,
        rows: widths.length,
    };
}

/**
 * The first row below the shoulders where the arms clear the torso.
 *
 * Above this the arms are still joined to the trunk and a single run spans
 * armpit to armpit, so a chest measured there is the width of the whole
 * shoulder girdle — 139 cm for a 100 cm chest, in the first synthetic run.
 * Finding the separation on the silhouette rather than assuming a fraction of
 * torso length also adapts to how far the athlete actually held their arms out.
 *
 * Returns null when the arms never separate, which is a real capture failure:
 * arms pressed against the ribs make a chest circumference unmeasurable.
 */
export function armSeparationRow(mask: Silhouette, fromY: number, toY: number): number | null {
    for (let y = Math.round(fromY); y <= Math.round(toY); y++) {
        if (rowRuns(mask, y).length >= 3) return y;
    }
    return null;
}

/** Scan a band for the row where the torso is narrowest — the natural waist. */
export function narrowestRow(
    mask: Silhouette,
    fromY: number,
    toY: number,
    centreX: number,
): number {
    let best = Math.round((fromY + toY) / 2);
    let bestWidth = Infinity;
    for (let y = Math.round(fromY); y <= Math.round(toY); y++) {
        const w = width(torsoRun(mask, y, centreX));
        if (Number.isFinite(w) && w < bestWidth) { bestWidth = w; best = y; }
    }
    return best;
}

/** Scan a band for the widest row — the seat, for hips. */
export function widestRow(
    mask: Silhouette,
    fromY: number,
    toY: number,
    centreX: number,
): number {
    let best = Math.round((fromY + toY) / 2);
    let bestWidth = -Infinity;
    for (let y = Math.round(fromY); y <= Math.round(toY); y++) {
        const w = width(torsoRun(mask, y, centreX));
        if (Number.isFinite(w) && w > bestWidth) { bestWidth = w; best = y; }
    }
    return best;
}

export interface SilhouetteExtent {
    topY: number;
    bottomY: number;
    /** Person pixels as a fraction of the frame. */
    areaFraction: number;
    /** True when the silhouette touches a frame edge — the body is cut off. */
    touchesTop: boolean;
    touchesBottom: boolean;
    touchesLeft: boolean;
    touchesRight: boolean;
}

/** Vertical extent and edge contact — the basis of the full-body check. */
export function silhouetteExtent(mask: Silhouette): SilhouetteExtent {
    let topY = -1;
    let bottomY = -1;
    let area = 0;
    let touchesLeft = false;
    let touchesRight = false;

    for (let y = 0; y < mask.height; y++) {
        const base = y * mask.width;
        let rowHas = false;
        for (let x = 0; x < mask.width; x++) {
            if (mask.data[base + x] === 0) continue;
            area++;
            rowHas = true;
            if (x === 0) touchesLeft = true;
            if (x === mask.width - 1) touchesRight = true;
        }
        if (rowHas) {
            if (topY === -1) topY = y;
            bottomY = y;
        }
    }

    return {
        topY,
        bottomY,
        areaFraction: area / (mask.width * mask.height),
        touchesTop: topY === 0,
        touchesBottom: bottomY === mask.height - 1,
        touchesLeft,
        touchesRight,
    };
}

/**
 * How crisp the silhouette boundary is, 0..1.
 *
 * A confident mask flips from 0 to 1 in one pixel. A soft one dithers across
 * several, which is what an out-of-focus edge or a low-contrast background
 * produces — and it is the largest single error source in the whole pipeline,
 * so it is measured rather than assumed.
 */
export function edgeSharpness(mask: Silhouette, probability?: Float32Array): number {
    if (!probability) return 0.85;
    let ambiguous = 0;
    let boundary = 0;
    for (let y = 1; y < mask.height - 1; y++) {
        for (let x = 1; x < mask.width - 1; x++) {
            const i = y * mask.width + x;
            const here = mask.data[i] !== 0;
            const right = mask.data[i + 1] !== 0;
            const down = mask.data[i + mask.width] !== 0;
            if (here === right && here === down) continue;
            boundary++;
            const p = probability[i];
            if (p > 0.25 && p < 0.75) ambiguous++;
        }
    }
    if (!boundary) return 0;
    return Math.max(0, Math.min(1, 1 - ambiguous / boundary));
}
