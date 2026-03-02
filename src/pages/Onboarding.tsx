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
];

export default function Onboarding() {
  const { setProfile, setRoutine, setDiet, setInsights, completeOnboarding, authToken } = useAppStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    age: 25,
    gender: 'Masculino',
    weight: 70,
    height: 175,
    currentState: 'Principiante',
    goal: 'Ganar masa muscular',
    schedule: '3 días a la semana, 1 hora',
    workHours: '09:00 - 17:00',
    mealTimes: {
      breakfast: '08:00',
      lunch: '14:00',
      snack: '18:00',
      dinner: '21:00'
    }
  });

  const handleNext = async () => {
    if (currentStep === 0 && !formData.name.trim()) {
      alert('Por favor, introduce tu nombre.');
      return;
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setLoading(true);
      try {
        const plan = await generatePlan(formData);
        
        const profileData = {
          ...formData,
          avatarConfig: {
            muscleMass: formData.goal.includes('masa') ? 0.6 : 0.4,
            bodyFat: formData.goal.includes('perder') ? 0.3 : 0.5,
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
              age: formData.age,
              weight: formData.weight,
              height: formData.height,
              gender: formData.gender,
              goal: formData.goal,
              currentState: formData.currentState,
              schedule: formData.schedule,
              workHours: formData.workHours,
              mealTimes: formData.mealTimes,
              avatarConfig: profileData.avatarConfig,
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
        alert('Hubo un error al generar tu plan. Inténtalo de nuevo.');
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
                className="w-full bg-[#121212] border border-[#262626] rounded-xl p-4 text-white focus:border-[#39ff14] focus:ring-1 focus:ring-[#39ff14] outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Edad</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                className="w-full bg-[#121212] border border-[#262626] rounded-xl p-4 text-white focus:border-[#39ff14] focus:ring-1 focus:ring-[#39ff14] outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Género</label>
              <div className="grid grid-cols-2 gap-4">
                {['Masculino', 'Femenino'].map((g) => (
                  <button
                    key={g}
                    onClick={() => setFormData({ ...formData, gender: g })}
                    className={`p-4 rounded-xl border transition-all ${
                      formData.gender === g
                        ? 'border-[#39ff14] bg-[#39ff14]/10 text-[#39ff14]'
                        : 'border-[#262626] bg-[#121212] text-gray-400'
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
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                className="w-full bg-[#121212] border border-[#262626] rounded-xl p-4 text-white focus:border-[#39ff14] focus:ring-1 focus:ring-[#39ff14] outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Altura (cm)</label>
              <input
                type="number"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })}
                className="w-full bg-[#121212] border border-[#262626] rounded-xl p-4 text-white focus:border-[#39ff14] focus:ring-1 focus:ring-[#39ff14] outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Estado Físico Actual</label>
              <select
                value={formData.currentState}
                onChange={(e) => setFormData({ ...formData, currentState: e.target.value })}
                className="w-full bg-[#121212] border border-[#262626] rounded-xl p-4 text-white focus:border-[#39ff14] focus:ring-1 focus:ring-[#39ff14] outline-none transition-all appearance-none"
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
          <div className="space-y-4">
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
                className={`w-full p-4 rounded-xl border text-left transition-all ${
                  formData.goal === goal
                    ? 'border-[#39ff14] bg-[#39ff14]/10 text-[#39ff14]'
                    : 'border-[#262626] bg-[#121212] text-gray-400'
                }`}
              >
                {goal}
              </button>
            ))}
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">¿Cuánto tiempo puedes entrenar?</label>
              <select
                value={formData.schedule}
                onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                className="w-full bg-[#121212] border border-[#262626] rounded-xl p-4 text-white focus:border-[#39ff14] focus:ring-1 focus:ring-[#39ff14] outline-none transition-all appearance-none"
              >
                <option>3 días a la semana, 45 min</option>
                <option>4 días a la semana, 1 hora</option>
                <option>5 días a la semana, 1 hora</option>
                <option>6 días a la semana, 1.5 horas</option>
              </select>
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
                className="w-full bg-[#121212] border border-[#262626] rounded-xl p-4 text-white focus:border-[#39ff14] focus:ring-1 focus:ring-[#39ff14] outline-none transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Desayuno</label>
                <input
                  type="time"
                  value={formData.mealTimes.breakfast}
                  onChange={(e) => setFormData({ ...formData, mealTimes: { ...formData.mealTimes, breakfast: e.target.value } })}
                  className="w-full bg-[#121212] border border-[#262626] rounded-xl p-3 text-white focus:border-[#39ff14] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Comida</label>
                <input
                  type="time"
                  value={formData.mealTimes.lunch}
                  onChange={(e) => setFormData({ ...formData, mealTimes: { ...formData.mealTimes, lunch: e.target.value } })}
                  className="w-full bg-[#121212] border border-[#262626] rounded-xl p-3 text-white focus:border-[#39ff14] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Merienda</label>
                <input
                  type="time"
                  value={formData.mealTimes.snack}
                  onChange={(e) => setFormData({ ...formData, mealTimes: { ...formData.mealTimes, snack: e.target.value } })}
                  className="w-full bg-[#121212] border border-[#262626] rounded-xl p-3 text-white focus:border-[#39ff14] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Cena</label>
                <input
                  type="time"
                  value={formData.mealTimes.dinner}
                  onChange={(e) => setFormData({ ...formData, mealTimes: { ...formData.mealTimes, dinner: e.target.value } })}
                  className="w-full bg-[#121212] border border-[#262626] rounded-xl p-3 text-white focus:border-[#39ff14] outline-none"
                />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] p-6 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="mb-8"
        >
          <Zap size={64} className="text-[#39ff14] drop-shadow-[0_0_15px_rgba(57,255,20,0.8)]" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-4 glow-text text-[#39ff14]">Generando tu plan...</h2>
        <p className="text-gray-400 max-w-xs">
          La IA de VoltBody está creando una rutina y dieta personalizadas basadas en tus datos.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col p-6">
      <div className="flex items-center justify-between mb-8 mt-4">
        <button
          onClick={handleBack}
          className={`p-2 rounded-full bg-[#121212] border border-[#262626] ${currentStep === 0 ? 'opacity-0 pointer-events-none' : ''}`}
        >
          <ChevronLeft size={24} className="text-white" />
        </button>
        <div className="flex gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === currentStep ? 'w-8 bg-[#39ff14] glow-box' : 'w-2 bg-[#262626]'
              }`}
            />
          ))}
        </div>
        <div className="w-10" /> {/* Spacer */}
      </div>

      <div className="flex-1">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="h-full flex flex-col"
        >
          <h1 className="text-3xl font-bold mb-2">{steps[currentStep].title}</h1>
          <p className="text-gray-400 mb-8">Personaliza tu experiencia en VoltBody.</p>
          
          {renderStepContent()}
        </motion.div>
      </div>

      <button
        onClick={handleNext}
        className="w-full bg-[#39ff14] text-black font-bold py-4 rounded-xl mt-8 flex items-center justify-center gap-2 hover:bg-[#32e612] transition-colors glow-box"
      >
        {currentStep === steps.length - 1 ? 'Generar Plan' : 'Siguiente'}
        {currentStep < steps.length - 1 && <ChevronRight size={20} />}
      </button>
    </div>
  );
}
