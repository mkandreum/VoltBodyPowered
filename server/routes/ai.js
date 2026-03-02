import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Initialize Gemini client
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('⚠️ GEMINI_API_KEY no está configurada');
} else {
  console.log('✅ GEMINI_API_KEY detectada');
}

const ai = new GoogleGenAI({ apiKey });

// POST /api/ai/generate-plan
router.post('/generate-plan', authMiddleware, async (req, res) => {
  try {
    const profile = req.body;
    console.log('📋 generate-plan request:', { name: profile.name, goal: profile.goal });

    const prompt = `Eres un entrenador personal y nutricionista experto. Genera una rutina de gimnasio, una dieta y recomendaciones para:
- Nombre: ${profile.name}
- Edad: ${profile.age}
- Género: ${profile.gender}
- Peso: ${profile.weight}kg, Altura: ${profile.height}cm
- Estado: ${profile.currentState}
- Objetivo: ${profile.goal}
- Disponibilidad: ${profile.schedule}
- Horario: ${profile.workHours}
- Horarios de comida: Desayuno ${profile.mealTimes?.breakfast}, Comida ${profile.mealTimes?.lunch}, Merienda ${profile.mealTimes?.snack}, Cena ${profile.mealTimes?.dinner}

Responde SOLO con JSON válido (sin markdown, sin comentarios) con esta estructura:
{
  "routine": [
    {"day": "string", "focus": "string", "exercises": [{"id": "string", "name": "string", "sets": number, "reps": "string", "weight": number, "gifUrl": "string", "muscleGroup": "string"}]}
  ],
  "diet": {
    "dailyCalories": number,
    "macros": {"protein": number, "carbs": number, "fat": number},
    "meals": [
      {"id": "string", "name": "string", "time": "string", "calories": number, "protein": number, "carbs": number, "fat": number, "description": "string"}
    ]
  },
  "insights": {
    "sleepRecommendation": "string",
    "estimatedResults": "string",
    "dailyQuote": "string con el nombre ${profile.name}"
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
      console.error('❌ Error parseando JSON:', parseErr.message);
      console.error('Raw response:', response.text?.substring(0, 200));
      res.status(500).json({ error: 'JSON inválido de Gemini', details: parseErr.message });
    }
  } catch (error) {
    console.error('❌ Error en generate-plan:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Error al generar el plan', details: error.message });
  }
});

// POST /api/ai/generate-alternative-meal
router.post('/generate-alternative-meal', authMiddleware, async (req, res) => {
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
      console.error('❌ Error parseando JSON:', parseErr.message);
      res.status(500).json({ error: 'JSON inválido de Gemini', details: parseErr.message });
    }
  } catch (error) {
    console.error('❌ Error en generate-alternative-meal:', error.message);
    res.status(500).json({ error: 'Error al generar comida alternativa', details: error.message });
  }
});

export default router;
