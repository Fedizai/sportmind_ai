/**
 * The one normalised body profile.
 *
 * Both scanner modes produce this and nothing else: the manual form fills it
 * directly, photo estimation fills it with `estimated: true`. There is a single
 * fitting engine and a single 3D system behind them.
 */
export interface BodyMeasurements {
    heightCm: number;
    /** A body-composition prior only. It never overrides a tape measure. */
    weightKg?: number;
    chestCm?: number;
    waistCm?: number;
    hipsCm?: number;
    upperArmCm?: number;
    thighCm?: number;
}

/** Which GLB the profile is fitted against. */
export type ModelSex = 'male' | 'female';

/** The 27 targets in both meshes, spelled exactly as the GLBs name them. */
export const MORPH_NAMES = [
    'BodyWeight_Low', 'BodyWeight_High',
    'Muscularity_Low', 'Muscularity_High',
    'Height_Short', 'Height_Tall',
    'Chest_Small', 'Chest_Large',
    'Waist_Small', 'Waist_Large',
    'Hips_Small', 'Hips_Large',
    'UpperArm_Small', 'UpperArm_Large',
    'Thigh_Small', 'Thigh_Large',
    'ShoulderWidth_Narrow', 'ShoulderWidth_Wide',
    'Calf_Small', 'Calf_Large',
    /**
     * The abdomen system, written into the meshes by
     * scripts/body-fit/build-glb.mjs. Seven targets rather than one because a
     * belly grows forward, sideways, downward and around the flanks by
     * different amounts, and `Waist_Large` only ever did sideways.
     */
    'AbdomenWidth_Large', 'AbdomenDepth_Large',
    'UpperAbdomen_Large', 'LowerAbdomen_Large',
    'Flanks_Large', 'BellyProjection_Large', 'LowerBellyDrop_Large',
] as const;

export type MorphName = (typeof MORPH_NAMES)[number];
export type MorphWeights = Partial<Record<MorphName, number>>;

/** The five loops the calibration measures, in the table's column order. */
export const FIT_REGIONS = ['chest', 'waist', 'hips', 'upperArm', 'thigh'] as const;
export type FitRegion = (typeof FIT_REGIONS)[number];

export interface FitResult {
    /** Clamped to 0..1, at most one of each opposing pair non-zero. */
    weights: MorphWeights;
    /** What the calibration predicts the fitted body will measure, in cm. */
    predicted: Record<FitRegion, number> & { heightCm: number };
    /** predicted − requested, for any measurement the athlete supplied. */
    residuals: Partial<Record<FitRegion, number>>;
    /** Requested values the mesh cannot reach even at full deflection. */
    outOfRange: FitRegion[];
    /** How far along the abdomen program the fit sits, 0 to BELLY_MAX. */
    belly: number;
    /** What that amount is called: flat, full, large, very large, extreme. */
    bellyStage: string;
}
