'use server';
/**
 * @fileOverview A flow to generate a personalized gym plan based on user preferences.
 *
 * - generateGymPlan - Creates a weekly gym plan.
 * - GymPlanInput - The input type for the generateGymPlan function.
 * - GymPlanOutput - The return type for the generateGymPlan function.
 */

import { ai } from '@/ai/genkit-instance';
import { z } from 'zod';
import { type PlanOptions } from '@/stores/plan-store';

// Define Zod schemas for input and output
const GymPlanInputSchema = z.object({
    goal: z.enum(['fat_loss', 'muscle_gain', 'recomposition']),
    experience: z.enum(['beginner', 'intermediate', 'advanced']),
    daysPerWeek: z.number().min(1).max(7),
    equipment: z.array(z.string()),
    focusAreas: z.array(z.string()),
});

const GymPlanOutputSchema = z.object({
  days: z.array(z.object({
    day: z.number(),
    focus: z.string().describe('The main muscle group or focus for the day (e.g., "Chest & Triceps", "Full Body Strength").'),
    exercises: z.array(z.object({
      name: z.string().describe('Name of the exercise.'),
      sets: z.number().describe('Number of sets.'),
      reps: z.string().describe('Number of repetitions (e.g., "8-12", "15").'),
      weight: z.string().optional().describe('The suggested weight in kg (e.g., "60kg", "bodyweight"). Always specify the unit as "kg" unless it is "bodyweight".'),
    })),
    completed: z.boolean().default(false),
  })).describe('A structured workout plan for the specified number of days.'),
});

// Define the prompt for the AI
const gymPlanPrompt = ai.definePrompt(
  {
    name: 'generateGymPlanPrompt',
    input: { schema: GymPlanInputSchema },
    output: { schema: GymPlanOutputSchema },
    model: 'googleai/gemini-1.5-flash',
  },
  `You are an expert fitness coach tasked with creating a personalized weekly workout plan.

User Preferences:
- Goal: {{{goal}}}
- Experience Level: {{{experience}}}
- Training Days per Week: {{{daysPerWeek}}}
- Available Equipment: {{{json equipment}}}
- Focus Areas: {{{json focusAreas}}}

Instructions:
1.  Create a detailed and effective workout plan for exactly {{{daysPerWeek}}} days.
2.  The output must be a valid JSON object that strictly adheres to the provided schema.
3.  The 'days' array in the output MUST contain exactly {{{daysPerWeek}}} items.
4.  Each day should have a clear focus (e.g., "Push Day", "Legs & Core", "Full Body"). Prioritize the user's focus areas when designing the workout splits.
5.  For each day, provide a list of 4-6 exercises.
6.  Specify the number of sets, a rep range (e.g., "8-12 reps"), and a suggested weight for each exercise.
7.  The weight must be a string containing the number and the unit "kg" (e.g., "60kg") or be the string "bodyweight". If no specific weight is appropriate, default to "bodyweight".
8.  Tailor the exercise selection, volume, and weight to the user's experience level and available equipment. For beginners, focus on compound movements and lighter weights. For advanced users, include more isolation, variation, and challenging weights.
9.  Ensure the plan is well-balanced and allows for adequate recovery between sessions.
`
);

// Define the main flow
const generateGymPlanFlow = ai.defineFlow(
    {
        name: 'generateGymPlanFlow',
        inputSchema: GymPlanInputSchema,
        outputSchema: GymPlanOutputSchema,
    },
    async (input) => {
        const { output } = await gymPlanPrompt(input);
        if (!output) {
            throw new Error('Failed to generate a gym plan from the AI. The AI returned no output.');
        }
        if (output.days.length !== input.daysPerWeek) {
            console.warn(`AI generated ${output.days.length} days, but user requested ${input.daysPerWeek}.`);
        }
        
        // Ensure every exercise has a weight property
        output.days.forEach(day => {
            day.exercises.forEach(exercise => {
                if (!exercise.weight) {
                    exercise.weight = 'bodyweight';
                }
            });
        });

        return output;
    }
);

// Export a wrapper function to be called from the client
export async function generateGymPlan(input: PlanOptions): Promise<z.infer<typeof GymPlanOutputSchema>> {
    const validatedInput = GymPlanInputSchema.parse(input);
    return generateGymPlanFlow(validatedInput);
}
