import type { TranslationKey } from '@/lib/i18n';

/**
 * Shared geometry + definitions for the Body Scanner wireframe.
 * The wireframe is rendered as an SVG triangulated mesh (no Three.js) so it
 * stays theme-aware (uses `hsl(var(--primary))`) and lets us anchor
 * measurement leader-lines at fixed points.
 */

export const BODY_VIEWBOX = { w: 300, h: 560 } as const;

export type MeasurementUnitSystem = 'metric' | 'imperial';

export type MeasurementId =
  | 'height'
  | 'weight'
  | 'chest'
  | 'waist'
  | 'hips'
  | 'arms'
  | 'thighs';

export interface MeasurementField {
  id: MeasurementId;
  labelKey: TranslationKey;
  /** length = circumference/height, mass = body weight */
  kind: 'length' | 'mass';
  /** rendered as a leader-line label on the body (vs a header stat) */
  onBody: boolean;
}

export const MEASUREMENT_FIELDS: MeasurementField[] = [
  { id: 'height', labelKey: 'measureHeight', kind: 'length', onBody: false },
  { id: 'weight', labelKey: 'measureWeight', kind: 'mass', onBody: false },
  { id: 'chest', labelKey: 'measureChest', kind: 'length', onBody: true },
  { id: 'arms', labelKey: 'measureArms', kind: 'length', onBody: true },
  { id: 'waist', labelKey: 'measureWaist', kind: 'length', onBody: true },
  { id: 'hips', labelKey: 'measureHips', kind: 'length', onBody: true },
  { id: 'thighs', labelKey: 'measureThighs', kind: 'length', onBody: true },
];

export type Measurements = Record<MeasurementId, number>;

export function unitLabel(kind: 'length' | 'mass', system: MeasurementUnitSystem): string {
  if (kind === 'mass') return system === 'metric' ? 'kg' : 'lb';
  return system === 'metric' ? 'cm' : 'in';
}

/* ------------------------------------------------------------------ */
/* Muscle zones (AI scores each 0–100; tinted on the body in results) */
/* ------------------------------------------------------------------ */

export type BodyZoneId = 'shoulders' | 'chest' | 'arms' | 'core' | 'back' | 'legs';

export const ZONE_IDS: BodyZoneId[] = ['shoulders', 'chest', 'arms', 'core', 'back', 'legs'];

export interface ZoneDef {
  id: BodyZoneId;
  labelKey: TranslationKey;
  /** which view the zone tint shows on */
  view: 'front' | 'back' | 'both';
  blobs: { cx: number; cy: number; rx: number; ry: number }[];
}

export const ZONES: ZoneDef[] = [
  { id: 'shoulders', labelKey: 'zoneShoulders', view: 'both', blobs: [{ cx: 150, cy: 120, rx: 50, ry: 16 }] },
  { id: 'chest', labelKey: 'zoneChest', view: 'front', blobs: [{ cx: 150, cy: 166, rx: 40, ry: 26 }] },
  {
    id: 'arms',
    labelKey: 'zoneArms',
    view: 'both',
    blobs: [
      { cx: 96, cy: 190, rx: 14, ry: 52 },
      { cx: 204, cy: 190, rx: 14, ry: 52 },
    ],
  },
  { id: 'core', labelKey: 'zoneCore', view: 'front', blobs: [{ cx: 150, cy: 250, rx: 34, ry: 30 }] },
  { id: 'back', labelKey: 'zoneBack', view: 'back', blobs: [{ cx: 150, cy: 190, rx: 46, ry: 56 }] },
  {
    id: 'legs',
    labelKey: 'zoneLegs',
    view: 'both',
    blobs: [
      { cx: 134, cy: 400, rx: 18, ry: 84 },
      { cx: 166, cy: 400, rx: 18, ry: 84 },
    ],
  },
];

/** Strong = green, average = amber, weak = rose. */
export function zoneColor(score: number): string {
  if (score >= 70) return '#22c55e';
  if (score >= 45) return '#eab308';
  return '#f43f5e';
}

export function zoneStatusKey(score: number): TranslationKey {
  if (score >= 70) return 'zoneStrong';
  if (score >= 45) return 'zoneAverage';
  return 'zoneWeak';
}

/* ------------------------------------------------------------------ */
/* SVG silhouette shapes — union forms the clip + the bright outline    */
/* ------------------------------------------------------------------ */

export type BodyShape =
  | { type: 'circle'; cx: number; cy: number; r: number }
  | { type: 'polygon'; points: string };

export const BODY_SHAPES: BodyShape[] = [
  { type: 'circle', cx: 150, cy: 56, r: 30 }, // head
  { type: 'polygon', points: '138,84 162,84 162,104 138,104' }, // neck
  // torso: wide shoulders → narrow waist → hips
  { type: 'polygon', points: '108,104 192,104 198,128 182,210 174,258 188,300 112,300 126,258 118,210 102,128' },
  { type: 'polygon', points: '100,118 120,126 104,258 86,254' }, // left arm
  { type: 'polygon', points: '200,118 180,126 196,258 214,254' }, // right arm
  { type: 'polygon', points: '112,300 150,304 146,420 140,540 116,540 120,420' }, // left leg
  { type: 'polygon', points: '188,300 150,304 154,420 160,540 184,540 180,420' }, // right leg
];

/** Spine + lat hint lines drawn only on the back view. */
export const BACK_DETAIL_LINES: { x1: number; y1: number; x2: number; y2: number }[] = [
  { x1: 150, y1: 110, x2: 150, y2: 300 }, // spine
  { x1: 132, y1: 150, x2: 124, y2: 230 }, // left lat
  { x1: 168, y1: 150, x2: 176, y2: 230 }, // right lat
];

/**
 * Triangular lattice covering the body's bounding box. The component clips it
 * to the silhouette, so overflow outside the body is hidden — this produces the
 * low-poly "mesh" look without hand-placing every triangle.
 */
export function triangleLattice(step = 18): { x1: number; y1: number; x2: number; y2: number }[] {
  const xMin = 78;
  const xMax = 222;
  const yMin = 22;
  const yMax = 548;
  const span = yMax - yMin;
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];

  // horizontals
  for (let y = yMin; y <= yMax; y += step) lines.push({ x1: xMin, y1: y, x2: xMax, y2: y });

  // diagonals (slope +1 and -1) → triangles
  for (let o = xMin - span; o <= xMax; o += step) {
    lines.push({ x1: o, y1: yMin, x2: o + span, y2: yMax }); // "\"
    lines.push({ x1: o + span, y1: yMin, x2: o, y2: yMax }); // "/"
  }
  return lines;
}

/* ------------------------------------------------------------------ */
/* Measurement leader-line anchors (front view)                        */
/* ------------------------------------------------------------------ */

export interface MeasurementAnchor {
  x: number;
  y: number;
  side: 'left' | 'right';
}

export const MEASUREMENT_ANCHORS: Partial<Record<MeasurementId, MeasurementAnchor>> = {
  chest: { x: 182, y: 162, side: 'right' },
  arms: { x: 92, y: 190, side: 'left' },
  waist: { x: 178, y: 256, side: 'right' },
  hips: { x: 116, y: 300, side: 'left' },
  thighs: { x: 166, y: 392, side: 'right' },
};
