'use server';
/**
 * @fileOverview A general-purpose fitness assistant AI flow.
 *
 * This flow acts as a dispatcher, analyzing the user's prompt to determine their intent
 * and then routing the request to the appropriate specialized logic (e.g., workout generation,
 * form feedback) or handling it as a general inquiry.
 *
 * - getAssistantResponse - The main function that handles the user's request.
 * - AssistantResponseInput - The input type for the getAssistantResponse function.
 * - AssistantResponseOutput - The return type for the getAssistantResponse function.
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


// --- Intent Classification ---
const intentSchema = z.object({
    intent: z.enum(['WORKOUT_PLAN', 'FORM_FEEDBACK', 'GENERAL_INQUIRY'])
        .describe("The user's primary intent."),
    goal: z.string().optional().describe('The user\'s goal if the intent is WORKOUT_PLAN (e.g., "muscle gain", "weight loss").'),
    exercise: z.string().optional().describe("The exercise name if the intent is FORM_FEEDBACK."),
});

const intentPrompt = ai.definePrompt(
  {
    name: 'assistantIntentPrompt',
    input: { schema: AssistantResponseInputSchema },
    output: { schema: intentSchema },
    model: 'googleai/gemini-1.5-flash',
  },
  `You are an AI assistant responsible for classifying a user's fitness-related request into one of three categories: WORKOUT_PLAN, FORM_FEEDBACK, or GENERAL_INQUIRY.

Your task is to analyze the user's message and determine their primary goal.

- If the user is asking for a workout routine, a schedule, or a plan to achieve a specific fitness goal (like building muscle, losing weight, improving endurance, etc.), you must classify the intent as WORKOUT_PLAN. You must also extract this goal.
- If the user is asking for advice, tips, or feedback on how to perform a specific exercise (like "squat", "deadlift", "bench press"), you must classify the intent as FORM_FEEDBACK. You must also extract the name of the exercise.
- For all other questions related to fitness, health, nutrition, or general well-being, you must classify the intent as GENERAL_INQUIRY.

User Message: {{{message}}}
`
);


// --- Specialized Prompts ---

const workoutPrompt = ai.definePrompt(
  {
    name: 'generateWorkoutPlanPrompt',
    input: { schema: z.object({ goal: z.string() }) },
    output: { schema: WorkoutPlanOutputSchema },
    model: 'googleai/gemini-1.5-flash',
  },
  `You are an expert fitness coach. A user wants a workout plan for their goal: {{{goal}}}. 
    
    Create a detailed and effective 3-day workout plan. For each day, provide a clear focus and a list of exercises with the recommended number of sets and reps.
    
    Ensure the plan is well-balanced and targets major muscle groups throughout the week.`
);

const feedbackPrompt = ai.definePrompt(
  {
    name: 'getExerciseFeedbackPrompt',
    input: { schema: z.object({ exercise: z.string() }) },
    output: { schema: ExerciseFeedbackOutputSchema },
    model: 'googleai/gemini-1.5-flash',
  },
  `You are an expert personal trainer specializing in exercise form and safety. A user needs feedback on their form for the exercise: {{{exercise}}}.

    Provide a list of 2-3 specific, actionable feedback points to help them improve their technique and avoid injury. For each point, provide a brief explanation. Since you cannot see the user, give general but crucial tips for this exercise.`
);


const generalPrompt = ai.definePrompt(
  {
    name: 'assistantGeneralPrompt',
    input: { schema: AssistantResponseInputSchema },
    output: { schema: z.object({ response: z.string() }) },
    model: 'googleai/gemini-1.5-flash',
  },
  `You are a friendly and knowledgeable AI Fitness Coach. Answer the user's question clearly and concisely.

    User's Question: "{{{message}}}"
    
    Your Answer:`
);


// --- Main Assistant Flow ---
const assistantFlow = ai.defineFlow(
  {
    name: 'assistantFlow',
    inputSchema: AssistantResponseInputSchema,
    outputSchema: AssistantResponseOutputSchema,
  },
  async (input) => {
    const { output: intentOutput } = await intentPrompt(input);
    
    // Fallback logic: If intent detection fails, treat it as a general inquiry.
    const intent = intentOutput?.intent || 'GENERAL_INQUIRY';
    const goal = intentOutput?.goal;
    const exercise = intentOutput?.exercise;

    switch (intent) {
        case 'WORKOUT_PLAN':
            if (!goal) {
                return { response: "It sounds like you want a workout plan, but I need to know your goal. For example, tell me if you want to 'build muscle', 'lose weight', or 'improve general fitness'." };
            }
            const { output: workoutPlan } = await workoutPrompt({ goal });
            return {
                response: `Here is a workout plan for your goal: **${goal}**.`,
                workoutPlan,
            };
        case 'FORM_FEEDBACK':
             if (!exercise) {
                return { response: "I can help with form feedback, but I need to know which exercise you're asking about." };
            }
            const { output: formFeedback } = await feedbackPrompt({ exercise });
             return {
                response: `Here is some general feedback for performing a **${exercise}**:`,
                formFeedback,
            };
        case 'GENERAL_INQUIRY':
        default:
            const { output: generalOutput } = await generalPrompt(input);
             if (!generalOutput) {
                return { response: "I'm sorry, I couldn't generate a response. Could you please rephrase your question?" };
            }
            return { response: generalOutput.response };
    }
  }
);

export async function getAssistantResponse(input: AssistantResponseInput): Promise<AssistantResponseOutput> {
    return assistantFlow(input);
}
