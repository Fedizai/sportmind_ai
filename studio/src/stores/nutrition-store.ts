
import { create } from 'zustand';
import { collection, query, where, onSnapshot, Unsubscribe, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { startOfDay, endOfDay, format } from 'date-fns';
import type { NutritionLog } from '@/lib/schemas';

let listener: Unsubscribe | null = null;
/**
 * Who the live query is for, and which local day it covers.
 *
 * The query window is fixed when the listener is built, and the listener was
 * only ever built once. A tab open past midnight therefore kept yesterday's
 * window: the ring went on showing yesterday's calories, and every later
 * `startListener` call saw a listener already running and left it alone.
 * Recording the day means a call for a different one rebuilds instead.
 */
let listeningFor: { userId: string; day: string } | null = null;

const localDay = () => format(new Date(), 'yyyy-MM-dd');

export interface DailyLog {
    breakfast: (NutritionLog & {id: string})[];
    lunch: (NutritionLog & {id: string})[];
    dinner: (NutritionLog & {id: string})[];
    snack: (NutritionLog & {id: string})[];
}

interface DailyTotals {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

interface NutritionState {
  dailyLogs: DailyLog;
  dailyTotals: DailyTotals;
  isLoading: boolean;
  startListener: (userId: string) => void;
  stopListener: () => void;
  resetDailyData: (userId: string) => void;
}

const initialState = {
    dailyLogs: { breakfast: [], lunch: [], dinner: [], snack: [] },
    dailyTotals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    isLoading: true,
};

export const useNutritionStore = create<NutritionState>((set, get) => ({
  ...initialState,
  startListener: (userId) => {
    const day = localDay();
    if (listener && listeningFor?.userId === userId && listeningFor.day === day) {
      return; // Already watching this athlete's today
    }

    if (listener) {
      // A different athlete, or a day that has since turned over.
      listener();
      listener = null;
      set(initialState);
    }
    listeningFor = { userId, day };

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const q = query(
      collection(db, "nutritionLogs"),
      where("userId", "==", userId),
      where("createdAt", ">=", Timestamp.fromDate(todayStart)),
      where("createdAt", "<=", Timestamp.fromDate(todayEnd))
    );

    listener = onSnapshot(q, (querySnapshot) => {
      const newDailyLog: DailyLog = { breakfast: [], lunch: [], dinner: [], snack: [] };
      const newDailyTotals: DailyTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as NutritionLog;
        const logWithId = { id: doc.id, ...data };
        if (logWithId.createdAt instanceof Timestamp) {
            logWithId.createdAt = logWithId.createdAt.toDate();
        }

        if (logWithId.mealType) {
          newDailyLog[logWithId.mealType].push(logWithId);
        }

        logWithId.items.forEach(item => {
            newDailyTotals.calories += item.calories;
            newDailyTotals.protein += item.protein;
            newDailyTotals.carbs += item.carbs;
            newDailyTotals.fat += item.fat;
        });
      });
      
      set({ dailyLogs: newDailyLog, dailyTotals: newDailyTotals, isLoading: false });
    }, (error) => {
      console.error("Error fetching nutrition logs:", error);
      set({ isLoading: false });
    });
  },
  stopListener: () => {
    listeningFor = null;
    if (listener) {
      listener();
      listener = null;
      set(initialState);
    }
  },
  resetDailyData: (userId: string) => {
    get().stopListener();
    set(initialState);
    get().startListener(userId);
  }
}));
