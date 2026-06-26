'use server';
/**
 * @fileOverview A flow to get nutritional information for a list of meal items.
 *
 * - logPlannedMeal - Takes a list of food item names and returns their nutritional info.
 * - LogPlannedMealInput - The input type for the function.
 * - LogPlannedMealOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit-instance';
import { z } from 'zod';
import { NutritionInfoOutputSchema } from '@/ai/schemas';

const LogPlannedMealInputSchema = z.object({
  items: z.array(z.string()).describe("A list of food item names, e.g., ['1 cup of oatmeal', 'a banana', '1 scoop of protein powder']"),
});
export type LogPlannedMealInput = z.infer<typeof LogPlannedMealInputSchema>;

export type LogPlannedMealOutput = z.infer<typeof NutritionInfoOutputSchema>;


const nutritionPrompt = ai.definePrompt(
  {
    name: 'plannedMealNutritionPrompt',
    input: { schema: LogPlannedMealInputSchema },
    output: { schema: NutritionInfoOutputSchema },
    model: 'googleai/gemini-1.5-flash',
  },
  `You are a nutrition expert. Given a list of food items, provide the estimated nutritional information for the entire meal.
  
  The user has provided the following items for one meal:
  {{#each items}}
  - {{{this}}}
  {{/each}}
  
  Return the nutritional information as a list of items identified from the input. For portion sizes, use your best estimation based on the description (e.g., 'a banana' is one medium banana).
  If a quantity is specified (e.g., '1 cup of milk'), use that. If no quantity is specified for an item, assume a standard single serving size.
`
);

const logPlannedMealFlow = ai.defineFlow(
  {
    name: 'logPlannedMealFlow',
    inputSchema: LogPlannedMealInputSchema,
    outputSchema: NutritionInfoOutputSchema,
  },
  async (input) => {
    const { output } = await nutritionPrompt(input);
    if (!output) {
      throw new Error('The AI failed to provide nutritional information for the meal.');
    }
    return output;
  }
);

export async function logPlannedMeal(input: LogPlannedMealInput): Promise<LogPlannedMealOutput> {
  return logPlannedMealFlow(input);
}
