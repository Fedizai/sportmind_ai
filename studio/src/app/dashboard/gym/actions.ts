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
