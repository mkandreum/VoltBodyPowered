// Prompts y post-procesado de los planes de IA (rutina + menu semanal + comida alternativa).
//
// Idea clave: los numeros (kcal, macros, dias de entreno, n.º de ejercicios) los calcula el servidor
// de forma determinista y se le dan al modelo como restricciones; el modelo solo elige ejercicios y
// platos. Despues se valida y se corrige la respuesta para que la app nunca reciba datos rotos.

export const WEEK_DAYS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

const MEAL_SLOTS = [
  { key: 'breakfast', label: 'Desayuno', share: 0.25, fallback: '08:00' },
  { key: 'brunch', label: 'Media mañana', share: 0.1, fallback: '11:00' },
  { key: 'lunch', label: 'Comida', share: 0.32, fallback: '14:00' },
  { key: 'snack', label: 'Merienda', share: 0.1, fallback: '17:30' },
  { key: 'dinner', label: 'Cena', share: 0.23, fallback: '21:00' },
];

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const round = (v, step = 1) => Math.round(v / step) * step;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const list = (v) => (Array.isArray(v) ? v.filter(Boolean).map(String).join(', ') : '');

// Desayuno, media mañana y merienda siempre dulces (el usuario no quiere lentejas a media tarde).
const SWEET_RULE = 'Desayuno, media mañana y merienda SIEMPRE DULCES (avena con fruta, tortitas de avena y plátano, yogur griego con miel y frutos rojos, tostadas con crema de cacahuete y plátano, batido de proteína con fruta, requesón con fruta, porridge de cacao...). NUNCA platos salados en esas tomas: nada de legumbres, guisos, carne, embutido, pescado, huevos revueltos ni verdura. La proteína de esas tomas sale de lácteos, claras en tortitas o proteína en polvo';

/** true si la hora corresponde a desayuno, media mañana o merienda. */
function isSweetSlot(time = '') {
  const h = Number(String(time).slice(0, 2));
  return Number.isFinite(h) && (h < 13 || (h >= 16 && h < 20));
}

function normalizeText(v = '') {
  return String(v).normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase().trim();
}

export function weekdayIndex(name = '') {
  const n = normalizeText(name);
  if (n.startsWith('lun')) return 0;
  if (n.startsWith('mar')) return 1;
  if (n.startsWith('mie')) return 2;
  if (n.startsWith('jue')) return 3;
  if (n.startsWith('vie')) return 4;
  if (n.startsWith('sab')) return 5;
  if (n.startsWith('dom')) return 6;
  return -1;
}

function hhmm(value, fallback) {
  const m = String(value || '').match(/(\d{1,2})[:.h](\d{2})/);
  if (!m) return fallback;
  return `${String(clamp(Number(m[1]), 0, 23)).padStart(2, '0')}:${m[2]}`;
}

/** Nivel 'beginner' | 'intermediate' | 'advanced' a partir del texto libre del perfil. */
function levelOf(profile) {
  const s = normalizeText(profile?.currentState);
  if (/avanzad|competi|atleta|mas de (2|3|4|5) anos|experto/.test(s)) return 'advanced';
  if (/intermedi|regular|6 meses|1 ano|un ano|habitual/.test(s)) return 'intermediate';
  return 'beginner';
}

function goalKind(profile) {
  const dir = normalizeText(profile?.goalDirection);
  const goal = normalizeText(profile?.goal);
  if (dir.startsWith('perd') || /perder|definir|adelgaz|grasa|bajar/.test(goal)) return 'lose';
  if (dir.startsWith('gan') || /ganar|volumen|masa|hipertrof|subir/.test(goal)) return 'gain';
  return 'maintain';
}

/**
 * Objetivos nutricionales deterministas: Mifflin-St Jeor + factor de actividad + ajuste por objetivo,
 * con suelos de seguridad. Proteina por kg de peso, grasa minima y el resto en hidratos.
 */
