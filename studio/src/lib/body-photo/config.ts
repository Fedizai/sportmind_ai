/**
 * Where the vision assets come from.
 *
 * The WASM runtime is served from our own origin — it is already inside
 * `@mediapipe/tasks-vision` in node_modules and gets staged into `public/` at
 * build time, so the app does not stop working if a third-party CDN does. The
 * model weights are fetched from Google's official store because the file is
 * 9.4 MB and does not belong in git.
 *
 * Both are overridable by environment variable so the model can be self-hosted
 * later by setting one string, with no change to the pipeline.
 */

/** Served from our origin. Staged from node_modules by scripts/stage-mediapipe.mjs. */
export const MEDIAPIPE_WASM_PATH =
    process.env.NEXT_PUBLIC_MEDIAPIPE_WASM_PATH || '/mediapipe/wasm';

/**
 * Pose landmarker weights. `full` rather than `lite`: the lite model's
 * segmentation mask is noticeably rougher at the waist, and the mask edge is
 * the dominant error source in the whole pipeline.
 */
export const POSE_MODEL_URL =
    process.env.NEXT_PUBLIC_POSE_MODEL_URL ||
    'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task';

/** Thresholds the capture and validation steps are judged against. */
export const QUALITY = {
    /** Variance of the Laplacian, on 0..255 luma. Below this the shot is soft. */
    minBlurVariance: 55,
    /** Landmark visibility a required joint must reach. */
    minLandmarkVisibility: 0.6,
    /** Pose detector confidence for the person to count at all. */
    minPoseConfidence: 0.5,
    /** Silhouette must occupy a sane share of the frame. */
    minMaskAreaFraction: 0.045,
    maxMaskAreaFraction: 0.75,
    /** Head and feet must clear the frame edge by this fraction of frame height. */
    edgeMarginFraction: 0.005,
    /**
     * Front shot: shoulders and hips must be square to the camera. Measured as
     * |leftZ - rightZ| normalised by shoulder width.
     */
    maxFrontRotation: 0.32,
    /** Side shot: the far shoulder must be hidden behind the near one. */
    minSideRotation: 0.55,
    /** Front and side photos must agree on the subject's pixel height. */
    maxScaleDisagreement: 0.12,
} as const;
