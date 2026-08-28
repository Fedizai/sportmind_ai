import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import * as dotenv from 'dotenv';

dotenv.config();

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
});

/**
 * Model references, declared in one place.
 *
 * These must be built with `googleAI.model()` rather than passed as a
 * `'googleai/<name>'` string: the installed plugin's static registry only knows
 * models up to gemini-2.5, and Google has since retired those for new API keys
 * ("no longer available to new users"). `googleAI.model()` accepts any
 * `gemini-*` name and forwards it straight to the API, so the app can use
 * current models without waiting on a plugin release.
 *
 * Both names below were verified against the live API before being set here.
 */

/** Cheap, fast model for the text-only flows (most of the app). */
export const TEXT_MODEL = googleAI.model('gemini-3.5-flash-lite');

/** Fuller model for prompts carrying photos or video. */
export const VISION_MODEL = googleAI.model('gemini-3.6-flash');
