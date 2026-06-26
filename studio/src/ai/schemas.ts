

import { z } from 'zod';
import { tennisMatchSchema } from '@/lib/schemas';

// --- Shared Input/Output Schemas ---

export const AssistantResponseInputSchema = z.object({
  message: z.string().describe("The user's message to the fitness assistant."),
});
export type AssistantResponseInput = z.infer<typeof AssistantResponseInputSchema>;


// --- Workout Plan Generation Schemas ---
export const WorkoutPlanOutputSchema = z.object({
    plan: z.array(z.object({
        day: z.string().describe('The day of the week for the workout (e.g., "Monday").'),
        focus: z.string().describe('The main focus for the day (e.g., "Chest & Triceps", "Full Body").'),
        exercises: z.array(z.object({
            name: z.string().describe('Name of the exercise.'),
            sets: z.number().describe('Number of sets.'),
            reps: z.string().describe('Number of repetitions (can be a range, e.g., "8-12").'),
        })).describe('A list of exercises for the workout day.'),
    })).describe('A structured workout plan, typically for 3-5 days.'),
});
export type WorkoutPlanOutput = z.infer<typeof WorkoutPlanOutputSchema>;


// --- Exercise Form Feedback Schemas ---
export const ExerciseFeedbackOutputSchema = z.object({
    feedback: z.array(z.object({
        point: z.string().describe('A specific point of feedback (e.g., "Keep your back straight").'),
        explanation: z.string().describe('A brief explanation of why this point is important.'),
    })).describe('A list of actionable feedback points to improve exercise form.'),
});
export type ExerciseFeedbackOutput = z.infer<typeof ExerciseFeedbackOutputSchema>;


// --- Main Assistant Output Schema ---
export const AssistantResponseOutputSchema = z.object({
  response: z.string().describe('The text-based response from the AI.'),
  workoutPlan: WorkoutPlanOutputSchema.optional().describe('A structured workout plan, if generated.'),
  formFeedback: ExerciseFeedbackOutputSchema.optional().describe('Structured form feedback, if generated.'),
});
export type AssistantResponseOutput = z.infer<typeof AssistantResponseOutputSchema>;


// --- Tactical Advice ---

export const TacticalAdviceInputSchema = z.object({
    userId: z.string(),
    sport: z.string().describe('The sport the user is asking about (e.g., "football", "basketball").'),
    question: z.string().describe('The user\'s tactical question.'),
});
export type TacticalAdviceInput = z.infer<typeof TacticalAdviceInputSchema>;

export const TacticalAdviceOutputSchema = z.object({
    advice: z.string().describe('The AI-generated tactical advice in response to the user\'s question.'),
});
export type TacticalAdviceOutput = z.infer<typeof TacticalAdviceOutputSchema>;


// --- Nutrition Analysis (AI) ---

