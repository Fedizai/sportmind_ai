/**
 * Pure, dependency-free landmark constants for the 3D body scanner.
 *
 * Kept separate from `human-geometry.ts` so files that only need positions
 * (e.g. the measurement-ring overlay) can import these without pulling Three.js
 * into the bundle. All values are in model-space units (Y up, +Z = front),
 * the same space the procedural mesh is built in.
 */

import type { MeasurementId } from '@/lib/body-zones';

/** Vertical extent of the mesh, used for camera framing + scan sweep range. */
export const BODY_TOP_Y = 2.42;
export const BODY_BOTTOM_Y = -2.16;
export const BODY_HEIGHT = BODY_TOP_Y - BODY_BOTTOM_Y;
export const BODY_CENTER_Y = (BODY_TOP_Y + BODY_BOTTOM_Y) / 2;

/** A horizontal measuring band hugging the body at a given height. */
export interface BodyRing {
  id: Extract<MeasurementId, 'chest' | 'waist' | 'hips'> | 'shoulders';
  /** measurement field this ring visualises (shoulders reuses the chest input) */
  source: MeasurementId;
  y: number;
  /** half-width on X (left↔right) */
  radiusX: number;
  /** half-depth on Z (front↔back) — torso is flattened, so < radiusX */
  radiusZ: number;
  /** which side the leader label sits on */
  side: 'left' | 'right';
}

/**
 * Four measuring bands, top → bottom. `source` maps each band to the form
 * field whose value is shown; the ring geometry hugs the mesh regardless of
 * the entered number so the body always looks measured.
 */
export const BODY_RINGS: BodyRing[] = [
  { id: 'shoulders', source: 'chest', y: 1.46, radiusX: 0.7, radiusZ: 0.3, side: 'right' },
  { id: 'chest', source: 'chest', y: 1.16, radiusX: 0.52, radiusZ: 0.3, side: 'left' },
  { id: 'waist', source: 'waist', y: 0.58, radiusX: 0.34, radiusZ: 0.22, side: 'right' },
  { id: 'hips', source: 'hips', y: 0.14, radiusX: 0.46, radiusZ: 0.26, side: 'left' },
];

/** Camera azimuth (radians) the body group rotates to for each named view. */
export const VIEW_ROTATION: Record<'front' | 'side' | 'back', number> = {
  front: 0,
  side: Math.PI / 2,
  back: Math.PI,
};
