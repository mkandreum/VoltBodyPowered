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

export type ExerciseType = 'weighted' | 'isometric' | 'bodyweight' | 'cardio';

export type Exercise = {
  id: string;
  name: string;
  nameEn?: string;
  sets: number;
  reps: string;
  weight: number;
  gifUrl: string;
  muscleGroup: string;
  technique?: string;
  exerciseType?: ExerciseType;
  /** Target hold duration in seconds (used for isometric exercises) */
  durationTarget?: number;
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
  /** Duration in seconds (for isometric and cardio exercises) */
  duration?: number;
  /** Rate of Perceived Exertion 1-10 (isometric) */
  rpe?: number;
  /** Reps In Reserve 0-4 (weighted / bodyweight) */
  rir?: number;
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
  nameEn?: string;
  technique?: string;
  muscleGroup: string;
  defaultSets: number;
  defaultReps: string;
  exerciseType?: ExerciseType;
};

export type Achievement = {
  id: string;
  label: string;
  icon: string;
  description: string;
  unlockedAt?: string; // ISO date string
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
  // Hydration guard — true once Zustand has rehydrated from localStorage
  _hasHydrated: boolean;
  _setHasHydrated: (v: boolean) => void;

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
  achievements: Achievement[];
  notificationsEnabled: boolean;

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
  updateLog: (index: number, updates: Partial<WorkoutLog>) => void;
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
  setWeightLogs: (logs: WeightLog[]) => void;
  toggleMealEaten: (mealId: string, date: string) => void;
  toggleWeeklyGoal: (id: string) => void;
  completeOnboarding: () => void;
  resetApp: () => void;
  addAchievement: (achievement: Achievement) => void;
  setNotificationsEnabled: (v: boolean) => void;
}

