'use server';

/**
 * Food photo scanning.
 *
 * Two stages, deliberately separated:
 *
 *  1. A vision model looks at the photo and answers one question — which foods
 *     are on the plate, and roughly how many grams of each. That is what a
 *     vision model is genuinely good at.
 *  2. Those names are looked up in the bundled 34k-item food dataset that
 *     already ships with the app, and the macros are computed from the matched
 *     entry. Only the local dataset is consulted: it answers without a network
 *     call or a rate limit, which matters when a scan looks up several foods
 *     at once.
 *
 * The previous implementation asked the model for calories and macros directly
 * and logged whatever came back. Those numbers read like data but are a guess,
 * and they were what the athlete ended up with in their daily totals. Anything
 * the database cannot match is now returned marked `estimate`, so the UI can
 * say so rather than presenting it as fact.
 */

import { ai, VISION_MODEL } from '@/ai/genkit-instance';
import { matchFood } from '@/lib/food-match';
import {
  FoodVisionOutputSchema,
  ScanMealOutputSchema,
  type DetectedFood,
  type ScanMealOutput,
  type ScannedFood,
} from '@/ai/schemas';
import { z } from 'zod';

const ScanInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe("A photo of a meal as a data URI: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type ScanInput = z.infer<typeof ScanInputSchema>;

/**
 * Below this the model is guessing at something it cannot really see, and a
 * wrong food silently added to a day's totals is worse than one left out.
 * Borderline items still come back — the UI flags them for confirmation.
 */
const MIN_CONFIDENCE = 0.35;

const visionPrompt = ai.definePrompt(
  {
    name: 'foodVisionPrompt',
    input: { schema: ScanInputSchema },
    output: { schema: FoodVisionOutputSchema },
    // A vision model, not the text-lite one. The old nutrition flow sent every
    // photo to TEXT_MODEL, which is not what that model is for.
    model: VISION_MODEL,
  },
  `You identify food in photographs for a nutrition tracker.

List every distinct food you can see on the plate. For each one:

- Give the most specific name you can justify from the image. "grilled chicken
  breast" rather than "meat"; "cooked white rice" rather than "rice". State the
  cooking method when it is visible, because it changes the nutrition.
- Estimate the edible weight in grams, using the plate, cutlery and container
  as scale references. Estimate the portion actually present, not a typical
  serving size.
- Give a confidence between 0 and 1. Be honest: a blurred or partly hidden food
  deserves a low number.

Do not report calories or macronutrients — those are looked up separately.
Do not invent foods you cannot see. If the photo contains no food at all,
return an empty list.

Photo: {{media url=photoDataUri}}`
);

/** Look one detected food up in the bundled database. */
function lookup(food: DetectedFood): ScannedFood {
  const grams = Math.max(0, Math.round(food.estimatedGrams));
  const best = matchFood(food.name);

  if (!best) {
    // No match: return zeros marked as an estimate rather than inventing
    // numbers. The UI shows this as needing manual entry.
    return {
      name: food.name,
      grams,
      confidence: food.confidence,
      source: 'estimate',
      per100g: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
    };
  }

  // The importer reads the dataset's `*_100g` columns, so these values are
  // already per 100 g. `pt` on a record is an informational serving size, not
  // the basis of its figures — rescaling by it would corrupt every entry whose
  // serving is not 100 g.
  const num = (value: number | undefined) => (Number.isFinite(value) ? Number(value) : 0);

  return {
    name: food.name,
    matchedName: best.b ? `${best.n} — ${best.b}` : best.n,
    grams,
    confidence: food.confidence,
    source: 'database',
    per100g: {
      calories: num(best.c),
      protein: num(best.p),
      carbs: num(best.g),
      fat: num(best.f),
      // The bundled dataset carries no fibre column, so this is honestly zero
      // rather than a guess. Nothing downstream presents it as measured.
      fiber: 0,
      sugar: num(best.s),
      sodium: num(best.so),
    },
  };
}

const scanMealFlow = ai.defineFlow(
  {
    name: 'scanMealFlow',
    inputSchema: ScanInputSchema,
    outputSchema: ScanMealOutputSchema,
  },
  async (input): Promise<ScanMealOutput> => {
    if (!input.photoDataUri?.startsWith('data:')) {
      throw new Error('A photo is required to scan a meal.');
    }

    const { output } = await visionPrompt(input);
    if (!output) {
      throw new Error('The vision model returned nothing for this photo.');
    }

    const detected = output.foods.filter((f) => f.confidence >= MIN_CONFIDENCE && f.estimatedGrams > 0);

    if (detected.length === 0) {
      return { foods: [], noFoodDetected: true };
    }

    return { foods: detected.map(lookup), noFoodDetected: false };
  }
);

export async function scanMeal(input: ScanInput): Promise<ScanMealOutput> {
  return scanMealFlow(input);
}
