'use server';

import { adminDb } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";

/**
 * Football match deletion.
 *
 * Runs with the Admin SDK. It used to use the browser SDK (`db` from
 * `@/lib/firebase` with `deleteDoc`), which inside a server action is an
 * unauthenticated client — Firestore rules require `request.auth`, so every
 * delete was denied and the match stayed on screen.
 */
export async function deleteMatch(matchId: string) {
    if (!matchId) {
        throw new Error("Match ID is required.");
    }

    try {
        await adminDb.collection("football_matches").doc(matchId).delete();
        revalidatePath('/dashboard/football');
        revalidatePath('/dashboard/insights');
    } catch (error) {
        console.error("Error deleting match:", error);
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Could not delete match: ${detail}`);
    }
}
