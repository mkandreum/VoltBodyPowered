import type { UserProfile, WorkoutLog, WeightLog } from '../store/useAppStore';

const NOTIFICATION_ICON = '/icon-192.svg';
/** Minimum ms from now before a notification is worth scheduling. */
const MIN_SCHEDULE_THRESHOLD_MS = 60_000; // 1 minute
/** Delay before showing the streak-danger notification after app open. */
const STREAK_NOTIFICATION_DELAY_MS = 8_000;
/** Delay before showing the weekly-weight notification after app open. */
const WEIGHT_NOTIFICATION_DELAY_MS = 15_000;

let scheduledTimers: ReturnType<typeof setTimeout>[] = [];

async function showNotification(title: string, options?: NotificationOptions): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: NOTIFICATION_ICON,
        badge: NOTIFICATION_ICON,
        ...options,
      });
    } else {
      new Notification(title, { icon: NOTIFICATION_ICON, ...options });
    }
  } catch {
    try {
      new Notification(title, { icon: NOTIFICATION_ICON, ...options });
    } catch {
      // Notifications not supported in this context
    }
  }
}

/** Parse "HH:MM" → milliseconds until that time today, or null if already past. */
function msUntilTime(timeStr: string): number | null {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  const target = new Date();
  target.setHours(h, m, 0, 0);
  const ms = target.getTime() - Date.now();
  return ms > MIN_SCHEDULE_THRESHOLD_MS ? ms : null; // only schedule if far enough away
}

export const notificationService = {
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    const result = await Notification.requestPermission();
    return result === 'granted';
  },

  hasPermission(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  },

  clearAll(): void {
    scheduledTimers.forEach((t) => clearTimeout(t));
    scheduledTimers = [];
  },

  async scheduleAll(
    profile: UserProfile,
    logs: WorkoutLog[],
    weightLogs: WeightLog[],
  ): Promise<void> {
    this.clearAll();
    if (!this.hasPermission()) return;

    const mealLabels: Record<string, string> = {
      breakfast: '🌅 Desayuno',
      brunch: '🥐 Almuerzo matutino',
      lunch: '🍽️ Comida',
      snack: '🍎 Merienda',
      dinner: '🌙 Cena',
    };

    // ── Meal reminders (5 min before each configured meal time) ──────────
    if (profile.mealTimes) {
      for (const [key, time] of Object.entries(profile.mealTimes)) {
        if (!time) continue;
        const ms = msUntilTime(time);
        if (ms === null) continue;
        const reminderMs = ms - 5 * 60_000;
        if (reminderMs > 0) {
          const t = setTimeout(
            () =>
              showNotification(`VoltBody – ${mealLabels[key] ?? 'Comida'} en 5 min`, {
                body: `Tu ${(mealLabels[key] ?? 'comida').replace(/^[^ ]+ /, '').toLowerCase()} es a las ${time}. ¡Prepárate!`,
                tag: `meal-${key}`,
              }),
            reminderMs,
          );
          scheduledTimers.push(t);
        }
      }
    }

    // ── Streak danger (3+ days without training) ─────────────────────────
    if (logs.length > 0) {
      const lastDate = logs
        .map((l) => l.date.slice(0, 10))
        .sort()
        .at(-1)!;
      // Use noon UTC to avoid off-by-one errors from timezone shifts
      const lastMs = new Date(lastDate + 'T12:00:00Z').getTime();
      const daysSince = Math.floor(
        (Date.now() - lastMs) / 86_400_000,
      );
      if (daysSince >= 3) {
        const t = setTimeout(
          () =>
            showNotification('¡Tu racha está en peligro! 🔥', {
              body: `Llevas ${daysSince} días sin entrenar. ¡Hoy es el día!`,
              tag: 'streak-danger',
            }),
          STREAK_NOTIFICATION_DELAY_MS,
        );
        scheduledTimers.push(t);
      }
    }

    // ── Weekly weight reminder ────────────────────────────────────────────
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);
    const hasWeightThisWeek = weightLogs.some(
      (l) => new Date(l.date + 'T00:00:00') >= weekStart,
    );
    if (!hasWeightThisWeek) {
      const t = setTimeout(
        () =>
          showNotification('⚖️ Recordatorio semanal', {
            body: 'Aún no has registrado tu peso esta semana. ¡Solo tarda 5 segundos!',
            tag: 'weekly-weight',
          }),
        WEIGHT_NOTIFICATION_DELAY_MS,
      );
      scheduledTimers.push(t);
    }
  },
};
