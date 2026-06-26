
'use server';

import { adminDb } from "@/lib/firebase-admin";
import { doc, deleteDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { revalidatePath } from "next/cache";

export async function saveTennisMatch(userId: string, matchData: any) {
    if (!userId) {
        throw new Error("User ID is required.");
    }

    try {
        await adminDb.collection('tennis_matches').add({
            ...matchData,
            userId,
            createdAt: serverTimestamp(),
        });
        revalidatePath('/dashboard/insights');
        revalidatePath('/dashboard/tennis');
    } catch (error) {
        console.error("Error saving tennis match:", error);
        throw new Error("Could not save tennis match to the database.");
    }
}

export async function deleteTennisMatch(matchId: string) {
    if (!matchId) {
        throw new Error("Match ID is required.");
    }

    try {
        const docRef = adminDb.collection("tennis_matches").doc(matchId);
        await docRef.delete();
        revalidatePath('/dashboard/insights');
        revalidatePath('/dashboard/tennis');
    } catch (error) {
        console.error("Error deleting tennis match:", error);
        throw new Error("Could not delete tennis match from the database.");
    }
}
