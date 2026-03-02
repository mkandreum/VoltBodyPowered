import { WorkoutDay, DietPlan, Meal, Insights } from '../store/useAppStore';

const API_URL = '/api';

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
  const response = await fetch(`${API_URL}/ai/generate-plan`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(err.details || err.error || 'Error al generar el plan');
  }

  return response.json();
}

export async function generateAlternativeMeal(oldMeal: Meal, profile: any): Promise<Meal> {
  const response = await fetch(`${API_URL}/ai/generate-alternative-meal`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ oldMeal, profile }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(err.details || err.error || 'Error al generar comida alternativa');
  }

  return response.json();
}