export function computeTargets(profile = {}) {
  const weight = num(profile.weight) ?? 70;
  const height = num(profile.height) ?? 170;
  const age = num(profile.age) ?? 30;
  const female = /^(f|muj|fem)/.test(normalizeText(profile.gender));
  const days = clamp(num(profile.trainingDaysPerWeek) ?? 3, 0, 7);
  const minutes = clamp(num(profile.sessionMinutes) ?? 60, 15, 180);

  const bmr = 10 * weight + 6.25 * height - 5 * age + (female ? -161 : 5);
  const weeklyTrainingHours = (days * minutes) / 60;
  const factor = weeklyTrainingHours <= 1 ? 1.3 : weeklyTrainingHours <= 3 ? 1.45 : weeklyTrainingHours <= 5 ? 1.6 : 1.72;
  const tdee = bmr * factor;

  const kind = goalKind(profile);
  const targetKg = Math.abs(num(profile.goalTargetKg) ?? 0);
  const months = num(profile.goalTimelineMonths) ?? 0;
  // kcal/dia necesarias para la meta (7700 kcal ~ 1 kg), acotadas a un ritmo seguro.
  const needed = targetKg > 0 && months > 0 ? (targetKg * 7700) / (months * 30.4) : null;
  let kcal = tdee;
  if (kind === 'lose') kcal = tdee - clamp(needed ?? tdee * 0.18, 250, tdee * 0.25);
  if (kind === 'gain') kcal = tdee + clamp(needed ?? 300, 150, 450);
  kcal = Math.max(kcal, female ? 1400 : 1600, bmr * 1.05);
  kcal = round(kcal, 10);

  const proteinPerKg = kind === 'lose' ? 2.1 : kind === 'gain' ? 1.9 : 1.8;
  const protein = round(Math.min(weight * proteinPerKg, (kcal * 0.4) / 4));
  const fat = round(Math.max(weight * 0.8, (kcal * 0.25) / 9));
  const carbs = Math.max(50, round((kcal - protein * 4 - fat * 9) / 4));

  return { dailyCalories: kcal, macros: { protein, carbs, fat }, bmr: round(bmr), tdee: round(tdee), kind, female };
}

/** Dias de entreno repartidos en la semana (con descanso entre medias cuando es posible). */
export function trainingDays(profile = {}) {
  const n = clamp(num(profile.trainingDaysPerWeek) ?? 3, 1, 6);
  const layouts = {
    1: [0],
    2: [0, 3],
    3: [0, 2, 4],
    4: [0, 1, 3, 4],
    5: [0, 1, 2, 3, 4],
    6: [0, 1, 2, 3, 4, 5],
  };
  let idx = layouts[n];
  // La clase especial semanal no debe caer el mismo dia que fuerza si hay alternativa.
  const special = profile.weeklySpecialSession?.enabled ? weekdayIndex(profile.weeklySpecialSession.day) : -1;
  if (special >= 0 && idx.includes(special) && n <= 4) {
    const free = [0, 1, 2, 3, 4, 5].filter((d) => !idx.includes(d) && d !== special);
    if (free.length) idx = [...idx.filter((d) => d !== special), free[0]].sort((a, b) => a - b);
  }
  return idx.map((i) => WEEK_DAYS[i]);
}

function splitFor(n) {
  if (n <= 3) return 'Full body en todas las sesiones (cada sesion con un enfoque distinto: dominante de rodilla, de cadera, empuje/traccion)';
  if (n === 4) return 'Torso / Pierna / Torso / Pierna (Upper/Lower)';
  if (n === 5) return 'Push / Pull / Legs + Upper / Lower';
  return 'Push / Pull / Legs dos veces por semana';
}

const LEVEL_RULES = {
  beginner: 'Principiante: 3 series por ejercicio, 10-15 reps, RIR 3 (lejos del fallo), maquinas y mancuernas antes que barra libre en tecnicas complejas, pesos conservadores.',
  intermediate: 'Intermedio: 3-4 series, 6-12 reps en compuestos y 10-15 en aislamiento, RIR 1-2, progresion de carga semanal.',
  advanced: 'Avanzado: 4-5 series, 4-8 reps en compuestos pesados y 8-15 en accesorios, RIR 0-2; permite tecnicas (rest-pause, top set + back-off) en el ultimo ejercicio.',
};

