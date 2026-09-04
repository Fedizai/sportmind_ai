'use server';

import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

import { admin, adminDb } from '@/lib/firebase-admin';

/**
 * Scheduling a match, on its own.
 *
 * A fixture used to be a mode of the "log a match" dialog — a form built to
 * record what happened, asked to describe something that had not. It is a
 * different act with different inputs, so it gets its own page.
 *
 * The rows land in the same `football_matches` / `tennis_matches` collections
 * every other screen already reads, carrying `status: 'upcoming'`. That is what
 * makes the sport pages and insights pick a new fixture up with no further
 * wiring: there is one place a match lives, and a fixture is a match whose
 * result has not been filled in yet.
 *
 * Admin SDK behind an ID token, so saving cannot be refused by a security rule
 * that was never deployed — an App Hosting rollout does not deploy
 * firestore.rules. The uid comes from the token and never from the request
 * body: a server action is an HTTP endpoint, so anything the caller sends is
 * whatever the caller typed.
 */

export type FixtureSport = 'football' | 'tennis';

const COLLECTIONS: Record<FixtureSport, string> = {
    football: 'football_matches',
    tennis: 'tennis_matches',
};

const ROUTES: Record<FixtureSport, string> = {
    football: '/dashboard/football',
    tennis: '/dashboard/tennis',
};

export interface FixtureInput {
    opponent: string;
    /** ISO string — JSON has no Date, and the time of day is part of a fixture. */
    date: string;
    venue?: string;
    competition?: string;
    notes?: string;
    /** Tennis only. */
    surface?: string;
}

export interface FixtureRow {
    id: string;
    sport: FixtureSport;
    opponent: string;
    date: string;
    venue?: string;
    competition?: string;
    notes?: string;
    surface?: string;
}

async function requireCaller(idToken: string): Promise<string> {
    if (!idToken) throw new Error('Not signed in.');
    const decoded = await admin.auth().verifyIdToken(idToken);
    return decoded.uid;
}

function assertSport(sport: string): FixtureSport {
    if (sport !== 'football' && sport !== 'tennis') throw new Error('Unknown sport.');
    return sport;
}

export async function createFixture(
    idToken: string,
    sport: string,
    values: FixtureInput,
): Promise<{ success: boolean; error?: string }> {
    try {
        const userId = await requireCaller(idToken);
        const key = assertSport(sport);

        const opponent = values.opponent?.trim();
        if (!opponent) throw new Error('An opponent is required.');

        const date = new Date(values.date);
        if (Number.isNaN(date.getTime())) throw new Error('A valid date is required.');

        // Only what is knowable before kick-off. Writing the form's defaults for
        // goals, minutes or a result would file a match report for a match
        // nobody has played, and every average and chart downstream reads them.
        const row: Record<string, unknown> = {
            userId,
            opponent,
            date: Timestamp.fromDate(date),
            status: 'upcoming',
            createdAt: Timestamp.now(),
        };
        if (values.venue?.trim()) row.venue = values.venue.trim();
        if (values.competition?.trim()) row.competition = values.competition.trim();
        if (values.notes?.trim()) row.notes = values.notes.trim();
        if (key === 'tennis' && values.surface) row.surface = values.surface;

        await adminDb.collection(COLLECTIONS[key]).add(row);

        revalidatePath(ROUTES[key]);
        revalidatePath('/dashboard/insights');
        revalidatePath('/dashboard/fixtures');
        return { success: true };
    } catch (error) {
        console.error('Could not schedule the match:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}

/** Every fixture the athlete has ahead of them, both sports, soonest first. */
export async function listFixtures(idToken: string): Promise<FixtureRow[]> {
    try {
        const userId = await requireCaller(idToken);

        const rows: FixtureRow[] = [];
        for (const sport of ['football', 'tennis'] as const) {
            // userId alone, filtered in memory. Adding `status` and an ordering
            // to the query needs its own composite index, and a missing index
            // fails the whole read rather than degrading — which has already
            // emptied two lists in this app.
            const snap = await adminDb.collection(COLLECTIONS[sport]).where('userId', '==', userId).get();
            snap.forEach((doc) => {
                const data = doc.data();
                if (data.status !== 'upcoming') return;
                const date = data.date?.toDate?.() ?? (data.date ? new Date(data.date) : null);
                if (!date || Number.isNaN(date.getTime())) return;
                rows.push({
                    id: doc.id,
                    sport,
                    opponent: data.opponent ?? '',
                    date: date.toISOString(),
                    venue: data.venue ?? '',
                    competition: data.competition ?? '',
                    notes: data.notes ?? '',
                    surface: data.surface ?? '',
                });
            });
        }
        rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return rows;
    } catch (error) {
        console.error('Could not read your fixtures:', error);
        return [];
    }
}

export async function deleteFixture(
    idToken: string,
    sport: string,
    fixtureId: string,
): Promise<{ success: boolean; error?: string }> {
    try {
        const userId = await requireCaller(idToken);
        const key = assertSport(sport);

        // The id comes from the client, the uid from the token — so check the
        // row belongs to the caller before removing it.
        const ref = adminDb.collection(COLLECTIONS[key]).doc(fixtureId);
        const snap = await ref.get();
        if (!snap.exists || snap.data()?.userId !== userId) throw new Error('Not found.');
        await ref.delete();

        revalidatePath(ROUTES[key]);
        revalidatePath('/dashboard/insights');
        revalidatePath('/dashboard/fixtures');
        return { success: true };
    } catch (error) {
        console.error('Could not remove the fixture:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}
