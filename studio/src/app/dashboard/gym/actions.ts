
'use server';

import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { type GymPlan } from '@/stores/plan-store';

export async function saveGymPlan(userId: string, plan: GymPlan) {
    if (!userId) {
        throw new Error("User ID is required to save the plan.");
    }
    try {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, { gymPlan: plan });
    } catch (error) {
        console.error("Error saving gym plan:", error);
        throw new Error("Could not save the gym plan to the database.");
    }
}

export async function deleteGymPlan(userId: string) {
     if (!userId) {
        throw new Error("User ID is required to delete the plan.");
    }
    try {
        const userDocRef = doc(db, 'users', userId);
        // To "delete" the plan, we set it to null in the user's document.
        await updateDoc(userDocRef, { gymPlan: null });
    } catch (error) {
        console.error("Error deleting gym plan:", error);
        throw new Error("Could not delete the gym plan from the database.");
    }
}

export async function getGymPlan(userId: string): Promise<GymPlan | null> {
    if (!userId) {
        return null;
    }
    try {
        const userDocRef = doc(db, 'users', userId);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            // The gymPlan is a field within the user document
            return docSnap.data().gymPlan || null;
        }
        return null;
    } catch (error) {
        console.error("Error fetching gym plan:", error);
        throw new Error("Could not fetch the gym plan from the database.");
    }
}
