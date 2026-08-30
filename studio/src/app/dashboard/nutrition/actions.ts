
"use server";

import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";


/**
 * A nutrient value coming off the client.
 *
 * Portion maths can produce NaN or Infinity (an empty portion field divides to
 * NaN), and a strict `z.number()` rejects those outright — which surfaced to
 * the athlete as "Could not save your meal" with no way to recover. Nutrient
 * figures are informational, so coerce anything non-finite to 0 and let the
 * meal save rather than losing the whole entry.
 */
const nutrientValue = z.preprocess(
    (v) => {
        const n = typeof v === 'string' ? parseFloat(v) : v;
        return typeof n === 'number' && Number.isFinite(n) ? n : 0;
    },
    z.number()
);

const mealItemSchema = z.object({
    id: z.string().optional(), // Optional client-side ID
    name: z.string().min(1, 'A food item needs a name.'),
    calories: nutrientValue,
    protein: nutrientValue,
    carbs: nutrientValue,
    fat: nutrientValue,
    sugar: nutrientValue,
    sodium: nutrientValue,
    // A portion of 0 would make every downstream total meaningless.
    portion: z.preprocess(
        (v) => {
            const n = typeof v === 'string' ? parseFloat(v) : v;
            return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 100;
        },
        z.number().positive()
    ),
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
      const first = error.issues[0];
      const where = first?.path?.join('.') || 'meal';
      throw new Error(`Invalid meal data (${where}): ${first?.message ?? 'unknown field'}`);
    }
    console.error("❌ Firestore error:", error);
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not save nutrition log to the database: ${detail}`);
  }
}

// --- UPDATE ---
/**
 * Correct a meal that was already logged.
 *
 * Logged meals could only be deleted and re-entered, which meant a single
 * wrong portion cost the whole entry. The items are revalidated through the
 * same schema the create path uses, so a correction cannot write values the
 * original was not allowed to.
 */
export async function updateNutritionLog(
  logId: string,
  items: z.infer<typeof mealItemSchema>[]
) {
  try {
    if (!logId) throw new Error("Log ID is required.");

    const validated = z.array(mealItemSchema.omit({ id: true })).parse(items);
    if (validated.length === 0) {
      throw new Error("A meal needs at least one item.");
    }

    await adminDb.collection("nutritionLogs").doc(logId).update({ items: validated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const first = error.issues[0];
      const where = first?.path?.join('.') || 'meal';
      throw new Error(`Invalid meal data (${where}): ${first?.message ?? 'unknown field'}`);
    }
    console.error("❌ Error updating nutrition log:", error);
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not update the meal: ${detail}`);
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
