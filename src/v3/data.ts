/** Datos derivados compartidos por las pantallas (espejo de HomeData / summarize de la app). */
import type { AppTheme, DietPlan, Meal, WorkoutDay, WorkoutLog } from '../store/useAppStore';
import { getMondayFirstIndex, mapRoutineByWeekday } from '../lib/routineWeek';
import type { DailyMetricDTO } from '../services/dataService';

export const STEP_GOAL = 8000;
export const WATER_GOAL = 2500;
export const MIN_PER_EXERCISE = 6;

const pad = (n: number) => String(n).padStart(2, '0');
export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Fecha local de un log (ISO con hora). */
export const logDateKey = (iso: string) => { const d = new Date(iso); return isNaN(+d) ? iso.slice(0, 10) : dateKey(d); };
export const mondayOf = (d: Date) => { const c = new Date(d.getFullYear(), d.getMonth(), d.getDate()); c.setDate(c.getDate() - getMondayFirstIndex(c)); return c; };
export const mondayFirstIndex = getMondayFirstIndex;
export { mapRoutineByWeekday };

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export function weekdayIndexFromName(name: string): number {
  const n = norm(name);
  const keys = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];
  return keys.findIndex((k) => n.includes(k));
}

/** Índice del menú semanal para una fecha, o -1 (Models.kt weekIndexFor). */
export function weekIndexFor(diet: DietPlan, date: Date): number {
  const week = diet.week ?? [];
  const wd = getMondayFirstIndex(date);
  const i = week.findIndex((d) => weekdayIndexFromName(d.day) === wd && d.meals?.length);
  if (i >= 0) return i;
  return week.length === 7 && week[wd]?.meals?.length ? wd : -1;
}
export function mealsFor(diet: DietPlan | null | undefined, date: Date): Meal[] {
  if (!diet) return [];
  const i = weekIndexFor(diet, date);
  return i >= 0 ? diet.week![i].meals : diet.meals ?? [];
}
/** Cambia una comida solo en el menú de ese día (o en el menú base). */
export function replaceMeal(diet: DietPlan, date: Date, oldId: string, newMeal: Meal): DietPlan {
  const i = weekIndexFor(diet, date);
  if (i < 0) return { ...diet, meals: diet.meals.map((m) => (m.id === oldId ? newMeal : m)) };
  return { ...diet, week: diet.week!.map((d, j) => (j === i ? { ...d, meals: d.meals.map((m) => (m.id === oldId ? newMeal : m)) } : d)) };
}

export const WEEK_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export const WEEKDAY_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function setsLabel(ex: { exerciseType?: string; sets: number; reps: string; durationTarget?: number }): string {
  if (ex.exerciseType === 'isometric') return `${ex.sets} × ${ex.durationTarget ? `${ex.durationTarget}s` : ex.reps}`;
  if (ex.exerciseType === 'cardio') return `${ex.reps} min`;
  return `${ex.sets} × ${ex.reps}`;
}

export type DaySummary = {
  kcal: number; kcalTarget: number; steps: number; km: number; waterMl: number;
  sets: number; plannedExercises: number; doneExercises: number; focus: string | null;
  mealsEaten: number; meals: number; weight: number | null; goalPct: number;
};

/** Resumen de un día (o semana) para la pantalla Actividad. */
export function summarize(st: {
  routine: WorkoutDay[]; logs: WorkoutLog[]; diet: DietPlan | null; mealEatenRecord: Record<string, string[]>;
  dailyMetrics: Record<string, DailyMetricDTO>; weightLogs: { date: string; weight: number }[];
}, days: Date[]): DaySummary {
  const byDay = mapRoutineByWeekday(st.routine);
  const logsByDay = new Map<string, WorkoutLog[]>();
  st.logs.forEach((l) => { const k = logDateKey(l.date); (logsByDay.get(k) ?? logsByDay.set(k, []).get(k)!).push(l); });
  let kcal = 0, steps = 0, km = 0, water = 0, sets = 0, planned = 0, done = 0, eaten = 0, mealCount = 0, pctSum = 0;
  days.forEach((d) => {
    const key = dateKey(d);
    const meals = mealsFor(st.diet, d);
    const ids = st.mealEatenRecord[key] ?? [];
    const dk = meals.filter((m) => ids.includes(m.id)).reduce((a, m) => a + m.calories, 0);
    const m = st.dailyMetrics[key];
    const dl = logsByDay.get(key) ?? [];
    const r = byDay[getMondayFirstIndex(d)];
    const p = r?.exercises?.length ?? 0;
    const dn = r?.exercises?.filter((ex) => dl.some((l) => l.exerciseId === ex.id)).length ?? 0;
    kcal += dk; steps += m?.steps ?? 0; km += m?.distanceKm ?? 0; water += m?.waterMl ?? 0;
    sets += dl.length; planned += p; done += dn; eaten += meals.filter((x) => ids.includes(x.id)).length; mealCount += meals.length;
    const parts: number[] = [];
    const target = st.diet?.dailyCalories ?? 0;
    if (target > 0) parts.push(Math.min(1, dk / target));
    parts.push(Math.min(1, (m?.steps ?? 0) / STEP_GOAL));
    parts.push(Math.min(1, (m?.waterMl ?? 0) / WATER_GOAL));
    if (p > 0) parts.push(dn / p);
    pctSum += parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0;
  });
  const last = days[days.length - 1];
  const keys = new Set(days.map(dateKey));
  const w = [...st.weightLogs].reverse().find((x) => keys.has(x.date));
  return {
    kcal, kcalTarget: (st.diet?.dailyCalories ?? 0) * days.length, steps, km, waterMl: water, sets,
    plannedExercises: planned, doneExercises: done,
    focus: days.length === 1 && last ? byDay[getMondayFirstIndex(last)]?.focus ?? null : null,
    mealsEaten: eaten, meals: mealCount, weight: w?.weight ?? null,
    goalPct: Math.round((pctSum / Math.max(1, days.length)) * 100),
  };
}