function mealSchedule(profile = {}) {
  const mt = profile.mealTimes || {};
  return MEAL_SLOTS.map((s) => ({ ...s, time: hhmm(mt[s.key], s.fallback) }));
}

function profileBlock(profile, targets) {
  const bmi = profile.weight && profile.height ? (profile.weight / (profile.height / 100) ** 2).toFixed(1) : 'N/A';
  const special = profile.weeklySpecialSession?.enabled
    ? `${profile.weeklySpecialSession.activity} el ${profile.weeklySpecialSession.day} (${profile.weeklySpecialSession.durationMinutes} min)`
    : 'ninguna';
  return `PERFIL
- Nombre: ${profile.name || 'Usuario'} | Edad: ${profile.age ?? 'N/A'} | Género: ${profile.gender || 'N/A'}
- Peso: ${profile.weight ?? 'N/A'} kg | Altura: ${profile.height ?? 'N/A'} cm | IMC: ${bmi}
- Nivel declarado: ${profile.currentState || 'N/A'}
- Objetivo: ${profile.goal || 'N/A'} (${profile.goalDirection || ''} ${profile.goalTargetKg || 0} kg en ${profile.goalTimelineMonths || 0} meses)
- Entreno: ${profile.trainingDaysPerWeek || 'N/A'} días/semana, ${profile.sessionMinutes || 'N/A'} min por sesión. Disponibilidad: ${profile.schedule || 'N/A'}
- Horario laboral/estudio: ${profile.workHours || 'N/A'}
- Clase especial semanal: ${special}
- Gustos — verduras: ${list(profile.foodPreferences?.vegetables) || 'sin preferencia'}; hidratos: ${list(profile.foodPreferences?.carbs) || 'sin preferencia'}; proteínas: ${list(profile.foodPreferences?.proteins) || 'sin preferencia'}
- Plato especial del usuario: ${profile.specialDish?.ingredients ? `${profile.specialDish.ingredients} (~${profile.specialDish.targetCalories || 'N/A'} kcal)` : 'ninguno'}
- Gasto estimado: metabolismo basal ${targets.bmr} kcal, gasto total ${targets.tdee} kcal`;
}

