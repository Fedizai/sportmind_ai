import type { Landmark } from './types';

/**
 * MediaPipe Pose's 33 landmarks, by the indices the model documents.
 *
 * Landmarks are used for anatomical localisation only — to decide *where* on
 * the body to measure. No circumference is ever derived from a distance
 * between two landmarks: the distance between two hip points is a projected
 * chord through a joint, not a body width, and treating it as one is how photo
 * measurement usually goes wrong.
 */
export const LM = {
    nose: 0,
    leftEar: 7, rightEar: 8,
    leftShoulder: 11, rightShoulder: 12,
    leftElbow: 13, rightElbow: 14,
    leftWrist: 15, rightWrist: 16,
    leftHip: 23, rightHip: 24,
    leftKnee: 25, rightKnee: 26,
    leftAnkle: 27, rightAnkle: 28,
    leftHeel: 29, rightHeel: 30,
    leftFootIndex: 31, rightFootIndex: 32,
} as const;

/** Joints every measurement depends on. Missing any of these stops the run. */
export const REQUIRED_LANDMARKS = [
    LM.leftShoulder, LM.rightShoulder,
    LM.leftHip, LM.rightHip,
    LM.leftKnee, LM.rightKnee,
    LM.leftAnkle, LM.rightAnkle,
    LM.leftElbow, LM.rightElbow,
];

export const visibility = (lm: Landmark | undefined) => lm?.visibility ?? 0;

/** Landmarks are normalised 0..1; the mask is in pixels. */
export const toPx = (lm: Landmark, width: number, height: number) => ({
    x: lm.x * width,
    y: lm.y * height,
});

export const midpoint = (a: Landmark, b: Landmark) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
    visibility: Math.min(visibility(a), visibility(b)),
});

/**
 * How square the shoulders and hips are to the camera.
 *
 * MediaPipe's `z` is depth relative to the hip centre, in the same units as x.
 * Two shoulders at the same depth mean the torso faces the lens; a large
 * difference means it is turned. Normalising by shoulder width keeps the number
 * comparable across body sizes and distances.
 */
export function rotationScore(landmarks: Landmark[]): number {
    const ls = landmarks[LM.leftShoulder];
    const rs = landmarks[LM.rightShoulder];
    if (!ls || !rs) return 1;
    const span = Math.hypot(ls.x - rs.x, ls.y - rs.y);
    if (span < 1e-6) return 1;
    return Math.min(1, Math.abs(ls.z - rs.z) / span);
}
