
'use server';
/**
 * @fileOverview A flow to generate a personalized nutrition plan.
 *
 * - generateNutritionPlan - Creates a daily meal plan based on user goals.
 * - NutritionPlanInput - The input type for the generateNutritionPlan function.
 * - NutritionPlanOutput - The return type for the generateNutritionPlan function.
 */

import { ai, TEXT_MODEL } from '@/ai/genkit-instance';
import { z } from 'zod';
import {
    NutritionPlanInputSchema,
    NutritionPlanOutputSchema,
    type NutritionPlanInput,
    type NutritionPlanOutput,
} from '@/ai/schemas';
import { assertProAccess } from '@/lib/server-access';

const nutritionPlanPrompt = ai.definePrompt(
    {
        name: 'generateNutritionPlanPrompt',
        input: { schema: NutritionPlanInputSchema.omit({ userId: true }) },
        output: { schema: NutritionPlanOutputSchema },
        model: TEXT_MODEL,
    },
    `You are an expert nutritionist. A user wants a 1-day meal plan.

    User's Goal: {{goal}}
    Target Calories: {{calories}}
    Dietary Needs: {{#if dietaryNeeds}}{{dietaryNeeds}}{{else}}None{{/if}}

    Instructions:
    1. Create a balanced 1-day meal plan with 4 meals: Breakfast, Lunch, Dinner, and a Snack.
    2. The total calories for the day should be approximately {{calories}} kcal.
    3. For each meal, provide a short description, an estimated calorie count, estimated grams of protein, and its ingredients.
    4. Give every ingredient as three separate fields: the food's name with no quantity in it, a numeric quantity, and a unit.
       - Use "g" for solids and "ml" for liquids. Convert household measures yourself: "1 cup of rolled oats" becomes name "Rolled oats", quantity 80, unit "g".
       - Use "piece" ONLY for items a shop sells one at a time and never weighs, such as eggs. Anything sold by weight — including fruit and vegetables like apples, bananas or broccoli — must be given in grams, using a realistic weight for one of them (a medium apple is about 180 g, a banana about 120 g).
       - Name plain shopping ingredients ("Chicken breast", "Greek yogurt", "Olive oil"), not prepared dishes, so the ingredients can be bought.
    5. Ensure the plan is healthy, balanced, and considers the user's goal (e.g., higher protein for muscle gain).
    6. Adhere strictly to the specified dietary needs.
    7. Never mention prices, costs or currency anywhere in the plan. Pricing is calculated separately from real market data.
    8. The output must be a valid JSON object that strictly adheres to the provided schema.
    `
);

const generateNutritionPlanFlow = ai.defineFlow(
    {
        name: 'generateNutritionPlanFlow',
        inputSchema: NutritionPlanInputSchema,
        outputSchema: NutritionPlanOutputSchema,
    },
    async (input) => {
        await assertProAccess(input.userId, 'Meal plan generation');

        const { output } = await nutritionPlanPrompt({ calories: input.calories, dietaryNeeds: input.dietaryNeeds, goal: input.goal });
        if (!output) {
            throw new Error('The AI failed to generate a nutrition plan.');
        }
        return output;
    }
);

export async function generateNutritionPlan(input: NutritionPlanInput): Promise<NutritionPlanOutput> {
    return generateNutritionPlanFlow(input);
}
