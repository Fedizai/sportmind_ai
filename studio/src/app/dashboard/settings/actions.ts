
'use server';

import { z } from 'zod';
import { auth, db } from '@/lib/firebase';
import { admin, adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { getAuth, updateProfile } from 'firebase/auth';
import { doc, updateDoc, getDoc, getDocs, addDoc, collection, query, where } from 'firebase/firestore';
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


/**
 * Settings writes.
 *
 * These reached Firestore through the browser SDK from inside a 'use server'
 * module, where nobody is signed in — so every write arrived unauthenticated
 * and the rules refused it. Saving a name reported "Failed to update account
 * settings" every time, because it genuinely had.
 *
 * They also called getAuth().currentUser to update the Firebase Auth profile.
 * On the server that is always null, so the auth display name was never
 * touched even when the Firestore write was expected to succeed. The Admin SDK
 * updates both records.
 */

export async function updateAccountSettings(idToken: string, data: z.infer<typeof accountSchema>) {
  const validatedData = accountSchema.safeParse(data);
  if (!validatedData.success) {
    return { success: false, message: 'Invalid data provided.' };
  }

  try {
    const uid = await requireCaller(idToken);
    const { fullName } = validatedData.data;

    // Both records, or the header and the auth account disagree about the name.
    await admin.auth().updateUser(uid, { displayName: fullName });
    await adminDb.collection('users').doc(uid).set({ displayName: fullName }, { merge: true });

    revalidatePath('/dashboard/settings');
    return { success: true, message: 'Account settings updated successfully.' };
  } catch (error) {
    console.error('Error updating account settings:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Failed to update account settings.' };
  }
}

/** One shape for the three settings groups that only write a single field. */
async function writeSettingsField(idToken: string, field: string, value: unknown, label: string) {
    try {
        const uid = await requireCaller(idToken);
        await adminDb.collection('users').doc(uid).set({ [field]: value }, { merge: true });
        revalidatePath('/dashboard/settings');
        return { success: true, message: `${label} updated.` };
    } catch (error) {
        console.error(`Error updating ${field}:`, error);
        return { success: false, message: error instanceof Error ? error.message : `Failed to save ${label.toLowerCase()}.` };
    }
}

export async function updatePreferences(idToken: string, data: z.infer<typeof preferencesSchema>) {
    const parsed = preferencesSchema.safeParse(data);
    if (!parsed.success) return { success: false, message: 'Invalid data provided.' };
    return writeSettingsField(idToken, 'preferences', parsed.data, 'Preferences');
}

export async function updateNotifications(idToken: string, data: z.infer<typeof notificationsSchema>) {
    const parsed = notificationsSchema.safeParse(data);
    if (!parsed.success) return { success: false, message: 'Invalid data provided.' };
    return writeSettingsField(idToken, 'notifications', parsed.data, 'Notification settings');
}

export async function updatePrivacy(idToken: string, data: z.infer<typeof privacySchema>) {
    const parsed = privacySchema.safeParse(data);
    if (!parsed.success) return { success: false, message: 'Invalid data provided.' };
    return writeSettingsField(idToken, 'privacy', parsed.data, 'Privacy settings');
}

const serializeDoc = (data: Record<string, any>) => {
    return Object.fromEntries(Object.entries(data).map(([key, value]) => [
        key,
        value instanceof Timestamp ? value.toDate().toISOString() : value,
    ]));
};

/**
 * Data export, import and account deletion.
 *
 * These three run against the Admin SDK, not the client one. They used to
 * import `db` from lib/firebase — the browser SDK — from inside a 'use server'
 * module, where no user is signed in, so every read and write arrived at
 * Firestore unauthenticated and the security rules refused it. Nothing these
 * functions did could ever have reached the database.
 *
 * They also took a uid straight from the caller. A server action is an HTTP
 * endpoint, so that uid is whatever the caller types: with a working delete
 * behind it, anyone could have erased any account by passing someone else's
 * id, and exported anyone's data by passing theirs. The caller now proves who
 * they are with an ID token, and the uid inside it is the only one used.
 */

/** Verify the caller and return their uid. A client-supplied uid is ignored. */
async function requireCaller(idToken: string): Promise<string> {
    if (!idToken) throw new Error('Not signed in.');
    const decoded = await admin.auth().verifyIdToken(idToken);
    return decoded.uid;
}

/** Top-level collections whose documents carry a `userId` field. */
const OWNED_COLLECTIONS = [
    'nutritionLogs',
    'football_matches',
    'tennis_matches',
    'basketball_games',
    'boxing_bouts',
    'swimming_sessions',
] as const;

/** Firestore values that JSON cannot represent on its own. */
function serialize(value: any): any {
    if (value === null || value === undefined) return value ?? null;
    if (typeof value?.toDate === 'function') return value.toDate().toISOString();
    if (Array.isArray(value)) return value.map(serialize);
    if (typeof value === 'object' && value.constructor === Object) {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serialize(v)]));
    }
    return value;
}

/** Turn ISO strings back into Timestamps on the fields known to hold dates. */
const DATE_FIELDS = ['createdAt', 'date', 'timestamp', 'completed_at', 'respondedAt'];
function deserialize(payload: Record<string, any>): Record<string, any> {
    const out: Record<string, any> = { ...payload };
    for (const field of DATE_FIELDS) {
        if (typeof out[field] === 'string') {
            const parsed = new Date(out[field]);
            if (!Number.isNaN(parsed.getTime())) out[field] = Timestamp.fromDate(parsed);
        }
    }
    return out;
}

