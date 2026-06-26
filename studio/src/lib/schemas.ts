
"use client";

import { z } from "zod";
import { Timestamp } from "firebase/firestore";

export const loginSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters long.",
  }),
});

export const signupSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters long." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters long." }),
  role: z.enum(["player", "coach"]),
  
  // General Info
  age: z.coerce.number().min(13, { message: "You must be at least 13 years old." }).max(100),
  trainingFrequency: z.enum(["1-2_per_week", "3-4_per_week", "5+_per_week"]),
  mainGoal: z.enum(["improve_fitness", "lose_weight", "gain_muscle", "improve_performance"]),
  sports: z.array(z.string()).min(1, { message: "Please select at least one sport."}),
  
  // Football Profile (conditional)
  footballPosition: z.enum(["goalkeeper", "defender", "midfielder", "forward"]).optional(),
  inClub: z.boolean().optional(),
  
  // Tennis Profile (conditional)
  tennisLevel: z.enum(["beginner", "intermediate", "advanced", "pro"]).optional(),
  hasRanking: z.boolean().optional(),
  tennisRanking: z.string().optional(),
  dominantHand: z.enum(["left", "right"]).optional(),
  playStyle: z.enum(["baseliner", "serve_volley", "all_court", "counter_puncher"]).optional(),

  // Gym Profile (conditional)
  gymHeight: z.coerce.number().optional(),
  gymWeight: z.coerce.number().optional(),
  gymGoal: z.enum(["fat_loss", "muscle_gain", "strength", "endurance"]).optional(),
});


export const workoutSchema = z.object({
  exercise: z.string().min(1, "Exercise name is required."),
  sets: z.coerce.number().min(1, "Sets must be at least 1."),
  reps: z.coerce.number().min(1, "Reps must be at least 1."),
  weight: z.coerce.number().min(0, "Weight can't be negative."),
  date: z.date(),
});

export const footballMatchSchema = z.object({
  opponent: z.string().min(1, "Opponent name is required."),
  result: z.enum(['win', 'draw', 'loss']),
  goals: z.coerce.number().min(0, "Goals cannot be negative.").default(0),
  assists: z.coerce.number().min(0, "Assists cannot be negative.").default(0),
  minutesPlayed: z.coerce.number().min(0, "Minutes must be positive.").max(120, "Minutes can't exceed 120.").default(90),
  position: z.string().optional(),
  stamina: z.coerce.number().min(1).max(10),
  notes: z.string().optional(),
  motm: z.boolean().default(false),
  date: z.date(),
});


export const tennisMatchSchema = z.object({
  id: z.string().optional(),
  opponent: z.string().min(1, "Opponent name is required."),
  score: z.string().min(1, "Score is required.").optional(),
  result: z.enum(["W", "L"]).optional(),
  surface: z.enum(["Hard", "Clay", "Grass", "Other"]).optional(),
  date: z.date(),
  status: z.enum(["upcoming", "completed"]).optional(),
  playerComment: z.string().optional(),
  coachComment: z.string().optional(),
  opponentWeakness: z.string().optional(),
  weaknessDiscovered: z.string().optional(),
  addToTraining: z.boolean().default(false),
  serveSpeed: z.coerce.number().optional(),
  firstServePercent: z.coerce.number().min(0).max(100).optional(),
  doubleFaults: z.coerce.number().min(0).optional(),
  aces: z.coerce.number().min(0).optional(),
  breakPointsSaved: z.coerce.number().min(0).max(100).optional(),
});
export type TennisMatch = z.infer<typeof tennisMatchSchema>;


// Schema for a single food item within a meal log
export const mealItemSchema = z.object({
  id: z.string().optional(), // Optional client-side ID
  name: z.string(),
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
export type MealItem = z.infer<typeof mealItemSchema>;


// Schema for a full nutrition log entry
export const nutritionLogSchema = z.object({
  userId: z.string(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  items: z.array(mealItemSchema),
  createdAt: z.instanceof(Date).or(z.custom<Timestamp>(val => val instanceof Timestamp)),
});
export type NutritionLog = z.infer<typeof nutritionLogSchema>;
