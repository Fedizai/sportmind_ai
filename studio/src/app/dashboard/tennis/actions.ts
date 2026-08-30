'use server';

import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";

/**
 * Tennis match persistence.
 *
 * These run on the server with the Admin SDK. The browser Firestore SDK must
 * never appear in here: this file used to import `serverTimestamp` from
 * `firebase/firestore` and hand that sentinel to an Admin write, which the
 * Admin SDK cannot serialise — every attempt to log a match threw before it
 * reached Firestore and surfaced as "Could not log match".
 */

export async function saveTennisMatch(userId: string, matchData: Record<string, any>) {
    if (!userId) {
        throw new Error("User ID is required.");
    }

    try {
        // The form supplies `date` as a JS Date; store it as a real Timestamp
        // so the listener that reads it back can call .toDate() on it.
        const date = matchData?.date instanceof Date
            ? Timestamp.fromDate(matchData.date)
            : matchData?.date;

        await adminDb.collection('tennis_matches').add({
            ...matchData,
            ...(date ? { date } : {}),
            userId,
            createdAt: Timestamp.now(),
        });
        revalidatePath('/dashboard/insights');
        revalidatePath('/dashboard/tennis');
    } catch (error) {
        console.error("Error saving tennis match:", error);
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Could not save tennis match: ${detail}`);
    }
}

export async function deleteTennisMatch(matchId: string) {
    if (!matchId) {
        throw new Error("Match ID is required.");
    }

    try {
        await adminDb.collection("tennis_matches").doc(matchId).delete();
        revalidatePath('/dashboard/insights');
        revalidatePath('/dashboard/tennis');
    } catch (error) {
        console.error("Error deleting tennis match:", error);
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Could not delete tennis match: ${detail}`);
    }
}