/** Prompt de generate-plan: rutina semanal + menu de 7 dias + insights. */
export function buildPlanPrompt(profile = {}) {
  const targets = computeTargets(profile);
  const days = trainingDays(profile);
  const level = levelOf(profile);
  const minutes = clamp(num(profile.sessionMinutes) ?? 60, 20, 150);
  const exercises = clamp(Math.round((minutes - 10) / 8), 4, 8);
  const slots = mealSchedule(profile);
  const slotLines = slots
    .map((s) => `  - ${s.time} ${s.label}: ~${round(targets.dailyCalories * s.share, 10)} kcal`)
    .join('\n');

  const prompt = `Eres un entrenador personal (NSCA-CSCS) y dietista-nutricionista deportivo. Diseñas planes reales, seguros y fáciles de cumplir para usuarios de una app en español de España.

${profileBlock(profile, targets)}

== RUTINA ==
Días de entreno (usa EXACTAMENTE estos nombres y este orden, sin días de descanso): ${days.join(', ')}.
- División: ${splitFor(days.length)}.
- ${LEVEL_RULES[level]}
- ${exercises} ejercicios por sesión (caben en ${minutes} min con calentamiento). Primero 1-2 compuestos pesados, después accesorios y por último core o aislamiento.
- Equilibra el volumen semanal: 10-20 series efectivas por grupo grande, sin repetir el mismo ejercicio en dos días seguidos.
- "focus": nombre corto y claro (ej. "Torso · fuerza", "Pierna · glúteo", "Full body A").
- "weight": kg iniciales realistas para su peso corporal y nivel (0 si es peso corporal). En mancuernas indica el peso de UNA mancuerna.
- "reps": texto como "8-10", "12" o "30 s"; para isométricos y cardio usa "exerciseType" "isometric"/"cardio" y "durationTarget" en segundos.
- "nameEn": nombre estándar en inglés de ExerciseDB (ej. "barbell bench press", "dumbbell lateral raise", "cable seated row", "barbell romanian deadlift"); se usa para buscar el GIF, así que nada de nombres inventados.
- "technique": 1 frase con la clave técnica más importante (ej. "Escápulas atrás y abajo, baja la barra al esternón").
- Si hay clase especial semanal, no pongas pierna pesada el día anterior.

== NUTRICIÓN ==
Objetivos FIJOS (no los recalcules): ${targets.dailyCalories} kcal/día · proteína ${targets.macros.protein} g · hidratos ${targets.macros.carbs} g · grasa ${targets.macros.fat} g.
Genera un MENÚ SEMANAL de 7 días (Lunes a Domingo) con estas 5 tomas cada día:
${slotLines}
Reglas del menú:
- Cada día debe sumar ${targets.dailyCalories} kcal ±5 % y al menos ${round(targets.macros.protein * 0.95)} g de proteína. Revisa las sumas antes de responder.
- Coherencia: calorías ≈ proteína×4 + hidratos×4 + grasa×9 (±8 %) en cada comida.
- Variedad real: el plato principal de comida y cena no se repite más de 2 veces en la semana; alterna fuentes de proteína (pollo, pavo, huevo, pescado blanco, pescado azul, legumbre, ternera magra, lácteos).
- ${SWEET_RULE}. Sus gustos de proteínas y verduras se aplican a comida y cena.
- Prioriza los alimentos que le gustan; ingredientes de supermercado español, recetas de ≤20 min entre semana y algo más elaborado el fin de semana. Puedes reutilizar sobras de la cena en la comida siguiente.
- En días de entreno (${days.join(', ')}) sube algo los hidratos de la comida previa o posterior al entreno y baja la grasa; en días de descanso al revés, manteniendo el total diario.
${profile.specialDish?.ingredients ? `- Incluye su plato especial ("${profile.specialDish.ingredients}") 1-2 veces en la semana como comida o cena, ajustado a ese hueco.\n` : ''}- "name": nombre concreto y apetecible empezando por un emoji (ej. "🍳 Tortilla de claras con espinacas y pan de centeno").
- "description": ingredientes con gramos en crudo y preparación breve (ej. "120 g pechuga de pollo, 70 g arroz basmati, 150 g brócoli, 10 g AOVE. Plancha y arroz hervido.").
- "time": la hora indicada para esa toma (HH:MM).

== INSIGHTS ==
- sleepRecommendation: horas objetivo y 2 hábitos concretos según su horario.
- estimatedResults: qué esperar a las 4, 8 y 12 semanas con cifras realistas (pérdida/ganancia de 0,25-0,75 % del peso por semana según objetivo).
- dailyQuote: frase corta y motivadora que mencione a ${profile.name || 'el usuario'}.

Responde SOLO con JSON válido con esta forma:
{
  "routine": [ { "day": "Lunes", "focus": "string", "exercises": [ { "id": "string", "name": "string (español)", "nameEn": "string", "sets": 3, "reps": "8-10", "weight": 40, "muscleGroup": "Pecho|Espalda|Hombros|Bíceps|Tríceps|Piernas|Glúteos|Core|Cardio", "exerciseType": "weighted|bodyweight|isometric|cardio", "durationTarget": null, "technique": "string" } ] } ],
  "diet": { "week": [ { "day": "Lunes", "meals": [ { "name": "string", "time": "HH:MM", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "description": "string" } ] } ] },
  "insights": { "sleepRecommendation": "string", "estimatedResults": "string", "dailyQuote": "string" }
}`;

  return { prompt, targets, days };
}