export const THEMES: AppTheme[] = ['verde-negro', 'aguamarina-negro', 'ocaso-negro'];
export const THEME_ACCENT: Record<AppTheme, string> = { 'verde-negro': '#27F58B', 'aguamarina-negro': '#3FF5D0', 'ocaso-negro': '#FF8A3D' };
export function themeLabel(t: string): string {
  return t === 'aguamarina-negro' ? 'Aguamarina' : t === 'ocaso-negro' ? 'Ocaso' : 'Neón';
}

/** Emoji del plato según sus ingredientes (y si no, según la hora). */
export function foodEmoji(meal: Meal): string {
  const t = norm(`${meal.name} ${meal.description ?? ''}`);
  const map: Array<[string[], string]> = [
    [['tortita', 'pancake', 'crepe'], '🥞'], [['huevo', 'tortilla', 'revuelto'], '🍳'], [['avena', 'porridge', 'cereal', 'granola'], '🥣'],
    [['batido', 'smoothie', 'shake'], '🥤'], [['yogur', 'kefir', 'skyr'], '🥛'], [['tostada', 'pan ', 'sandwich', 'bocadillo'], '🥪'],
    [['wrap', 'burrito', 'fajita'], '🌯'], [['pizza'], '🍕'], [['hamburguesa', 'burger'], '🍔'],
    [['salmon', 'atun', 'merluza', 'pescado', 'bacalao', 'dorada', 'sardina'], '🐟'], [['gamba', 'langostino', 'marisco'], '🍤'],
    [['pollo', 'pavo'], '🍗'], [['ternera', 'carne', 'solomillo', 'lomo', 'filete'], '🥩'],
    [['pasta', 'espagueti', 'macarron'], '🍝'], [['arroz', 'risotto', 'poke'], '🍚'], [['sopa', 'crema', 'caldo', 'guiso', 'lenteja', 'garbanzo'], '🍲'],
    [['ensalada', 'quinoa', 'bowl'], '🥗'], [['boniato', 'patata'], '🍠'], [['aguacate'], '🥑'],
    [['frutos secos', 'nueces', 'almendra', 'cacahuete'], '🥜'], [['platano', 'banana'], '🍌'], [['frutos rojos', 'arandano', 'fresa'], '🫐'],
    [['manzana', 'fruta'], '🍎'], [['queso', 'requeson'], '🧀'], [['verdura', 'brocoli', 'espinaca'], '🥦'],
  ];
  const hit = map.find(([keys]) => keys.some((k) => t.includes(k)));
  if (hit) return hit[1];
  const h = parseInt(meal.time?.slice(0, 2) ?? '12', 10) || 12;
  return h < 11 ? '🥣' : h < 13 ? '🍎' : h < 16 ? '🍽️' : h < 19 ? '🥜' : '🌙';
}

export function mealMoment(time: string): string {
  const h = parseInt(time?.slice(0, 2) ?? '12', 10) || 12;
  return h < 11 ? 'Desayuno' : h < 13 ? 'Media mañana' : h < 17 ? 'Comida' : h < 20 ? 'Merienda' : 'Cena';
}

export const firstInt = (s: string, def: number) => { const m = String(s ?? '').match(/\d+/); return m ? parseInt(m[0], 10) : def; };

// ── Tipo de ejercicio (cuando el plan no lo trae) y ejercicio de PoseCoach ──
const ISOMETRIC_KEYWORDS = ['plancha', 'frog stand', 'isométrica', 'wall sit', 'estática', 'side plank'];
const BODYWEIGHT_KEYWORDS = ['dominadas', 'fondos', 'flexiones', 'burpees', 'pull-up', 'dip'];
const CARDIO_KEYWORDS = ['cardio', 'cuerda', 'correr', 'bicicleta', 'remo ergómetro', 'caminar', 'elíptica'];
export function exerciseTypeOf(ex: { name: string; exerciseType?: string }): 'weighted' | 'isometric' | 'bodyweight' | 'cardio' {
  if (ex.exerciseType) return ex.exerciseType as 'weighted';
  const lower = ex.name.toLowerCase();
  if (ISOMETRIC_KEYWORDS.some((k) => lower.includes(k))) return 'isometric';
  if (BODYWEIGHT_KEYWORDS.some((k) => lower.includes(k))) return 'bodyweight';
  if (CARDIO_KEYWORDS.some((k) => lower.includes(k))) return 'cardio';
  return 'weighted';
}
export function poseExerciseOf(name: string): 'squat' | 'plank' | 'deadlift' | 'lunge' | 'pushup' {
  const lower = name.toLowerCase();
  const type = exerciseTypeOf({ name });
  if (lower.includes('sentadilla') || lower.includes('squat') || lower.includes('goblet')) return 'squat';
  if (lower.includes('plancha') || lower.includes('plank')) return 'plank';
  if (lower.includes('peso muerto') || lower.includes('deadlift') || lower.includes('rdl')) return 'deadlift';
  if (lower.includes('zancada') || lower.includes('lunge')) return 'lunge';
  if (lower.includes('flexiones') || lower.includes('push') || lower.includes('fondos')) return 'pushup';
  if (type === 'isometric') return 'plank';
  if (type === 'bodyweight') return 'pushup';
  return 'squat';
}

/** Clave YYYY-MM-DD de `d` + `n` días. */
export const addDaysKey = (d: Date, n: number) => { const c = new Date(d.getFullYear(), d.getMonth(), d.getDate()); c.setDate(c.getDate() + n); return dateKey(c); };
