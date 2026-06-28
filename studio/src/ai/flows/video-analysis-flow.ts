
'use server';
/**
 * @fileOverview An AI flow for analyzing football video clips.
 *
 * - analyzeFootballVideo - Analyzes a video and provides feedback.
 * - VideoAnalysisInput - The input type for the function.
 * - VideoAnalysisOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit-instance';
import {
  VideoAnalysisInputSchema,
  VideoAnalysisOutputSchema,
  type VideoAnalysisInput,
  type VideoAnalysisOutput,
} from '@/ai/schemas';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase-admin';

// This flow simulates video analysis.
const videoAnalysisFlow = ai.defineFlow(
  {
    name: 'videoAnalysisFlow',
    inputSchema: VideoAnalysisInputSchema,
    outputSchema: VideoAnalysisOutputSchema,
  },
  async (input) => {
    // Check user's plan
    const userDoc = await adminDb.collection('users').doc(input.userId).get();
    if (!userDoc.exists || userDoc.data()?.plan !== 'pro') {
      throw new Error('Access denied: This feature is only available for Pro plan users.');
    }

    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt: `You are a world-class football coach. Analyze the provided video of a player and give specific, actionable feedback based on the user's prompt.

        User's Focus: "${input.prompt}"

        Video for Analysis:
        {{media url=videoDataUri}}

        Instructions:
        1.  Analyze the player's technique, positioning, and decision-making in the video.
        2.  Provide 2-4 critical feedback points directly related to the user's focus.
        3.  For each point, explain WHY it's important (e.g., for creating space, defensive stability, etc.).
        4.  Keep the language clear, encouraging, and easy to understand.
        5.  Structure the feedback as a concise bulleted or numbered list.`,
      output: {
        schema: VideoAnalysisOutputSchema,
      }
    });

    if (!output?.feedback) {
      throw new Error("The AI failed to provide any feedback for the video.");
    }

    return {
      feedback: output.feedback,
    };
  }
);


export async function analyzeFootballVideo(input: VideoAnalysisInput): Promise<VideoAnalysisOutput> {
  return videoAnalysisFlow(input);
}

