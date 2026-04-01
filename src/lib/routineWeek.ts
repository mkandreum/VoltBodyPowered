import type { WorkoutDay } from '../store/useAppStore';

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
