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
  trainingDaysPerWeek: number;
  sessionMinutes: number;
  goalDirection: 'Perder' | 'Ganar';
  goalTargetKg: number;
  goalTimelineMonths: number;
  mealTimes: {
    breakfast: string;
    brunch: string;
    lunch: string;
    snack: string;
    dinner: string;
  };
  foodPreferences: {
    vegetables: string[];
    carbs: string[];
    proteins: string[];
  };
  weeklySpecialSession: {
    enabled: boolean;
    activity: string;
    day: string;
    durationMinutes: number;
  };
  avatarConfig: {
    muscleMass: number;
    bodyFat: number;
  };
};

export type Exercise = {
  id: string;
  name: string;
  nameEn?: string;
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

export type WeightLog = {
  date: string; // YYYY-MM-DD
  weight: number;
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

export type AppTheme = 'verde-negro' | 'aguamarina-negro' | 'ocaso-negro';

export type ExerciseLibraryEntry = {
  id: string;
  name: string;
  muscleGroup: string;
  defaultSets: number;
  defaultReps: string;
};

export type WeeklyGoal = {
  id: string;
  label: string;
  done: boolean;
};

export type AppToast = {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
};

interface AppState {
  // Auth
  authToken: string | null;
  user: { id: string; email: string; name: string | null } | null;
  isAuthenticated: boolean;
  
  // Onboarding
  isOnboarded: boolean;
  profile: UserProfile | null;
  profilePhoto: string | null;
  progressPhotos: ProgressPhoto[];
  routine: WorkoutDay[];
  diet: DietPlan | null;
  logs: WorkoutLog[];
  insights: Insights | null;
  currentTab: 'home' | 'workout' | 'diet' | 'calendar' | 'profile';
  theme: AppTheme;
  customWorkout: Exercise[];
  exerciseLibrary: ExerciseLibraryEntry[];
  motivationPhrase: string;
  motivationPhoto: string | null;
  toasts: AppToast[];
  weightLogs: WeightLog[];
  // Maps date (YYYY-MM-DD) -> array of eaten meal IDs
  mealEatenRecord: Record<string, string[]>;
  weeklyGoals: WeeklyGoal[];

  // Auth actions
  setAuthToken: (token: string | null) => void;
  setUser: (user: { id: string; email: string; name: string | null } | null) => void;
  logout: () => void;
  
  // Profile actions
  setProfile: (profile: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  setProfilePhoto: (url: string) => void;
  addProgressPhoto: (photo: ProgressPhoto) => void;
  setRoutine: (routine: WorkoutDay[]) => void;
  setDiet: (diet: DietPlan) => void;
  setInsights: (insights: Insights) => void;
  swapMeal: (mealId: string, newMeal: Meal) => void;
  addLog: (log: WorkoutLog) => void;
  setLogs: (logs: WorkoutLog[]) => void;
  setProgressPhotos: (photos: ProgressPhoto[]) => void;
  setTab: (tab: 'home' | 'workout' | 'diet' | 'calendar' | 'profile') => void;
  setTheme: (theme: AppTheme) => void;
  addToCustomWorkout: (exercise: ExerciseLibraryEntry) => void;
  removeFromCustomWorkout: (exerciseId: string) => void;
  setMotivationPhrase: (phrase: string) => void;
  setMotivationPhoto: (photo: string | null) => void;
  showToast: (toast: Omit<AppToast, 'id'>) => void;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
  addWeightLog: (log: WeightLog) => void;
  toggleMealEaten: (mealId: string, date: string) => void;
  toggleWeeklyGoal: (id: string) => void;
  completeOnboarding: () => void;
  resetApp: () => void;
}

const defaultExerciseLibrary: ExerciseLibraryEntry[] = [
  { id: 'chest-1', name: 'Press de banca', muscleGroup: 'Pecho', defaultSets: 4, defaultReps: '8-12' },
  { id: 'chest-2', name: 'Press inclinado con mancuernas', muscleGroup: 'Pecho', defaultSets: 4, defaultReps: '10-12' },
  { id: 'chest-3', name: 'Aperturas en polea', muscleGroup: 'Pecho', defaultSets: 3, defaultReps: '12-15' },
  { id: 'chest-4', name: 'Fondos en paralelas', muscleGroup: 'Pecho', defaultSets: 3, defaultReps: '8-12' },

  { id: 'back-1', name: 'Dominadas asistidas', muscleGroup: 'Espalda', defaultSets: 4, defaultReps: '6-10' },
  { id: 'back-2', name: 'Remo con barra', muscleGroup: 'Espalda', defaultSets: 4, defaultReps: '8-12' },
  { id: 'back-3', name: 'Jalón al pecho', muscleGroup: 'Espalda', defaultSets: 3, defaultReps: '10-12' },
  { id: 'back-4', name: 'Remo en cable sentado', muscleGroup: 'Espalda', defaultSets: 3, defaultReps: '10-12' },

  { id: 'legs-1', name: 'Sentadilla goblet', muscleGroup: 'Piernas', defaultSets: 4, defaultReps: '10-12' },
  { id: 'legs-2', name: 'Prensa de piernas', muscleGroup: 'Piernas', defaultSets: 4, defaultReps: '10-15' },
  { id: 'legs-3', name: 'Peso muerto rumano', muscleGroup: 'Piernas', defaultSets: 4, defaultReps: '8-10' },
  { id: 'legs-4', name: 'Zancadas caminando', muscleGroup: 'Piernas', defaultSets: 3, defaultReps: '12 por pierna' },

  { id: 'shoulders-1', name: 'Press militar con mancuernas', muscleGroup: 'Hombros', defaultSets: 4, defaultReps: '8-12' },
  { id: 'shoulders-2', name: 'Elevaciones laterales', muscleGroup: 'Hombros', defaultSets: 3, defaultReps: '12-15' },
  { id: 'shoulders-3', name: 'Pájaros inclinado', muscleGroup: 'Hombros', defaultSets: 3, defaultReps: '12-15' },
  { id: 'shoulders-4', name: 'Face pulls', muscleGroup: 'Hombros', defaultSets: 3, defaultReps: '12-15' },

  { id: 'arms-1', name: 'Curl de bíceps con barra', muscleGroup: 'Bíceps', defaultSets: 3, defaultReps: '10-12' },
  { id: 'arms-2', name: 'Curl martillo', muscleGroup: 'Bíceps', defaultSets: 3, defaultReps: '10-12' },
  { id: 'arms-3', name: 'Extensión de tríceps en polea', muscleGroup: 'Tríceps', defaultSets: 3, defaultReps: '10-12' },
  { id: 'arms-4', name: 'Press francés', muscleGroup: 'Tríceps', defaultSets: 3, defaultReps: '10-12' },
];

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth state
      authToken: null,
      user: null,
      isAuthenticated: false,
      
      // App state
      isOnboarded: false,
      profile: null,
      profilePhoto: null,
      progressPhotos: [],
      routine: [],
      diet: null,
      logs: [],
      insights: null,
      currentTab: 'home',
      theme: 'verde-negro',
      customWorkout: [],
      exerciseLibrary: defaultExerciseLibrary,
      motivationPhrase: 'Cada repetición te acerca a tu mejor versión.',
      motivationPhoto: null,
      toasts: [],
      weightLogs: [],
      mealEatenRecord: {},
      weeklyGoals: [
        { id: 'habit-1', label: 'Completar 3 sesiones de fuerza', done: false },
        { id: 'habit-2', label: 'Dormir 7h al menos 5 dias', done: false },
        { id: 'habit-3', label: 'Cumplir proteina diaria 5 dias', done: false },
      ],

      // Auth actions
      setAuthToken: (token) => set({ authToken: token, isAuthenticated: !!token }),
      setUser: (user) => set({ user }),
      logout: () => set({ 
        authToken: null, 
        user: null, 
        isAuthenticated: false,
        isOnboarded: false,
        profile: null,
        profilePhoto: null,
        progressPhotos: [],
        routine: [],
        diet: null,
        logs: [],
        insights: null,
        currentTab: 'home',
        customWorkout: [],
        motivationPhoto: null,
        toasts: [],
        weightLogs: [],
        mealEatenRecord: {},
        weeklyGoals: [
          { id: 'habit-1', label: 'Completar 3 sesiones de fuerza', done: false },
          { id: 'habit-2', label: 'Dormir 7h al menos 5 dias', done: false },
          { id: 'habit-3', label: 'Cumplir proteina diaria 5 dias', done: false },
        ],
      }),

      // Profile actions
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
      setLogs: (logs) => set({ logs }),
      setProgressPhotos: (progressPhotos) => set({ progressPhotos }),
      setTab: (tab) => set({ currentTab: tab }),
      setTheme: (theme) => set({ theme }),
      addToCustomWorkout: (exercise) => set((state) => {
        if (state.customWorkout.some((item) => item.id === exercise.id)) {
          return state;
        }

        return {
          customWorkout: [
            ...state.customWorkout,
            {
              id: exercise.id,
              name: exercise.name,
              sets: exercise.defaultSets,
              reps: exercise.defaultReps,
              weight: 0,
              gifUrl: '',
              muscleGroup: exercise.muscleGroup,
            },
          ],
        };
      }),
      removeFromCustomWorkout: (exerciseId) =>
        set((state) => ({
          customWorkout: state.customWorkout.filter((item) => item.id !== exerciseId),
        })),
      setMotivationPhrase: (phrase) => set({ motivationPhrase: phrase }),
      setMotivationPhoto: (photo) => set({ motivationPhoto: photo }),
      showToast: (toast) =>
        set((state) => ({
          toasts: [
            ...state.toasts,
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              ...toast,
            },
          ],
        })),
      dismissToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((toast) => toast.id !== id),
        })),
      clearToasts: () => set({ toasts: [] }),
      addWeightLog: (log) =>
        set((state) => ({
          weightLogs: [...state.weightLogs.filter((l) => l.date !== log.date), log]
            .sort((a, b) => a.date.localeCompare(b.date)),
        })),
      toggleMealEaten: (mealId, date) =>
        set((state) => {
          const existing = state.mealEatenRecord[date] ?? [];
          const updated = existing.includes(mealId)
            ? existing.filter((id) => id !== mealId)
            : [...existing, mealId];
          return { mealEatenRecord: { ...state.mealEatenRecord, [date]: updated } };
        }),
      toggleWeeklyGoal: (id) =>
        set((state) => ({
          weeklyGoals: state.weeklyGoals.map((g) => (g.id === id ? { ...g, done: !g.done } : g)),
        })),
      completeOnboarding: () => set({ isOnboarded: true }),
      resetApp: () => set({
        isOnboarded: false,
        profile: null,
        profilePhoto: null,
        progressPhotos: [],
        routine: [],
        diet: null,
        logs: [],
        insights: null,
        currentTab: 'home',
        customWorkout: [],
        motivationPhoto: null,
        toasts: [],
        weightLogs: [],
        mealEatenRecord: {},
        weeklyGoals: [
          { id: 'habit-1', label: 'Completar 3 sesiones de fuerza', done: false },
          { id: 'habit-2', label: 'Dormir 7h al menos 5 dias', done: false },
          { id: 'habit-3', label: 'Cumplir proteina diaria 5 dias', done: false },
        ],
      }),
    }),
    {
      name: 'voltbody-storage',
    }
  )
);
