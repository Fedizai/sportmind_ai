import { FIT_REGIONS, type FitRegion } from '@/lib/body-fit';
import { QUALITY } from './config';
import { circumferenceFor } from './circumference';
import { LM, REQUIRED_LANDMARKS, rotationScore, visibility } from './landmarks';
import {
    armSeparationRow, edgeSharpness, narrowestRow, sampleBand, silhouetteExtent,
    torsoRun, limbRun, widestRow,
} from './silhouette';
import type {
    Landmark, PhotoMeasurementResult, RegionEstimate, Rejection, ShotKind, Silhouette,
} from './types';

/** One analysed photograph: what the model saw, before any measuring. */
export interface ShotAnalysis {
    kind: ShotKind;
    mask: Silhouette;
    /** Soft mask probabilities, when the model provides them. Drives edge sharpness. */
    probability?: Float32Array;
    landmarks: Landmark[];
    /** Number of people the detector found. */
    poseCount: number;
    /** Variance of the Laplacian on the source image. */
    blurVariance: number;
}

/**
 * Every reason a shot is refused.
 *
 * Nothing downstream is allowed to fill a gap left by a failed check. A body
 * scanner that answers when it cannot see is worse than one that asks for
 * another photo, so a rejection ends the run and the UI asks for a retake.
 */
function validateShot(shot: ShotAnalysis): Rejection[] {
    const out: Rejection[] = [];
    const { kind } = shot;

    if (shot.poseCount === 0 || shot.landmarks.length === 0) {
        return [{ code: 'no_person', shot: kind }];
    }
    if (shot.poseCount > 1) {
        out.push({ code: 'multiple_people', shot: kind, detail: `${shot.poseCount} detected` });
    }
    if (shot.blurVariance < QUALITY.minBlurVariance) {
        out.push({ code: 'too_blurry', shot: kind, detail: shot.blurVariance.toFixed(0) });
    }

    const missing = REQUIRED_LANDMARKS.filter(
        (i) => visibility(shot.landmarks[i]) < QUALITY.minLandmarkVisibility,
    );
    if (missing.length) {
        out.push({ code: 'missing_landmarks', shot: kind, detail: `${missing.length} joints` });
    }

    const extent = silhouetteExtent(shot.mask);
    if (extent.topY < 0) {
        return [{ code: 'unreliable_segmentation', shot: kind, detail: 'empty mask' }];
    }
    if (extent.areaFraction < QUALITY.minMaskAreaFraction) {
        out.push({ code: 'unreliable_segmentation', shot: kind, detail: 'subject too small' });
    }
    if (extent.areaFraction > QUALITY.maxMaskAreaFraction) {
        out.push({ code: 'unreliable_segmentation', shot: kind, detail: 'subject fills frame' });
    }
    // Head and feet must both be inside the frame, or the height scale — which
    // every measurement depends on — is measuring something shorter than the
    // person.
    if (extent.touchesTop || extent.touchesBottom) {
        out.push({ code: 'body_cut_off', shot: kind, detail: extent.touchesTop ? 'head' : 'feet' });
    }

    /**
     * Orientation. The front shot must face the lens and the side shot must be
     * turned away from it — the same number, read in opposite directions.
     */
    const rotation = rotationScore(shot.landmarks);
    if (kind === 'front' && rotation > QUALITY.maxFrontRotation) {
        out.push({ code: 'too_rotated', shot: kind, detail: rotation.toFixed(2) });
    }
    if (kind === 'side' && rotation < QUALITY.minSideRotation) {
        out.push({ code: 'too_rotated', shot: kind, detail: rotation.toFixed(2) });
    }

    return out;
}

/** Anatomical levels in mask pixels, located from the landmarks. */
interface Levels {
    centreX: number;
    chestY: number;
    waistY: number;
    hipsY: number;
    upperArmY: number;
    thighY: number;
    torsoSpanPx: number;
}

