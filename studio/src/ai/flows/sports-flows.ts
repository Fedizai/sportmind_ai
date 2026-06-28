
'use server';
/**
 * @fileOverview Sports-related AI flows for tactical advice.
 *
 * - getTacticalAdvice - Provides tactical advice for a specific sport.
 * - TacticalAdviceInput - The input type for the getTacticalAdvice function.
 * - TacticalAdviceOutput - The return type for the getTacticalAdvice function.
 */

import { ai } from '@/ai/genkit-instance';
import {
    TacticalAdviceInputSchema,
    TacticalAdviceOutputSchema,
    type TacticalAdviceInput,
    type TacticalAdviceOutput
} from '@/ai/schemas';
import { adminDb } from '@/lib/firebase-admin';

const getTacticalAdviceFlow = ai.defineFlow(
    {
        name: 'getTacticalAdviceFlow',
        inputSchema: TacticalAdviceInputSchema,
        outputSchema: TacticalAdviceOutputSchema,
    },
    async ({ sport, question, userId }) => {
        // Check user's plan
        const userDoc = await adminDb.collection('users').doc(userId).get();
        if (!userDoc.exists || userDoc.data()?.plan !== 'pro') {
            throw new Error('Access denied: This feature is only available for Pro plan users.');
        }

        const { output } = await ai.generate({
            model: 'googleai/gemini-1.5-flash',
            prompt: `You are an expert sports strategist and coach for ${sport}. A user has a tactical question.

            User's Question: "${question}"

            Provide clear, concise, and actionable tactical advice. Frame your response as an expert coach talking directly to a player or another coach.
            `,
            output: {
                schema: TacticalAdviceOutputSchema,
            }
        });

        if (!output) {
            throw new Error('Failed to generate tactical advice.');
        }

        return {
            advice: output.advice,
        };
    }
);

export async function getTacticalAdvice(input: TacticalAdviceInput): Promise<TacticalAdviceOutput> {
    return getTacticalAdviceFlow(input);
}
