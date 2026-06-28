
'use server';
/**
 * @fileOverview A flow to generate a personalized nutrition plan.
 *
 * - generateNutritionPlan - Creates a daily meal plan based on user goals.
 * - NutritionPlanInput - The input type for the generateNutritionPlan function.
 * - NutritionPlanOutput - The return type for the generateNutritionPlan function.
 */

import { ai } from '@/ai/genkit-instance';
import { z } from 'zod';
import {
    NutritionPlanInputSchema,
    NutritionPlanOutputSchema,
    type NutritionPlanInput,
    type NutritionPlanOutput,
} from '@/ai/schemas';
import { adminDb } from '@/lib/firebase-admin';

const nutritionPlanPrompt = ai.definePrompt(
    {
        name: 'generateNutritionPlanPrompt',
        input: { schema: NutritionPlanInputSchema.omit({ userId: true }) },
        output: { schema: NutritionPlanOutputSchema },
        model: 'googleai/gemini-1.5-flash',
    },
    `You are an expert nutritionist. A user wants a 1-day meal plan.

    User's Goal: {{goal}}
    Target Calories: {{calories}}
    Dietary Needs: {{#if dietaryNeeds}}{{dietaryNeeds}}{{else}}None{{/if}}

    Instructions:
    1. Create a balanced 1-day meal plan with 4 meals: Breakfast, Lunch, Dinner, and a Snack.
    2. The total calories for the day should be approximately {{calories}} kcal.
    3. For each meal, provide a short description, an estimated calorie count, and a list of food items.
    4. Ensure the plan is healthy, balanced, and considers the user's goal (e.g., higher protein for muscle gain).
    5. Adhere strictly to the specified dietary needs.
    6. The output must be a valid JSON object that strictly adheres to the provided schema.
    `
);

const generateNutritionPlanFlow = ai.defineFlow(
    {
        name: 'generateNutritionPlanFlow',
        inputSchema: NutritionPlanInputSchema,
        outputSchema: NutritionPlanOutputSchema,
    },
    async (input) => {
        // Check user's plan
        const userDoc = await adminDb.collection('users').doc(input.userId).get();
        if (!userDoc.exists || userDoc.data()?.plan !== 'pro') {
            throw new Error('Access denied: This feature is only available for Pro plan users.');
        }

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
