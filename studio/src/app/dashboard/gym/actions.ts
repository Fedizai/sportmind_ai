'use server';

import { adminDb } from '@/lib/firebase-admin';
import { type GymPlan } from '@/stores/plan-store';

/**
 * Gym plan persistence.
 *
 * These run on the server with the Admin SDK. They previously used the browser
 * Firestore SDK (`db` from `@/lib/firebase` with `updateDoc`), which inside a
 * `'use server'` module is an unauthenticated client — the rules require
 * `request.auth`, so every write was denied. Nothing about the gym plan was
 * ever saved: an edited weight, a ticked-off set, a whole generated plan, all
 * of it lived in memory until the page reloaded and then vanished.
 *
 * `set` with merge rather than `update`, because `update` fails outright on a
 * user document that does not exist yet.
 */

export async function saveGymPlan(userId: string, plan: GymPlan) {
    if (!userId) {
        throw new Error("User ID is required to save the plan.");
    }
    try {
        await adminDb.collection('users').doc(userId).set({ gymPlan: plan }, { merge: true });
    } catch (error) {
        console.error("Error saving gym plan:", error);
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Could not save the gym plan: ${detail}`);
    }
}

export async function deleteGymPlan(userId: string) {
    if (!userId) {
        throw new Error("User ID is required to delete the plan.");
    }
    try {
        await adminDb.collection('users').doc(userId).set({ gymPlan: null }, { merge: true });
    } catch (error) {
        console.error("Error deleting gym plan:", error);
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Could not delete the gym plan: ${detail}`);
    }
}

export async function getGymPlan(userId: string): Promise<GymPlan | null> {
    if (!userId) {
        return null;
    }
    try {
        const snap = await adminDb.collection('users').doc(userId).get();
        return snap.exists ? (snap.data()?.gymPlan ?? null) : null;
    } catch (error) {
        console.error("Error fetching gym plan:", error);
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Could not fetch the gym plan: ${detail}`);
    }
}

/**
 * One finished workout, kept forever.
 *
 * The gym plan is a single field on the user document, so it only ever holds
 * the current week: regenerating a plan, resetting it, or simply coming round
 * to the same day again next week erased `completed_at` and with it every
 * trace that the session had happened. History read from that field, which is
 * why a workout done a fortnight ago showed as "no plan active for this day".
 *
 * The id is deterministic — one athlete, one calendar day — so ticking the
 * last exercise, then un-ticking and re-ticking it, updates the entry in place
 * instead of piling up duplicates.
 */
export interface WorkoutLogEntry {
    day: string;
    dayNumber: number;
    focus: string;
    exercises: { name: string; sets: number; reps: string; completed?: boolean }[];
    volumeKg: number;
    completedDays: number;
    totalDays: number;
}

export async function logCompletedWorkout(userId: string, entry: WorkoutLogEntry) {
    if (!userId) {
        throw new Error("User ID is required to log a workout.");
    }
    try {
        await adminDb.collection('workout_logs').doc(`${userId}_${entry.day}`).set(
            { userId, ...entry, completedAt: new Date().toISOString() },
            { merge: true },
        );
    } catch (error) {
        // A workout that was done is not worth failing the UI over; the plan
        // itself has already been saved by the caller.
        console.error("Error logging completed workout:", error);
    }
}
