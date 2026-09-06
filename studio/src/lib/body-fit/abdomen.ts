import program from './abdomen-program.json';
import type { MorphName, MorphWeights } from './types';

/**
 * One number in, seven influences out.
 *
 * `Waist_Large` is a waist thickener: at full influence it moves the trunk
 * about a centimetre sideways and, from the side, leaves the torso as flat as
 * it started. Driven to its fold point it reaches a 134 cm waist on a body
 * that still has no belly — which is what a 150 kg athlete was being shown.
 *
 * The abdomen is seven targets instead, authored by
 * scripts/body-fit/abdomen-morphs.mjs, and the schedule below is the one the
 * geometry was built for. It is staged rather than proportional because an
 * abdomen does not grow uniformly: a full belly is a fairly even swelling, but
 * past roughly 130 cm the growth is overwhelmingly forward and downward. Width
 * and flanks flatten off — both because that is the shape and because the
 * A-pose forearm passes 42 cm from the centreline at the navel — while
 * projection, depth and the lower abdomen keep going, and the apron appears
 * only at the top of the range.
 */
export const ABDOMEN_MORPHS = program.morphs as readonly MorphName[];

/** The largest belly the meshes are authored for. */
export const BELLY_MAX = program.stops[program.stops.length - 1];

const TABLE = program.program as Record<string, number[]>;

/** What to call a belly of this size, for the fit report. */
export function bellyStage(amount: number): string {
    const stages = program.stages;
    for (let i = stages.length - 1; i >= 0; i--) {
        if (amount >= stages[i].from - 1e-9) return stages[i].name;
    }
    return stages[0].name;
}

/** Influences for one belly amount. Linear between the stops, held past the end. */
export function bellyProgram(amount: number): MorphWeights {
    const t = Math.max(0, Math.min(BELLY_MAX, amount));
    const stops = program.stops;
    const out: MorphWeights = {};
    for (const name of ABDOMEN_MORPHS) {
        const row = TABLE[name];
        let v = row[row.length - 1];
        for (let i = 1; i < stops.length; i++) {
            if (t <= stops[i]) {
                const u = (t - stops[i - 1]) / (stops[i] - stops[i - 1] || 1);
                v = row[i - 1] + u * (row[i] - row[i - 1]);
                break;
            }
        }
        if (v > 0.0005) out[name] = Math.round(v * 10000) / 10000;
    }
    return out;
}
