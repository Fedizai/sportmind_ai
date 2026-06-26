
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { startOfDay, format, subDays } from 'date-fns';
import { usePlanStore } from './plan-store';

interface StreakState {
  streak: number;
  isLoading: boolean;
  lastCalculated: string | null;
  calculateStreak: (userId: string) => Promise<void>;
}

const getTodayString = () => format(new Date(), 'yyyy-MM-dd');

export const useStreakStore = create<StreakState>()(
  persist(
    (set) => ({
      streak: 0,
      isLoading: true,
      lastCalculated: null,

      calculateStreak: async (userId: string) => {
        set({ isLoading: true });

        try {
          const { plan } = usePlanStore.getState();

          const gymQuery = (plan?.days || [])
            .filter(d => d.completed_at)
            .map(d => startOfDay(new Date(d.completed_at!)));

          const footballQuery = query(collection(db, "football_matches"), where("userId", "==", userId));
          const tennisQuery = query(collection(db, "tennis_matches"), where("userId", "==", userId));
          const nutritionQuery = query(collection(db, "nutritionLogs"), where("userId", "==", userId));

          const [footballSnapshot, tennisSnapshot, nutritionSnapshot] = await Promise.all([
            getDocs(footballQuery),
            getDocs(tennisQuery),
            getDocs(nutritionQuery)
          ]);

          const footballDates = footballSnapshot.docs.map(doc => startOfDay((doc.data().date as Timestamp).toDate()));
          const tennisDates = tennisSnapshot.docs.map(doc => startOfDay((doc.data().date as Timestamp).toDate()));
          const nutritionDates = nutritionSnapshot.docs.map(doc => startOfDay((doc.data().createdAt as Timestamp).toDate()));

          const activityTimestamps = [...gymQuery, ...footballDates, ...tennisDates, ...nutritionDates].map(d => d.getTime());
          const uniqueDays = [...new Set(activityTimestamps)].sort((a, b) => b - a);
          
          if (uniqueDays.length === 0) {
            set({ streak: 0, isLoading: false, lastCalculated: getTodayString() });
            return;
          }

          let currentStreak = 0;
          let checkDate = new Date(uniqueDays[0]);
          const today = startOfDay(new Date());
          const yesterday = startOfDay(subDays(new Date(), 1));

          if (checkDate.getTime() === today.getTime() || checkDate.getTime() === yesterday.getTime()) {
             currentStreak = 1;
             for (let i = 1; i < uniqueDays.length; i++) {
                const currentDate = new Date(uniqueDays[i-1]);
                const prevDate = new Date(uniqueDays[i]);
                if (currentDate.getTime() - prevDate.getTime() === 24 * 60 * 60 * 1000) {
                    currentStreak++;
                } else {
                    break;
                }
             }
          }
           set({ streak: currentStreak, isLoading: false, lastCalculated: getTodayString() });

        } catch (error) {
          console.error("Error calculating streak:", error);
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'streak-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
