
'use server';

import { z } from 'zod';
import { auth, db } from '@/lib/firebase';
import { getAuth, updateProfile } from 'firebase/auth';
import { doc, updateDoc, getDoc, getDocs, addDoc, collection, query, where, Timestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

const accountSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
});

const preferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  units: z.enum(["metric", "imperial"]),
});

const notificationsSchema = z.object({
    emailNotifications: z.boolean(),
    trainingReminders: z.boolean(),
});

const privacySchema = z.object({
    shareDataWithCoach: z.boolean(),
});


export async function updateAccountSettings(userId: string, data: z.infer<typeof accountSchema>) {
  if (!userId) throw new Error("User not authenticated.");

  const validatedData = accountSchema.safeParse(data);
  if (!validatedData.success) {
    throw new Error("Invalid data provided.");
  }
  
  const currentUser = getAuth().currentUser;

  try {
     // Update Firebase Auth profile
    if (currentUser && currentUser.uid === userId) {
        await updateProfile(currentUser, { displayName: validatedData.data.fullName });
    }
    
    // Update Firestore document
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      displayName: validatedData.data.fullName,
    });

    revalidatePath('/dashboard/settings');
    return { success: true, message: 'Account settings updated successfully.' };
  } catch (error) {
    console.error("Error updating account settings:", error);
    return { success: false, message: 'Failed to update account settings.' };
  }
}

export async function updatePreferences(userId: string, data: z.infer<typeof preferencesSchema>) {
    if (!userId) throw new Error("User not authenticated.");
    const validatedData = preferencesSchema.safeParse(data);
    if (!validatedData.success) throw new Error("Invalid data provided.");
    
    try {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, { preferences: validatedData.data });
        revalidatePath('/dashboard/settings');
        return { success: true, message: 'Preferences updated.' };
    } catch (error) {
        return { success: false, message: 'Failed to save preferences.' };
    }
}

export async function updateNotifications(userId: string, data: z.infer<typeof notificationsSchema>) {
    if (!userId) throw new Error("User not authenticated.");
    const validatedData = notificationsSchema.safeParse(data);
    if (!validatedData.success) throw new Error("Invalid data provided.");
    
    try {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, { notifications: validatedData.data });
        revalidatePath('/dashboard/settings');
        return { success: true, message: 'Notification settings updated.' };
    } catch (error) {
        return { success: false, message: 'Failed to save notification settings.' };
    }
}

export async function updatePrivacy(userId: string, data: z.infer<typeof privacySchema>) {
    if (!userId) throw new Error("User not authenticated.");
    const validatedData = privacySchema.safeParse(data);
    if (!validatedData.success) throw new Error("Invalid data provided.");
    
    try {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, { privacy: validatedData.data });
        revalidatePath('/dashboard/settings');
        return { success: true, message: 'Privacy settings updated.' };
    } catch (error) {
        return { success: false, message: 'Failed to save privacy settings.' };
    }
}

const serializeDoc = (data: Record<string, any>) => {
    return Object.fromEntries(Object.entries(data).map(([key, value]) => [
        key,
        value instanceof Timestamp ? value.toDate().toISOString() : value,
    ]));
};

export async function exportUserData(userId: string) {
    if (!userId) throw new Error("User not authenticated.");

    try {
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);
        const userData = userDocSnap.exists() ? serializeDoc(userDocSnap.data()) : {};

        const userScopedCollections = ['nutritionLogs', 'football_matches', 'tennis_matches'];
        const exportedCollections: Record<string, any[]> = {};

        for (const collectionName of userScopedCollections) {
            const q = query(collection(db, collectionName), where('userId', '==', userId));
            const snap = await getDocs(q);
            exportedCollections[collectionName] = snap.docs.map(d => ({ id: d.id, ...serializeDoc(d.data()) }));
        }

        const bodyweightSnap = await getDocs(collection(db, `users/${userId}/bodyweightLogs`));
        exportedCollections.bodyweightLogs = bodyweightSnap.docs.map(d => ({ id: d.id, ...serializeDoc(d.data()) }));

        const progressPhotosSnap = await getDocs(collection(db, `users/${userId}/progressPhotos`));
        exportedCollections.progressPhotos = progressPhotosSnap.docs.map(d => ({ id: d.id, ...serializeDoc(d.data()) }));

        return {
            success: true,
            message: 'Your data export is ready for download.',
            data: {
                exportedAt: new Date().toISOString(),
                userId,
                profile: userData,
                ...exportedCollections,
            },
        };
    } catch (error) {
        console.error("Error exporting user data:", error);
        return { success: false, message: 'Failed to export your data.' };
    }
}

export async function importUserData(userId: string, data: any) {
    if (!userId) throw new Error("User not authenticated.");
    if (!data || typeof data !== 'object') {
        return { success: false, message: 'Invalid data file.' };
    }

    try {
        let importedCount = 0;

        if (data.profile && typeof data.profile === 'object') {
            const updatePayload: Record<string, any> = {};
            for (const field of ['preferences', 'notifications', 'privacy', 'gymPlan', 'nutritionTarget']) {
                if (data.profile[field] !== undefined) updatePayload[field] = data.profile[field];
            }
            if (Object.keys(updatePayload).length > 0) {
                await updateDoc(doc(db, 'users', userId), updatePayload);
                importedCount++;
            }
        }

        const collectionsToImport = ['nutritionLogs', 'football_matches', 'tennis_matches'];
        for (const collectionName of collectionsToImport) {
            const items = data[collectionName];
            if (!Array.isArray(items)) continue;

            for (const item of items) {
                const { id, ...rest } = item;
                const payload: Record<string, any> = { ...rest, userId };
                for (const dateField of ['createdAt', 'date']) {
                    if (typeof payload[dateField] === 'string') {
                        payload[dateField] = Timestamp.fromDate(new Date(payload[dateField]));
                    }
                }
                await addDoc(collection(db, collectionName), payload);
                importedCount++;
            }
        }

        revalidatePath('/dashboard/settings');
        return { success: true, message: `Import complete. ${importedCount} item(s) restored.` };
    } catch (error) {
        console.error("Error importing user data:", error);
        return { success: false, message: 'Failed to import your data.' };
    }
}

export async function deleteUserAccount(userId: string) {
    // In a real app, this would be a complex, multi-step process with soft deletes
    // and cleanup jobs. For now, it's a placeholder.
    console.log(`Scheduling deletion for user: ${userId}`);
    // await auth.deleteUser(userId); // This would be the final step
    return { success: true, message: 'Account deletion process has been started.' };
}
