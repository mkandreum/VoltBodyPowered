import { WorkoutDay } from '../store/useAppStore';

const API_URL = '/api';

/**
 * Returns true if at least one exercise in the routine has no gifUrl.
 */
export function routineNeedsEnrichment(routine: WorkoutDay[]): boolean {
  return routine.some((day) => day.exercises?.some((ex) => !ex.gifUrl));
}

/**
 * Calls the server to enrich exercises that have empty gifUrl.
 * Safe to call at any time — server only fills empty URLs.
 */
export async function enrichRoutine(
  routine: WorkoutDay[],
  token: string | null,
): Promise<WorkoutDay[]> {
  if (!token) return routine;

  try {
    const response = await fetch(`${API_URL}/ai/enrich-routine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ routine }),
    });

    if (!response.ok) return routine;

    const data = await response.json();
    return Array.isArray(data.routine) ? data.routine : routine;
  } catch {
    return routine; // silently degrade
  }
}
