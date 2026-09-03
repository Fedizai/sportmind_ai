'use server';

import { admin, adminDb } from '@/lib/firebase-admin';

/**
 * An athlete's own planned sessions, stored server-side.
 *
 * These used the browser SDK, which means every read and write depended on the
 * `athlete_sessions` block in firestore.rules actually being deployed — and an
 * App Hosting rollout does not deploy rules, they need their own
 * `firebase deploy --only firestore` that nothing in the pipeline runs. Under
 * the default-deny catch-all, a session an athlete planned was refused on the
 * way in and the list came back empty, which is exactly what "prochain
 * entraînement: rien de prévu" looks like from the outside.
 *
 * The Admin SDK bypasses rules entirely, so the feature no longer waits on a
 * deploy step nobody remembers. The caller proves who they are with an ID
 * token and the uid inside it is the only one used — a server action is an
 * HTTP endpoint, so a uid in the request body is whatever the caller types.
 */

const COLLECTION = 'athlete_sessions';

async function requireCaller(idToken: string): Promise<string> {
    if (!idToken) throw new Error('Not signed in.');
    const decoded = await admin.auth().verifyIdToken(idToken);
    return decoded.uid;
}

/** Dates cross the server boundary as ISO strings; JSON has no Date. */
export interface SessionRow {
    id: string;
    sport: string;
    title: string;
    type: string;
    date: string | null;
    duration: number;
    notes: string;
    completed: boolean;
}

export async function listSessions(idToken: string): Promise<SessionRow[]> {
    try {
        const userId = await requireCaller(idToken);
        // userId alone, sorted in memory. Filtering on userId while ordering by
        // date needs its own composite index, and a missing one fails the whole
        // read rather than degrading. One athlete's sessions number in the tens.
        const snap = await adminDb.collection(COLLECTION).where('userId', '==', userId).get();
        return snap.docs.map((doc) => {
            const data = doc.data();
            const date = data.date?.toDate?.() ?? (data.date ? new Date(data.date) : null);
            return {
                id: doc.id,
                sport: data.sport ?? '',
                title: data.title ?? '',
                type: data.type ?? 'other',
                date: date && !Number.isNaN(date.getTime()) ? date.toISOString() : null,
                duration: typeof data.duration === 'number' ? data.duration : 0,
                notes: data.notes ?? '',
                completed: !!data.completed,
            };
        });
    } catch (error) {
        console.error('Could not read athlete sessions:', error);
        return [];
    }
}

export async function createSession(
    idToken: string,
    sport: string,
    values: { title: string; type: string; date: string; duration: number; notes?: string },
): Promise<{ success: boolean; error?: string }> {
    try {
        const userId = await requireCaller(idToken);
        const date = new Date(values.date);
        if (Number.isNaN(date.getTime())) throw new Error('Invalid date.');

        await adminDb.collection(COLLECTION).add({
            userId,
            sport,
            title: values.title,
            type: values.type,
            date,
            duration: values.duration,
            notes: values.notes ?? '',
            completed: false,
            createdAt: new Date(),
        });
        return { success: true };
    } catch (error) {
        console.error('Could not save the session:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}

/** Owner-checked: the id comes from the client, the uid comes from the token. */
async function ownedDoc(idToken: string, sessionId: string) {
    const userId = await requireCaller(idToken);
    const ref = adminDb.collection(COLLECTION).doc(sessionId);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.userId !== userId) throw new Error('Not found.');
    return { ref, data: snap.data()! };
}

export async function setSessionCompleted(
    idToken: string,
    sessionId: string,
): Promise<{ success: boolean; error?: string }> {
    try {
        const { ref, data } = await ownedDoc(idToken, sessionId);
        await ref.update({ completed: !data.completed });
        return { success: true };
    } catch (error) {
        console.error('Could not update the session:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}

export async function deleteSession(
    idToken: string,
    sessionId: string,
): Promise<{ success: boolean; error?: string }> {
    try {
        const { ref } = await ownedDoc(idToken, sessionId);
        await ref.delete();
        return { success: true };
    } catch (error) {
        console.error('Could not remove the session:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}
