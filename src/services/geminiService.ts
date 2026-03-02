import { GoogleGenAI, Type } from '@google/genai';
import { WorkoutDay, DietPlan, Meal, Insights } from '../store/useAppStore';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('GEMINI_API_KEY not set. AI features will not work.');
}
const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export async function generatePlan(profile: any): Promise<{ routine: WorkoutDay[]; diet: DietPlan; insights: Insights }> {
  const prompt = `
    Eres un entrenador personal y nutricionista experto.
    Genera una rutina de gimnasio, una dieta y recomendaciones para un usuario con las siguientes características:
    - Nombre: ${profile.name}
    - Edad: ${profile.age}
    - Género: ${profile.gender}
    - Peso: ${profile.weight} kg
    - Altura: ${profile.height} cm
    - Estado actual: ${profile.currentState}
    - Objetivo: ${profile.goal}
    - Disponibilidad para entrenar: ${profile.schedule}
    - Horario de trabajo/estudio: ${profile.workHours}
    - Horarios de comida preferidos: Desayuno ${profile.mealTimes.breakfast}, Comida ${profile.mealTimes.lunch}, Merienda ${profile.mealTimes.snack}, Cena ${profile.mealTimes.dinner}

    Devuelve un JSON con la siguiente estructura exacta:
    {
      "routine": [
        {
          "day": "Día 1",
          "focus": "Pecho y Tríceps",
          "exercises": [
            {
              "id": "ex_1",
              "name": "Press de Banca",
              "sets": 4,
              "reps": "8-12",
              "weight": 0,
              "gifUrl": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=400&auto=format&fit=crop",
              "muscleGroup": "Pecho"
            }
          ]
        }
      ],
      "diet": {
        "dailyCalories": 2500,
        "macros": { "protein": 150, "carbs": 300, "fat": 70 },
        "meals": [
          {
            "id": "meal_1",
            "name": "Desayuno",
            "time": "08:00",
            "calories": 500,
            "protein": 30,
            "carbs": 50,
            "fat": 15,
            "description": "Avena con proteína y plátano"
          }
        ]
      },
      "insights": {
        "sleepRecommendation": "Deberías dormir a las 23:00 para asegurar 8 horas de descanso antes de tu trabajo.",
        "estimatedResults": "Notarás los primeros cambios físicos en 4-6 semanas si mantienes la constancia.",
        "dailyQuote": "¡A por todas hoy, Juan! Cada repetición cuenta."
      }
    }
    
    IMPORTANTE: Para gifUrl, usa siempre URLs de imágenes de Unsplash relacionadas con fitness (ej. https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=400&auto=format&fit=crop) o deja un string vacío si no encuentras. No uses URLs de Giphy falsas.
    La rutina debe adaptarse a los días de disponibilidad (${profile.schedule}).
    La dieta debe adaptar las comidas a los horarios proporcionados (${JSON.stringify(profile.mealTimes)}).
    En 'insights.dailyQuote', genera una frase motivadora corta que incluya el nombre del usuario (${profile.name}).
    En 'insights.sleepRecommendation', recomienda una hora de dormir basada en su horario de trabajo (${profile.workHours}).
    En 'insights.estimatedResults', estima cuándo verá resultados basados en su estado actual (${profile.currentState}) y objetivo (${profile.goal}).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            routine: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING },
                  focus: { type: Type.STRING },
                  exercises: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        name: { type: Type.STRING },
                        sets: { type: Type.INTEGER },
                        reps: { type: Type.STRING },
                        weight: { type: Type.INTEGER },
                        gifUrl: { type: Type.STRING },
                        muscleGroup: { type: Type.STRING },
                      },
                      required: ['id', 'name', 'sets', 'reps', 'weight', 'gifUrl', 'muscleGroup'],
                    },
                  },
                },
                required: ['day', 'focus', 'exercises'],
              },
            },
            diet: {
              type: Type.OBJECT,
              properties: {
                dailyCalories: { type: Type.INTEGER },
                macros: {
                  type: Type.OBJECT,
                  properties: {
                    protein: { type: Type.INTEGER },
                    carbs: { type: Type.INTEGER },
                    fat: { type: Type.INTEGER },
                  },
                  required: ['protein', 'carbs', 'fat'],
                },
                meals: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      name: { type: Type.STRING },
                      time: { type: Type.STRING },
                      calories: { type: Type.INTEGER },
                      protein: { type: Type.INTEGER },
                      carbs: { type: Type.INTEGER },
                      fat: { type: Type.INTEGER },
                      description: { type: Type.STRING },
                    },
                    required: ['id', 'name', 'time', 'calories', 'protein', 'carbs', 'fat', 'description'],
                  },
                },
              },
              required: ['dailyCalories', 'macros', 'meals'],
            },
            insights: {
              type: Type.OBJECT,
              properties: {
                sleepRecommendation: { type: Type.STRING },
                estimatedResults: { type: Type.STRING },
                dailyQuote: { type: Type.STRING },
              },
              required: ['sleepRecommendation', 'estimatedResults', 'dailyQuote'],
            },
          },
          required: ['routine', 'diet', 'insights'],
        },
      },
    });

    const jsonStr = response.text || '{}';
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Error in generatePlan:', error);
    throw error;
  }
}

export async function generateAlternativeMeal(oldMeal: Meal, profile: any): Promise<Meal> {
  const prompt = `
    Eres un nutricionista experto. El usuario quiere cambiar la siguiente comida de su dieta:
    - Nombre: ${oldMeal.name}
    - Descripción: ${oldMeal.description}
    - Calorías: ${oldMeal.calories}
    - Macros: Proteína ${oldMeal.protein}g, Carbos ${oldMeal.carbs}g, Grasa ${oldMeal.fat}g

    Genera una comida alternativa que tenga aproximadamente las mismas calorías y macros, y que sea adecuada para su objetivo (${profile.goal}).
    Devuelve un JSON con la siguiente estructura:
    {
      "id": "${oldMeal.id}",
      "name": "${oldMeal.name}",
      "time": "${oldMeal.time}",
      "calories": ${oldMeal.calories},
      "protein": ${oldMeal.protein},
      "carbs": ${oldMeal.carbs},
      "fat": ${oldMeal.fat},
      "description": "Nueva descripción de la comida"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            name: { type: Type.STRING },
            time: { type: Type.STRING },
            calories: { type: Type.INTEGER },
            protein: { type: Type.INTEGER },
            carbs: { type: Type.INTEGER },
            fat: { type: Type.INTEGER },
            description: { type: Type.STRING },
          },
          required: ['id', 'name', 'time', 'calories', 'protein', 'carbs', 'fat', 'description'],
        },
      },
    });

    const jsonStr = response.text || '{}';
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Error in generateAlternativeMeal:', error);
    throw error;
  }
}
