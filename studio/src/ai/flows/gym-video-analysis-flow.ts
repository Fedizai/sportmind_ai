
'use server';
/**
 * @fileOverview An AI flow for analyzing gym exercise form from video clips.
 * This flow is designed to provide feedback on specific exercises.
 *
 * - analyzeGymVideo - Analyzes a video and provides feedback.
 * - VideoAnalysisInput - The input type for the function.
 * - VideoAnalysisOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit-instance';
import { z } from 'zod';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-admin';

// Define Zod schemas for the flow's input and output
export const GymVideoAnalysisInputSchema = z.object({
  userId: z.string().describe("The ID of the user requesting the analysis."),
  videoDataUri: z.string().describe("A video file of a gym exercise, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  prompt: z.string().describe("The user's question or area of focus for the analysis (e.g., 'Check my squat depth and back angle')."),
});
export type GymVideoAnalysisInput = z.infer<typeof GymVideoAnalysisInputSchema>;

export const GymVideoAnalysisOutputSchema = z.object({
    feedback: z.string().describe("The AI's detailed, point-by-point feedback on the exercise form in the video clip."),
});
export type GymVideoAnalysisOutput = z.infer<typeof GymVideoAnalysisOutputSchema>;


const videoAnalysisPrompt = ai.definePrompt(
  {
    name: 'gymVideoAnalysisPrompt',
    input: { schema: GymVideoAnalysisInputSchema.omit({ userId: true }) },
    output: { schema: GymVideoAnalysisOutputSchema },
    model: 'googleai/gemini-1.5-flash',
  },
  `You are a world-class personal trainer and biomechanics expert. Analyze the provided video of an exercise and give specific, actionable feedback based on the user's prompt.

User's Focus: "{{{prompt}}}"

Video for Analysis:
{{media url=videoDataUri}}

Instructions:
1.  Analyze the exercise form in the video.
2.  Provide 2-4 critical feedback points directly related to the user's focus.
3.  For each point, explain WHY it's important (e.g., for safety, effectiveness, targeting the right muscle).
4.  Keep the language clear, encouraging, and easy to understand for someone who is not an expert.
5.  Structure the feedback as a concise bulleted list.
`
);

const analyzeGymVideoFlow = ai.defineFlow(
  {
    name: 'analyzeGymVideoFlow',
    inputSchema: GymVideoAnalysisInputSchema,
    outputSchema: GymVideoAnalysisOutputSchema,
  },
  async (input) => {
    // Check user's plan
    const userDocRef = doc(db, 'users', input.userId);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists() || userDoc.data()?.plan !== 'pro') {
      throw new Error('Access denied: This feature is only available for Pro plan users.');
    }
      
    const { output } = await videoAnalysisPrompt({ videoDataUri: input.videoDataUri, prompt: input.prompt });
    
    if (!output?.feedback) {
        throw new Error("The AI failed to provide any feedback for the video.");
    }
    
    return {
        feedback: output.feedback,
    };
  }
);


export async function analyzeGymVideo(input: GymVideoAnalysisInput): Promise<GymVideoAnalysisOutput> {
  return analyzeGymVideoFlow(input);
}

    