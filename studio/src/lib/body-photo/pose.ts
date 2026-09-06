'use client';

import type { PoseLandmarker as PoseLandmarkerType } from '@mediapipe/tasks-vision';

import { MEDIAPIPE_WASM_PATH, POSE_MODEL_URL, QUALITY } from './config';
import type { Landmark, ShotKind, Silhouette } from './types';
import type { ShotAnalysis } from './measure';

/**
 * The vision runtime, loaded once.
 *
 * `numPoses: 2` on purpose — one is the subject, and the second slot exists so
 * a bystander can be *detected* and the shot refused. Asking for one pose would
 * silently measure whichever person the model liked best.
 *
 * The segmentation mask comes from the same pass as the landmarks, so the
 * silhouette and the joints can never disagree about which person they describe.
 */
let landmarkerPromise: Promise<PoseLandmarkerType> | null = null;

export function loadPoseLandmarker(): Promise<PoseLandmarkerType> {
    landmarkerPromise ??= (async () => {
        const vision = await import('@mediapipe/tasks-vision');
        const fileset = await vision.FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH);
        return vision.PoseLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: 'GPU' },
            runningMode: 'IMAGE',
            numPoses: 2,
            minPoseDetectionConfidence: QUALITY.minPoseConfidence,
            minPosePresenceConfidence: QUALITY.minPoseConfidence,
            outputSegmentationMasks: true,
        });
    })();
    return landmarkerPromise;
}

/** Free the GPU resources when the scanner closes. */
export function releasePoseLandmarker() {
    landmarkerPromise?.then((l) => l.close()).catch(() => undefined);
    landmarkerPromise = null;
}

/**
 * Variance of the Laplacian — the standard sharpness measure.
 *
 * A crisp photo has strong second derivatives at every edge; a soft one does
 * not. Computed on luma at reduced size, because the number only has to
 * separate "sharp enough to trust the silhouette edge" from "not".
 */
export function blurVariance(image: ImageData): number {
    const { width, height, data } = image;
    const luma = new Float32Array(width * height);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        luma[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    let sum = 0;
    let sumSq = 0;
    let n = 0;
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const i = y * width + x;
            const lap =
                luma[i - width] + luma[i + width] + luma[i - 1] + luma[i + 1] - 4 * luma[i];
            sum += lap;
            sumSq += lap * lap;
            n++;
        }
    }
    if (!n) return 0;
    const mean = sum / n;
    return sumSq / n - mean * mean;
}

/** Draw a source image into a canvas at a working size and read it back. */
function toImageData(source: HTMLImageElement | HTMLVideoElement, maxSide = 640) {
    const w = 'naturalWidth' in source ? source.naturalWidth : source.videoWidth;
    const h = 'naturalHeight' in source ? source.naturalHeight : source.videoHeight;
    const scale = Math.min(1, maxSide / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Run one photograph through the model.
 *
 * The mask arrives as per-pixel confidence. Thresholding at 0.5 gives the
 * silhouette the geometry works on, and the raw probabilities are kept so
 * `edgeSharpness` can tell a decisive boundary from a smeared one — a soft
 * edge is the single largest error source in the whole pipeline.
 */
export async function analyseShot(
    source: HTMLImageElement | HTMLVideoElement,
    kind: ShotKind,
): Promise<ShotAnalysis> {
    const landmarker = await loadPoseLandmarker();
    const result = landmarker.detect(source);

    const maskImage = result.segmentationMasks?.[0];
    let mask: Silhouette = { width: 0, height: 0, data: new Uint8Array(0) };
    let probability: Float32Array | undefined;

    if (maskImage) {
        const floats = maskImage.getAsFloat32Array();
        const width = maskImage.width;
        const height = maskImage.height;
        const data = new Uint8Array(width * height);
        for (let i = 0; i < floats.length; i++) data[i] = floats[i] > 0.5 ? 1 : 0;
        mask = { width, height, data };
        probability = Float32Array.from(floats);
        maskImage.close();
    }

    const landmarks: Landmark[] = (result.landmarks?.[0] ?? []).map((l) => ({
        x: l.x, y: l.y, z: l.z, visibility: (l as { visibility?: number }).visibility ?? 0,
    }));

    return {
        kind,
        mask,
        probability,
        landmarks,
        poseCount: result.landmarks?.length ?? 0,
        blurVariance: blurVariance(toImageData(source)),
    };
}

/** Decode a data URI or object URL into an image the model can read. */
export function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Could not read the photo.'));
        img.src = src;
    });
}