const defaultExerciseLibrary: ExerciseLibraryEntry[] = [
  {
    id: 'chest-1', name: 'Press de banca', nameEn: 'bench press', muscleGroup: 'Pecho', defaultSets: 4, defaultReps: '8-12',
    technique: '1. Túmbate en el banco con los pies planos en el suelo.\n2. Agarra la barra a la anchura de los hombros.\n3. Baja la barra hasta rozar el pecho controladamente.\n4. Empuja explosivo hasta extender los codos.\n5. Mantén las escápulas retraídas durante todo el movimiento.',
  },
  {
    id: 'chest-2', name: 'Press inclinado con mancuernas', nameEn: 'incline dumbbell press', muscleGroup: 'Pecho', defaultSets: 4, defaultReps: '10-12',
    technique: '1. Ajusta el banco a 30-45°.\n2. Sujeta una mancuerna en cada mano a la altura del pecho.\n3. Empuja las mancuernas hacia arriba y al centro.\n4. Baja despacio hasta que los codos queden a 90°.\n5. Mantén los glúteos apoyados en el banco.',
  },
  {
    id: 'chest-3', name: 'Aperturas en polea', nameEn: 'cable fly', muscleGroup: 'Pecho', defaultSets: 3, defaultReps: '12-15',
    technique: '1. Coloca las poleas en posición alta y da un paso adelante.\n2. Agarra un extremo en cada mano con los brazos extendidos a los lados.\n3. Lleva las manos al frente con un arco, como si abrazaras.\n4. Contrae el pecho en la posición final 1 segundo.\n5. Vuelve despacio a la posición inicial.',
  },
  {
    id: 'chest-4', name: 'Fondos en paralelas', nameEn: 'chest dips', muscleGroup: 'Pecho', defaultSets: 3, defaultReps: '8-12',
    exerciseType: 'bodyweight',
    technique: '1. Apóyate en las barras con los brazos extendidos.\n2. Inclínate ligeramente hacia delante para activar el pecho.\n3. Baja doblando los codos hasta 90°.\n4. Empuja hacia arriba controlando el movimiento.\n5. No hiperextiendas los codos arriba.',
  },
  {
    id: 'back-1', name: 'Dominadas asistidas', nameEn: 'assisted pull up', muscleGroup: 'Espalda', defaultSets: 4, defaultReps: '6-10',
    exerciseType: 'bodyweight',
    technique: '1. Agarra la barra con agarre prono a la anchura de los hombros.\n2. Cuelga con los brazos extendidos y activa las escápulas hacia abajo y atrás.\n3. Tira del cuerpo hacia arriba hasta que la barbilla supere la barra.\n4. Baja lentamente hasta la extensión completa.\n5. Evita balancear el cuerpo.',
  },
  {
    id: 'back-2', name: 'Remo con barra', nameEn: 'barbell row', muscleGroup: 'Espalda', defaultSets: 4, defaultReps: '8-12',
    technique: '1. Inclínate hacia delante con la espalda recta y rodillas ligeramente flexionadas.\n2. Agarra la barra a la anchura de los hombros con agarre prono.\n3. Tira de la barra hacia el abdomen.\n4. Aprieta las escápulas en la posición alta.\n5. Baja despacio hasta la extensión completa.',
  },
  {
    id: 'back-3', name: 'Jalón al pecho', nameEn: 'lat pulldown', muscleGroup: 'Espalda', defaultSets: 3, defaultReps: '10-12',
    technique: '1. Siéntate en la máquina y sujeta la barra con agarre amplio.\n2. Inclínate ligeramente hacia atrás.\n3. Baja la barra hasta el nivel del mentón o parte alta del pecho.\n4. Aprieta los dorsales en la posición baja.\n5. Sube controlando el peso, sin dejar que los hombros suban.',
  },
  {
    id: 'back-4', name: 'Remo en cable sentado', nameEn: 'seated cable row', muscleGroup: 'Espalda', defaultSets: 3, defaultReps: '10-12',
    technique: '1. Siéntate con la espalda recta y pies apoyados en la plataforma.\n2. Sujeta el accesorio con ambas manos y brazos extendidos.\n3. Tira hacia el abdomen juntando los codos.\n4. Aprieta las escápulas al final del recorrido.\n5. Vuelve controlando la resistencia del cable.',
  },
  {
    id: 'legs-1', name: 'Sentadilla goblet', nameEn: 'goblet squat', muscleGroup: 'Piernas', defaultSets: 4, defaultReps: '10-12',
    technique: '1. Sujeta una mancuerna o kettlebell con ambas manos a la altura del pecho.\n2. Separa los pies a la anchura de los hombros con las puntas hacia afuera.\n3. Baja manteniendo el torso erguido hasta que los muslos queden paralelos al suelo.\n4. Empuja a través de los talones para subir.\n5. Mantén las rodillas alineadas con los dedos de los pies.',
  },
  {
    id: 'legs-2', name: 'Prensa de piernas', nameEn: 'leg press', muscleGroup: 'Piernas', defaultSets: 4, defaultReps: '10-15',
    technique: '1. Siéntate con la espalda completamente apoyada.\n2. Coloca los pies a la anchura de los hombros en la plataforma.\n3. Libera el seguro y baja la plataforma doblando las rodillas hasta 90°.\n4. Empuja de vuelta a la posición inicial sin bloquear las rodillas.\n5. No dejes que la zona lumbar se despegue del respaldo.',
  },
  {
    id: 'legs-3', name: 'Peso muerto rumano', nameEn: 'romanian deadlift', muscleGroup: 'Piernas', defaultSets: 4, defaultReps: '8-10',
    technique: '1. Agarra la barra a la anchura de los hombros con la espalda recta.\n2. Con las rodillas ligeramente flexionadas, desliza la barra por las piernas mientras bajas.\n3. Siente el estiramiento en los isquiotibiales al descender hasta la mitad de la tibia.\n4. Lleva las caderas hacia adelante para subir.\n5. Aprieta los glúteos en la posición alta.',
  },
  {
    id: 'legs-4', name: 'Zancadas caminando', nameEn: 'walking lunge', muscleGroup: 'Piernas', defaultSets: 3, defaultReps: '12 por pierna',
    technique: '1. De pie con los pies juntos y mancuernas en manos.\n2. Da un paso largo hacia adelante y baja la rodilla trasera hacia el suelo.\n3. La rodilla delantera no debe pasar la punta del pie.\n4. Empuja con el pie delantero y lleva la pierna trasera al frente.\n5. Alterna lados caminando.',
  },
  {
    id: 'shoulders-1', name: 'Press militar con mancuernas', nameEn: 'dumbbell overhead press', muscleGroup: 'Hombros', defaultSets: 4, defaultReps: '8-12',
    technique: '1. Siéntate en un banco con respaldo o de pie.\n2. Sujeta las mancuernas a la altura de los hombros con los codos a 90°.\n3. Empuja hacia arriba hasta casi extender los brazos.\n4. Baja controlando hasta la posición inicial.\n5. No arquees la espalda ni muevas la cabeza hacia adelante.',
  },
  {
    id: 'shoulders-2', name: 'Elevaciones laterales', nameEn: 'lateral raise', muscleGroup: 'Hombros', defaultSets: 3, defaultReps: '12-15',
    technique: '1. De pie con las mancuernas a los lados.\n2. Con un ligero codo doblado, eleva los brazos lateralmente hasta la altura de los hombros.\n3. Gira levemente las muñecas como si vaciaras una jarra.\n4. Baja muy lentamente (3-4 segundos).\n5. Evita balancear el torso.',
  },
  {
    id: 'shoulders-3', name: 'Pájaros inclinado', nameEn: 'bent over lateral raise', muscleGroup: 'Hombros', defaultSets: 3, defaultReps: '12-15',
    technique: '1. Inclínate hacia delante con la espalda recta.\n2. Sujeta las mancuernas con los brazos colgando.\n3. Eleva los brazos hacia los lados hasta la altura de los hombros.\n4. Focaliza el movimiento en el deltoides posterior y romboides.\n5. Baja controladamente sin tirar con la espalda.',
  },
  {
    id: 'shoulders-4', name: 'Face pulls', nameEn: 'face pull', muscleGroup: 'Hombros', defaultSets: 3, defaultReps: '12-15',
    technique: '1. Coloca la polea alta con cuerda y agarra los extremos.\n2. Da un paso atrás hasta tener tensión en el cable.\n3. Tira hacia la cara separando los extremos de la cuerda.\n4. Lleva los codos hacia atrás a la altura de los hombros.\n5. Contrae el deltoides posterior y retractores escápulares.',
  },
  {
    id: 'arms-1', name: 'Curl de bíceps con barra', nameEn: 'barbell curl', muscleGroup: 'Bíceps', defaultSets: 3, defaultReps: '10-12',
    technique: '1. De pie con la barra sujeta con agarre supino a la anchura de los hombros.\n2. Mantén los codos pegados a los costados durante todo el movimiento.\n3. Sube la barra doblando los codos hasta contraer el bíceps.\n4. Baja lentamente (2-3 segundos) sin perder la tensión.\n5. No balancees el torso para ganar inercia.',
  },
  {
    id: 'arms-2', name: 'Curl martillo', nameEn: 'hammer curl', muscleGroup: 'Bíceps', defaultSets: 3, defaultReps: '10-12',
    technique: '1. De pie con mancuernas y las palmas mirando al torso (agarre neutro).\n2. Sube alternando brazos o de forma simultánea.\n3. Mantén los codos fijos en los costados.\n4. El pulgar siempre apunta hacia arriba.\n5. Baja controlado, sin dejar caer el peso.',
  },
  {
    id: 'arms-3', name: 'Extensión de tríceps en polea', nameEn: 'cable tricep extension', muscleGroup: 'Tríceps', defaultSets: 3, defaultReps: '10-12',
    technique: '1. Coloca la polea alta con cuerda o barra recta.\n2. Agarra el accesorio con agarre prono y pega los codos a los costados.\n3. Extiende los brazos hacia abajo hasta la extensión completa.\n4. Contrae el tríceps 1 segundo en la posición baja.\n5. Vuelve despacio sin abrir los codos.',
  },
  {
    id: 'arms-4', name: 'Press francés', nameEn: 'skull crusher', muscleGroup: 'Tríceps', defaultSets: 3, defaultReps: '10-12',
    technique: '1. Túmbate en el banco con una barra EZ o mancuernas sobre la cabeza.\n2. Con los codos apuntando al techo, baja el peso hacia la frente.\n3. Extiende los brazos sin bloquear los codos.\n4. Mantén los codos fijos, sin que se abran hacia los lados.\n5. Controla bien la bajada para proteger los codos.',
  },
  // ─── Isometric exercises ───────────────────────────────────────────────────
  {
    id: 'core-1', name: 'Plancha', nameEn: 'plank', muscleGroup: 'Core', defaultSets: 3, defaultReps: '30-60s',
    exerciseType: 'isometric',
    technique: '1. Apoya los antebrazos y las puntas de los pies en el suelo.\n2. Mantén el cuerpo alineado de cabeza a talones.\n3. Contrae el abdomen, glúteos y cuádriceps durante toda la serie.\n4. No dejes caer ni elevar las caderas.\n5. Respira de forma continua y controlada.',
  },
  {
    id: 'core-2', name: 'Sentadilla isométrica', nameEn: 'wall sit', muscleGroup: 'Piernas', defaultSets: 3, defaultReps: '30-60s',
    exerciseType: 'isometric',
    technique: '1. Apoya la espalda en la pared.\n2. Baja hasta que los muslos queden paralelos al suelo y las rodillas a 90°.\n3. Los pies deben estar a la anchura de los hombros.\n4. Mantén la posición sin mover la espalda de la pared.\n5. Focaliza la tensión en cuádriceps y glúteos.',
  },
  {
    id: 'cali-1', name: 'Frog Stand', nameEn: 'frog stand', muscleGroup: 'Calistenia', defaultSets: 3, defaultReps: '10-30s',
    exerciseType: 'isometric',
    technique: '1. En cuclillas, coloca las manos en el suelo a la anchura de los hombros.\n2. Apoya las rodillas sobre los tríceps.\n3. Inclínate lentamente hacia adelante transfiriendo el peso a las manos.\n4. Levanta los pies del suelo y mantén el equilibrio.\n5. Activa el core y mira al suelo a 30 cm enfrente.',
  },
  {
    id: 'core-3', name: 'Plancha lateral', nameEn: 'side plank', muscleGroup: 'Core', defaultSets: 3, defaultReps: '20-45s',
    exerciseType: 'isometric',
    technique: '1. Apoya el antebrazo derecho y el borde del pie derecho.\n2. Eleva las caderas hasta alinear el cuerpo lateralmente.\n3. Mantén el abdomen y glúteo activados.\n4. No dejes caer la cadera hacia el suelo.\n5. Repite por el lado izquierdo.',
  },
];

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Hydration guard
      _hasHydrated: false,
      _setHasHydrated: (v) => set({ _hasHydrated: v }),

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
      achievements: [],
      notificationsEnabled: false,

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
        achievements: [],
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
      updateLog: (index, updates) =>
        set((state) => ({
          logs: state.logs.map((log, i) => (i === index ? { ...log, ...updates } : log)),
        })),
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
              exerciseType: exercise.exerciseType,
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
      setWeightLogs: (logs) =>
        set({
          weightLogs: [...logs]
            .map((l) => ({ date: typeof l.date === 'string' ? l.date.slice(0, 10) : String(l.date), weight: l.weight }))
            .sort((a, b) => a.date.localeCompare(b.date)),
        }),
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
      addAchievement: (achievement) =>
        set((state) => {
          if (state.achievements.some((a) => a.id === achievement.id)) return state;
          return { achievements: [...state.achievements, { ...achievement, unlockedAt: new Date().toISOString() }] };
        }),
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
        achievements: [],
        weeklyGoals: [
          { id: 'habit-1', label: 'Completar 3 sesiones de fuerza', done: false },
          { id: 'habit-2', label: 'Dormir 7h al menos 5 dias', done: false },
          { id: 'habit-3', label: 'Cumplir proteina diaria 5 dias', done: false },
        ],
      }),
      setNotificationsEnabled: (v) => set({ notificationsEnabled: v }),
    }),
    {
      name: 'voltbody-storage',
      onRehydrateStorage: () => (state) => {
        state?._setHasHydrated(true);
      },
    }
  )
);
