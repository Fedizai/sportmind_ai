'use server';

import { db } from "@/lib/firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { revalidatePath } from "next/cache";

export async function deleteMatch(matchId: string) {
    if (!matchId) {
        throw new Error("Match ID is required.");
    }

    try {
        const docRef = doc(db, "football_matches", matchId);
        await deleteDoc(docRef);
        revalidatePath('/dashboard/football');
    } catch (error) {
        console.error("Error deleting match:", error);
        throw new Error("Could not delete match from the database.");
    }
}