function cleanMeal(m, id, time) {
  const p = Math.max(0, round(num(m?.protein) ?? 0));
  const c = Math.max(0, round(num(m?.carbs) ?? 0));
  const f = Math.max(0, round(num(m?.fat) ?? 0));
  let kcal = Math.max(0, round(num(m?.calories) ?? 0));
  const fromMacros = p * 4 + c * 4 + f * 9;
  // Si las kcal declaradas no cuadran con los macros (>15 %), manda la suma de macros.
  if (fromMacros > 0 && (kcal === 0 || Math.abs(kcal - fromMacros) / fromMacros > 0.15)) kcal = fromMacros;
  return {
    id,
    name: String(m?.name || 'Comida').slice(0, 120),
    time: hhmm(m?.time, time),
    calories: kcal,
    protein: p,
    carbs: c,
    fat: f,
    description: String(m?.description || '').slice(0, 1200),
  };
}

/** Normaliza el menu: 7 dias Lunes..Domingo, ids unicos y estables, horas validas; meals = menu del lunes. */
export function normalizeDiet(rawDiet, profile, targets) {
  const slots = mealSchedule(profile);
  const byIndex = new Array(7).fill(null);
  const rawWeek = Array.isArray(rawDiet?.week) ? rawDiet.week : [];
  rawWeek.forEach((d, i) => {
    const idx = weekdayIndex(d?.day);
    const at = idx >= 0 ? idx : i;
    if (at < 7 && !byIndex[at] && Array.isArray(d?.meals) && d.meals.length) byIndex[at] = d.meals;
  });
  const base = Array.isArray(rawDiet?.meals) && rawDiet.meals.length ? rawDiet.meals : byIndex.find(Boolean);
  if (!base) return null;

  const week = WEEK_DAYS.map((day, di) => {
    const meals = (byIndex[di] || base).slice(0, 6).map((m, mi) => cleanMeal(m, `d${di + 1}-m${mi + 1}`, slots[mi]?.time || '12:00'));
    meals.sort((a, b) => a.time.localeCompare(b.time));
    return { day, meals };
  });

  return {
    dailyCalories: targets.dailyCalories,
    macros: targets.macros,
    meals: week[0].meals, // compatibilidad con clientes que solo leen "meals"
    week,
  };
}

const MUSCLES = ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Piernas', 'Glúteos', 'Core', 'Cardio'];

export function normalizeRoutine(rawRoutine, days) {
  if (!Array.isArray(rawRoutine) || !rawRoutine.length) return null;
  return rawRoutine.slice(0, 7).map((d, di) => {
    const day = days[di] && weekdayIndex(d?.day) < 0 ? days[di] : String(d?.day || days[di] || WEEK_DAYS[di]);
    const slug = normalizeText(day).slice(0, 3);
    const exercises = (Array.isArray(d?.exercises) ? d.exercises : []).slice(0, 10).map((e, ei) => {
      const type = ['weighted', 'bodyweight', 'isometric', 'cardio'].includes(e?.exerciseType) ? e.exerciseType : undefined;
      const muscle = MUSCLES.find((m) => normalizeText(m) === normalizeText(e?.muscleGroup)) || String(e?.muscleGroup || 'Core');
      return {
        id: `${slug}-${ei + 1}-${normalizeText(e?.name || 'ejercicio').replace(/[^a-z0-9]+/g, '-').slice(0, 32)}`,
        name: String(e?.name || 'Ejercicio').slice(0, 80),
        nameEn: String(e?.nameEn || '').slice(0, 80),
        sets: clamp(Math.round(num(e?.sets) ?? 3), 1, 8),
        reps: String(e?.reps ?? '10').slice(0, 20),
        weight: Math.max(0, num(e?.weight) ?? 0),
        gifUrl: '',
        muscleGroup: muscle,
        ...(type && { exerciseType: type }),
        ...(num(e?.durationTarget) && { durationTarget: clamp(Math.round(num(e.durationTarget)), 5, 3600) }),
        ...(e?.technique && { technique: String(e.technique).slice(0, 200) }),
      };
    });
    return { day, focus: String(d?.focus || 'Entreno').slice(0, 60), exercises };
  }).filter((d) => d.exercises.length);
}

