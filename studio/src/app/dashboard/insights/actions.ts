'use server';

import { admin, adminDb } from '@/lib/firebase-admin';
import { DAILY_SNAPSHOTS, type DailySnapshot } from '@/lib/daily-archive';

/**
 * The permanent record behind the insights history.
 *
 * These run through the Admin SDK for one practical reason: Firestore security
 * rules are not deployed by an App Hosting rollout — they need their own
 * `firebase deploy --only firestore:rules`. A feature whose storage depends on
 * a rules change nobody remembers to run is a feature that silently saves
 * nothing, which is exactly the failure this is meant to end.
 *
 * The caller proves who they are with an ID token and the uid inside it is the
 * only one used. A server action is an HTTP endpoint, so a uid in the request
 * body is whatever the caller types — passing someone else's would otherwise
 * hand over their nutrition plan and training history.
 */

async function requireCaller(idToken: string): Promise<string> {
    if (!idToken) throw new Error('Not signed in.');
    const decoded = await admin.auth().verifyIdToken(idToken);
    return decoded.uid;
}

/** `yyyy-MM-dd` only — the id is built from it, so it must not carry a path. */
function assertDay(day: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Invalid day.');
}

export async function saveDailySnapshot(
    idToken: string,
    day: string,
    payload: Pick<DailySnapshot, 'mealPlan' | 'shoppingList' | 'planDays'>,
): Promise<{ success: boolean; error?: string }> {
    try {
        const userId = await requireCaller(idToken);
        assertDay(day);
        await adminDb.collection(DAILY_SNAPSHOTS).doc(`${userId}_${day}`).set({
            userId,
            day,
            mealPlan: payload.mealPlan ?? null,
            shoppingList: payload.shoppingList ?? [],
            planDays: payload.planDays ?? 1,
            updatedAt: new Date().toISOString(),
        }, { merge: true });
        return { success: true };
    } catch (error) {
        console.error('Could not save the day:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}

export async function fetchDailySnapshot(idToken: string, day: string): Promise<DailySnapshot | null> {
    try {
        const userId = await requireCaller(idToken);
        assertDay(day);
        const snap = await adminDb.collection(DAILY_SNAPSHOTS).doc(`${userId}_${day}`).get();
        return snap.exists ? (JSON.parse(JSON.stringify(snap.data())) as DailySnapshot) : null;
    } catch (error) {
        console.error('Could not load the saved day:', error);
        return null;
    }
}

/** One finished workout, read back long after the plan that produced it changed. */
export async function fetchWorkoutLog(idToken: string, day: string): Promise<any | null> {
    try {
        const userId = await requireCaller(idToken);
        assertDay(day);
        const snap = await adminDb.collection('workout_logs').doc(`${userId}_${day}`).get();
        return snap.exists ? JSON.parse(JSON.stringify(snap.data())) : null;
    } catch (error) {
        console.error('Could not load the workout log:', error);
        return null;
    }
}
