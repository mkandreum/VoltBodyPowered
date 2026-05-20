import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { authMiddleware } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { validateGeneratePlanPayload, validateAlternativeMealPayload, validateProgressReportPayload } from '../middleware/validators.js';
import { logError, logInfo } from '../utils/logger.js';
import { incrementAiError } from '../utils/metrics.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXERCISES_PATH = path.join(__dirname, '../utils/exercises.json');

let localExercises = [];
try {
  localExercises = JSON.parse(fs.readFileSync(EXERCISES_PATH, 'utf8'));
  logInfo('ai.local_exercises.loaded', { count: localExercises.length });
} catch (err) {
  logError('ai.local_exercises.load_error', { message: err.message });
}

const router = express.Router();
const aiRateLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 12, keyPrefix: 'ai' });

function fallbackRoutine(profile) {
  const days = ['Lunes', 'Miercoles', 'Viernes'];
  const requestedDays = Math.max(1, Math.min(5, Number(profile?.trainingDaysPerWeek || 3)));
  const pickedDays = days.slice(0, Math.min(days.length, requestedDays));

  return pickedDays.map((day, dayIndex) => ({
    day,
    focus: dayIndex % 2 === 0 ? 'Fuerza Full Body' : 'Empuje y tiron',
    exercises: [
      { id: `${day}-sentadilla`, name: 'Sentadilla goblet', nameEn: 'goblet squat', sets: 3, reps: '10-12', weight: 12, gifUrl: '', muscleGroup: 'Piernas' },
      { id: `${day}-press`, name: 'Press con mancuernas', nameEn: 'dumbbell press', sets: 3, reps: '8-12', weight: 10, gifUrl: '', muscleGroup: 'Pecho' },
      { id: `${day}-remo`, name: 'Remo con mancuerna', nameEn: 'dumbbell row', sets: 3, reps: '10-12', weight: 12, gifUrl: '', muscleGroup: 'Espalda' },
      { id: `${day}-hombro`, name: 'Press militar sentado', nameEn: 'seated overhead press', sets: 3, reps: '10', weight: 8, gifUrl: '', muscleGroup: 'Hombros' },
      { id: `${day}-core`, name: 'Plancha frontal', nameEn: 'plank', sets: 3, reps: '30 segundos', weight: 0, gifUrl: '', muscleGroup: 'Core' },
    ],
  }));
}

function fallbackDiet(profile) {
  const target = profile?.goal?.toLowerCase().includes('perder') ? 2100 : 2500;
  return {
    dailyCalories: target,
    macros: {
      protein: Math.round(target * 0.32 / 4),
      carbs: Math.round(target * 0.43 / 4),
      fat: Math.round(target * 0.25 / 9),
    },
    meals: [
      { id: 'meal-1', name: '🥣 Tortilla de avena y platano', time: '08:00', calories: 520, protein: 30, carbs: 62, fat: 16, description: 'Avena, huevo, platano y canela.' },
      { id: 'meal-2', name: '🍎 Yogur con frutos secos', time: '11:30', calories: 320, protein: 18, carbs: 22, fat: 17, description: 'Yogur griego natural, nueces y fruta.' },
      { id: 'meal-3', name: '🍽️ Pollo con arroz y verduras', time: '14:00', calories: 690, protein: 48, carbs: 78, fat: 20, description: 'Pechuga de pollo, arroz y verduras salteadas.' },
      { id: 'meal-4', name: '🥜 Sandwich integral de atun', time: '18:00', calories: 360, protein: 28, carbs: 34, fat: 11, description: 'Pan integral, atun y tomate.' },
      { id: 'meal-5', name: '🌙 Merluza con patata cocida', time: '21:00', calories: 510, protein: 40, carbs: 44, fat: 16, description: 'Merluza al horno con patata y ensalada.' },
    ],
  };
}

function fallbackInsights(profile) {
  const name = profile?.name || 'Atleta';
  return {
    sleepRecommendation: 'Intenta dormir 7.5-8 horas y evitar pantallas 45 minutos antes de acostarte.',
    estimatedResults: 'En 4 semanas notarás mejor energia; en 8 semanas veras cambios visibles; en 12 semanas consolidaras habitos.',
    dailyQuote: `${name}, la consistencia gana: hoy cumple lo basico y suma una victoria mas.`,
  };
}

