
"use server";

import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";


const mealItemSchema = z.object({
    id: z.string().optional(), // Optional client-side ID
    name: z.string(),
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
    sugar: z.number(),
    sodium: z.number(),
    portion: z.number(),
});

const nutritionLogSchema = z.object({
    userId: z.string(),
    mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
    items: z.array(mealItemSchema.omit({ id: true })), // Don't save client-side ID to Firestore
    createdAt: z.instanceof(Date).or(z.custom<Timestamp>((val) => val instanceof Timestamp)),
});

// Type for data coming from Firestore
type NutritionLog = Omit<z.infer<typeof nutritionLogSchema>, 'createdAt'> & { createdAt: Date | Timestamp };

// --- CREATE ---
export async function logNutrition(
  data: Omit<NutritionLog, 'id' | 'createdAt'> & { userId: string }
) {
  try {
    const dataWithTimestamp = { ...data, createdAt: new Date() };
    
    // Zod will now apply default values for optional fields if they are missing
    const validatedData = nutritionLogSchema.parse(dataWithTimestamp);

    const dataToSave = {
      ...validatedData,
      createdAt: Timestamp.fromDate(validatedData.createdAt as Date),
    };
    
    console.log("Saving nutrition log with data:", JSON.stringify(dataToSave, null, 2));

    await adminDb.collection("nutritionLogs").add(dataToSave);
    
    console.log("✅ Nutrition log saved successfully.");

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Zod validation errors:", error.flatten());
      throw new Error("Invalid data provided for nutrition log.");
    }
    console.error("❌ Firestore error:", error);
    throw new Error(`Could not save nutrition log to the database: ${error.message}`);
  }
}

// --- DELETE ---
export async function deleteNutritionLog(logId: string) {
  try {
    if (!logId) {
      throw new Error("Log ID is required for deletion.");
    }
    await adminDb.collection("nutritionLogs").doc(logId).delete();
    console.log("🗑️ Nutrition log deleted:", logId);
  } catch (error) {
    console.error("❌ Error deleting nutrition log:", error);
    throw new Error("Could not delete nutrition log from the database.");
  }
}
