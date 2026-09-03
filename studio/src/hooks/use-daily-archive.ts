"use client";

import { useEffect, useRef, useState } from 'react';
import { getAuth } from 'firebase/auth';

import { dayKey, type DailySnapshot } from '@/lib/daily-archive';
import { fetchDailySnapshot, fetchWorkoutLog, saveDailySnapshot } from '@/app/dashboard/insights/actions';
import { useNutritionPlanStore } from '@/stores/nutrition-plan-store';
import { useShoppingListStore } from '@/stores/shopping-list-store';
import { useUser } from './use-user';

/** Proof of who is calling. The server ignores any uid sent alongside it. */
async function idToken(): Promise<string | null> {
    const current = getAuth().currentUser;
    return current ? current.getIdToken() : null;
}

/**
 * Keep every day's meal plan and shopping list, forever.
 *
 * These two lived in `localStorage` alone. That storage is keyed by browser,
 * not by athlete, so a plan did not follow anyone to a second device, did not
 * survive a cleared browser, and — worse — was inherited by whoever signed in
 * on that machine next. It also held exactly one day: today overwrote
 * yesterday, so the history page's meal-plan and shopping-list cards could
 * never show anything but "no plan", no matter how long the app had been used.
 *
 * Local storage stays as the instant cache; Firestore is now the record.
 */
export function useDailyArchive() {
    const { user } = useUser();
    const userId = user?.uid;

    // Nothing may be written until the saved day has been read back, or a
    // fresh browser's empty list would overwrite a real day on the server.
    const hydratedFor = useRef<string | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Writing is gated on hydration, so the mirror has to be told when that
    // finishes — otherwise a first device, whose plan exists only in this
    // browser, would never send it up until the athlete happened to edit it.
    const [hydrationTick, setHydrationTick] = useState(0);

    useEffect(() => {
        if (!userId) {
            hydratedFor.current = null;
            return;
        }

        const key = `${userId}_${dayKey(new Date())}`;
        if (hydratedFor.current === key) return;

        let cancelled = false;

        (async () => {
            try {
                const token = await idToken();
                if (cancelled || !token) return;

                const saved = await fetchDailySnapshot(token, dayKey(new Date()));
                if (cancelled) return;

                if (saved) {
                    // The server's copy wins: it is this athlete's own day, and
                    // whatever sits in this browser may well be someone else's.
                    useNutritionPlanStore.getState().hydrate(saved.mealPlan ?? null);
                    useShoppingListStore.getState().hydrate(
                        Array.isArray(saved.shoppingList) ? saved.shoppingList : [],
                        typeof saved.planDays === 'number' ? saved.planDays : 1,
                    );
                }
            } catch (error) {
                // A failed read must not stop the day being saved — worst case
                // the local copy is the newer one and gets mirrored up.
                console.error('Could not load the saved day:', error);
            } finally {
                if (!cancelled) {
                    hydratedFor.current = key;
                    setHydrationTick(tick => tick + 1);
                }
            }
        })();

        return () => { cancelled = true; };
    }, [userId]);

    useEffect(() => {
        if (!userId) return;

        const write = async () => {
            const day = dayKey(new Date());
            const key = `${userId}_${day}`;
            if (hydratedFor.current !== key) {
                // A tab left open past midnight rolls onto a new day. There is
                // nothing saved for it yet, so local is the truth and writing
                // is safe — refusing would quietly stop saving until a reload.
                if (!hydratedFor.current?.startsWith(`${userId}_`)) return;
                hydratedFor.current = key;
            }

            const token = await idToken();
            if (!token) return;

            const mealPlan = useNutritionPlanStore.getState().generatedPlan;
            const { items, planDays } = useShoppingListStore.getState();

            const result = await saveDailySnapshot(token, day, {
                // A generated plan carries optional fields left unset, and
                // Firestore rejects a document containing `undefined` anywhere
                // inside it. A rejected write is a day of history lost.
                mealPlan: JSON.parse(JSON.stringify(mealPlan ?? null)),
                shoppingList: JSON.parse(JSON.stringify(items ?? [])),
                planDays,
            });
            if (!result.success) console.error('Could not save the day:', result.error);
        };

        // Ticking off five shopping items in a row is five store updates and
        // should be one write.
        const schedule = () => {
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => { void write(); }, 800);
        };

        const unsubPlan = useNutritionPlanStore.subscribe(schedule);
        const unsubList = useShoppingListStore.subscribe(schedule);
        // Seed the day as soon as it is safe to, so a plan generated before
        // this hook mounted is not left only in the browser.
        schedule();

        return () => {
            unsubPlan();
            unsubList();
            if (timer.current) clearTimeout(timer.current);
        };
    }, [userId, hydrationTick]);
}

/** Read one saved day back. Returns null when nothing was saved that day. */
export async function loadDailySnapshot(date: Date): Promise<DailySnapshot | null> {
    const token = await idToken();
    if (!token) return null;
    return fetchDailySnapshot(token, dayKey(date));
}

/**
 * Read one finished workout back.
 *
 * Separate from the gym plan on purpose: the plan holds this week and is
 * rewritten constantly, the log holds every week and is never overwritten.
 */
export async function loadWorkoutLog(date: Date): Promise<any | null> {
    const token = await idToken();
    if (!token) return null;
    return fetchWorkoutLog(token, dayKey(date));
}
