'use server';
/**
 * @fileOverview A flow to generate a short video from a text prompt.
 *
 * - generateVideo - Creates a video based on a description.
 * - GenerateVideoInput - The input type for the generateVideo function.
 * - GenerateVideoOutput - The return type for the generateVideo function.
 */

import { ai } from '@/ai/genkit-instance';
import { z } from 'zod';
import { googleAI } from '@genkit-ai/googleai';
import { media, type MediaPart } from 'genkit';
import * as fs from 'fs';
import { Readable } from 'stream';

export const GenerateVideoInputSchema = z.object({
  prompt: z.string().describe("A detailed text description of the video to be generated."),
});
export type GenerateVideoInput = z.infer<typeof GenerateVideoInputSchema>;

export const GenerateVideoOutputSchema = z.object({
  videoUrl: z.string().describe("The data URI of the generated video file."),
});
export type GenerateVideoOutput = z.infer<typeof GenerateVideoOutputSchema>;

async function toBase64(video: MediaPart): Promise<string> {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(
      `${video.media!.url}&key=${process.env.GEMINI_API_KEY}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
}


const generateVideoFlow = ai.defineFlow(
  {
    name: 'generateVideoFlow',
    inputSchema: GenerateVideoInputSchema,
    outputSchema: GenerateVideoOutputSchema,
  },
  async ({ prompt }) => {
    let { operation } = await ai.generate({
        model: googleAI.model('veo-2.0-generate-001'),
        prompt: prompt,
        config: {
            durationSeconds: 6,
            aspectRatio: '16:9',
        },
    });

    if (!operation) {
        throw new Error('Video generation operation did not start.');
    }

    // Poll for completion
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.checkOperation(operation);
    }
    
    if (operation.error) {
        throw new Error(`Video generation failed: ${operation.error.message}`);
    }

    const videoPart = operation.output?.message?.content.find((p) => !!p.media && p.media.contentType?.startsWith('video/'));

    if (!videoPart) {
      throw new Error('Generated content did not contain a video.');
    }

    const videoBase64 = await toBase64(videoPart);
    
    return {
      videoUrl: `data:video/mp4;base64,${videoBase64}`,
    };
  }
);


export async function generateVideo(input: GenerateVideoInput): Promise<GenerateVideoOutput> {
  return generateVideoFlow(input);
}
