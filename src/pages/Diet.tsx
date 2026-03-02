import { useState } from 'react';
import { motion } from 'motion/react';
import { useAppStore, Meal } from '../store/useAppStore';
import { Utensils, Flame, Droplet, Beef, Wheat, RefreshCw, Sparkles } from 'lucide-react';
import { generateAlternativeMeal } from '../services/geminiService';
import { authService } from '../services/authService';
import { AppCard, SectionHeader, StatPill } from '../components/ui';
import { listStagger } from '../lib/motion';

export default function Diet() {
  const { diet, profile, swapMeal, showToast, authToken } = useAppStore();
  const [loadingMealId, setLoadingMealId] = useState<string | null>(null);
  const [specialDishTarget, setSpecialDishTarget] = useState(390);

  if (!diet) return null;

  const handleSwap = async (meal: Meal) => {
    if (!profile) return;
    setLoadingMealId(meal.id);
    try {
      const newMeal = await generateAlternativeMeal(meal, profile);
      const updatedDiet = {
        ...diet,
        meals: diet.meals.map((item) => (item.id === meal.id ? newMeal : item)),
      };

      swapMeal(meal.id, newMeal);

      if (authToken) {
        try {
          await authService.updateProfile(authToken, { diet: updatedDiet });
        } catch (persistError) {
          console.error('Error persisting swapped meal:', persistError);
          showToast({
            type: 'info',
            title: 'Cambio local guardado',
            message: 'No se pudo sincronizar con el servidor en este momento.',
          });
        }
      }

      showToast({
        type: 'success',
        title: 'Comida actualizada 🔄',
        message: `${meal.name} fue reemplazada por una alternativa equivalente.`,
      });
    } catch (error) {
      console.error('Error swapping meal:', error);
      showToast({
        type: 'error',
        title: 'No se pudo cambiar la comida',
        message: 'Prueba nuevamente en un momento.',
      });
    } finally {
      setLoadingMealId(null);
    }
  };

  const baseSpecialDish = {
    arroz: { calories: 130, grams: 100 },
    lentejas: { calories: 116, grams: 100 },
    tomate: { calories: 18, grams: 100 },
    'queso feta': { calories: 265, grams: 100 },
  };

  const baseCalories =
    baseSpecialDish.arroz.calories +
    baseSpecialDish.lentejas.calories +
    baseSpecialDish.tomate.calories +
    baseSpecialDish['queso feta'].calories;
  const scale = specialDishTarget / baseCalories;
  const avgMealCalories = Math.round(diet.dailyCalories / Math.max(1, diet.meals.length));

  return (
    <div className="min-h-screen app-shell p-6 pb-32">
      <header className="mb-8 mt-4">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Utensils className="app-accent" size={32} />
          Tu Dieta
        </h1>
        <p className="text-gray-400 font-mono text-sm">Objetivo: {diet.dailyCalories} kcal</p>
      </header>

      <AppCard accent interactive className="mb-8 p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Resumen Nutricional</p>
            <h2 className="text-2xl font-extrabold text-white leading-tight">Hoy comes para rendir</h2>
            <p className="text-sm text-gray-300 mt-2">
              {diet.meals.length} comidas planificadas con foco en energía estable y recuperación.
            </p>
          </div>
          <Sparkles className="app-accent shrink-0" />
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatPill label="kcal" value={`${diet.dailyCalories}`} />
          <StatPill label="comidas" value={`${diet.meals.length}`} />
          <StatPill label="promedio" value={`${avgMealCalories}`} />
        </div>

        <div className="rounded-xl border border-[var(--app-border)] bg-black/30 p-3 text-xs text-gray-300">
          Tip: si entrenas intenso hoy, prioriza proteína + carbohidrato en la comida post-entreno.
        </div>
      </AppCard>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <AppCard className="p-4 flex flex-col items-center justify-center text-center">
          <Beef className="text-[#ff3939] mb-2" size={24} />
          <span className="text-xl font-bold text-white">{diet.macros.protein}g</span>
          <span className="text-xs text-gray-500 font-mono">Proteína</span>
        </AppCard>
        <AppCard className="p-4 flex flex-col items-center justify-center text-center">
          <Wheat className="text-[#ffb839] mb-2" size={24} />
          <span className="text-xl font-bold text-white">{diet.macros.carbs}g</span>
          <span className="text-xs text-gray-500 font-mono">Carbos</span>
        </AppCard>
        <AppCard className="p-4 flex flex-col items-center justify-center text-center">
          <Droplet className="text-[#39a6ff] mb-2" size={24} />
          <span className="text-xl font-bold text-white">{diet.macros.fat}g</span>
          <span className="text-xs text-gray-500 font-mono">Grasas</span>
        </AppCard>
      </div>

      <div className="space-y-4">
        {diet.meals.map((meal, index) => (
          <motion.div
            key={meal.id}
            {...listStagger(index)}
            className="app-surface border border-[var(--app-border)] rounded-3xl p-5 relative overflow-hidden group hover:border-[color:var(--app-accent)]/50 transition-colors"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[color:var(--app-accent)]/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[color:var(--app-accent)]/10 transition-colors" />
            
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  {meal.name}
                  <span className="text-xs font-mono bg-[#262626] text-gray-300 px-2 py-1 rounded-full">
                    {meal.time}
                  </span>
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleSwap(meal)}
                  disabled={loadingMealId === meal.id}
                  className="p-2 bg-[var(--app-border)] rounded-full text-gray-400 hover:text-[var(--app-accent)] transition-colors disabled:opacity-50"
                  title="Cambiar comida"
                >
                  <RefreshCw size={16} className={loadingMealId === meal.id ? 'animate-spin' : ''} />
                </button>
                <div className="flex items-center gap-1 app-accent font-mono font-bold glow-text">
                  <Flame size={16} />
                  {meal.calories}
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-400 mb-4 relative z-10">{meal.description}</p>

            <div className="flex gap-4 text-xs font-mono text-gray-500 relative z-10">
              <span>P: {meal.protein}g</span>
              <span>C: {meal.carbs}g</span>
              <span>G: {meal.fat}g</span>
            </div>
          </motion.div>
        ))}
      </div>

      {profile?.foodPreferences && (
        <AppCard className="mt-8">
          <SectionHeader title="Preferencias para tu dieta" />
          <div className="space-y-2 text-sm text-gray-300">
            <p><span className="text-gray-500">Verduras:</span> {profile.foodPreferences.vegetables.join(', ') || 'No definidas'}</p>
            <p><span className="text-gray-500">Carbohidratos:</span> {profile.foodPreferences.carbs.join(', ') || 'No definidos'}</p>
            <p><span className="text-gray-500">Proteínas:</span> {profile.foodPreferences.proteins.join(', ') || 'No definidas'}</p>
          </div>
        </AppCard>
      )}

      <AppCard className="mt-6" accent>
        <SectionHeader title="Plato Especial Ajustable" />
        <p className="text-sm text-gray-400 mb-4">Base: arroz + lentejas + tomate + queso feta</p>

        <label className="block text-sm text-gray-400 mb-2">Calorías objetivo</label>
        <input
          type="number"
          min={200}
          max={900}
          value={specialDishTarget}
          onChange={(e) => setSpecialDishTarget(Number(e.target.value) || 390)}
          className="w-full bg-black border border-[var(--app-border)] rounded-xl p-3 text-white mb-4 outline-none focus:border-[var(--app-accent)]"
        />

        <div className="space-y-2 text-sm text-gray-300">
          <p>Arroz: {(baseSpecialDish.arroz.grams * scale).toFixed(0)} g</p>
          <p>Lentejas: {(baseSpecialDish.lentejas.grams * scale).toFixed(0)} g</p>
          <p>Tomate: {(baseSpecialDish.tomate.grams * scale).toFixed(0)} g</p>
          <p>Queso feta: {(baseSpecialDish['queso feta'].grams * scale).toFixed(0)} g</p>
        </div>
      </AppCard>
    </div>
  );
}
