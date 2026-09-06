/**
 * Front width and side depth into a circumference.
 *
 * A cross-section through a torso is closer to an ellipse than to anything else
 * two photographs can give you: the front view fixes one axis, the side view
 * fixes the other. Ramanujan's second approximation is used for the perimeter —
 * it is accurate to better than 0.02% for the eccentricities a human body
 * produces, which is far inside the error the mask edge contributes.
 *
 * This is an approximation and is treated as one. A real chest is not an
 * ellipse; a relaxed abdomen is not an ellipse. See `shapeFactor`.
 */
export function ellipseCircumferenceCm(widthCm: number, depthCm: number): number {
    const a = widthCm / 2;
    const b = depthCm / 2;
    if (!(a > 0) || !(b > 0)) return NaN;
    const h = Math.pow(a - b, 2) / Math.pow(a + b, 2);
    return Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
}

/**
 * Per-region correction to the pure ellipse.
 *
 * A real cross-section has flatter sides than an ellipse of the same width and
 * depth, so its perimeter is longer — the pure ellipse under-read every torso
 * loop by a consistent amount. These factors are the measured ratio between
 * the true cross-section perimeter and the ellipse, taken from the anatomical
 * meshes themselves by `scripts/body-photo/validate.mjs`.
 *
 * They are a correction for the shape of a human cross-section, not a fit to
 * human tape data — this project has none yet. Each was cross-validated
 * leave-one-out across eight body profiles, giving 0.47–2.02 cm residual and
 * standard deviations of 0.006–0.029, so they are stable rather than tuned to
 * particular bodies. Real photographs will need their own validation before
 * any accuracy claim can be made.
 */
export const SHAPE_FACTOR: Record<string, number> = {
    chest: 1.102,
    waist: 1.045,
    hips: 1.032,
    // Under 1: a limb in front view is measured across its widest point while
    // the depth reference is the trunk's, which overstates the minor axis.
    upperArm: 0.936,
    thigh: 0.987,
};

export function circumferenceFor(region: string, widthCm: number, depthCm: number): number {
    const base = ellipseCircumferenceCm(widthCm, depthCm);
    return Number.isFinite(base) ? base * (SHAPE_FACTOR[region] ?? 1) : NaN;
}
