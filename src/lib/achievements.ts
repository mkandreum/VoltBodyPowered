import { Achievement, WorkoutLog } from '../store/useAppStore';

export const ACHIEVEMENTS_CATALOG: Omit<Achievement, 'unlockedAt'>[] = [
  { id: 'first-series',  label: 'Primera serie',        icon: '🏋️', description: 'Registraste tu primera serie. ¡El camino empieza aquí!' },
  { id: 'series-10',    label: '10 series',             icon: '💪', description: 'Has acumulado 10 series registradas.' },
  { id: 'series-50',    label: '50 series',             icon: '⚡', description: '50 series completadas. ¡Eso es dedicación!' },
  { id: 'series-100',   label: '100 series',            icon: '🔥', description: '100 series. Eres imparable.' },
  { id: 'series-500',   label: '500 series',            icon: '💥', description: '500 series. Nivel élite.' },
  { id: 'streak-3',     label: 'Racha de 3 días',       icon: '🔗', description: 'Entrenaste 3 días seguidos.' },
  { id: 'streak-7',     label: 'Racha semanal',         icon: '📅', description: '7 días de racha. ¡Un hábito de hierro!' },
  { id: 'streak-14',    label: 'Dos semanas seguidas',  icon: '🗓️', description: '14 días de racha. Consistencia brutal.' },
  { id: 'streak-30',    label: 'Racha mensual',         icon: '🏆', description: '30 días en racha. Eres una bestia.' },
  { id: 'pr-beaten',    label: 'Nuevo récord personal', icon: '🥇', description: 'Superaste tu mejor marca en un ejercicio.' },
  { id: 'first-100kg',  label: '100 kg en la barra',    icon: '🦾', description: 'Registraste 100 kg o más en un ejercicio.' },
  { id: 'consistency-week', label: 'Semana perfecta',   icon: '✅', description: 'Completaste todos los días de entreno en una semana.' },
];

export function computeCurrentStreak(logs: WorkoutLog[]): number {
  if (!logs.length) return 0;
  const dateSet = new Set(
    logs.map((l) => new Date(l.date).toISOString().slice(0, 10))
  );
  let streak = 0;
  const cursor = new Date();
  while (dateSet.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function checkNewAchievements(
  logs: WorkoutLog[],
  earnedIds: string[],
  exerciseId: string,
  newLogWeight: number,
): Omit<Achievement, 'unlockedAt'>[] {
  const totalLogs = logs.length;
  const streak = computeCurrentStreak(logs);
  const unlocked: Omit<Achievement, 'unlockedAt'>[] = [];

  const earn = (id: string) => {
    if (!earnedIds.includes(id)) {
      const found = ACHIEVEMENTS_CATALOG.find((a) => a.id === id);
      if (found) unlocked.push(found);
    }
  };

  if (totalLogs >= 1) earn('first-series');
  if (totalLogs >= 10) earn('series-10');
  if (totalLogs >= 50) earn('series-50');
  if (totalLogs >= 100) earn('series-100');
  if (totalLogs >= 500) earn('series-500');
  if (streak >= 3) earn('streak-3');
  if (streak >= 7) earn('streak-7');
  if (streak >= 14) earn('streak-14');
  if (streak >= 30) earn('streak-30');
  if (newLogWeight >= 100) earn('first-100kg');

  // PR check: check if this is a new best for this exercise
  const prevBest = logs
    .filter((l) => l.exerciseId === exerciseId)
    .reduce((max, l) => Math.max(max, l.weight), 0);
  if (newLogWeight > prevBest && prevBest > 0) earn('pr-beaten');

  return unlocked;
}