function fallbackPlan(profile) {
  return {
    routine: fallbackRoutine(profile),
    diet: fallbackDiet(profile),
    insights: fallbackInsights(profile),
  };
}

function fallbackProgressReport(logs = []) {
  const uniqueDays = new Set(logs.map((item) => String(item.date || '').slice(0, 10))).size;
  const consistency = Math.min(100, uniqueDays * 7);
  const progress = Math.min(100, Math.round(consistency * 0.8));
  const overall = Math.round((consistency + progress) / 2);

  return {
    overallScore: overall,
    progressPercent: progress,
    consistencyPercent: consistency,
    nutritionPercent: Math.max(45, Math.round(progress * 0.75)),
    trainingExecutionPercent: Math.max(50, Math.round(consistency * 0.78)),
    weeksToVisibleChange: Math.max(2, 12 - Math.floor(progress / 10)),
    summary: 'Tu avance es estable. Si mantienes el plan sin saltarte sesiones, la mejora visual sera progresiva y medible.',
    improvements: [
      'Mantener frecuencia semanal constante de entreno.',
      'Priorizar sueno y recuperacion para rendir mejor.',
      'Cumplir objetivos de proteina diaria con menos variacion.',
    ],
    nextActions: [
      'Completa todas las sesiones planificadas esta semana.',
      'Registra todas las series clave para medir progreso real.',
      'Revisa peso y fotos cada 7 dias para ajustar estrategia.',
    ],
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isProviderUnavailableError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('"code":503') ||
    message.includes('unavailable') ||
    message.includes('high demand')
  );
}