export const NutritionInfoInputSchema = z.object({
  query: z.string().optional().describe('A natural language query about food eaten, e.g., "I ate a bowl of oatmeal and a banana for breakfast."'),
  photoDataUri: z.string().optional().describe("A photo of food, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type NutritionInfoInput = z.infer<typeof NutritionInfoInputSchema>;

const NutritionItemSchema = z.object({
    name: z.string().describe('The identified food item.'),
    calories: z.number().describe('Estimated calories for the item.'),
    protein: z.number().describe('Estimated protein in grams.'),
    carbs: z.number().describe('Estimated carbohydrates in grams.'),
    fat: z.number().describe('Estimated fat in grams.'),
    sugar: z.number().describe('Estimated sugar in grams.'),
    sodium: z.number().describe('Estimated sodium in milligrams.'),
    iron: z.number().describe('Estimated iron in milligrams.'),
    potassium: z.number().describe('Estimated potassium in milligrams.'),
    portion: z.number().describe('Estimated portion size in grams.'),
});
export type NutritionItem = z.infer<typeof NutritionItemSchema>;

export const NutritionInfoOutputSchema = z.object({
  items: z.array(NutritionItemSchema).describe('A list of food items identified from the input.'),
});
export type NutritionInfoOutput = z.infer<typeof NutritionInfoOutputSchema>;


// --- Nutrition Search (Database) ---
export const FoodSearchInputSchema = z.object({
    query: z.string().describe('A search query for a food item, e.g., "apple" or "1 cup of milk".'),
});
export type FoodSearchInput = z.infer<typeof FoodSearchInputSchema>;


const FoodSearchItemSchema = z.object({
    fdcId: z.string(),
    name: z.string(),
    image: z.string().nullable(),
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
    sugar: z.number().optional().default(0),
    sodium: z.number().optional().default(0),
    iron: z.number().optional().default(0),
    potassium: z.number().optional().default(0),
    portion: z.number(),
});

export type FoodSearchItem = z.infer<typeof FoodSearchItemSchema>;

export const FoodSearchOutputSchema = z.object({
    items: z.array(FoodSearchItemSchema),
});
export type FoodSearchOutput = z.infer<typeof FoodSearchOutputSchema>;

// --- Tennis Drill Suggestions ---
export const TennisDrillInputSchema = z.object({
    focus: z.string().describe('The area the player wants to improve, e.g., "backhand consistency".'),
});
export type TennisDrillInput = z.infer<typeof TennisDrillInputSchema>;

export const TennisDrillOutputSchema = z.object({
    drills: z.array(z.object({
        name: z.string().describe('The name of the tennis drill.'),
        description: z.string().describe('A brief explanation of how to perform the drill.'),
    })).describe('A list of suggested tennis drills.'),
});
export type TennisDrillOutput = z.infer<typeof TennisDrillOutputSchema>;
export type TennisMatch = z.infer<typeof tennisMatchSchema>;


// --- Video Analysis ---
export const VideoAnalysisInputSchema = z.object({
  userId: z.string(),
  videoDataUri: z.string().describe("A video file as a data URI that must include a MIME type and use Base64 encoding."),
  prompt: z.string().describe("The user's question or area of focus for the analysis (e.g., 'Check my passing technique')."),
});
export type VideoAnalysisInput = z.infer<typeof VideoAnalysisInputSchema>;

export const VideoAnalysisOutputSchema = z.object({
    feedback: z.string().describe("The AI's detailed feedback on the video clip."),
});
export type VideoAnalysisOutput = z.infer<typeof VideoAnalysisOutputSchema>;


// --- Nutrition Plan Generation ---
export const NutritionPlanInputSchema = z.object({
  userId: z.string(),
  goal: z.enum(['fat_loss', 'muscle_gain', 'maintenance']),
  calories: z.number().min(1000).max(10000),
  dietaryNeeds: z.string().optional().describe("Any specific dietary needs, e.g., 'vegetarian', 'gluten-free'"),
});
export type NutritionPlanInput = z.infer<typeof NutritionPlanInputSchema>;

export const NutritionPlanOutputSchema = z.object({
  meals: z.array(z.object({
    name: z.string().describe("The name of the meal (e.g., 'Breakfast', 'Lunch')."),
    description: z.string().describe("A brief description of the meal."),
    calories: z.number().describe("Estimated calories for the meal."),
    items: z.array(z.string()).describe("A list of food items in the meal."),
  })).describe("A list of meals for one day.")
});
export type NutritionPlanOutput = z.infer<typeof NutritionPlanOutputSchema>;

// --- Mental Coach ---
export const MentalCoachInputSchema = z.object({
    scenario: z.string().describe("The user's situation or challenge, e.g., 'big match tomorrow', 'in a slump'"),
});
export type MentalCoachInput = z.infer<typeof MentalCoachInputSchema>;

export const MentalCoachOutputSchema = z.object({
    focus: z.string().describe("A key point of focus for the user."),
    confidenceBooster: z.string().describe("A short, actionable confidence-boosting message."),
    visualization: z.string().describe("A brief visualization exercise."),
});
export type MentalCoachOutput = z.infer<typeof MentalCoachOutputSchema>;