export async function exportUserData(idToken: string) {
    try {
        const uid = await requireCaller(idToken);

        const profileSnap = await adminDb.collection('users').doc(uid).get();
        const collections: Record<string, any[]> = {};

        for (const name of OWNED_COLLECTIONS) {
            const snap = await adminDb.collection(name).where('userId', '==', uid).get();
            collections[name] = snap.docs.map((d) => ({ id: d.id, ...serialize(d.data()) }));
        }

        // Per-user subcollections are discovered rather than listed: body scans,
        // bodyweight logs, progress photos and anything added later.
        const subcollections: Record<string, any[]> = {};
        for (const sub of await adminDb.collection('users').doc(uid).listCollections()) {
            const snap = await sub.get();
            subcollections[sub.id] = snap.docs.map((d) => ({ id: d.id, ...serialize(d.data()) }));
        }

        const tickets = await adminDb.collection('supportTickets').where('userId', '==', uid).get();
        const friendships = await adminDb.collection('friendships').where('users', 'array-contains', uid).get();
        const answers = await adminDb.collection('signupAnswers').doc(uid).get();

        return {
            success: true,
            message: 'Your data export is ready for download.',
            data: {
                exportedAt: new Date().toISOString(),
                userId: uid,
                profile: profileSnap.exists ? serialize(profileSnap.data()) : {},
                signupAnswers: answers.exists ? serialize(answers.data()) : null,
                ...collections,
                subcollections,
                supportTickets: tickets.docs.map((d) => ({ id: d.id, ...serialize(d.data()) })),
                friendships: friendships.docs.map((d) => ({ id: d.id, ...serialize(d.data()) })),
            },
        };
    } catch (error) {
        console.error('Error exporting user data:', error);
        return { success: false, message: error instanceof Error ? error.message : 'Failed to export your data.' };
    }
}

export async function importUserData(idToken: string, data: any) {
    try {
        const uid = await requireCaller(idToken);
        if (!data || typeof data !== 'object') {
            return { success: false, message: 'That file is not a SportMind export.' };
        }

        let restored = 0;

        if (data.profile && typeof data.profile === 'object') {
            // Only settings come back. Role, plan and streak decide what the
            // account is allowed to do, and an import is a file the user can
            // edit by hand — restoring those would hand out Pro and admin.
            const allowed = ['preferences', 'notifications', 'privacy', 'gymPlan', 'nutritionTarget', 'favorites'];
            const payload: Record<string, any> = {};
            for (const field of allowed) {
                if (data.profile[field] !== undefined) payload[field] = data.profile[field];
            }
            if (Object.keys(payload).length > 0) {
                await adminDb.collection('users').doc(uid).set(payload, { merge: true });
                restored++;
            }
        }

        for (const name of OWNED_COLLECTIONS) {
            const items = data[name];
            if (!Array.isArray(items)) continue;
            for (const item of items) {
                if (!item || typeof item !== 'object') continue;
                const { id, userId: _ignored, ...rest } = item;
                // Written under the original id, so importing the same file
                // twice restores rather than duplicating every entry — which is
                // what addDoc did before. userId is forced to the caller, so a
                // hand-edited file cannot file data against someone else.
                const ref = id ? adminDb.collection(name).doc(String(id)) : adminDb.collection(name).doc();
                await ref.set({ ...deserialize(rest), userId: uid });
                restored++;
            }
        }

        if (data.subcollections && typeof data.subcollections === 'object') {
            for (const [name, items] of Object.entries(data.subcollections)) {
                if (!Array.isArray(items)) continue;
                for (const item of items as any[]) {
                    if (!item || typeof item !== 'object') continue;
                    const { id, ...rest } = item;
                    const ref = adminDb.collection('users').doc(uid).collection(name);
                    await (id ? ref.doc(String(id)) : ref.doc()).set(deserialize(rest));
                    restored++;
                }
            }
        }

        // Friendships and conversations are deliberately not restored: both
        // describe a relationship with another person, and a file the importer
        // can edit must not be able to manufacture one.

        revalidatePath('/dashboard/settings');
        return { success: true, message: `Import complete. ${restored} item(s) restored.` };
    } catch (error) {
        console.error('Error importing user data:', error);
        return { success: false, message: error instanceof Error ? error.message : 'Failed to import your data.' };
    }
}

export async function deleteUserAccount(idToken: string) {
    try {
        const uid = await requireCaller(idToken);

        // Owned documents in shared collections.
        for (const name of OWNED_COLLECTIONS.concat(['supportTickets' as any])) {
            const snap = await adminDb.collection(name).where('userId', '==', uid).get();
            await Promise.all(snap.docs.map((d) => adminDb.recursiveDelete(d.ref)));
        }

        // Friendships, which are jointly held: removing them is the same write
        // as unfriending, and leaves the other person no dangling link.
        const friendships = await adminDb.collection('friendships').where('users', 'array-contains', uid).get();
        await Promise.all(friendships.docs.map((d) => d.ref.delete()));

        // Conversations are one-to-one, so a thread with a deleted account has
        // no remaining owner. Messages go with them.
        const conversations = await adminDb.collection('conversations').where('participants', 'array-contains', uid).get();
        await Promise.all(conversations.docs.map((d) => adminDb.recursiveDelete(d.ref)));

        await adminDb.collection('signupAnswers').doc(uid).delete();
        // The profile last, with every subcollection under it.
        await adminDb.recursiveDelete(adminDb.collection('users').doc(uid));

        // The auth record last of all: while it exists the athlete can still
        // sign in, so failing earlier leaves an account that works rather than
        // one that is half gone.
        await admin.auth().deleteUser(uid);

        return { success: true, message: 'Your account and all of its data have been deleted.' };
    } catch (error) {
        console.error('Error deleting account:', error);
        return { success: false, message: error instanceof Error ? error.message : 'Failed to delete your account.' };
    }
}
