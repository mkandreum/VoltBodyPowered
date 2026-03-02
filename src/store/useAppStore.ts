import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserProfile = {
  name: string;
  age: number;
  weight: number;
  height: number;
  gender: string;
  goal: string;
  currentState: string;
  schedule: string;
  workHours: string;
  mealTimes: {
    breakfast: string;
    lunch: string;
    snack: string;
    dinner: string;
  };
  avatarConfig: {
    muscleMass: number;
    bodyFat: number;
  };
};

export type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: number;
  gifUrl: string;
  muscleGroup: string;
};

export type WorkoutDay = {
  day: string;
  focus: string;
  exercises: Exercise[];
};

export type Meal = {
  id: string;
  name: string;
  time: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  description: string;
};

export type DietPlan = {
  dailyCalories: number;
  macros: { protein: number; carbs: number; fat: number };
  meals: Meal[];
};

export type WorkoutLog = {
  date: string;
  exerciseId: string;
  weight: number;
  reps: number;
};

export type ProgressPhoto = {
  date: string;
  url: string;
};

export type Insights = {
  sleepRecommendation: string;
  estimatedResults: string;
  dailyQuote: string;
};

interface AppState {
  isOnboarded: boolean;
  profile: UserProfile | null;
  profilePhoto: string | null;
  progressPhotos: ProgressPhoto[];
  routine: WorkoutDay[];
  diet: DietPlan | null;
  logs: WorkoutLog[];
  insights: Insights | null;
  currentTab: 'home' | 'workout' | 'diet' | 'calendar' | 'profile';
  
  setProfile: (profile: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  setProfilePhoto: (url: string) => void;
  addProgressPhoto: (photo: ProgressPhoto) => void;
  setRoutine: (routine: WorkoutDay[]) => void;
  setDiet: (diet: DietPlan) => void;
  setInsights: (insights: Insights) => void;
  swapMeal: (mealId: string, newMeal: Meal) => void;
  addLog: (log: WorkoutLog) => void;
  setTab: (tab: 'home' | 'workout' | 'diet' | 'calendar' | 'profile') => void;
  completeOnboarding: () => void;
  resetApp: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isOnboarded: false,
      profile: null,
      profilePhoto: null,
      progressPhotos: [],
      routine: [],
      diet: null,
      logs: [],
      insights: null,
      currentTab: 'home',

      setProfile: (profile) => set({ profile }),
      updateProfile: (updates) => set((state) => ({ profile: state.profile ? { ...state.profile, ...updates } : null })),
      setProfilePhoto: (url) => set({ profilePhoto: url }),
      addProgressPhoto: (photo) => set((state) => ({ progressPhotos: [...state.progressPhotos, photo] })),
      setRoutine: (routine) => set({ routine }),
      setDiet: (diet) => set({ diet }),
      setInsights: (insights) => set({ insights }),
      swapMeal: (mealId, newMeal) => set((state) => {
        if (!state.diet) return state;
        return {
          diet: {
            ...state.diet,
            meals: state.diet.meals.map(m => m.id === mealId ? newMeal : m)
          }
        };
      }),
      addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
      setTab: (tab) => set({ currentTab: tab }),
      completeOnboarding: () => set({ isOnboarded: true }),
      resetApp: () => set({ isOnboarded: false, profile: null, profilePhoto: null, progressPhotos: [], routine: [], diet: null, logs: [], insights: null, currentTab: 'home' }),
    }),
    {
      name: 'voltbody-storage',
    }
  )
);