function locate(shot: ShotAnalysis): Levels {
    const { mask, landmarks } = shot;
    const px = (lm: Landmark) => ({ x: lm.x * mask.width, y: lm.y * mask.height });

    const ls = px(landmarks[LM.leftShoulder]);
    const rs = px(landmarks[LM.rightShoulder]);
    const lh = px(landmarks[LM.leftHip]);
    const rh = px(landmarks[LM.rightHip]);
    const lk = px(landmarks[LM.leftKnee]);
    const rk = px(landmarks[LM.rightKnee]);
    const le = px(landmarks[LM.leftElbow]);

    const shoulderY = (ls.y + rs.y) / 2;
    const hipY = (lh.y + rh.y) / 2;
    const kneeY = (lk.y + rk.y) / 2;
    const centreX = (ls.x + rs.x + lh.x + rh.x) / 4;
    const torso = Math.max(1, hipY - shoulderY);

    /**
     * Chest just below the armpit, where the arms have cleared the ribs.
     *
     * A fixed fraction of torso length put this level inside the armpit on
     * every male profile, and the torso run there spans from one arm to the
     * other — a 100 cm chest measured 139. The separation row is found on the
     * silhouette itself, so it also adapts to how far the arms were held out.
     */
    const separation = armSeparationRow(mask, shoulderY, hipY - torso * 0.1);
    const chestY = separation !== null
        ? separation + torso * 0.06
        : shoulderY + torso * 0.28;
    // Natural waist: the narrowest torso row between ribs and pelvis, found on
    // the silhouette rather than assumed at a fixed fraction.
    const waistY = narrowestRow(mask, shoulderY + torso * 0.48, hipY - torso * 0.02, centreX);
    // Hips at the widest row of the seat, just below the hip joints.
    const hipsY = widestRow(mask, hipY, hipY + Math.max(1, (kneeY - hipY) * 0.22), centreX);
    // Mid upper-arm, between shoulder and elbow.
    const upperArmY = (ls.y + le.y) / 2;
    // Upper thigh, below the crotch so the two legs are separate.
    const thighY = hipY + (kneeY - hipY) * 0.28;

    return { centreX, chestY, waistY, hipsY, upperArmY, thighY, torsoSpanPx: torso };
}

/** Confidence from band agreement, mask crispness and landmark visibility. */
function confidenceOf(dispersionFront: number, dispersionSide: number, sharpness: number, vis: number): number {
    const bandAgreement = 1 - Math.min(1, (dispersionFront + dispersionSide) / 2 / 0.25);
    return Math.max(0, Math.min(1, bandAgreement * 0.5 + sharpness * 0.3 + vis * 0.2));
}

/**
 * Front width and side depth at each region, then an ellipse through them.
 *
 * The entered height is the only metric reference in the pipeline: the
 * silhouette's pixel height maps to it, and everything else is measured in
 * those pixels. Nothing is estimated from the image that the athlete was asked
 * to type in.
 */
