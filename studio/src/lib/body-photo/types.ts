import type { FitRegion } from '@/lib/body-fit';

/** Where a stored number came from. Recorded per measurement, never inferred. */
export type MeasurementSource = 'manual' | 'photo_estimated' | 'user_corrected';

/** Which photo a check applies to. */
export type ShotKind = 'front' | 'side';

/**
 * Why a photo was refused.
 *
 * Every one of these stops the pipeline. Nothing downstream may invent a
 * measurement to fill the gap — a body scanner that answers when it cannot see
 * is worse than one that asks for another photo.
 */
export type RejectionCode =
    | 'no_person'
    | 'multiple_people'
    | 'low_confidence'
    | 'missing_landmarks'
    | 'body_cut_off'
    | 'too_rotated'
    | 'too_blurry'
    | 'unreliable_segmentation'
    | 'scale_mismatch';

export interface Rejection {
    code: RejectionCode;
    shot: ShotKind | 'both';
    /** Measured value that failed, for the retry hint. */
    detail?: string;
}

/** One region's estimate, with the evidence behind it. */
export interface RegionEstimate {
    region: FitRegion;
    /** Ellipse circumference in cm. */
    valueCm: number;
    /** Front silhouette width and side silhouette depth, in cm. */
    widthCm: number;
    depthCm: number;
    /** 0..1. Low means the bands disagreed or the mask edge was soft. */
    confidence: number;
}

export interface PhotoMeasurementSuccess {
    ok: true;
    /** cm per pixel, derived from the entered height. */
    scale: { frontCmPerPx: number; sideCmPerPx: number };
    regions: Record<FitRegion, RegionEstimate>;
    /** Mean of the per-region confidences, for the summary line. */
    overallConfidence: number;
}

export interface PhotoMeasurementFailure {
    ok: false;
    rejections: Rejection[];
}

export type PhotoMeasurementResult = PhotoMeasurementSuccess | PhotoMeasurementFailure;

/**
 * A binary silhouette, row-major, 1 = person.
 *
 * The pipeline works on this rather than on pixels so the geometry can be
 * tested without a browser, a camera or a model.
 */
export interface Silhouette {
    width: number;
    height: number;
    data: Uint8Array;
}

/** Normalised landmark, as MediaPipe reports it. */
export interface Landmark {
    x: number;
    y: number;
    z: number;
    visibility?: number;
}
