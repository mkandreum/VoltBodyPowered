import { WorkoutDay, DietPlan, Meal, Insights } from '../store/useAppStore';

const API_URL = '/api';

type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

export type ProgressReport = {
  overallScore: number;
  progressPercent: number;
  consistencyPercent: number;
  nutritionPercent: number;
  trainingExecutionPercent: number;
  weeksToVisibleChange: number;
  summary: string;
  improvements: string[];
  nextActions: string[];
};

async function apiFetch(url: string, options: RequestOptions = {}) {
  return fetch(url, {
    method: options.method,
    headers: options.headers,
    body: options.body,
  });
}

async function extractErrorMessage(response: Response) {
  try {
    const data = await response.json();
    return data?.details || data?.error || 'Error desconocido';
  } catch {
    return `Error HTTP ${response.status}`;
  }
}

function getAuthHeaders(token?: string | null): Record<string, string> {
  if (token) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }
  // Fallback: try to read from persisted store for unauthenticated callers
  try {
    const stored = localStorage.getItem('voltbody-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      const storedToken = parsed?.state?.authToken;
      if (storedToken) {
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${storedToken}`,
        };
      }
    }
  } catch { /* silent */ }
  return { 'Content-Type': 'application/json' };
}

export async function generatePlan(profile: any, token?: string | null): Promise<{ routine: WorkoutDay[]; diet: DietPlan; insights: Insights }> {
  const response = await apiFetch(`${API_URL}/ai/generate-plan`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return response.json();
}

export async function generateAlternativeMeal(oldMeal: Meal, profile: any, token?: string | null): Promise<Meal> {
  const response = await apiFetch(`${API_URL}/ai/generate-alternative-meal`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ oldMeal, profile }),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return response.json();
}

export async function generateProgressReport(payload: {
  profile: unknown;
  logs: unknown[];
  routine: unknown[];
  diet: unknown;
  progressPhotos: unknown[];
}, token?: string | null): Promise<ProgressReport> {
  const response = await apiFetch(`${API_URL}/ai/generate-progress-report`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return response.json();
}
