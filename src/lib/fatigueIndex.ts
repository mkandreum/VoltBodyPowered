/**
 * fatigueIndex.ts
 *
 * Calculates accumulated weekly training volume per muscle group and compares
 * it to research-based Maximum Recoverable Volume (MRV) values.
 *
 * Reference ranges are conservative medians from Israetel et al. (RP Strength).
 * The actual MRV varies by individual training age, recovery, nutrition, etc.
 * These values serve as evidence-based starting points.
 */

import type { WorkoutLog, WorkoutDay } from '../store/useAppStore';
import { format, startOfWeek, endOfWeek } from 'date-fns';

/**
 * MRV = Maximum Recoverable Volume (sets per week per muscle group).
 * Below this threshold the athlete recovers fully between sessions.
 * Values are weekly SET counts per muscle group.
 */
export const MRV_DEFAULTS: Record<string, number> = {
  Pecho: 20,
  Espalda: 25,
  Hombros: 20,
  Piernas: 22,
  Bíceps: 20,
  Tríceps: 20,
  Core: 25,
  Calistenia: 18,
  Glúteos: 20,
  Cardio: 5,
};

const DEFAULT_MRV = 18;

export type FatigueEntry = {
  muscleGroup: string;
  weeklyVolume: number;  // total sets this week
  mrv: number;           // max recoverable volume (sets)
  percent: number;       // 0-100+ percent of MRV used
  status: 'fresh' | 'moderate' | 'high' | 'overreached';
};

/**
 * Returns fatigue status per muscle group for the current ISO week (Monday-based).
 *
 * @param logs       All stored workout logs
 * @param routine    Weekly routine (to map exerciseId → muscleGroup)
 * @param weekStart  Reference date for the start of the target week (defaults to today's week)
 */
export function computeFatigueIndex(
  logs: WorkoutLog[],
  routine: WorkoutDay[],
  weekStart?: Date,
): FatigueEntry[] {
  const now = weekStart ?? new Date();
  const monday = startOfWeek(now, { weekStartsOn: 1 });
  const sunday = endOfWeek(now, { weekStartsOn: 1 });
  const fromKey = format(monday, 'yyyy-MM-dd');
  const toKey = format(sunday, 'yyyy-MM-dd');

  // Build exerciseId → muscleGroup lookup from routine
  const muscleMap = new Map<string, string>();
  for (const day of routine) {
    for (const ex of day.exercises) {
      if (ex.id && ex.muscleGroup) {
        muscleMap.set(ex.id, ex.muscleGroup);
      }
    }
  }

  // Count sets per muscle group this week
  const setsByMuscle = new Map<string, number>();
  for (const log of logs) {
    const dateKey = log.date.slice(0, 10);
    if (dateKey < fromKey || dateKey > toKey) continue;

    const muscle = muscleMap.get(log.exerciseId);
    if (!muscle) continue;

    setsByMuscle.set(muscle, (setsByMuscle.get(muscle) ?? 0) + 1);
  }

  const result: FatigueEntry[] = [];

  for (const [muscle, sets] of setsByMuscle.entries()) {
    const mrv = MRV_DEFAULTS[muscle] ?? DEFAULT_MRV;
    const percent = Math.round((sets / mrv) * 100);
    let status: FatigueEntry['status'];

    if (percent < 50) status = 'fresh';
    else if (percent < 75) status = 'moderate';
    else if (percent < 100) status = 'high';
    else status = 'overreached';

    result.push({ muscleGroup: muscle, weeklyVolume: sets, mrv, percent, status });
  }

  // Sort by percent descending (most fatigued first)
  return result.sort((a, b) => b.percent - a.percent);
}

/** Human-readable status label */
export function fatigueStatusLabel(status: FatigueEntry['status']): string {
  switch (status) {
    case 'fresh': return '🟢 Fresco';
    case 'moderate': return '🟡 Moderado';
    case 'high': return '🟠 Alto';
    case 'overreached': return '🔴 Sobreentrenado';
  }
}

/** CSS colour class for the status badge */
export function fatigueStatusColor(status: FatigueEntry['status']): string {
  switch (status) {
    case 'fresh': return 'text-emerald-400';
    case 'moderate': return 'text-yellow-400';
    case 'high': return 'text-orange-400';
    case 'overreached': return 'text-red-400';
  }
}
