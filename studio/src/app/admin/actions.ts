
'use server';

import { admin, adminDb } from "@/lib/firebase-admin";
import { isAdminEmail } from "@/lib/admin-emails";
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

/**
 * Admin edit of any account.
 *
 * Runs on the Admin SDK and verifies the caller is an admin from their ID
 * token — not from a flag the client sends. Without that check this is an HTTP
 * endpoint that rewrites anyone's role and email for anyone who finds it.
 *
 * Name and email live on the Firebase Auth record as well as the profile, so
 * both are written; leaving them to drift is what left one account with an
 * empty auth display name and a populated Firestore one.
 */
const adminEditSchema = z.object({
    displayName: z.string().min(2).max(60).optional(),
    username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_.]+$/).optional(),
    email: z.string().email().optional(),
    role: z.enum(['player', 'coach', 'admin']).optional(),
    plan: z.enum(['athlete', 'pro']).optional(),
});

async function requireAdmin(idToken: string): Promise<void> {
    if (!idToken) throw new Error('Not signed in.');
    const decoded = await admin.auth().verifyIdToken(idToken);
    const snap = await adminDb.collection('users').doc(decoded.uid).get();
    const isAdmin = snap.data()?.role === 'admin' || isAdminEmail(decoded.email);
    if (!isAdmin) throw new Error('Admins only.');
}

export async function adminUpdateUser(
    idToken: string,
    targetUid: string,
    data: z.infer<typeof adminEditSchema>
) {
    try {
        await requireAdmin(idToken);
        const parsed = adminEditSchema.safeParse(data);
        if (!parsed.success) {
            return { success: false, message: parsed.error.issues[0]?.message ?? 'Invalid data.' };
        }
        if (!targetUid) return { success: false, message: 'No user selected.' };

        const { displayName, username, email, role, plan } = parsed.data;

        // The two protected owner accounts keep their admin role whoever edits
        // them, matching the rule that has always guarded them in Firestore.
        const target = await adminDb.collection('users').doc(targetUid).get();
        const targetEmail = target.data()?.email as string | undefined;
        if (role && role !== 'admin' && isAdminEmail(targetEmail)) {
            return { success: false, message: 'This account always stays an admin.' };
        }

        if (username) {
            const clash = await adminDb.collection('users').where('username', '==', username).limit(2).get();
            if (clash.docs.some((d) => d.id !== targetUid)) {
                return { success: false, message: 'That username is already taken.' };
            }
        }

        const authPatch: Record<string, string> = {};
        if (displayName) authPatch.displayName = displayName;
        if (email) authPatch.email = email;
        if (Object.keys(authPatch).length > 0) {
            await admin.auth().updateUser(targetUid, authPatch);
        }

        const profilePatch: Record<string, unknown> = {};
        if (displayName) profilePatch.displayName = displayName;
        if (username) profilePatch.username = username;
        if (email) profilePatch.email = email;
        if (role) profilePatch.role = role;
        if (plan) profilePatch.plan = plan;
        if (Object.keys(profilePatch).length > 0) {
            await adminDb.collection('users').doc(targetUid).set(profilePatch, { merge: true });
        }

        revalidatePath('/admin');
        return { success: true, message: 'User updated.' };
    } catch (error) {
        console.error('Admin user update failed:', error);
        return { success: false, message: error instanceof Error ? error.message : 'Could not update the user.' };
    }
}
