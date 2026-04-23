import { format, subDays, isValid } from 'date-fns';
import type { WorkoutDay, WorkoutLog } from '../store/useAppStore';

export const WEEKDAY_KEYS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'] as const;

export const WEEKDAY_LABELS = [
  { key: 'lun', short: 'Lun', full: 'Lunes' },
  { key: 'mar', short: 'Mar', full: 'Martes' },
  { key: 'mie', short: 'Mie', full: 'Miercoles' },
  { key: 'jue', short: 'Jue', full: 'Jueves' },
  { key: 'vie', short: 'Vie', full: 'Viernes' },
  { key: 'sab', short: 'Sab', full: 'Sabado' },
  { key: 'dom', short: 'Dom', full: 'Domingo' },
] as const;

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function getWeekdayIndexFromName(dayName: string): number {
  const normalized = normalizeText(dayName);

  if (normalized.includes('lun')) return 0;
  if (normalized.includes('mar')) return 1;
  if (normalized.includes('mie') || normalized.includes('mié')) return 2;
  if (normalized.includes('jue')) return 3;
  if (normalized.includes('vie')) return 4;
  if (normalized.includes('sab') || normalized.includes('sáb')) return 5;
  if (normalized.includes('dom')) return 6;

  return -1;
}

export function getMondayFirstIndex(date: Date) {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

/** Weeks start on Monday (ISO-8601). */
export const WEEK_STARTS_ON_MONDAY = 1 as const;

/** Maximum number of past days to look back when computing streaks. */
const MAX_STREAK_DAYS = 365;

export function mapRoutineByWeekday(routine: WorkoutDay[]) {
  const mapped: Array<WorkoutDay | null> = new Array<WorkoutDay | null>(7).fill(null);
  const unresolved: WorkoutDay[] = [];

  routine.forEach((day) => {
    const idx = getWeekdayIndexFromName(day.day);
    if (idx >= 0 && mapped[idx] === null) {
      mapped[idx] = day;
      return;
    }
    unresolved.push(day);
  });

  unresolved.forEach((day) => {
    const freeIdx = mapped.findIndex((entry) => entry === null);
    if (freeIdx >= 0) {
      mapped[freeIdx] = day;
    }
  });

  return mapped;
}

/**
 * Computes the current training streak, skipping rest days.
 * A "rest day" is any weekday that has no exercises assigned in the routine.
 * Only scheduled workout days that were missed (no logs) break the streak.
 * Today's workout is not penalised if not yet done.
 */
export function computeSmartStreak(logs: WorkoutLog[], routine: WorkoutDay[]): number {
  if (logs.length === 0) return 0;

  const routineByDay = mapRoutineByWeekday(routine);
  const workoutWeekdays = new Set<number>(
    routineByDay
      .map((entry, index) => (entry ? index : -1))
      .filter((index) => index >= 0),
  );

  const dateSet = new Set(
    logs
      .filter((log) => isValid(new Date(log.date)))
      .map((log) => format(new Date(log.date), 'yyyy-MM-dd')),
  );

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  let streak = 0;
  let cursor = new Date();

  for (let i = 0; i < MAX_STREAK_DAYS; i++) {
    const dateStr = format(cursor, 'yyyy-MM-dd');
    const weekdayIndex = getMondayFirstIndex(cursor);
    // When no routine is defined every calendar day counts (original behaviour).
    const isWorkoutDay = workoutWeekdays.size === 0 || workoutWeekdays.has(weekdayIndex);

    if (isWorkoutDay) {
      if (dateSet.has(dateStr)) {
        streak += 1;
      } else if (dateStr === todayStr) {
        // Today's session not yet completed — don't penalise.
      } else {
        // Missed a past workout day — streak ends.
        break;
      }
    }
    // Rest day: skip without breaking streak.
    cursor = subDays(cursor, 1);
  }

  return streak;
}
