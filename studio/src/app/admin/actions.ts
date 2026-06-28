
'use server';

import { admin, adminDb } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { UserRole, UserPlan } from "@/hooks/use-all-users";

const createUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6, "Password should be at least 6 characters"),
    displayName: z.string().min(1, "Display name is required"),
    role: z.enum(["player", "coach", "admin"]),
    plan: z.enum(["athlete", "pro"])
});

export async function createUser(data: z.infer<typeof createUserSchema>) {
    // Check if the admin app is initialized
    if (!admin.apps.length) {
        console.error("Firebase Admin SDK is not initialized.");
        throw new Error("The server is not configured to perform administrative actions.");
    }

    const validatedData = createUserSchema.safeParse(data);
    if (!validatedData.success) {
        throw new Error("Invalid user data provided.");
    }

    const { email, password, displayName, role, plan } = validatedData.data;

    try {
        // 1. Create user in Firebase Authentication
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName,
            emailVerified: true, // Admin-created users can be pre-verified
        });

        // 2. Create user document in Firestore
        const userDocRef = adminDb.collection('users').doc(userRecord.uid);
        await userDocRef.set({
            uid: userRecord.uid,
            email: email,
            displayName: displayName,
            role: role,
            plan: plan,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        revalidatePath('/admin');
        return { success: true, message: `User ${displayName} created successfully.` };

    } catch (error: any) {
        console.error("Error creating user:", error);
        // Provide a more user-friendly error message
        if (error.code === 'auth/email-already-exists') {
            throw new Error("A user with this email address already exists.");
        }
        throw new Error(error.message || "An unexpected error occurred while creating the user.");
    }
}


export async function deleteUser(uid: string) {
    if (!uid) {
        throw new Error("User ID is required for deletion.");
    }

    if (!admin.apps.length) {
        console.error("Firebase Admin SDK is not initialized. Make sure the FIREBASE_SERVICE_ACCOUNT_KEY is set in your environment variables.");
        throw new Error("The server is not configured to perform administrative actions. Please contact support.");
    }

    try {
        // First, attempt to delete from Firebase Authentication
        await admin.auth().deleteUser(uid);
        console.log(`Successfully deleted user ${uid} from Firebase Auth.`);
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            console.warn(`User ${uid} not found in Firebase Auth. Proceeding to delete from Firestore.`);
        } else {
            console.error("Error deleting user from Firebase Auth:", error);
            throw new Error(`Could not delete user from Authentication: ${error.message}`);
        }
    }

    try {
        // Second, delete from Firestore. This will run even if the user was not in Auth.
        const userDocRef = adminDb.collection('users').doc(uid);
        await userDocRef.delete();
        console.log(`Successfully deleted user ${uid} from Firestore.`);
    } catch (error: any) {
        console.error("Error deleting user from Firestore:", error);
        throw new Error(`Could not delete user from Firestore: ${error.message}`);
    }

    revalidatePath('/admin');
    return { success: true, message: "User successfully deleted from all services." };
}
