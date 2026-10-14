const API_URL = import.meta.env.VITE_API_URL || '/api';

export interface DailyMetricDTO {
  date: string;
  steps?: number | null;
  distanceKm?: number | null;
  activeKcal?: number | null;
  totalKcal?: number | null;
  sleepHours?: number | null;
  hrv?: number | null;
  restingHr?: number | null;
  avgHr?: number | null;
  waterMl?: number | null;
}

export type MetricsPatch = Partial<Omit<DailyMetricDTO, 'date'>>;

export interface AllDataDTO {
  metrics: DailyMetricDTO[];
  mealLogs: { date: string; mealId: string }[];
  goals: { weekStart: string; goalId: string; label: string; done: boolean }[];
  achievements: { id: string; unlockedAt: string }[];
  customWorkout: any[];
  recovery: { date: string; sleepHours: number; hrv?: number | null; score: number }[];
}

async function request<T>(token: string, method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    let msg = `Request failed (${response.status})`;
    try {
      const e = await response.json();
      msg = e.details ? `${e.error}: ${e.details}` : e.error || msg;
    } catch { /* non-JSON body */ }
    throw new Error(msg);
  }

  return response.json() as Promise<T>;
}

export const dataService = {
  getAll: (token: string) => request<AllDataDTO>(token, 'GET', '/data/all'),
  putMetrics: (token: string, date: string, patch: MetricsPatch) =>
    request<DailyMetricDTO>(token, 'PUT', `/data/metrics/${date}`, patch),
  putMeal: (token: string, date: string, mealId: string, eaten: boolean) =>
    request<{ ok: true }>(token, 'PUT', '/data/meals', { date, mealId, eaten }),
  putGoals: (token: string, weekStart: string, goals: { id: string; label: string; done: boolean }[]) =>
    request<{ ok: true }>(token, 'PUT', '/data/goals', { weekStart, goals }),
  postAchievement: (token: string, id: string, unlockedAt?: string) =>
    request<{ id: string; unlockedAt: string }>(token, 'POST', '/data/achievements', { id, unlockedAt }),
  putCustomWorkout: (token: string, exercises: unknown[]) =>
    request<{ ok: true }>(token, 'PUT', '/data/custom-workout', { exercises }),
  putRecovery: (token: string, date: string, body: { sleepHours: number; hrv?: number; score: number }) =>
    request<unknown>(token, 'PUT', `/data/recovery/${date}`, body),
  updateLog: (token: string, id: string, body: Record<string, number>) =>
    request<unknown>(token, 'PUT', `/workout/logs/${id}`, body),
  deleteLog: (token: string, id: string) =>
    request<{ ok: true }>(token, 'DELETE', `/workout/logs/${id}`),
};