/** Prompt de generate-alternative-meal: mismo hueco, mismos macros (±10 %), sin repetir lo del dia. */
export function buildAlternativeMealPrompt({ oldMeal, profile = {}, dayMeals = [] }) {
  const others = Array.isArray(dayMeals)
    ? dayMeals.slice(0, 8).map((m) => `${m?.time || ''} ${m?.name || ''}`.trim()).filter(Boolean)
    : [];
  return `Eres dietista-nutricionista deportivo. El usuario quiere cambiar UNA comida de su plan por otra equivalente.

COMIDA A SUSTITUIR (${oldMeal.time}): ${oldMeal.name}
${oldMeal.description ? `Detalle: ${oldMeal.description}\n` : ''}Objetivo de la nueva: ${oldMeal.calories} kcal (±8 %), proteína ${oldMeal.protein} g (mínimo ${round(oldMeal.protein * 0.9)} g), hidratos ${oldMeal.carbs} g (±15 %), grasa ${oldMeal.fat} g (±15 %).
Objetivo del usuario: ${profile.goal || 'N/A'}.
Le gustan — verduras: ${list(profile.foodPreferences?.vegetables) || 'sin preferencia'}; hidratos: ${list(profile.foodPreferences?.carbs) || 'sin preferencia'}; proteínas: ${list(profile.foodPreferences?.proteins) || 'sin preferencia'}.
${others.length ? `Ese día ya come: ${others.join(' | ')}. No repitas su proteína principal ni el mismo plato.\n` : ''}
Reglas:
${isSweetSlot(oldMeal.time) ? `- Es una toma dulce: ${SWEET_RULE}.\n` : ''}- Debe ser claramente distinta (otra proteína principal u otra preparación), adecuada para esa hora del día y hecha con ingredientes de supermercado español en ≤20 min.
- "name" empieza con un emoji y es concreto (ej. "🐟 Salmón al horno con boniato y espárragos").
- "description": ingredientes con gramos en crudo + preparación en una frase.
- calorías ≈ proteína×4 + hidratos×4 + grasa×9.

Responde SOLO con JSON válido:
{ "name": "string", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "description": "string" }`;
}

export function normalizeAlternativeMeal(raw, oldMeal) {
  const m = cleanMeal(raw, oldMeal.id, oldMeal.time);
  return { ...m, id: oldMeal.id, time: oldMeal.time };
}

