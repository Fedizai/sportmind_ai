'use server';
/**
 * @fileOverview AI flow for body-composition analysis (the Body Scanner feature).
 *
 * Combines manual measurements with optional front/side photos to estimate
 * body fat %, score muscle balance per zone, and produce sport-specific
 * training recommendations. PRO-only.
 *
 * - analyzeBody - Runs the analysis.
 * - BodyAnalysisInput / BodyAnalysisOutput - I/O types.
 */

import { ai } from '@/ai/genkit-instance';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase-admin';

const ZONE_ENUM = z.enum(['shoulders', 'chest', 'arms', 'core', 'back', 'legs']);

export const BodyAnalysisInputSchema = z.object({
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
      'Body measurements (any subset). Lengths in cm (metric) or in (imperial); weight in kg or lb. Missing values should be estimated from the photos.'
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

export const BodyAnalysisOutputSchema = z.object({
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
    model: 'googleai/gemini-1.5-flash',
  },
  `You are a world-class body-composition analyst and strength & conditioning coach.
Analyze the athlete's physique from the measurements (and photos, if provided) and return a structured assessment.

Unit system: {{unitSystem}}  (lengths are cm/in, weight is kg/lb)
Primary sport: {{#if sport}}{{sport}}{{else}}general athletic development{{/if}}

Measurements (any missing value must be estimated from the photos):
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
0. If some or all measurements are "not provided", estimate them from the photos and proceed — never refuse. Base the analysis on whatever data is available (photos and/or numbers).
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
    if (!userSnap.exists || userSnap.data()?.plan !== 'pro') {
      throw new Error('Access denied: Body Scanner is only available for Pro plan users.');
    }

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
