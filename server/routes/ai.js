import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { authMiddleware } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { validateGeneratePlanPayload, validateAlternativeMealPayload } from '../middleware/validators.js';
import { logError, logInfo } from '../utils/logger.js';
import { incrementAiError } from '../utils/metrics.js';

const router = express.Router();
const aiRateLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 12, keyPrefix: 'ai' });

// Initialize Gemini client
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  logError('ai.config.missing_key');
} else {
  logInfo('ai.config.key_detected');
}

const ai = new GoogleGenAI({ apiKey });

// POST /api/ai/generate-plan
router.post('/generate-plan', authMiddleware, aiRateLimiter, validateGeneratePlanPayload, async (req, res) => {
  try {
    const profile = req.body;
    console.log('📋 generate-plan request:', { name: profile.name, goal: profile.goal });

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

    console.log('🤖 Llamando a Gemini...');
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    console.log('✅ Respuesta de Gemini recibida');
    try {
      const jsonText = response.text.trim();
      const plan = JSON.parse(jsonText);
      console.log('✅ JSON parseado exitosamente');
      res.json(plan);
    } catch (parseErr) {
      incrementAiError();
      console.error('❌ Error parseando JSON:', parseErr.message);
      console.error('Raw response:', response.text?.substring(0, 200));
      res.status(500).json({ error: 'JSON inválido de Gemini', details: parseErr.message });
    }
  } catch (error) {
    incrementAiError();
    logError('ai.generate_plan.error', { requestId: req.requestId, message: error.message, stack: error.stack });
    res.status(500).json({ error: 'Error al generar el plan', details: error.message });
  }
});

// POST /api/ai/generate-alternative-meal
router.post('/generate-alternative-meal', authMiddleware, aiRateLimiter, validateAlternativeMealPayload, async (req, res) => {
  try {
    const { oldMeal, profile } = req.body;
    console.log('🍽️ generate-alternative-meal request:', oldMeal.name);

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

    console.log('🤖 Llamando a Gemini...');
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    console.log('✅ Respuesta de Gemini recibida');
    try {
      const jsonText = response.text.trim();
      const meal = JSON.parse(jsonText);
      console.log('✅ JSON parseado exitosamente');
      res.json(meal);
    } catch (parseErr) {
      incrementAiError();
      console.error('❌ Error parseando JSON:', parseErr.message);
      res.status(500).json({ error: 'JSON inválido de Gemini', details: parseErr.message });
    }
  } catch (error) {
    incrementAiError();
    logError('ai.generate_alternative_meal.error', { requestId: req.requestId, message: error.message, stack: error.stack });
    res.status(500).json({ error: 'Error al generar comida alternativa', details: error.message });
  }
});

export default router;
