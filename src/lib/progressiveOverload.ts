import type { WorkoutLog } from '../store/useAppStore';

export interface ProgressiveSuggestion {
  suggestedWeight: number;
  currentWeight: number;
  sessionsAnalyzed: number;
  increment: number;
}

/**
 * Analyzes the last `minSessions` distinct training sessions for an exercise.
 * Returns a weight suggestion when the user consistently hit the same peak weight.
 */
export function getProgressiveSuggestion(
  exerciseId: string,
  logs: WorkoutLog[],
  minSessions = 3,
): ProgressiveSuggestion | null {
  const exerciseLogs = logs
    .filter((l) => l.exerciseId === exerciseId)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (exerciseLogs.length === 0) return null;

  // Group logs by date (YYYY-MM-DD)
  const sessionMap = new Map<string, WorkoutLog[]>();
  for (const log of exerciseLogs) {
    const date = log.date.slice(0, 10);
    if (!sessionMap.has(date)) sessionMap.set(date, []);
    sessionMap.get(date)!.push(log);
  }

  // Most-recent sessions first
  const sessions = Array.from(sessionMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, minSessions);

  if (sessions.length < minSessions) return null;

  // Max weight per session
  const weights = sessions.map(([, s]) => Math.max(...s.map((l) => l.weight)));

  // All sessions must share the same peak weight
  if (!weights.every((w) => w === weights[0])) return null;

  const currentWeight = weights[0];
  if (currentWeight <= 0) return null;

  const increment = 2.5;
  // Round to nearest 0.5 kg (standard gym plate increment)
  const suggestedWeight = Math.round((currentWeight + increment) * 2) / 2;

  return { suggestedWeight, currentWeight, sessionsAnalyzed: sessions.length, increment };
}

export interface ExerciseSession {
  date: string; // YYYY-MM-DD
  maxWeight: number;
  totalVolume: number; // sum of weight × reps
  sets: number;
  maxReps: number;
}

/**
 * Returns per-session aggregates for an exercise, sorted oldest→newest (for chart).
 */
export function getExerciseHistory(
  exerciseId: string,
  logs: WorkoutLog[],
  limit = 15,
): ExerciseSession[] {
  const exerciseLogs = logs.filter((l) => l.exerciseId === exerciseId);
  const sessionMap = new Map<string, WorkoutLog[]>();

  for (const log of exerciseLogs) {
    const date = log.date.slice(0, 10);
    if (!sessionMap.has(date)) sessionMap.set(date, []);
    sessionMap.get(date)!.push(log);
  }

  return Array.from(sessionMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-limit)
    .map(([date, s]) => ({
      date,
      maxWeight: Math.max(...s.map((l) => l.weight)),
      totalVolume: s.reduce((sum, l) => sum + l.weight * l.reps, 0),
      sets: s.length,
      maxReps: Math.max(...s.map((l) => l.reps)),
    }));
}
