'use server';
/**
 * @fileOverview A flow to generate tennis drill suggestions.
 *
 * - getDrillSuggestions - Generates a list of tennis drills based on a focus area.
 * - TennisDrillInput - The input type for the getDrillSuggestions function.
 * - TennisDrillOutput - The return type for the getDrillSuggestions function.
 */

import { ai } from '@/ai/genkit-instance';
import { 
    TennisDrillInputSchema, 
    TennisDrillOutputSchema, 
    type TennisDrillInput, 
    type TennisDrillOutput 
} from '@/ai/schemas';

const drillSuggestionPrompt = ai.definePrompt(
  {
    name: 'tennisDrillPrompt',
    input: { schema: TennisDrillInputSchema },
    output: { schema: TennisDrillOutputSchema },
    model: 'googleai/gemini-1.5-flash',
  },
  `You are an expert tennis coach. A player wants drill suggestions for a specific focus area.

Focus Area: "{{{focus}}}"

Generate 2-3 creative and effective tennis drills to help the player improve in this area. For each drill, provide a clear name and a concise description of how to perform it.
`
);

const getDrillSuggestionsFlow = ai.defineFlow(
    {
        name: 'getDrillSuggestionsFlow',
        inputSchema: TennisDrillInputSchema,
        outputSchema: TennisDrillOutputSchema,
    },
    async (input) => {
        const { output } = await drillSuggestionPrompt(input);
        if (!output) {
            throw new Error('Failed to generate drill suggestions.');
        }
        return output;
    }
);

export async function getDrillSuggestions(input: TennisDrillInput): Promise<TennisDrillOutput> {
    return getDrillSuggestionsFlow(input);
}
