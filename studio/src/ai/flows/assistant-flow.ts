'use server';
/**
 * @fileOverview A general-purpose fitness assistant AI flow.
 */

import { ai } from '@/ai/genkit-instance';
import { z } from 'zod';
import {
  AssistantResponseInputSchema,
  AssistantResponseOutputSchema,
  ExerciseFeedbackOutputSchema,
  WorkoutPlanOutputSchema,
  type AssistantResponseInput,
  type AssistantResponseOutput,
} from '@/ai/schemas';

const intentSchema = z.object({
  intent: z.enum(['WORKOUT_PLAN', 'FORM_FEEDBACK', 'GENERAL_INQUIRY']),
  goal: z.string().optional(),
  exercise: z.string().optional(),
});

const intentPrompt = ai.definePrompt(
  {
    name: 'assistantIntentPrompt',
    input: { schema: AssistantResponseInputSchema },
    output: { schema: intentSchema },
    model: 'googleai/gemini-1.5-flash',
  },
  `Classify the user's request as WORKOUT_PLAN, FORM_FEEDBACK, or GENERAL_INQUIRY.

User Message: {{{message}}}`
);

const workoutPrompt = ai.definePrompt(
  {
    name: 'generateWorkoutPlanPrompt',
    input: { schema: z.object({ goal: z.string() }) },
    output: { schema: WorkoutPlanOutputSchema },
    model: 'googleai/gemini-1.5-flash',
  },
  `Create a detailed 3-day workout plan for this goal: {{{goal}}}.`
);

const feedbackPrompt = ai.definePrompt(
  {
    name: 'getExerciseFeedbackPrompt',
    input: { schema: z.object({ exercise: z.string() }) },
    output: { schema: ExerciseFeedbackOutputSchema },
    model: 'googleai/gemini-1.5-flash',
  },
  `Give 2-3 form feedback tips for this exercise: {{{exercise}}}.`
);

const generalPrompt = ai.definePrompt(
  {
    name: 'assistantGeneralPrompt',
    input: { schema: AssistantResponseInputSchema },
    output: { schema: z.object({ response: z.string() }) },
    model: 'googleai/gemini-1.5-flash',
  },
  `Answer clearly as a friendly AI fitness coach.

User Question: {{{message}}}`
);

const assistantFlow = ai.defineFlow(
  {
    name: 'assistantFlow',
    inputSchema: AssistantResponseInputSchema,
    outputSchema: AssistantResponseOutputSchema,
  },
  async (input) => {
    const { output: intentOutput } = await intentPrompt(input);

    const intent = intentOutput?.intent || 'GENERAL_INQUIRY';
    const goal = intentOutput?.goal;
    const exercise = intentOutput?.exercise;

    switch (intent) {
      case 'WORKOUT_PLAN': {
        if (!goal) {
          return {
            response:
              "It sounds like you want a workout plan, but I need to know your goal.",
          };
        }

        const { output: workoutPlan } = await workoutPrompt({ goal });

        return {
          response: `Here is a workout plan for your goal: **${goal}**.`,
          workoutPlan: workoutPlan ?? undefined,
        };
      }

      case 'FORM_FEEDBACK': {
        if (!exercise) {
          return {
            response:
              "I can help with form feedback, but I need to know which exercise you're asking about.",
          };
        }

        const { output: formFeedback } = await feedbackPrompt({ exercise });

        return {
          response: `Here is some general feedback for performing a **${exercise}**:`,
          formFeedback: formFeedback ?? undefined,
        };
      }

      case 'GENERAL_INQUIRY':
      default: {
        const { output: generalOutput } = await generalPrompt(input);

        return {
          response:
            generalOutput?.response ||
            "I'm sorry, I couldn't generate a response. Could you please rephrase your question?",
        };
      }
    }
  }
);

export async function getAssistantResponse(
  input: AssistantResponseInput
): Promise<AssistantResponseOutput> {
  return assistantFlow(input);
}