/** Menu semanal de respaldo (sin IA): rota platos sencillos y los escala a las kcal objetivo. */
export function fallbackWeekDiet(profile, targets) {
  const slots = mealSchedule(profile);
  const pool = [
    [
      ['🥣 Avena con yogur y plátano', 'Avena, yogur griego, plátano y canela.', [30, 62, 14]],
      ['🍓 Tostadas de centeno con requesón y fresas', 'Pan de centeno, requesón, fresas y miel.', [28, 52, 10]],
      ['🥞 Tortitas de avena y claras', 'Avena, claras, arándanos.', [34, 58, 9]],
    ],
    [
      ['🍎 Yogur con nueces y fruta', 'Yogur natural, nueces y manzana.', [16, 24, 14]],
      ['🥛 Batido de proteína con plátano', 'Proteína whey, leche y plátano.', [28, 30, 5]],
    ],
    [
      ['🍗 Pollo con arroz y verduras', 'Pechuga de pollo, arroz y verduras salteadas.', [48, 78, 18]],
      ['🍝 Pasta integral con atún y tomate', 'Pasta integral, atún al natural, tomate y aceitunas.', [42, 85, 16]],
      ['🍲 Lentejas estofadas con verduras', 'Lentejas, zanahoria, pimiento y huevo cocido.', [36, 80, 14]],
      ['🥩 Ternera magra con patata y ensalada', 'Ternera, patata asada y ensalada.', [46, 60, 20]],
    ],
    [
      ['🥜 Tostada con crema de cacahuete', 'Pan integral, crema de cacahuete y plátano.', [14, 38, 14]],
      ['🫐 Yogur griego con miel y frutos rojos', 'Yogur griego 0 %, miel y arándanos.', [22, 26, 4]],
    ],
    [
      ['🐟 Merluza con patata cocida', 'Merluza al horno, patata y ensalada.', [40, 44, 14]],
      ['🍳 Tortilla de espinacas con pan', 'Huevos, espinacas y pan integral.', [32, 30, 20]],
      ['🐟 Salmón con boniato', 'Salmón al horno, boniato y espárragos.', [36, 40, 22]],
    ],
  ];
  const week = WEEK_DAYS.map((day, di) => ({
    day,
    meals: slots.map((s, si) => {
      const opts = pool[si];
      const [name, description, [p, c, f]] = opts[(di + si) % opts.length];
      const base = p * 4 + c * 4 + f * 9;
      const k = (targets.dailyCalories * s.share) / base;
      return cleanMeal({ name, description, time: s.time, protein: p * k, carbs: c * k, fat: f * k }, `d${di + 1}-m${si + 1}`, s.time);
    }),
  }));
  return { dailyCalories: targets.dailyCalories, macros: targets.macros, meals: week[0].meals, week };
}

/** Prompt de generate-day-meals: menú del día completamente nuevo con los mismos huecos y macros. */
export function buildDayMealsPrompt({ meals, profile = {}, dailyCalories, macros }) {
  const slots = meals
    .map((m) => `- id "${m.id}" · ${m.time}${isSweetSlot(m.time) ? ' (toma DULCE)' : ''}: ~${m.calories} kcal (P${m.protein} C${m.carbs} G${m.fat}). Actual: ${m.name}`)
    .join('\n');
  return `Eres dietista-nutricionista deportivo. El usuario quiere cambiar TODO el menú de un día por platos nuevos.

TOMAS DEL DÍA (respeta id, hora y objetivo de cada una):
${slots}
${dailyCalories ? `Total del día: ${dailyCalories} kcal${macros ? ` · proteína ${macros.protein} g · hidratos ${macros.carbs} g · grasa ${macros.fat} g` : ''}.\n` : ''}Objetivo del usuario: ${profile.goal || 'N/A'}.
Le gustan — verduras: ${list(profile.foodPreferences?.vegetables) || 'sin preferencia'}; hidratos: ${list(profile.foodPreferences?.carbs) || 'sin preferencia'}; proteínas: ${list(profile.foodPreferences?.proteins) || 'sin preferencia'}.

Reglas:
- Todos los platos deben ser distintos de los actuales y entre sí (no repitas proteína principal en comida y cena).
- ${SWEET_RULE}.
- Comida y cena: platos completos con sus gustos; ingredientes de supermercado español, ≤20 min.
- Cada toma: calorías ±8 % y proteína mínima del 90 % de su objetivo; calorías ≈ proteína×4 + hidratos×4 + grasa×9.
- "name" empieza con un emoji y es concreto; "description": ingredientes con gramos en crudo + preparación en una frase.

Responde SOLO con JSON válido:
{ "meals": [ { "id": "string", "name": "string", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "description": "string" } ] }`;
}

/** Empareja la respuesta con las tomas originales (por id o por orden) conservando id y hora. */
export function normalizeDayMeals(raw, oldMeals) {
  const generated = Array.isArray(raw) ? raw : raw?.meals;
  if (!Array.isArray(generated) || !generated.length) return null;
  return oldMeals.map((old, i) => {
    const m = generated.find((g) => g?.id === old.id) || generated[i];
    return m ? normalizeAlternativeMeal(m, old) : old;
  });
}
