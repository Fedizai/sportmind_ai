'use server';
/**
 * @fileOverview A nutrition analysis AI flow that can identify foods from
 * text or images and estimate their nutritional content.
 *
 * - getNutritionInfo - Analyzes food from text or an image.
 * - NutritionInfoInput - The input type for the getNutritionInfo function.
 * - NutritionInfoOutput - The return type for the getNutritionInfo function.
 */

import { ai, TEXT_MODEL } from '@/ai/genkit-instance';
import {
    NutritionInfoInputSchema,
    NutritionInfoOutputSchema,
    type NutritionInfoInput,
    type NutritionInfoOutput,
} from '@/ai/schemas';
import { z } from 'zod';

/**
 * Text description of a meal -> nutrition estimate.
 *
 * Photos no longer come through here: they go to scanMeal, which uses a vision
 * model and looks the macros up in the food database instead of taking the
 * model's word for them. This path stays for typed queries, where there is no
 * image to look at and the description is all there is to work from.
 */
const nutritionPrompt = ai.definePrompt(
  {
    name: 'nutritionPrompt',
    input: { schema: NutritionInfoInputSchema },
    output: { schema: NutritionInfoOutputSchema },
    model: TEXT_MODEL,
  },
  `You are an expert nutritionist. Analyze the user's input, which can be either a text description of a meal or a photo of a meal. Identify the food items and estimate their nutritional information.

Return the nutritional information as a list of items. For portion sizes, use your best estimation based on the description or image.

{{#if photoDataUri}}
Analyze the following image:
{{media url=photoDataUri}}
{{/if}}

{{#if query}}
Analyze the following text: "{{query}}"
{{/if}}
`
);

const getNutritionInfoFlow = ai.defineFlow(
    {
        name: 'getNutritionInfoFlow',
        inputSchema: NutritionInfoInputSchema,
        outputSchema: NutritionInfoOutputSchema,
    },
    async (input) => {
        if (!input.query && !input.photoDataUri) {
            throw new Error('Either a text query or a photo is required.');
        }

        const { output } = await nutritionPrompt(input);
        
        if (!output) {
            throw new Error('The AI failed to provide nutritional information.');
        }
        
        return output;
    }
);

export async function getNutritionInfo(input: NutritionInfoInput): Promise<NutritionInfoOutput> {
    return getNutritionInfoFlow(input);
}