export function measureFromPhotos(
    front: ShotAnalysis,
    side: ShotAnalysis,
    heightCm: number,
): PhotoMeasurementResult {
    const rejections = [...validateShot(front), ...validateShot(side)];

    const frontExtent = silhouetteExtent(front.mask);
    const sideExtent = silhouetteExtent(side.mask);
    const frontHeightPx = frontExtent.bottomY - frontExtent.topY;
    const sideHeightPx = sideExtent.bottomY - sideExtent.topY;

    if (!(heightCm > 0)) {
        rejections.push({ code: 'scale_mismatch', shot: 'both', detail: 'no height entered' });
    }
    if (frontHeightPx > 0 && sideHeightPx > 0) {
        // Both photos show the same person, so their silhouettes should be a
        // similar share of the frame. A large disagreement means one shot was
        // taken from a different distance, and the two scales cannot be mixed.
        const frontShare = frontHeightPx / front.mask.height;
        const sideShare = sideHeightPx / side.mask.height;
        const disagreement = Math.abs(frontShare - sideShare) / Math.max(frontShare, sideShare);
        if (disagreement > QUALITY.maxScaleDisagreement) {
            rejections.push({ code: 'scale_mismatch', shot: 'both', detail: `${(disagreement * 100).toFixed(0)}%` });
        }
    }

    if (rejections.length) return { ok: false, rejections };

    const frontCmPerPx = heightCm / frontHeightPx;
    const sideCmPerPx = heightCm / sideHeightPx;

    const fl = locate(front);
    const sl = locate(side);
    const frontSharp = edgeSharpness(front.mask, front.probability);
    const sideSharp = edgeSharpness(side.mask, side.probability);

    // Band half-heights scale with the torso so they cover the same anatomy on
    // a short athlete and a tall one.
    const band = Math.max(2, fl.torsoSpanPx * 0.035);
    const limbBand = Math.max(2, fl.torsoSpanPx * 0.025);

    const regions = {} as Record<FitRegion, RegionEstimate>;

    const torsoRegions: Array<[FitRegion, keyof Levels, number]> = [
        ['chest', 'chestY', band],
        ['waist', 'waistY', band],
        ['hips', 'hipsY', band],
    ];

    for (const [region, key, half] of torsoRegions) {
        const f = sampleBand(front.mask, fl[key] as number, half, (y) => torsoRun(front.mask, y, fl.centreX));
        const s = sampleBand(side.mask, sl[key] as number, half, (y) => torsoRun(side.mask, y, sl.centreX));
        const widthCm = f.widthPx * frontCmPerPx;
        const depthCm = s.widthPx * sideCmPerPx;
        regions[region] = {
            region,
            widthCm, depthCm,
            valueCm: circumferenceFor(region, widthCm, depthCm),
            confidence: confidenceOf(f.dispersion, s.dispersion, (frontSharp + sideSharp) / 2,
                Math.min(visibility(front.landmarks[LM.leftShoulder]), visibility(front.landmarks[LM.leftHip]))),
        };
    }

    /**
     * Limbs are measured on one side only.
     *
     * Averaging the two arms across a silhouette mixes a near limb with a far
     * one on anything but a perfectly square shot. The athlete's left is used
     * consistently, and the side photo gives the depth of the same limb.
     */
    const limbs: Array<[FitRegion, number]> = [
        ['upperArm', fl.upperArmY],
        ['thigh', fl.thighY],
    ];
    for (const [region, y] of limbs) {
        const f = sampleBand(front.mask, y, limbBand, (row) => limbRun(front.mask, row, fl.centreX, 'left'));
        const sideY = region === 'upperArm' ? sl.upperArmY : sl.thighY;
        // In profile the limb sits in front of or behind the trunk, so the
        // torso run is the only reliable depth reference at that level.
        const s = sampleBand(side.mask, sideY, limbBand, (row) => torsoRun(side.mask, row, sl.centreX));
        const widthCm = f.widthPx * frontCmPerPx;
        // A limb's depth is not the trunk's depth; it is close to its own width
        // in front view, which is why limbs carry lower confidence than torso.
        const depthCm = Number.isFinite(s.widthPx) ? Math.min(widthCm * 1.12, s.widthPx * sideCmPerPx) : widthCm;
        regions[region] = {
            region,
            widthCm, depthCm,
            valueCm: circumferenceFor(region, widthCm, depthCm),
            confidence: confidenceOf(f.dispersion, s.dispersion, (frontSharp + sideSharp) / 2,
                visibility(front.landmarks[region === 'upperArm' ? LM.leftElbow : LM.leftKnee])) * 0.85,
        };
    }

    const missing = FIT_REGIONS.filter((r) => !Number.isFinite(regions[r]?.valueCm));
    if (missing.length) {
        return {
            ok: false,
            rejections: [{ code: 'unreliable_segmentation', shot: 'both', detail: missing.join(', ') }],
        };
    }

    const overallConfidence =
        FIT_REGIONS.reduce((sum, r) => sum + regions[r].confidence, 0) / FIT_REGIONS.length;

    return {
        ok: true,
        scale: { frontCmPerPx, sideCmPerPx },
        regions,
        overallConfidence,
    };
}
