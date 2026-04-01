import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store/useAppStore';
import { ChevronRight, ChevronLeft, Loader2, Zap } from 'lucide-react';
import { generatePlan } from '../services/geminiService';
import { authService } from '../services/authService';

const steps = [
  { id: 'basics', title: 'Tus Datos' },
  { id: 'body', title: 'Tu Cuerpo' },
  { id: 'goal', title: 'Tu Objetivo' },
  { id: 'training', title: 'Tu Entrenamiento' },
  { id: 'schedule', title: 'Tu Rutina Diaria' },
  { id: 'preferences', title: 'Tus Preferencias' },
];

export default function Onboarding() {
  const { setProfile, setRoutine, setDiet, setInsights, completeOnboarding, authToken, showToast } = useAppStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    age: 25,
    gender: 'Masculino',
    weight: 70,
    height: 175,
    currentState: 'Principiante (Nunca he entrenado)',
    goal: 'Ganar masa muscular (Volumen)',
    schedule: '3 días a la semana, 45 min',
    trainingDaysPerWeek: 3,
    sessionMinutes: 45,
    goalDirection: 'Perder' as 'Perder' | 'Ganar',
    goalTargetKg: 5,
    goalTimelineMonths: 3,
    workHours: '09:00 - 17:00',
    mealTimes: {
      breakfast: '08:00',
      brunch: '11:30',
      lunch: '14:00',
      snack: '18:00',
      dinner: '21:00'
    },
    foodPreferences: {
      vegetables: 'brócoli, espinaca, zanahoria',
      carbs: 'arroz, papa, avena',
      proteins: 'pollo, huevo, atún'
    },
    weeklySpecialSession: {
      enabled: true,
      activity: 'Zumba',
      day: 'Sábado',
      durationMinutes: 60,
    },
    specialDish: {
      ingredients: 'arroz, lentejas, tomate, queso feta',
      targetCalories: 390,
    },
  });

  const handleNext = async () => {
    if (currentStep === 0 && !formData.name.trim()) {
      showToast({
        type: 'info',
        title: 'Falta tu nombre',
        message: 'Introduce tu nombre para continuar.',
      });
      return;
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setLoading(true);
      try {
        const sanitizedData = {
          ...formData,
          age: Number(formData.age) || 25,
          weight: Number(formData.weight) || 70,
          height: Number(formData.height) || 175,
          trainingDaysPerWeek: Number(formData.trainingDaysPerWeek) || 3,
          sessionMinutes: Number(formData.sessionMinutes) || 45,
          goalTargetKg: Number(formData.goalTargetKg) || 5,
          goalTimelineMonths: Number(formData.goalTimelineMonths) || 3,
          schedule: `${formData.trainingDaysPerWeek} días a la semana, ${formData.sessionMinutes} min`,
          foodPreferences: {
            vegetables: formData.foodPreferences.vegetables.split(',').map((value) => value.trim()).filter(Boolean),
            carbs: formData.foodPreferences.carbs.split(',').map((value) => value.trim()).filter(Boolean),
            proteins: formData.foodPreferences.proteins.split(',').map((value) => value.trim()).filter(Boolean),
          },
        };

        const plan = await generatePlan(sanitizedData);
        
        const profileData = {
          ...sanitizedData,
          avatarConfig: {
            muscleMass: sanitizedData.goal.includes('masa') ? 0.6 : 0.4,
            bodyFat: sanitizedData.goal.includes('perder') ? 0.3 : 0.5,
          }
        };

        // Save to local store
        setProfile(profileData);
        setRoutine(plan.routine);
        setDiet(plan.diet);
        if (plan.insights) {
          setInsights(plan.insights);
        }

        // Save to backend
        if (authToken) {
          try {
            await authService.updateProfile(authToken, {
              age: sanitizedData.age,
              weight: sanitizedData.weight,
              height: sanitizedData.height,
              gender: sanitizedData.gender,
              goal: sanitizedData.goal,
              currentState: sanitizedData.currentState,
              schedule: sanitizedData.schedule,
              workHours: sanitizedData.workHours,
              mealTimes: sanitizedData.mealTimes,
              avatarConfig: profileData.avatarConfig,
              goalDirection: sanitizedData.goalDirection,
              goalTargetKg: sanitizedData.goalTargetKg,
              goalTimelineMonths: sanitizedData.goalTimelineMonths,
              trainingDaysPerWeek: sanitizedData.trainingDaysPerWeek,
              sessionMinutes: sanitizedData.sessionMinutes,
              weeklySpecialSession: sanitizedData.weeklySpecialSession,
              foodPreferences: sanitizedData.foodPreferences,
              specialDish: sanitizedData.specialDish,
              routine: plan.routine,
              diet: plan.diet,
              insights: plan.insights
            });
          } catch (error) {
            console.error('Error saving profile to backend:', error);
            // Continue anyway, data is saved locally
          }
        }

        completeOnboarding();
      } catch (error) {
        console.error('Error generating plan:', error);
        showToast({
          type: 'error',
          title: 'No se pudo generar tu plan',
          message: 'Inténtalo de nuevo en unos segundos.',
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">¿Cómo te llamas?</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Tu nombre"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Edad</label>
              <input
                type="number"
                value={formData.age || ''}
                onChange={(e) => setFormData({ ...formData, age: e.target.value === '' ? 0 : Number(e.target.value) })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Género</label>
              <div className="grid grid-cols-2 gap-4">
                {['Masculino', 'Femenino'].map((g) => (
                  <button
                    key={g}
                    onClick={() => setFormData({ ...formData, gender: g })}
                    className={`tap-target p-4 rounded-xl border transition-all ${
                      formData.gender === g
                        ? 'border-[var(--app-accent)] bg-[color:var(--app-accent)]/10 text-[var(--app-accent)]'
                        : 'border-[var(--app-border)] app-surface text-gray-400'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Peso (kg)</label>
              <input
                type="number"
                value={formData.weight || ''}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value === '' ? 0 : Number(e.target.value) })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Altura (cm)</label>
              <input
                type="number"
                value={formData.height || ''}
                onChange={(e) => setFormData({ ...formData, height: e.target.value === '' ? 0 : Number(e.target.value) })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Estado Físico Actual</label>
              <select
                value={formData.currentState}
                onChange={(e) => setFormData({ ...formData, currentState: e.target.value })}
                className="input-field appearance-none"
              >
                <option>Principiante (Nunca he entrenado)</option>
                <option>Intermedio (Entreno a veces)</option>
                <option>Avanzado (Entreno regularmente)</option>
              </select>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <label className="block text-sm text-gray-400 mb-2">¿Cómo te quieres ver?</label>
            {[
              'Ganar masa muscular (Volumen)',
              'Perder grasa (Definición)',
              'Mantenimiento y salud',
              'Fuerza bruta',
            ].map((goal) => (
              <button
                key={goal}
                onClick={() => setFormData({ ...formData, goal })}
                className={`tap-target w-full p-4 rounded-xl border text-left transition-all ${
                  formData.goal === goal
                    ? 'border-[var(--app-accent)] bg-[color:var(--app-accent)]/10 text-[var(--app-accent)]'
                    : 'border-[var(--app-border)] app-surface text-gray-400'
                }`}
              >
                {goal}
              </button>
            ))}

            <div className="grid grid-cols-2 gap-4">
              {(['Perder', 'Ganar'] as const).map((direction) => (
                <button
                  key={direction}
                  onClick={() => setFormData({ ...formData, goalDirection: direction })}
                  className={`tap-target p-4 rounded-xl border transition-all ${
                    formData.goalDirection === direction
                      ? 'border-[var(--app-accent)] bg-[color:var(--app-accent)]/10 text-[var(--app-accent)]'
                      : 'border-[var(--app-border)] app-surface text-gray-400'
                  }`}
                >
                  {direction} peso
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Cantidad (kg)</label>
                <input
                  type="number"
                  min={1}
                  value={formData.goalTargetKg || ''}
                  onChange={(e) => setFormData({ ...formData, goalTargetKg: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Tiempo (meses)</label>
                <input
                  type="number"
                  min={1}
                  value={formData.goalTimelineMonths || ''}
                  onChange={(e) => setFormData({ ...formData, goalTimelineMonths: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="input-field"
                />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Días de entrenamiento por semana</label>
              <input
                type="number"
                min={1}
                max={7}
                value={formData.trainingDaysPerWeek}
                onChange={(e) => setFormData({ ...formData, trainingDaysPerWeek: Number(e.target.value) })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Tiempo por sesión (minutos)</label>
              <input
                type="number"
                min={20}
                max={180}
                value={formData.sessionMinutes}
                onChange={(e) => setFormData({ ...formData, sessionMinutes: Number(e.target.value) })}
                className="input-field"
              />
            </div>
            <div className="p-4 rounded-xl border border-[color:var(--app-accent)]/30 bg-[color:var(--app-accent)]/5 text-sm text-[var(--app-accent)]">
              Tu disponibilidad quedará como: {formData.trainingDaysPerWeek} días/semana y {formData.sessionMinutes} min por sesión.
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">¿Cuál es tu horario de trabajo/estudio?</label>
              <input
                type="text"
                value={formData.workHours}
                onChange={(e) => setFormData({ ...formData, workHours: e.target.value })}
                placeholder="Ej. 09:00 - 17:00"
                className="input-field"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Desayuno</label>
                <input
                  type="time"
                  value={formData.mealTimes.breakfast}
                  onChange={(e) => setFormData({ ...formData, mealTimes: { ...formData.mealTimes, breakfast: e.target.value } })}
                  className="input-field p-3"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Almuerzo</label>
                <input
                  type="time"
                  value={formData.mealTimes.brunch}
                  onChange={(e) => setFormData({ ...formData, mealTimes: { ...formData.mealTimes, brunch: e.target.value } })}
                  className="input-field p-3"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Comida</label>
                <input
                  type="time"
                  value={formData.mealTimes.lunch}
                  onChange={(e) => setFormData({ ...formData, mealTimes: { ...formData.mealTimes, lunch: e.target.value } })}
                  className="input-field p-3"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Merienda</label>
                <input
                  type="time"
                  value={formData.mealTimes.snack}
                  onChange={(e) => setFormData({ ...formData, mealTimes: { ...formData.mealTimes, snack: e.target.value } })}
                  className="input-field p-3"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Cena</label>
                <input
                  type="time"
                  value={formData.mealTimes.dinner}
                  onChange={(e) => setFormData({ ...formData, mealTimes: { ...formData.mealTimes, dinner: e.target.value } })}
                  className="input-field p-3"
                />
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Verduras y vegetales que comes</label>
              <input
                type="text"
                value={formData.foodPreferences.vegetables}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    foodPreferences: { ...formData.foodPreferences, vegetables: e.target.value },
                  })
                }
                placeholder="Ej: brócoli, espinaca, tomate"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Carbohidratos que sueles consumir</label>
              <input
                type="text"
                value={formData.foodPreferences.carbs}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    foodPreferences: { ...formData.foodPreferences, carbs: e.target.value },
                  })
                }
                placeholder="Ej: arroz, papa, avena"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Proteínas preferidas</label>
              <input
                type="text"
                value={formData.foodPreferences.proteins}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    foodPreferences: { ...formData.foodPreferences, proteins: e.target.value },
                  })
                }
                placeholder="Ej: pollo, huevo, atún"
                className="input-field"
              />
            </div>

            <div className="panel-soft p-4 space-y-4">
              <label className="flex items-center justify-between text-sm text-gray-300">
                Activar clase especial semanal
                <input
                  type="checkbox"
                  checked={formData.weeklySpecialSession.enabled}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      weeklySpecialSession: {
                        ...formData.weeklySpecialSession,
                        enabled: e.target.checked,
                      },
                    })
                  }
                />
              </label>

              {formData.weeklySpecialSession.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={formData.weeklySpecialSession.activity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        weeklySpecialSession: {
                          ...formData.weeklySpecialSession,
                          activity: e.target.value,
                        },
                      })
                    }
                    placeholder="Actividad (zumba, trote...)"
                    className="input-field p-3"
                  />
                  <input
                    type="text"
                    value={formData.weeklySpecialSession.day}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        weeklySpecialSession: {
                          ...formData.weeklySpecialSession,
                          day: e.target.value,
                        },
                      })
                    }
                    placeholder="Día"
                    className="input-field p-3"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Plato especial (ingredientes)</label>
              <input
                type="text"
                value={formData.specialDish.ingredients}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    specialDish: { ...formData.specialDish, ingredients: e.target.value },
                  })
                }
                placeholder="Ej: arroz, lentejas, tomate, queso feta"
                className="input-field"
              />
              <label className="block text-sm text-gray-400 mt-3 mb-2">Calorías objetivo del plato</label>
              <input
                type="number"
                min={100}
                value={formData.specialDish.targetCalories}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    specialDish: { ...formData.specialDish, targetCalories: Number(e.target.value) },
                  })
                }
                className="input-field"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen app-shell flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        <div className="absolute -top-24 -left-12 w-60 h-60 rounded-full bg-[color:var(--app-accent)]/15 blur-3xl pointer-events-none" />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="mb-8 w-20 h-20 rounded-3xl border border-[color:var(--app-accent)]/35 bg-[color:var(--app-accent)]/10 flex items-center justify-center glow-box"
        >
          <Zap size={40} className="app-accent drop-shadow-[0_0_15px_var(--app-accent-dim)]" />
        </motion.div>
        <h2 className="brutal-title mb-4 glow-text app-accent">Generando tu plan...</h2>
        <p className="text-gray-400 max-w-xs">
          La IA de VoltBody está creando una rutina y dieta personalizadas basadas en tus datos.
        </p>
      </div>
    );
  }

  return (
    <div className="onboard-theme min-h-screen app-shell flex flex-col px-4 py-5 md:px-6 relative overflow-hidden">
      <div className="absolute -right-20 top-20 w-64 h-64 rounded-full bg-[color:var(--app-accent)]/10 blur-3xl pointer-events-none" />
      <div className="page-wrap w-full">
      <div className="flex items-center justify-between mb-8 mt-1">
        <button
          onClick={handleBack}
          className={`pressable p-2 rounded-full app-surface border border-[var(--app-border)] ${currentStep === 0 ? 'opacity-0 pointer-events-none' : ''}`}
        >
          <ChevronLeft size={24} className="text-white" />
        </button>
        <div className="flex gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === currentStep ? 'w-8 bg-[var(--app-accent)] glow-box' : 'w-2 bg-[var(--app-border)]'
              }`}
            />
          ))}
        </div>
        <div className="w-10" /> {/* Spacer */}
      </div>

      <div className="flex-1 glass-panel border border-[var(--app-border)] rounded-3xl p-5 md:p-6">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="h-full flex flex-col"
        >
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500 mb-2">Setup AI-First</p>
          <h1 className="brutal-title mb-2 headline-gradient">{steps[currentStep].title}</h1>
          <p className="text-gray-400 mb-8">Configura tu plan con precisión para resultados reales.</p>
          
          {renderStepContent()}
        </motion.div>
      </div>

      <button
        onClick={handleNext}
        className="tap-target pulse-surface pressable primary-btn w-full font-bold py-4 rounded-xl mt-8 flex items-center justify-center gap-2 transition-colors"
      >
        {currentStep === steps.length - 1 ? 'Generar Plan' : 'Siguiente'}
        {currentStep < steps.length - 1 && <ChevronRight size={20} />}
      </button>
      </div>
    </div>
  );
}


