'use server';
/**
 * @fileOverview AI flow for body-composition analysis (the Body Scanner feature).
 *
 * Reads the athlete's established measurements — from a tape, or from the
 * geometric photo pipeline in `lib/body-photo` after they confirmed them — and
 * produces body fat %, per-zone balance scores and sport-specific training
 * recommendations. PRO-only.
 *
 * This flow does not measure. It used to: the prompt told the model to
 * "estimate them from the photos and proceed — never refuse", which produced
 * circumferences with no scale reference, no geometry and an explicit
 * instruction never to decline. Measurement is now geometric, and its output
 * can never be overwritten from here.
 *
 * - analyzeBody - Runs the analysis.
 * - BodyAnalysisInput / BodyAnalysisOutput - I/O types.
 */

import { ai, VISION_MODEL } from '@/ai/genkit-instance';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase-admin';
import { assertProAccess } from '@/lib/server-access';

/**
 * The schemas stay local to this file on purpose.
 *
 * A `'use server'` module may only export async functions. The check runs when
 * the module is first loaded on the server, not at build time, so exporting a
 * Zod object here still compiled and still deployed — and then threw
 * `A "use server" file can only export async functions, found object` on the
 * very first call, before a single line of the flow ran. Every export of the
 * module failed the same way, which is why the analysis always came back as
 * "the AI could not complete the analysis" no matter what was typed in.
 *
 * The inferred `type` exports below are erased at compile time and are fine.
 */
const ZONE_ENUM = z.enum(['shoulders', 'chest', 'arms', 'core', 'back', 'legs']);

const BodyAnalysisInputSchema = z.object({
  userId: z.string().describe('The ID of the user requesting the analysis.'),
  unitSystem: z.enum(['metric', 'imperial']).describe('Unit system the measurements are expressed in.'),
  sport: z.string().optional().describe("The user's primary sport, for tailoring recommendations."),
  measurements: z
    .object({
      height: z.number().optional(),
      weight: z.number().optional(),
      chest: z.number().optional(),
      waist: z.number().optional(),
      hips: z.number().optional(),
      arms: z.number().optional(),
      thighs: z.number().optional(),
    })
    .describe(
      'Body measurements, already established before this flow runs — either measured with a tape or produced by the geometric photo pipeline and confirmed by the athlete. Lengths in cm (metric) or in (imperial); weight in kg or lb. These are inputs to the analysis and must never be altered or invented here.'
    ),
  frontPhotoUri: z
    .string()
    .optional()
    .describe("Optional front-facing body photo as a data URI: 'data:<mimetype>;base64,<data>'."),
  sidePhotoUri: z
    .string()
    .optional()
    .describe('Optional side-profile body photo as a data URI.'),
});
export type BodyAnalysisInput = z.infer<typeof BodyAnalysisInputSchema>;

const BodyAnalysisOutputSchema = z.object({
  bodyFatEstimate: z.number().describe('Estimated body fat percentage (single best estimate).'),
  bodyFatRange: z.string().describe('A short plausible range, e.g. "12–15%".'),
  zoneScores: z
    .array(
      z.object({
        zone: ZONE_ENUM,
        score: z.number().min(0).max(100).describe('Development/balance score for this zone, 0–100.'),
      })
    )
    .describe('One entry per muscle zone: shoulders, chest, arms, core, back, legs.'),
  strongPoints: z.array(z.string()).describe('2–4 standout strengths of this physique.'),
  weakPoints: z.array(z.string()).describe('2–4 areas that need the most work.'),
  recommendations: z.array(z.string()).describe('3–5 concrete, sport-specific training recommendations.'),
  summary: z.string().describe('A short, encouraging 1–2 sentence overall summary.'),
});
export type BodyAnalysisOutput = z.infer<typeof BodyAnalysisOutputSchema>;

const bodyAnalysisPrompt = ai.definePrompt(
  {
    name: 'bodyAnalysisPrompt',
    input: { schema: BodyAnalysisInputSchema.omit({ userId: true }) },
    output: { schema: BodyAnalysisOutputSchema },
    model: VISION_MODEL,
  },
  `You are a world-class body-composition analyst and strength & conditioning coach.
Analyze the athlete's physique from the measurements (and photos, if provided) and return a structured assessment.

The measurements below are FIXED INPUTS. They were either measured with a tape or
computed geometrically from the photographs and confirmed by the athlete. You are
not a measuring instrument: never restate, adjust, second-guess or invent a
circumference, and never output a measurement of your own. If a value is absent,
work without it and say what you could not assess.

Unit system: {{unitSystem}}  (lengths are cm/in, weight is kg/lb)
Primary sport: {{#if sport}}{{sport}}{{else}}general athletic development{{/if}}

Measurements (fixed inputs — never alter or infer these):
- Height: {{#if measurements.height}}{{measurements.height}}{{else}}not provided{{/if}}
- Weight: {{#if measurements.weight}}{{measurements.weight}}{{else}}not provided{{/if}}
- Chest: {{#if measurements.chest}}{{measurements.chest}}{{else}}not provided{{/if}}
- Waist: {{#if measurements.waist}}{{measurements.waist}}{{else}}not provided{{/if}}
- Hips: {{#if measurements.hips}}{{measurements.hips}}{{else}}not provided{{/if}}
- Arms: {{#if measurements.arms}}{{measurements.arms}}{{else}}not provided{{/if}}
- Thighs: {{#if measurements.thighs}}{{measurements.thighs}}{{else}}not provided{{/if}}

{{#if frontPhotoUri}}Front photo:
{{media url=frontPhotoUri}}
{{/if}}
{{#if sidePhotoUri}}Side photo:
{{media url=sidePhotoUri}}
{{/if}}

Instructions:
0. Treat every measurement above as given. Do not produce circumferences of your own; if one is missing, reason without it and note the limitation in the summary.
1. Estimate body fat % from waist-to-height/hip ratios and the photos if present. Give a single best estimate and a short range.
2. Score each of the six zones (shoulders, chest, arms, core, back, legs) 0–100 for development and balance relative to the rest of the physique. Provide ALL six zones.
3. List 2–4 strong points and 2–4 weak points in plain, specific language.
4. Give 3–5 concrete training recommendations tailored to the athlete's sport ({{#if sport}}{{sport}}{{else}}general athletic development{{/if}}) that target the weakest zones.
5. Keep tone encouraging and professional. Never give medical or eating-disorder advice; focus on training and proportion.
`
);

const analyzeBodyFlow = ai.defineFlow(
  {
    name: 'analyzeBodyFlow',
    inputSchema: BodyAnalysisInputSchema,
    outputSchema: BodyAnalysisOutputSchema,
  },
  async (input) => {
    // Server-side PRO gate.
    const userSnap = await adminDb.collection('users').doc(input.userId).get();
    await assertProAccess(input.userId, 'Body Scanner');

    const sport = input.sport || (userSnap.data()?.sport as string | undefined);

    const { userId, ...promptInput } = input;
    const { output } = await bodyAnalysisPrompt({ ...promptInput, sport });

    if (!output) {
      throw new Error('The AI failed to analyze the body scan.');
    }
    return output;
  }
);

export async function analyzeBody(input: BodyAnalysisInput): Promise<BodyAnalysisOutput> {
  return analyzeBodyFlow(input);
}
