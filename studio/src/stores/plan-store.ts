
import { create } from 'zustand';
import { startOfToday, isBefore, format } from 'date-fns';
import { deleteGymPlan, saveGymPlan } from '@/app/dashboard/gym/actions';
import { toast } from '@/hooks/use-toast';

export type WeightUnit = 'kg' | 'lbs' | 'bodyweight';

export type Weight = {
    value: number;
    unit: WeightUnit;
};

export type Exercise = {
  name: string;
  sets: number;
  reps: string;
  weight: Weight;
  completed: boolean;
};

export type DayPlan = {
  day: number;
  focus: string;
  exercises: Exercise[];
  completed: boolean;
  completed_at?: string; // ISO date string
};

export type GymPlan = {
  days: DayPlan[];
};

export type PlanOptions = {
    goal: 'fat_loss' | 'muscle_gain' | 'recomposition';
    experience: 'beginner' | 'intermediate' | 'advanced';
    daysPerWeek: number;
    equipment: string[];
    focusAreas: string[];
};

interface PlanState {
  plan: GymPlan | null;
  currentDayIndex: number;
  lastCompletionDate: string | null;
  isHydrated: boolean;
  userId: string | null;

  initialize: (userId: string, initialPlan: GymPlan | null) => void;
  setPlan: (newPlan: { days: Omit<DayPlan, 'exercises'> & { exercises: Omit<Exercise, 'weight' | 'completed'> & { weight?: string } }[] }) => Promise<void>;
  resetPlan: () => Promise<void>;
  markDayAsCompleted: (completed: boolean) => Promise<void>;
  toggleExerciseCompleted: (dayIndex: number, exerciseIndex: number) => Promise<void>;
  updateExerciseWeight: (dayIndex: number, exerciseIndex: number, newWeightKg: number) => Promise<void>;
  _rehydrate: () => void;
}

const parseWeight = (weightString?: string): Weight => {
    if (!weightString || weightString.toLowerCase() === 'bodyweight') {
        return { value: 0, unit: 'bodyweight' };
    }
    const value = parseFloat(weightString);
    const unit = weightString.includes('lbs') ? 'lbs' : 'kg';
    return { value: isNaN(value) ? 0 : value, unit };
};


export const usePlanStore = create<PlanState>((set, get) => ({
    plan: null,
    currentDayIndex: 0,
    lastCompletionDate: null,
    isHydrated: false,
    userId: null,

    initialize: (userId, initialPlan) => {
        if (get().isHydrated && get().userId === userId) return; // Prevent re-initialization for the same user
        set({
            userId: userId,
            plan: initialPlan,
            isHydrated: true,
        });
        get()._rehydrate();
    },

    setPlan: async (newPlan) => {
        const userId = get().userId;
        if (!userId) return;

        const planWithCompletionAndWeight: GymPlan = {
            ...newPlan,
            days: newPlan.days.map(day => ({
                ...day,
                exercises: day.exercises.map(ex => ({
                    ...ex,
                    weight: parseWeight(ex.weight),
                    completed: false
                }))
            }))
        };

        set({
            plan: planWithCompletionAndWeight,
            currentDayIndex: 0,
            lastCompletionDate: null,
        });
        await saveGymPlan(userId, planWithCompletionAndWeight);
    },

    resetPlan: async () => {
        const userId = get().userId;
        if (!userId) return;

        set({
            plan: null,
            currentDayIndex: 0,
            lastCompletionDate: null,
        });
        await deleteGymPlan(userId);
    },

    markDayAsCompleted: async (completed) => {
        const { plan, currentDayIndex, userId } = get();
        if (!plan || !userId) return;

        const updatedPlan = JSON.parse(JSON.stringify(plan));
        updatedPlan.days[currentDayIndex].completed = completed;
        
        if (completed) {
            updatedPlan.days[currentDayIndex].completed_at = new Date().toISOString();
            set({ plan: updatedPlan, lastCompletionDate: new Date().toISOString() });
        } else {
            delete updatedPlan.days[currentDayIndex].completed_at;
            set({ plan: updatedPlan });
        }
        await saveGymPlan(userId, updatedPlan);
    },

    toggleExerciseCompleted: async (dayIndex, exerciseIndex) => {
        const userId = get().userId;
        if (!userId) return;

        const state = get();
        if (!state.plan) return;

        const newPlan = JSON.parse(JSON.stringify(state.plan));
        const dayBeforeToggle = newPlan.days[dayIndex];
        const wasDayCompletedBefore = dayBeforeToggle.completed;

        const exercise = newPlan.days[dayIndex].exercises[exerciseIndex];
        exercise.completed = !exercise.completed;
        
        // Check if all exercises for the day are completed
        const allDayExercisesCompleted = newPlan.days[dayIndex].exercises.every((ex: Exercise) => ex.completed);
        
        if (allDayExercisesCompleted) {
            newPlan.days[dayIndex].completed = true;
            newPlan.days[dayIndex].completed_at = new Date().toISOString();
            set({ lastCompletionDate: new Date().toISOString() });

            // Show toast only when the day is first marked as complete
            if (!wasDayCompletedBefore) {
                 toast({
                    title: "Streak Updated!",
                    description: "Great job on completing your workout for the day. Keep it up!",
                });
            }
        } else {
            newPlan.days[dayIndex].completed = false;
            delete newPlan.days[dayIndex].completed_at;
        }

        set({ plan: newPlan });
        await saveGymPlan(userId, newPlan);
    },
      
    updateExerciseWeight: async (dayIndex, exerciseIndex, newWeightKg) => {
        const userId = get().userId;
        if (!userId) return;

        const state = get();
        if (!state.plan) return;

        const newPlan = JSON.parse(JSON.stringify(state.plan));
        const exercise = newPlan.days[dayIndex].exercises[exerciseIndex];
        if (exercise.weight.unit !== 'bodyweight') {
            exercise.weight = { value: newWeightKg, unit: 'kg' };
        }
        set({ plan: newPlan });
        await saveGymPlan(userId, newPlan);
    },
      
    _rehydrate: () => {
        const { plan, currentDayIndex, lastCompletionDate } = get();
        if (!plan) {
            return;
        }

        const today = startOfToday();
        const lastDate = lastCompletionDate ? new Date(lastCompletionDate) : null;
        
        if (lastDate && !isBefore(lastDate, today)) {
            return;
        }
        
        if (plan.days[currentDayIndex].completed) {
            const nextDayIndex = (currentDayIndex + 1) % plan.days.length;
            set({ currentDayIndex: nextDayIndex });
        }
    }
}));
