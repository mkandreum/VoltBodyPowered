import { WorkoutDay, DietPlan, Meal, Insights } from '../store/useAppStore';

const API_URL = '/api';
const AI_TIMEOUT_MS = 45000;

type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
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

async function fetchWithTimeout(url: string, options: RequestOptions = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? AI_TIMEOUT_MS);

  try {
    return await fetch(url, {
      method: options.method,
      headers: options.headers,
      body: options.body,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('La solicitud tardo demasiado y fue cancelada. Intenta de nuevo.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function extractErrorMessage(response: Response) {
  try {
    const data = await response.json();
    return data?.details || data?.error || 'Error desconocido';
  } catch {
    return `Error HTTP ${response.status}`;
  }
}

function getAuthHeaders(): Record<string, string> {
  const stored = localStorage.getItem('voltbody-storage');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      const token = parsed?.state?.authToken;
      if (token) {
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        };
      }
    } catch {}
  }
  return { 'Content-Type': 'application/json' };
}

export async function generatePlan(profile: any): Promise<{ routine: WorkoutDay[]; diet: DietPlan; insights: Insights }> {
  const response = await fetchWithTimeout(`${API_URL}/ai/generate-plan`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return response.json();
}

export async function generateAlternativeMeal(oldMeal: Meal, profile: any): Promise<Meal> {
  const response = await fetchWithTimeout(`${API_URL}/ai/generate-alternative-meal`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ oldMeal, profile }),
    timeoutMs: 30000,
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
}): Promise<ProgressReport> {
  const response = await fetchWithTimeout(`${API_URL}/ai/generate-progress-report`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
    timeoutMs: 45000,
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return response.json();
}
