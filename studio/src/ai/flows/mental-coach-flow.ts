'use server';
/**
 * @fileOverview A flow to provide mental coaching and preparation advice.
 *
 * - getMentalPrepAdvice - Generates mental preparation tips.
 * - MentalCoachInput - The input type for the getMentalPrepAdvice function.
 * - MentalCoachOutput - The return type for the getMentalPrepAdvice function.
 */

import { ai } from '@/ai/genkit-instance';
import {
    MentalCoachInputSchema,
    MentalCoachOutputSchema,
    type MentalCoachInput,
    type MentalCoachOutput
} from '@/ai/schemas';

const mentalCoachPrompt = ai.definePrompt(
  {
    name: 'mentalCoachPrompt',
    input: { schema: MentalCoachInputSchema },
    output: { schema: MentalCoachOutputSchema },
    model: 'googleai/gemini-1.5-flash',
  },
  `You are an expert sports psychologist and mental coach. A user is looking for mental preparation advice for a specific scenario.

Scenario: "{{{scenario}}}"

Based on this scenario, provide concise and actionable advice. Generate:
1.  **Focus:** A single, powerful sentence on what the athlete should focus on.
2.  **Confidence Booster:** A short, encouraging phrase to boost their confidence.
3.  **Visualization:** A brief, guided visualization exercise (2-3 sentences) to help them mentally rehearse success.
`
);

const getMentalPrepAdviceFlow = ai.defineFlow(
    {
        name: 'getMentalPrepAdviceFlow',
        inputSchema: MentalCoachInputSchema,
        outputSchema: MentalCoachOutputSchema,
    },
    async (input) => {
        const { output } = await mentalCoachPrompt(input);
        if (!output) {
            throw new Error('Failed to generate mental prep advice.');
        }
        return output;
    }
);

export async function getMentalPrepAdvice(input: MentalCoachInput): Promise<MentalCoachOutput> {
    return getMentalPrepAdviceFlow(input);
}
