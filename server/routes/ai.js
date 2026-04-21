import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { authMiddleware } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { validateGeneratePlanPayload, validateAlternativeMealPayload, validateProgressReportPayload } from '../middleware/validators.js';
import { logError, logInfo } from '../utils/logger.js';
import { incrementAiError } from '../utils/metrics.js';

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

/**
 * Translates a Spanish exercise name to an English search term
 * using a simple keyword map. Falls back to the original name.
 */
function toEnglishSearchTerm(nameEs = '') {
  const lower = nameEs.toLowerCase();
  const map = [
    [/sentadilla goblet/,   'goblet squat'],
    [/sentadill/,           'squat'],
    [/press.*banca.*inclin|press.*inclin.*banca/, 'incline bench press'],
    [/press.*banca/,        'bench press'],
    [/press.*inclin.*mancuerna|press.*mancuerna.*inclin/, 'incline dumbbell press'],
    [/press.*inclin/,       'incline dumbbell press'],
    [/press.*militar|press.*overhead|press.*hombro/, 'overhead press'],
    [/press.*mancuerna/,    'dumbbell press'],
    [/curl.*barra.*z|curl.*z/,  'ez bar curl'],
    [/curl.*b.?ceps.*barra|curl.*barra.*b.?ceps/, 'barbell curl'],
    [/curl.*b.?ceps|bicep curl/, 'bicep curl'],
    [/curl.*martillo/,      'hammer curl'],
    [/curl.*mancuerna/,     'dumbbell curl'],
    [/remo.*barra/,         'barbell row'],
    [/remo.*mancuerna/,     'dumbbell row'],
    [/remo.*cable|remo.*polea/, 'cable row'],
    [/remo/,                'row'],
    [/jalón.*pecho|jalon.*pecho|lat pulldown/, 'lat pulldown'],
    [/jalón|jalon/,         'lat pulldown'],
    [/dominada/,            'pull up'],
    [/fondos/,              'dips'],
    [/apertura.*polea|cable.*fly/, 'cable fly'],
    [/apertura/,            'dumbbell fly'],
    [/peso muerto rumano|peso muerto rum/, 'romanian deadlift'],
    [/peso muerto/,         'deadlift'],
    [/zancada caminando|lunge caminando/, 'walking lunge'],
    [/zancada|lunge/,       'lunge'],
    [/prensa.*pierna|leg press/, 'leg press'],
    [/curl.*femoral|curl.*pierna/, 'leg curl'],
    [/extensi.?n.*cuadricep|extensi.?n.*pierna/, 'leg extension'],
    [/extensi.?n.*tri/,     'tricep extension'],
    [/press.*franc.?s|skull crusher/, 'skull crusher'],
    [/elevaci.?n lateral/,  'lateral raise'],
    [/elevaci.?n frontal/,  'front raise'],
    [/p.?jaro inclinado/,   'bent over lateral raise'],
    [/face pull/,           'face pull'],
    [/plancha/,             'plank'],
    [/burpee/,              'burpee'],
    [/hip thrust/,          'hip thrust'],
    [/glut/,                'glute bridge'],
    [/cardio|trote|corr/,   'run'],
    [/pull.*over|pullover/,  'pullover'],
    [/remo.*sentado/,        'seated cable row'],
  ];
  for (const [pattern, term] of map) {
    if (pattern.test(lower)) return term;
  }
  return nameEs; // last resort: use as-is (ExerciseDB also accepts some Spanish)
}

/**
 * Scores how well an ExerciseDB result name matches the English search term.
 * Returns a value in [0, 1]: 1 means every word in the term appears as a
 * whole word in the result name. Uses whole-word comparison to avoid false
 * positives such as 'lat' matching 'lateral'.
 */
function scoreExerciseMatch(resultName, searchTerm) {
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const rWords = new Set(normalize(resultName).split(/\s+/).filter(Boolean));
  const terms = normalize(searchTerm).split(/\s+/).filter(Boolean);
  if (!terms.length) return 0;
  const hits = terms.filter((t) => rWords.has(t));
  return hits.length / terms.length;
}

/**
 * Enriches an array of exercises with GIF URLs from the free ExerciseDB API.
 * Only fills gifUrl when it is empty ('') — never overwrites existing URLs.
 * Fetches up to 10 candidates and selects the one whose name best matches
 * the English translation of the exercise name, to avoid mismatched GIFs.
 * No API key required.
 */
async function enrichExercisesWithGifs(exercises = []) {
  return Promise.all(
    exercises.map(async (ex) => {
      if (ex.gifUrl) return ex;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s limit per exercise

      try {
        // Use the English name provided by Gemini directly; fall back to the
        // static translation map only for exercises that predate this field.
        const englishTerm = ex.nameEn || toEnglishSearchTerm(ex.name);
        // limit=10: fetching a small candidate set (vs. limit=1) lets the word-overlap
        // scorer pick the best-matching exercise name, avoiding mismatched GIFs (e.g.
        // "lat pulldown" returning a lateral-raise gif). 10 is a deliberate balance
        // between accuracy and API payload size — 3-5 candidates often omit the best match.
        const url = `${EXERCISEDB_BASE}/exercises?name=${encodeURIComponent(englishTerm)}&limit=10`;
        
        const resp = await fetch(url, {
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!resp.ok) return ex;
        const data = await resp.json();
        const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
        if (!list.length) return ex;

        // Pick the candidate whose name best matches the English search term
        const best = list.reduce(
          (top, item) => {
            const score = scoreExerciseMatch(item.name || '', englishTerm);
            return score > top.score ? { score, gifUrl: item.gifUrl || '' } : top;
          },
          { score: -1, gifUrl: list[0]?.gifUrl || '' }
        );

        return { ...ex, gifUrl: best.gifUrl };
      } catch (err) {
        clearTimeout(timeoutId);
        // Silently log timeout or network error to avoid blocking the user
        logInfo('ai.enrich_gifs.skip', { exercise: ex.name, reason: err.name === 'AbortError' ? 'timeout' : 'error' });
        return ex; 
      }
    })
  );
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
