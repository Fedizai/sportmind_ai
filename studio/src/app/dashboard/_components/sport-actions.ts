'use server';

import { adminDb } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";

/**
 * Generic Firestore persistence for the configurable sport modules
 * (basketball, boxing, swimming). The collection name is constrained to a
 * strict allowlist so the client can never write to an arbitrary collection.
 */

const ALLOWED_COLLECTIONS: Record<string, string> = {
    basketball_games: "/dashboard/basketball",
    boxing_bouts: "/dashboard/boxing",
    swimming_sessions: "/dashboard/swimming",
};

function assertAllowed(collectionName: string): string {
    const path = ALLOWED_COLLECTIONS[collectionName];
    if (!path) {
        throw new Error(`Collection "${collectionName}" is not a permitted sport collection.`);
    }
    return path;
}

export async function saveSportEntry(collectionName: string, userId: string, data: Record<string, any>) {
    const path = assertAllowed(collectionName);
    if (!userId) {
        throw new Error("User ID is required.");
    }

    try {
        await adminDb.collection(collectionName).add({
            ...data,
            userId,
            createdAt: new Date(),
        });
        revalidatePath(path);
        revalidatePath("/dashboard/insights");
    } catch (error) {
        console.error(`Error saving entry to ${collectionName}:`, error);
        throw new Error("Could not save the entry to the database.");
    }
}

export async function deleteSportEntry(collectionName: string, entryId: string) {
    const path = assertAllowed(collectionName);
    if (!entryId) {
        throw new Error("Entry ID is required.");
    }

    try {
        await adminDb.collection(collectionName).doc(entryId).delete();
        revalidatePath(path);
        revalidatePath("/dashboard/insights");
    } catch (error) {
        console.error(`Error deleting entry from ${collectionName}:`, error);
        throw new Error("Could not delete the entry from the database.");
    }
}
