import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store/useAppStore';
import {
  ChevronRight,
  ChevronLeft,
  Zap,
  User,
  Scale,
  Ruler,
  Target,
  Calendar,
  Clock,
  Check,
  Dumbbell,
  Flame,
  HeartPulse,
  Utensils,
  Sparkles,
  Coffee,
  Sun,
  Apple,
  Moon
} from 'lucide-react';
import { generatePlan } from '../services/geminiService';
import { authService } from '../services/authService';

const steps = [
  { id: 'basics', title: 'Tus Datos', subtitle: 'Información básica para personalizar tu perfil' },
  { id: 'body', title: 'Tu Cuerpo', subtitle: 'Medidas corporales y experiencia actual' },
  { id: 'goal', title: 'Tu Objetivo', subtitle: 'Define tu meta física y horizonte temporal' },
  { id: 'training', title: 'Entrenamiento', subtitle: 'Frecuencia y duración de tus sesiones' },
  { id: 'schedule', title: 'Horarios', subtitle: 'Organización de tus comidas y jornadas' },
  { id: 'preferences', title: 'Nutrición', subtitle: 'Alimentos favoritos y platos especiales' },
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

        const plan = await generatePlan(sanitizedData, authToken);
        
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
          }
        }

        completeOnboarding();
      } catch (error) {
        console.error('Error generating plan:', error);
        const message = error instanceof Error ? error.message : 'Inténtalo de nuevo en unos segundos.';
        showToast({
          type: 'error',
          title: 'No se pudo generar tu plan',
          message,
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
          <div className="space-y-5">
            <div>
              <label htmlFor="user-name" className="block text-xs font-semibold text-gray-300 mb-1.5 ml-1">
                ¿Cómo te llamas?
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-gray-400 pointer-events-none">
                  <User size={18} />
                </div>
                <input
                  id="user-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Tu nombre o apodo"
                  className="input-field min-h-[50px] pl-11 pr-4 rounded-2xl bg-black/40 border-white/10 text-base"
                />
              </div>
            </div>

            <div>
              <label htmlFor="user-age" className="block text-xs font-semibold text-gray-300 mb-1.5 ml-1">
                Edad (años)
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-gray-400 pointer-events-none">
                  <Clock size={18} />
                </div>
                <input
                  id="user-age"
                  type="number"
                  min={12}
                  max={100}
                  value={formData.age || ''}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="input-field min-h-[50px] pl-11 pr-4 rounded-2xl bg-black/40 border-white/10 text-base font-mono"
                  placeholder="25"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2 ml-1">
                Género biológico
              </label>
              <div className="grid grid-cols-2 gap-3">
                {['Masculino', 'Femenino'].map((g) => {
                  const isSelected = formData.gender === g;
                  return (
                    <motion.button
                      key={g}
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setFormData({ ...formData, gender: g })}
                      className={`tap-target min-h-[52px] p-4 rounded-2xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 relative ${
                        isSelected
                          ? 'border-[var(--app-accent)] bg-[color:var(--app-accent)]/12 text-white shadow-[0_0_16px_var(--app-accent-dim)]'
                          : 'border-white/10 bg-white/[0.03] text-gray-300 hover:border-white/20'
                      }`}
                    >
                      {g === 'Masculino' ? '♂️ Masculino' : '♀️ Femenino'}
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-[var(--app-accent)]" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="user-weight" className="block text-xs font-semibold text-gray-300 mb-1.5 ml-1">
                  Peso (kg)
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-gray-400 pointer-events-none">
                    <Scale size={18} />
                  </div>
                  <input
                    id="user-weight"
                    type="number"
                    min={30}
                    max={300}
                    value={formData.weight || ''}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="input-field min-h-[50px] pl-11 pr-4 rounded-2xl bg-black/40 border-white/10 text-base font-mono"
                    placeholder="70"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="user-height" className="block text-xs font-semibold text-gray-300 mb-1.5 ml-1">
                  Altura (cm)
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-gray-400 pointer-events-none">
                    <Ruler size={18} />
                  </div>
                  <input
                    id="user-height"
                    type="number"
                    min={100}
                    max={250}
                    value={formData.height || ''}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="input-field min-h-[50px] pl-11 pr-4 rounded-2xl bg-black/40 border-white/10 text-base font-mono"
                    placeholder="175"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2 ml-1">
                Nivel de Experiencia
              </label>
              <div className="space-y-2.5">
                {[
                  { title: 'Principiante', desc: 'Nunca he entrenado o tengo poca experiencia', emoji: '🌱' },
                  { title: 'Intermedio', desc: 'Entreno a veces y conozco los ejercicios básicos', emoji: '⚡' },
                  { title: 'Avanzado', desc: 'Entreno regularmente con técnica depurada', emoji: '🔥' },
                ].map((item) => {
                  const fullVal = `${item.title} (${item.desc.split(' ')[0]}...)`;
                  const isSelected = formData.currentState.startsWith(item.title);
                  return (
                    <motion.button
                      key={item.title}
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setFormData({ ...formData, currentState: `${item.title} (${item.desc})` })}
                      className={`tap-target w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-[var(--app-accent)] bg-[color:var(--app-accent)]/12 text-white shadow-[0_0_16px_var(--app-accent-dim)]'
                          : 'border-white/10 bg-white/[0.03] text-gray-300 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{item.emoji}</span>
                        <div>
                          <p className="text-sm font-bold text-white">{item.title}</p>
                          <p className="text-xs text-gray-400">{item.desc}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[var(--app-accent)] flex items-center justify-center shrink-0">
                          <Check size={12} className="text-black stroke-[3]" />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2 ml-1">
                Meta Principal
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { title: 'Ganar masa muscular', sub: 'Hipertrofia y volumen', icon: Dumbbell },
                  { title: 'Perder grasa', sub: 'Definición y corte', icon: Flame },
                  { title: 'Mantenimiento y salud', sub: 'Vitalidad y longevidad', icon: HeartPulse },
                  { title: 'Fuerza bruta', sub: 'Potencia y cargas máximas', icon: Zap },
                ].map((item) => {
                  const fullGoal = `${item.title} (${item.sub.split(' ')[0]})`;
                  const isSelected = formData.goal.includes(item.title);
                  const Icon = item.icon;
                  return (
                    <motion.button
                      key={item.title}
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setFormData({ ...formData, goal: `${item.title} (${item.sub})` })}
                      className={`tap-target p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-[var(--app-accent)] bg-[color:var(--app-accent)]/12 text-white shadow-[0_0_16px_var(--app-accent-dim)]'
                          : 'border-white/10 bg-white/[0.03] text-gray-300 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isSelected ? 'bg-[var(--app-accent)] text-black' : 'bg-white/5 text-gray-400'}`}>
                          <Icon size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{item.title}</p>
                          <p className="text-[10px] text-gray-400">{item.sub}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-[var(--app-accent)] flex items-center justify-center shrink-0">
                          <Check size={10} className="text-black stroke-[3]" />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">Dirección del peso</span>
                <div className="flex p-1 bg-black/50 rounded-xl border border-white/10">
                  {(['Perder', 'Ganar'] as const).map((direction) => (
                    <button
                      key={direction}
                      type="button"
                      onClick={() => setFormData({ ...formData, goalDirection: direction })}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        formData.goalDirection === direction
                          ? 'bg-[var(--app-accent)] text-black'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {direction}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label htmlFor="goal-target" className="block text-[11px] text-gray-400 mb-1">
                    Cantidad a modificar
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="goal-target"
                      type="number"
                      min={1}
                      max={50}
                      value={formData.goalTargetKg || ''}
                      onChange={(e) => setFormData({ ...formData, goalTargetKg: e.target.value === '' ? 0 : Number(e.target.value) })}
                      className="input-field min-h-[44px] px-3 rounded-xl bg-black/50 border-white/10 text-sm font-mono"
                    />
                    <span className="absolute right-3 text-xs text-gray-500 font-mono">kg</span>
                  </div>
                </div>
                <div>
                  <label htmlFor="goal-timeline" className="block text-[11px] text-gray-400 mb-1">
                    Plazo estimado
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="goal-timeline"
                      type="number"
                      min={1}
                      max={24}
                      value={formData.goalTimelineMonths || ''}
                      onChange={(e) => setFormData({ ...formData, goalTimelineMonths: e.target.value === '' ? 0 : Number(e.target.value) })}
                      className="input-field min-h-[44px] px-3 rounded-xl bg-black/50 border-white/10 text-sm font-mono"
                    />
                    <span className="absolute right-3 text-xs text-gray-500 font-mono">meses</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-5">
            <div>
              <div className="flex justify-between items-center mb-1.5 ml-1">
                <label className="text-xs font-semibold text-gray-300">Días de entrenamiento / semana</label>
                <span className="text-sm font-bold text-[var(--app-accent)] font-mono">{formData.trainingDaysPerWeek} días</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[2, 3, 4, 5, 6].map((days) => (
                  <motion.button
                    key={days}
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setFormData({ ...formData, trainingDaysPerWeek: days })}
                    className={`tap-target min-h-[48px] rounded-2xl border font-bold text-sm transition-all ${
                      formData.trainingDaysPerWeek === days
                        ? 'border-[var(--app-accent)] bg-[color:var(--app-accent)]/15 text-[var(--app-accent)] shadow-[0_0_14px_var(--app-accent-dim)]'
                        : 'border-white/10 bg-white/[0.03] text-gray-400 hover:text-white'
                    }`}
                  >
                    {days}d
                  </motion.button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5 ml-1">
                <label className="text-xs font-semibold text-gray-300">Duración por sesión</label>
                <span className="text-sm font-bold text-[var(--app-accent)] font-mono">{formData.sessionMinutes} min</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[30, 45, 60, 90].map((mins) => (
                  <motion.button
                    key={mins}
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setFormData({ ...formData, sessionMinutes: mins })}
                    className={`tap-target min-h-[48px] rounded-2xl border font-bold text-xs transition-all ${
                      formData.sessionMinutes === mins
                        ? 'border-[var(--app-accent)] bg-[color:var(--app-accent)]/15 text-[var(--app-accent)] shadow-[0_0_14px_var(--app-accent-dim)]'
                        : 'border-white/10 bg-white/[0.03] text-gray-400 hover:text-white'
                    }`}
                  >
                    {mins}m
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[color:var(--app-accent)]/10 border border-[color:var(--app-accent)]/25 text-xs text-white flex items-center gap-3">
              <Sparkles size={20} className="app-accent shrink-0" />
              <p>
                Diseñaremos un microciclo de <span className="font-bold text-[var(--app-accent)]">{formData.trainingDaysPerWeek} días</span> con sesiones compactas de <span className="font-bold text-[var(--app-accent)]">{formData.sessionMinutes} minutos</span>.
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="work-hours" className="block text-xs font-semibold text-gray-300 mb-1.5 ml-1">
                Horario laboral / estudio
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-gray-400 pointer-events-none">
                  <Clock size={16} />
                </div>
                <input
                  id="work-hours"
                  type="text"
                  value={formData.workHours}
                  onChange={(e) => setFormData({ ...formData, workHours: e.target.value })}
                  placeholder="Ej. 09:00 - 18:00"
                  className="input-field min-h-[48px] pl-10 pr-4 rounded-2xl bg-black/40 border-white/10 text-sm"
                />
              </div>
            </div>

            <div className="glass-panel rounded-2xl border border-white/10 p-3.5 space-y-2.5">
              <p className="text-[11px] uppercase tracking-wider text-gray-400 font-mono font-semibold ml-1">
                Horarios de ingesta
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { key: 'breakfast', label: 'Desayuno', icon: Coffee },
                  { key: 'brunch', label: 'Media mañana', icon: Apple },
                  { key: 'lunch', label: 'Comida', icon: Sun },
                  { key: 'snack', label: 'Merienda', icon: Utensils },
                  { key: 'dinner', label: 'Cena', icon: Moon },
                ].map((meal) => {
                  const Icon = meal.icon;
                  return (
                    <div key={meal.key} className="flex items-center justify-between p-2.5 rounded-xl bg-black/30 border border-white/5">
                      <div className="flex items-center gap-2">
                        <Icon size={14} className="text-gray-400" />
                        <span className="text-xs text-gray-300 font-medium">{meal.label}</span>
                      </div>
                      <input
                        type="time"
                        value={formData.mealTimes[meal.key as keyof typeof formData.mealTimes]}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            mealTimes: { ...formData.mealTimes, [meal.key]: e.target.value },
                          })
                        }
                        className="bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono text-center focus:border-[var(--app-accent)] outline-none"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="pref-veg" className="block text-xs font-semibold text-gray-300 mb-1.5 ml-1">
                Verduras y vegetales preferidos
              </label>
              <input
                id="pref-veg"
                type="text"
                value={formData.foodPreferences.vegetables}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    foodPreferences: { ...formData.foodPreferences, vegetables: e.target.value },
                  })
                }
                placeholder="Ej: brócoli, espinaca, tomate"
                className="input-field min-h-[48px] px-3.5 rounded-2xl bg-black/40 border-white/10 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="pref-carbs" className="block text-xs font-semibold text-gray-300 mb-1.5 ml-1">
                  Carbohidratos
                </label>
                <input
                  id="pref-carbs"
                  type="text"
                  value={formData.foodPreferences.carbs}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      foodPreferences: { ...formData.foodPreferences, carbs: e.target.value },
                    })
                  }
                  placeholder="Arroz, papa, avena"
                  className="input-field min-h-[48px] px-3.5 rounded-2xl bg-black/40 border-white/10 text-sm"
                />
              </div>

              <div>
                <label htmlFor="pref-prot" className="block text-xs font-semibold text-gray-300 mb-1.5 ml-1">
                  Proteínas
                </label>
                <input
                  id="pref-prot"
                  type="text"
                  value={formData.foodPreferences.proteins}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      foodPreferences: { ...formData.foodPreferences, proteins: e.target.value },
                    })
                  }
                  placeholder="Pollo, huevo, atún"
                  className="input-field min-h-[48px] px-3.5 rounded-2xl bg-black/40 border-white/10 text-sm"
                />
              </div>
            </div>

            {/* Special class toggle iOS Style */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">Clase especial semanal</p>
                  <p className="text-[10px] text-gray-400">Pádel, fútbol, zumba, natación...</p>
                </div>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  aria-pressed={formData.weeklySpecialSession.enabled}
                  onClick={() =>
                    setFormData({
                      ...formData,
                      weeklySpecialSession: {
                        ...formData.weeklySpecialSession,
                        enabled: !formData.weeklySpecialSession.enabled,
                      },
                    })
                  }
                  className={`tap-target relative w-12 h-7 rounded-full p-0.5 transition-colors ${
                    formData.weeklySpecialSession.enabled ? 'bg-[var(--app-accent)]' : 'bg-gray-700'
                  }`}
                >
                  <motion.span
                    animate={{ x: formData.weeklySpecialSession.enabled ? 20 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="block w-6 h-6 rounded-full bg-white shadow-md"
                  />
                </motion.button>
              </div>

              {formData.weeklySpecialSession.enabled && (
                <div className="grid grid-cols-2 gap-2.5 pt-1">
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
                    placeholder="Actividad (ej. Pádel)"
                    className="input-field min-h-[44px] px-3 rounded-xl bg-black/50 border-white/10 text-xs"
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
                    placeholder="Día (ej. Sábado)"
                    className="input-field min-h-[44px] px-3 rounded-xl bg-black/50 border-white/10 text-xs"
                  />
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen app-shell flex flex-col items-center justify-center p-6 text-center relative overflow-hidden safe-top safe-bottom">
        <div className="absolute w-80 h-80 rounded-full bg-[color:var(--app-accent)]/15 blur-[120px] pointer-events-none" />
        <motion.div
          animate={{ scale: [1, 1.08, 1], rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="mb-6 w-24 h-24 rounded-[26px] bg-gradient-to-br from-white/15 to-white/5 border border-white/20 flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
        >
          <Zap size={44} className="app-accent drop-shadow-[0_0_16px_var(--app-accent-dim)]" strokeWidth={2.4} />
        </motion.div>
        <h2 className="text-2xl font-extrabold text-white mb-2">
          Creando tu <span className="headline-gradient">Plan Óptimo</span>
        </h2>
        <p className="text-gray-400 text-xs max-w-xs leading-relaxed">
          Nuestra IA está calculando tus macronutrientes y estructurando tu progresión biomecánica.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-shell flex flex-col px-4 py-5 sm:px-6 relative overflow-hidden safe-top safe-bottom">
      <div className="absolute -right-20 top-16 w-72 h-72 rounded-full bg-[color:var(--app-accent)]/10 blur-[100px] pointer-events-none" />

      <div className="page-wrap w-full max-w-lg mx-auto flex flex-col flex-1">
        {/* iOS Stepper Navigation Header */}
        <div className="flex items-center justify-between mb-5 mt-1">
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={handleBack}
            aria-label="Paso anterior"
            className={`tap-target w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center transition-all ${
              currentStep === 0 ? 'opacity-0 pointer-events-none' : 'hover:bg-white/10 text-white'
            }`}
          >
            <ChevronLeft size={20} />
          </motion.button>

          {/* Stepper Dots Pill */}
          <div className="flex gap-1.5 items-center px-3.5 py-2 rounded-full bg-black/40 border border-white/10 backdrop-blur-md">
            {steps.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ir al paso ${i + 1}`}
                onClick={() => { if (i < currentStep) setCurrentStep(i); }}
                disabled={i > currentStep}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? 'w-6 bg-[var(--app-accent)] shadow-[0_0_8px_var(--app-accent-dim)]'
                    : i < currentStep
                    ? 'w-2 bg-[var(--app-accent)]/40 cursor-pointer'
                    : 'w-2 bg-white/20'
                }`}
              />
            ))}
          </div>

          <div className="w-11 text-right">
            <span className="text-[11px] font-mono font-bold text-gray-400">
              {currentStep + 1}/{steps.length}
            </span>
          </div>
        </div>

        {/* Content Card */}
        <div className="flex-1 glass-panel border border-white/10 rounded-3xl p-5 sm:p-7 shadow-[0_16px_40px_rgba(0,0,0,0.5)] flex flex-col justify-between">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-5">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--app-accent)] font-semibold">
                Paso {currentStep + 1} de {steps.length}
              </span>
              <h1 className="text-2xl font-black text-white tracking-tight mt-0.5 mb-1">
                {steps[currentStep].title}
              </h1>
              <p className="text-xs text-gray-400">
                {steps[currentStep].subtitle}
              </p>
            </div>

            {renderStepContent()}
          </motion.div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={handleNext}
            className="tap-target pulse-surface pressable primary-btn w-full min-h-[52px] rounded-2xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 mt-6 shadow-lg"
          >
            <span>{currentStep === steps.length - 1 ? 'Generar Mi Plan con IA' : 'Continuar'}</span>
            <ChevronRight size={18} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