async function generateContentWithRetry({ model, prompt, requestId, eventBase }) {
  const maxAttempts = 2;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await ai.models.generateContent({
        model,
        contents: prompt,
      });
    } catch (error) {
      lastError = error;

      if (isProviderUnavailableError(error) && attempt < maxAttempts) {
        logInfo(`${eventBase}.provider_busy_retry`, { requestId, attempt, maxAttempts });
        await sleep(350);
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

function extractJsonBlock(rawText = '') {
  const trimmed = String(rawText).trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

// Initialize Gemini client
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  logError('ai.config.missing_key');
} else {
  logInfo('ai.config.key_detected');
}

const ai = new GoogleGenAI({ apiKey });

// ExerciseDB free open-source API — no API key required
// Docs: https://oss.exercisedb.dev
const EXERCISEDB_BASE = 'https://oss.exercisedb.dev/api/v1';

function isMockOrEmptyGifUrl(url) {
  if (!url) return true;
  const s = String(url).toLowerCase();
  return (
    s.includes('exercisedb.dev') ||
    s.includes('unsplash.com') ||
    s.includes('placeholder') ||
    s.includes('mock')
  );
}

/**
 * Translates a Spanish exercise name to an English search term
 * using a simple keyword map. Falls back to the original name.
 */
function toEnglishSearchTerm(nameEs = '') {
  const lower = nameEs.toLowerCase();
  const map = [
    [/sentadilla.*búlgara|sentadilla.*bulgara|sentadilla.*bulgar/, 'bulgarian split squat'],
    [/sentadilla goblet/,   'goblet squat'],
    [/sentadilla con barra|sentadilla libre|sentadilla frontal|sentadilla trasera/, 'barbell squat'],
    [/sentadilla/,           'squat'],
    [/peso muerto rumano|peso muerto rum/, 'romanian deadlift'],
    [/peso muerto sumo/,    'sumo deadlift'],
    [/peso muerto/,         'deadlift'],
    [/hip thrust con barra|hip thrust/, 'hip thrust'],
    [/puente de glúteo|puente de gluteo|glute bridge/, 'glute bridge'],
    [/patada de glúteo|patada de gluteo|glute kickback/, 'glute kickback'],
    [/prensa.*pierna|prensa|leg press/, 'leg press'],
    [/curl femoral|curl.*pierna|leg curl/, 'leg curl'],
    [/extensión de cuádriceps|extension de cuadriceps|leg extension/, 'leg extension'],
    [/elevación de talones|elevacion de talones|pantorrilla|gemelos/, 'calf raise'],
    [/zancadas caminando|zancada caminando|lunge caminando/, 'walking lunge'],
    [/zancada lateral|lunge lateral/, 'lateral lunge'],
    [/zancada|lunge/,       'lunge'],
    [/press.*banca.*inclin|press.*inclin.*banca/, 'incline bench press'],
    [/press.*banca.*declin|press.*declin.*banca/, 'decline bench press'],
    [/press.*banca/,        'bench press'],
    [/press.*inclin.*mancuerna|press.*mancuerna.*inclin/, 'incline dumbbell press'],
    [/press.*inclin/,       'incline dumbbell press'],
    [/press.*militar|press.*overhead|press.*hombro/, 'overhead press'],
    [/press.*militar.*mancuerna|press.*mancuerna.*militar/, 'dumbbell overhead press'],
    [/press.*mancuerna/,    'dumbbell bench press'],
    [/aperturas.*polea|cable.*fly/, 'cable fly'],
    [/aperturas.*mancuerna|apertura.*mancuerna/, 'dumbbell fly'],
    [/apertura|cruces de poleas/, 'cable crossover'],
    [/elevación lateral|elevaciones laterales/, 'lateral raise'],
    [/elevación frontal|elevaciones frontales/, 'front raise'],
    [/pájaro inclinado|pajaro inclinado|pájaros|pajaros/, 'bent over lateral raise'],
    [/face pull|facepull/,  'face pull'],
    [/curl.*barra.*z|curl.*z/, 'ez bar curl'],
    [/curl.*b.?ceps.*barra|curl.*barra.*b.?ceps/, 'barbell curl'],
    [/curl.*martillo/,      'hammer curl'],
    [/curl.*mancuerna/,     'dumbbell curl'],
    [/curl.*b.?ceps|bicep curl/, 'bicep curl'],
    [/extensión de tríceps en polea|tríceps en polea|triceps en polea|extension de triceps en polea/, 'cable tricep extension'],
    [/press.*francés|press.*frances|skull crusher/, 'skull crusher'],
    [/extensión.*tríceps|extension.*triceps/, 'tricep extension'],
    [/fondos.*paralelas|fondos en paralelas/, 'chest dips'],
    [/fondos|dips/,         'dips'],
    [/jalón.*pecho|jalon.*pecho|lat pulldown/, 'lat pulldown'],
    [/dominadas.*asistidas/, 'assisted pull up'],
    [/dominada|pull up|pull-up/, 'pull up'],
    [/remo.*barra/,         'barbell row'],
    [/remo.*mancuerna/,     'dumbbell row'],
    [/remo.*cable|remo.*polea|remo.*sentado/, 'cable row'],
    [/remo/,                'row'],
    [/plancha frontal|plancha/, 'plank'],
    [/burpee/,              'burpee'],
    [/trote|correr|corr|cardio/, 'run'],
    [/pull.*over|pullover/,  'pullover']
  ];
  for (const [pattern, term] of map) {
    if (pattern.test(lower)) return term;
  }
  return nameEs; // last resort: use as-is (ExerciseDB also accepts some Spanish)
}

/**
 * Scores how well an exercise dataset result name matches the English search term.
 * Returns a value based on word overlaps and ordering, with penalties for extra words.
 * Incorporates plural/singular normalization and intellectual penalties for variation equipment.
 */
function scoreExerciseMatch(resultName, searchTerm) {
  const normalize = (s) => {
    return s.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\bbiceps?\b/g, 'bicep')
      .replace(/\btriceps?\b/g, 'tricep')
      .replace(/\blunges?\b/g, 'lunge')
      .replace(/\bsquats?\b/g, 'squat')
      .replace(/\braises?\b/g, 'raise')
      .replace(/\bextensions?\b/g, 'extension')
      .replace(/\bfly(s|ies)?\b/g, 'fly')
      .replace(/\bpresses?\b/g, 'press')
      .replace(/\bdips?\b/g, 'dip')
      .trim();
  };

  const normResult = normalize(resultName);
  const normSearch = normalize(searchTerm);

  if (normResult === normSearch) return 10.0; // Perfect match

  const rWords = normResult.split(/\s+/).filter(Boolean);
  const rWordSet = new Set(rWords);
  const terms = normSearch.split(/\s+/).filter(Boolean);

  if (!terms.length) return 0;

  let hits = 0;
  terms.forEach(t => {
    if (rWordSet.has(t)) hits++;
  });

  if (hits === 0) return -1000; // Force an extremely bad score so it never matches

  // Calculate percentage of search terms matched
  const searchMatchRatio = hits / terms.length;

  // Add small penalty for extra words in the result to avoid overly long matches winning
  const lengthPenalty = 0.05 * Math.abs(rWords.length - terms.length);

  let score = searchMatchRatio - lengthPenalty;

  // Substring bonus: if the entire search term appears as a continuous substring
  if (normResult.includes(normSearch)) {
    score += 0.5;
  }

  // Exact word starting/ending match bonus
  if (normResult.startsWith(normSearch) || normResult.endsWith(normSearch)) {
    score += 0.2;
  }

  // INTELLECTUAL PENALTIES:
  // Penalize exercises in the database that require special/non-standard equipment or variations
  // if the user did NOT explicitly search for those words.
  const specialWords = [
    'band', 'resistance', 'elastic',
    'ball', 'swiss', 'stability', 'exercise ball',
    'bosu',
    'medicine',
    'lever', 'machine',
    'assisted',
    'power point', 'powerpoint',
    'suspension', 'trx',
    'foam', 'roller',
    'wheel',
    'partner',
    'slide',
    'towel',
    'chair',
    'bench press on', // e.g. dumbbell press on exercise ball
    'smith',
    'elbow dip', // avoid very weird elbow dips
    'impossible dip',
    'korean dip',
    'three bench'
  ];

  specialWords.forEach(word => {
    if (normResult.includes(word) && !normSearch.includes(word)) {
      score -= 0.8; // Apply a heavy penalty
    }
  });

  // Prefer standard "barbell" or "dumbbell" or "bodyweight" defaults if nothing is specified.
  if (normSearch === 'bench press' && normResult === 'barbell bench press') {
    score += 0.5;
  }
  if (normSearch === 'plank' && normResult === 'weighted front plank') {
    score += 0.5;
  }
  if (normSearch === 'bicep curl' && normResult === 'dumbbell bicep curl') {
    score += 0.6;
  }
  if (normSearch === 'dip' && normResult === 'tricep dip') {
    score += 0.5;
  }
  if (normSearch === 'dumbbell press' && normResult === 'dumbbell bench press') {
    score += 0.6;
  }

  return score;
}

/**
 * Enriches an array of exercises with GIF URLs using our local dataset of 1324 exercises.
 * Only fills/overwrites gifUrl when it is empty or is a mock/placeholder URL.
 * Resolves each exercise locally and accurately, mapping to a high-speed raw GitHub CDN URL.
 */
async function enrichExercisesWithGifs(exercises = []) {
  if (!localExercises.length) {
    return exercises; // Fallback
  }

  return exercises.map((ex) => {
    if (ex.gifUrl && !isMockOrEmptyGifUrl(ex.gifUrl)) return ex;

    const englishTerm = ex.nameEn || toEnglishSearchTerm(ex.name);
    let best = { score: -100, item: null };

    for (const item of localExercises) {
      const score = scoreExerciseMatch(item.name, englishTerm);
      if (score > best.score) {
        best = { score, item };
      }
    }

    if (best.item && best.score > 0 && best.item.gif_url) {
      const fullGifUrl = `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/${best.item.gif_url}`;
      return { ...ex, gifUrl: fullGifUrl };
    }

    return ex;
  });
}

/**
 * Enriches all exercises across a full routine (array of WorkoutDays).
 */
async function enrichRoutine(routine = []) {
  return Promise.all(
    routine.map(async (day) => ({
      ...day,
      exercises: await enrichExercisesWithGifs(day.exercises || []),
    }))
  );
}

// POST /api/ai/generate-plan
router.post('/generate-plan', authMiddleware, aiRateLimiter, validateGeneratePlanPayload, async (req, res) => {
  try {
    const profile = req.body;
    logInfo('ai.generate_plan.started', { requestId: req.requestId });

    const bmi = profile.weight && profile.height ? (profile.weight / ((profile.height / 100) ** 2)).toFixed(1) : 'N/A';
    const prompt = `Eres un entrenador personal certificado y nutricionista deportivo experto con más de 15 años de experiencia. Crea un plan COMPLETO, DETALLADO y PERSONALIZADO de entrenamiento y nutrición para:

PERFIL DEL USUARIO:
- Nombre: ${profile.name}
- Edad: ${profile.age} años
- Género: ${profile.gender}
- Peso: ${profile.weight}kg | Altura: ${profile.height}cm | IMC: ${bmi}
- Nivel de condición física: ${profile.currentState}
- Objetivo principal: ${profile.goal}
- Meta específica: ${profile.goalDirection || 'Perder'} ${profile.goalTargetKg || 0}kg en ${profile.goalTimelineMonths || 0} meses
- Disponibilidad de entrenamiento: ${profile.schedule}
- Días por semana: ${profile.trainingDaysPerWeek || 'N/A'} | Minutos por sesión: ${profile.sessionMinutes || 'N/A'}
- Horario laboral/estudio: ${profile.workHours}
- Horarios de comida: Desayuno ${profile.mealTimes?.breakfast}, Almuerzo ${profile.mealTimes?.brunch}, Comida ${profile.mealTimes?.lunch}, Merienda ${profile.mealTimes?.snack}, Cena ${profile.mealTimes?.dinner}
- Preferencias de alimentos: verduras ${Array.isArray(profile.foodPreferences?.vegetables) ? profile.foodPreferences.vegetables.join(', ') : 'N/A'}, carbohidratos ${Array.isArray(profile.foodPreferences?.carbs) ? profile.foodPreferences.carbs.join(', ') : 'N/A'}, proteínas ${Array.isArray(profile.foodPreferences?.proteins) ? profile.foodPreferences.proteins.join(', ') : 'N/A'}
- Plato especial sugerido por el usuario: ${profile.specialDish?.ingredients || 'N/A'} (${profile.specialDish?.targetCalories || 'N/A'} kcal objetivo)
- Clase especial semanal: ${profile.weeklySpecialSession?.enabled ? `${profile.weeklySpecialSession.activity} el ${profile.weeklySpecialSession.day} por ${profile.weeklySpecialSession.durationMinutes} minutos` : 'No aplica'}

INSTRUCCIONES PARA LA RUTINA:
- Genera ÚNICAMENTE los días de entrenamiento según la disponibilidad indicada (no generes días de descanso)
- Cada día debe tener entre 5 y 8 ejercicios específicos y variados
- Si hay clase especial semanal activa, inclúyela en la planificación semanal como actividad adicional de cardio/funcional (sin reemplazar fuerza)
- Incluye siempre: ejercicios compuestos (multi-articulares) + ejercicios de aislamiento
- Adapta las series, repeticiones y peso al nivel del usuario
- Asigna grupos musculares correctos y específicos (ej: "Pecho", "Espalda", "Hombros", "Bíceps", "Tríceps", "Piernas", "Glúteos", "Core", "Cardio")
- Los pesos iniciales deben ser realistas para el nivel indicado
- Para principiantes: 3 series, 10-15 reps, pesos moderados; intermedios: 4 series, 8-12 reps; avanzados: 4-5 series, 6-10 reps con técnicas avanzadas

INSTRUCCIONES PARA LA DIETA:
- Calcula las calorías según el objetivo: déficit calórico para perder grasa, superávit para ganar masa, mantenimiento para salud
- Ajusta el déficit/superávit para acercarse a la meta de kg en meses de forma realista y segura
- Distribuye los macros correctamente según el objetivo (más proteína para volumen/definición)
- Las comidas deben ser realistas, variadas y con alimentos accesibles en España/Latinoamérica
- Cada comida debe tener nombre concreto (ej: "Tortilla de avena con plátano") no genérico
- Ajusta los horarios de comida al horario laboral del usuario
- Incluye 5 tiempos si hay horario de almuerzo (desayuno, almuerzo, comida, merienda, cena)
- Prioriza alimentos de las listas de verduras, carbohidratos y proteínas indicadas por el usuario
- Incluye una versión del plato especial cercano a las calorías objetivo cuando sea posible

Responde SOLO con JSON válido (sin markdown, sin bloques de código, sin comentarios) con esta estructura exacta:
{
  "routine": [
    {
      "day": "string (ej: Lunes)",
      "focus": "string (ej: Pecho y Tríceps)",
      "exercises": [
        {
          "id": "string único",
          "name": "string (nombre del ejercicio en español)",
          "nameEn": "string (exercise name in English, used to search exercise GIFs)",
          "sets": number,
          "reps": "string (ej: '10-12' o '15' o '30 segundos')",
          "weight": number (en kg, 0 si es con peso corporal),
          "gifUrl": "",
          "muscleGroup": "string (grupo muscular principal)"
        }
      ]
    }
  ],
  "diet": {
    "dailyCalories": number,
    "macros": {"protein": number, "carbs": number, "fat": number},
    "meals": [
      {
        "id": "string único",
        "name": "string (nombre específico de la comida)",
        "time": "string (hora en formato HH:MM)",
        "calories": number,
        "protein": number,
        "carbs": number,
        "fat": number,
        "description": "string (descripción detallada con ingredientes y cantidades)"
      }
    ]
  },
  "insights": {
    "sleepRecommendation": "string (recomendación de sueño personalizada y detallada)",
    "estimatedResults": "string (resultados estimados realistas en 4, 8 y 12 semanas, alineados a la meta de kg/meses)",
    "dailyQuote": "string (frase motivacional personalizada mencionando el nombre ${profile.name})"
  }
}`;

    const response = await generateContentWithRetry({
      model: 'gemini-3-flash-preview',
      prompt,
      requestId: req.requestId,
      eventBase: 'ai.generate_plan',
    });

    try {
      const jsonText = extractJsonBlock(response.text);
      const plan = JSON.parse(jsonText);

      // Enrich exercises with GIF URLs from ExerciseDB
      try {
        plan.routine = await enrichRoutine(plan.routine || []);
      } catch (enrichErr) {
        logError('ai.generate_plan.enrich_error', { requestId: req.requestId, message: enrichErr.message });
        // Non-fatal: proceed without GIFs
      }

      logInfo('ai.generate_plan.success', { requestId: req.requestId });
      res.json(plan);
    } catch (parseErr) {
      incrementAiError();
      logError('ai.generate_plan.parse_error', {
        requestId: req.requestId,
        message: parseErr.message,
      });
      res.status(502).json({ error: 'JSON invalido de Gemini', details: parseErr.message });
    }
  } catch (error) {
    if (isProviderUnavailableError(error)) {
      logInfo('ai.generate_plan.provider_busy_fallback', { requestId: req.requestId });
      const fb = fallbackPlan(req.body || {});
      try { fb.routine = await enrichRoutine(fb.routine); } catch { /* non-fatal */ }
      return res.json({ ...fb, fallback: true, details: 'Plan de respaldo generado porque el proveedor IA esta saturado temporalmente.' });
    }

    incrementAiError();
    logError('ai.generate_plan.error', { requestId: req.requestId, message: error.message, stack: error.stack });
    const fb = fallbackPlan(req.body || {});
    try { fb.routine = await enrichRoutine(fb.routine); } catch { /* non-fatal */ }
    return res.json({ ...fb, fallback: true, details: 'Plan de respaldo generado por error del proveedor IA.' });
  }
});

// POST /api/ai/generate-alternative-meal
router.post('/generate-alternative-meal', authMiddleware, aiRateLimiter, validateAlternativeMealPayload, async (req, res) => {
  try {
    const { oldMeal, profile } = req.body;
    logInfo('ai.generate_alternative_meal.started', { requestId: req.requestId });

    const prompt = `Eres un nutricionista experto. Genera UNA comida alternativa para:
- Comida actual: ${oldMeal.name} (${oldMeal.description})
- Calorías: ${oldMeal.calories}, Macros: ${oldMeal.protein}g proteína, ${oldMeal.carbs}g carbos, ${oldMeal.fat}g grasa
- Objetivo del usuario: ${profile.goal}

Responde SOLO con JSON válido (sin markdown, sin comentarios):
{
  "id": "${oldMeal.id}",
  "name": "string",
  "time": "${oldMeal.time}",
  "calories": ${oldMeal.calories},
  "protein": ${oldMeal.protein},
  "carbs": ${oldMeal.carbs},
  "fat": ${oldMeal.fat},
  "description": "descripción corta y saludable"
}`;

    const response = await generateContentWithRetry({
      model: 'gemini-3-flash-preview',
      prompt,
      requestId: req.requestId,
      eventBase: 'ai.generate_alternative_meal',
    });

    try {
      const jsonText = extractJsonBlock(response.text);
      const meal = JSON.parse(jsonText);
      logInfo('ai.generate_alternative_meal.success', { requestId: req.requestId });
      res.json(meal);
    } catch (parseErr) {
      incrementAiError();
      logError('ai.generate_alternative_meal.parse_error', {
        requestId: req.requestId,
        message: parseErr.message,
      });
      res.status(502).json({ error: 'JSON invalido de Gemini', details: parseErr.message });
    }
  } catch (error) {
    if (isProviderUnavailableError(error)) {
      logInfo('ai.generate_alternative_meal.provider_busy_fallback', { requestId: req.requestId });
      return res.json({
        ...req.body.oldMeal,
        description: `${req.body.oldMeal.description} (fallback rapido por saturacion del proveedor IA)`,
      });
    }

    incrementAiError();
    logError('ai.generate_alternative_meal.error', { requestId: req.requestId, message: error.message, stack: error.stack });
    return res.json({
      ...req.body.oldMeal,
      description: `${req.body.oldMeal.description} (fallback rapido generado por error IA)`,
    });
  }
});

// POST /api/ai/generate-progress-report
router.post('/generate-progress-report', authMiddleware, aiRateLimiter, validateProgressReportPayload, async (req, res) => {
  try {
    const { profile, logs = [], routine = [], diet = null, progressPhotos = [] } = req.body;
    logInfo('ai.generate_progress_report.started', { requestId: req.requestId });

    const uniqueLogDays = new Set(logs.map((item) => String(item.date || '').slice(0, 10))).size;
    const totalSessions = Number(uniqueLogDays || 0);

    // Build exercise name lookup from routine so logs include readable names
    const exerciseNameMap = {};
    if (Array.isArray(routine)) {
      for (const day of routine) {
        if (Array.isArray(day?.exercises)) {
          for (const ex of day.exercises) {
            if (ex?.id && ex?.name) {
              exerciseNameMap[ex.id] = ex.name;
            }
          }
        }
      }
    }

    // Enrich logs with exercise names for the AI prompt
    const enrichedLogs = logs.slice(-200).map((log) => ({
      date: log.date,
      exercise: exerciseNameMap[log.exerciseId] || log.exerciseId,
      weight: log.weight,
      reps: log.reps,
    }));

    // Build a concise diet summary for the prompt
    let dietSummary = 'No hay plan de dieta configurado.';
    if (diet && typeof diet === 'object') {
      const macroLine = diet.macros
        ? `Macros objetivo: ${diet.macros.protein || 0}g proteina, ${diet.macros.carbs || 0}g carbos, ${diet.macros.fat || 0}g grasa`
        : '';
      const mealsLine = Array.isArray(diet.meals)
        ? diet.meals.map((m) => `${m.name || 'Comida'} (${m.calories || 0} kcal, ${m.protein || 0}g prot)`).join('; ')
        : '';
      dietSummary = `Calorias diarias objetivo: ${diet.dailyCalories || 'N/A'}. ${macroLine}. Comidas: ${mealsLine}`;
    }

    const prompt = `Eres un coach de fitness y recomposicion corporal. Analiza progreso real y da feedback accionable en ESPANOL.

DATOS DEL USUARIO:
- Nombre: ${profile?.name || 'Usuario'}
- Objetivo: ${profile?.goal || 'No definido'}
- Edad: ${profile?.age || 'N/A'}
- Peso actual: ${profile?.weight || 'N/A'}
- Altura: ${profile?.height || 'N/A'}
- Nivel: ${profile?.currentState || 'N/A'}
- Dias entreno/semana objetivo: ${profile?.trainingDaysPerWeek || 'N/A'}
- Duracion sesion objetivo: ${profile?.sessionMinutes || 'N/A'}

DATOS HISTORICOS:
- Registros de entrenamiento (sets): ${logs.length}
- Dias activos con entrenamiento: ${totalSessions}
- Dias de rutina configurados: ${Array.isArray(routine) ? routine.length : 0}
- Comidas del plan actual: ${diet?.meals?.length || 0}
- Fotos de progreso: ${Array.isArray(progressPhotos) ? progressPhotos.length : 0}

PLAN NUTRICIONAL:
${dietSummary}

LOGS RECIENTES (max 200, con nombre de ejercicio, peso y reps):
${JSON.stringify(enrichedLogs)}

RUTINA RESUMIDA:
${JSON.stringify(routine)}

Responde SOLO JSON valido con este formato exacto:
{
  "overallScore": number,
  "progressPercent": number,
  "consistencyPercent": number,
  "nutritionPercent": number,
  "trainingExecutionPercent": number,
  "weeksToVisibleChange": number,
  "summary": "string breve y motivador",
  "improvements": ["string", "string", "string"],
  "nextActions": ["string", "string", "string"]
}

Reglas:
- Todos los porcentajes entre 0 y 100.
- weeksToVisibleChange minimo 1 y maximo 52.
- Basate en los datos reales entregados, no inventes metricas externas.`;

    const response = await generateContentWithRetry({
      model: 'gemini-3-flash-preview',
      prompt,
      requestId: req.requestId,
      eventBase: 'ai.generate_progress_report',
    });

    try {
      const jsonText = extractJsonBlock(response.text);
      const report = JSON.parse(jsonText);
      logInfo('ai.generate_progress_report.success', { requestId: req.requestId });
      res.json(report);
    } catch (parseErr) {
      incrementAiError();
      logError('ai.generate_progress_report.parse_error', {
        requestId: req.requestId,
        message: parseErr.message,
      });
      res.status(502).json({ error: 'JSON invalido de Gemini', details: parseErr.message });
    }
  } catch (error) {
    if (isProviderUnavailableError(error)) {
      logInfo('ai.generate_progress_report.provider_busy_fallback', { requestId: req.requestId });
      return res.json(fallbackProgressReport(req.body?.logs || []));
    }

    incrementAiError();
    logError('ai.generate_progress_report.error', { requestId: req.requestId, message: error.message, stack: error.stack });
    return res.json(fallbackProgressReport(req.body?.logs || []));
  }
});

// POST /api/ai/enrich-routine
// Receives a routine with empty gifUrls and returns it enriched.
// Safe for existing users: only fills empty gifUrl fields.
router.post('/enrich-routine', authMiddleware, async (req, res) => {
  try {
    const { routine } = req.body;
    if (!Array.isArray(routine)) {
      return res.status(400).json({ error: 'routine debe ser un array' });
    }
    logInfo('ai.enrich_routine.started', { requestId: req.requestId, days: routine.length });
    const enriched = await enrichRoutine(routine);
    logInfo('ai.enrich_routine.success', { requestId: req.requestId });
    return res.json({ routine: enriched });
  } catch (error) {
    logError('ai.enrich_routine.error', { requestId: req.requestId, message: error.message });
    return res.status(500).json({ error: 'Error al enriquecer la rutina' });
  }
});

export default router;
