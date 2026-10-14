import { useAppStore } from '../store/useAppStore';
import type { UserProfile } from '../store/useAppStore';
import { authService } from './authService';

/** Builds the client UserProfile from the server profile columns (single source of truth). */
function mapProfile(name: string, p: any): UserProfile {
  return {
    name,
    age: p.age,
    weight: p.weight,
    height: p.height,
    gender: p.gender,
    goal: p.goal,
    currentState: p.currentState,
    schedule: p.schedule,
    workHours: p.workHours,
    trainingDaysPerWeek: p.trainingDaysPerWeek ?? 3,
    sessionMinutes: p.sessionMinutes ?? 45,
    goalDirection: p.goalDirection ?? 'Perder',
    goalTargetKg: p.goalTargetKg ?? 5,
    goalTimelineMonths: p.goalTimelineMonths ?? 3,
    mealTimes: {
      breakfast: p.mealTimes?.breakfast || '08:00',
      brunch: p.mealTimes?.brunch || '11:30',
      lunch: p.mealTimes?.lunch || '14:00',
      snack: p.mealTimes?.snack || '18:00',
      dinner: p.mealTimes?.dinner || '21:00',
    },
    foodPreferences: {
      vegetables: p.foodPreferences?.vegetables || [],
      carbs: p.foodPreferences?.carbs || [],
      proteins: p.foodPreferences?.proteins || [],
    },
    weeklySpecialSession: p.weeklySpecialSession || {
      enabled: false,
      activity: 'Zumba',
      day: 'Sábado',
      durationMinutes: 60,
    },
    avatarConfig: p.avatarConfig ?? { muscleMass: 0.5, bodyFat: 0.5 },
  };
}

/**
 * Loads the whole user state from the server (profile, plan, logs, photos, weights
 * and /api/data/all). Called after login and on app start when a token exists.
 */
export async function hydrateFromServer(token: string): Promise<void> {
  const store = useAppStore.getState();
  try {
    // null (404) means "no profile yet" -> onboarding; other failures throw
    const profile: any = await authService.getProfile(token);

    if (profile && profile.routine && profile.diet) {
      const user = useAppStore.getState().user;
      store.setProfile(mapProfile(user?.name || '', profile));
      store.setRoutine(profile.routine);
      store.setDiet(profile.diet);
      if (profile.insights) store.setInsights(profile.insights);
      if (profile.theme) store.setTheme(profile.theme);
      if (profile.motivationPhrase) store.setMotivationPhrase(profile.motivationPhrase);
      store.setMotivationPhoto(profile.motivationPhoto ?? null);
      store.setProfilePhoto(profile.profilePhoto ?? '');
      store.setNotificationsEnabledLocal(!!profile.notificationsEnabled);
      store.completeOnboarding();
      await store.loadUserData();
    }
  } finally {
    useAppStore.getState()._setDataReady(true);
  }
}
