import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore, Meal } from '../store/useAppStore';
import { Utensils, Flame, Droplet, Beef, Wheat, RefreshCw, Sparkles, CheckCircle2, Circle } from 'lucide-react';
import { generateAlternativeMeal } from '../services/geminiService';
import { authService } from '../services/authService';
import { AppCard, SectionHeader, StatPill } from '../components/ui';
import { listStagger, checkBounce, tapPulse } from '../lib/motion';
import { format } from 'date-fns';

export default function Diet() {
  const { diet, profile, swapMeal, showToast, authToken, mealEatenRecord, toggleMealEaten } = useAppStore();
  const [loadingMealId, setLoadingMealId] = useState<string | null>(null);
  const [specialDishTarget, setSpecialDishTarget] = useState(390);
  const [macroQuickMode, setMacroQuickMode] = useState(false);

  const todayDateKey = format(new Date(), 'yyyy-MM-dd');
  const eatenToday = mealEatenRecord[todayDateKey] ?? [];

  if (!diet) return (
    <div className="min-h-screen app-shell flex items-center justify-center px-6 safe-top safe-bottom">
      <div className="text-center max-w-xs">
        <p className="text-4xl mb-4">🥗</p>
        <h2 className="text-xl font-bold text-white mb-2">Sin plan nutricional</h2>
        <p className="text-gray-400 text-sm">Completa el onboarding para que la IA genere tu dieta personalizada.</p>
      </div>
    </div>
  );

  const handleSwap = async (meal: Meal) => {
    if (!profile) return;
    setLoadingMealId(meal.id);
    try {
      const newMeal = await generateAlternativeMeal(meal, profile, authToken);
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
  const totalMacros = Math.max(1, diet.macros.protein + diet.macros.carbs + diet.macros.fat);
  const macroBalance = Math.round((diet.macros.protein * 4 + diet.macros.carbs * 4 + diet.macros.fat * 9) / Math.max(1, diet.dailyCalories) * 100);
  const eatenCount = diet.meals.filter((m) => eatenToday.includes(m.id)).length;
  const dailyCompliance = Math.min(100, Math.round(((eatenCount / Math.max(1, diet.meals.length)) * 55) + ((macroBalance / 100) * 45)));

  const mealEmoji = (meal: Meal) => {
    const time = String(meal.time || '').toLowerCase();
    const name = String(meal.name || '').toLowerCase();

    if (time.includes('07') || time.includes('08') || time.includes('09') || name.includes('desay')) return '🥣';
    if (time.includes('11') || name.includes('almuer')) return '🍎';
    if (time.includes('13') || time.includes('14') || time.includes('15') || name.includes('comida')) return '🍽️';
    if (time.includes('17') || time.includes('18') || name.includes('meri')) return '🥜';
    if (time.includes('20') || time.includes('21') || time.includes('22') || name.includes('cena')) return '🌙';
    return '🍴';
  };

  const withMealEmoji = (meal: Meal) => {
    const base = String(meal.name || '').trim();
    if (/^[\p{Extended_Pictographic}\u2600-\u27BF]/u.test(base)) return base;
    return `${mealEmoji(meal)} ${base}`;
  };

  return (
    <div className="min-h-screen app-shell px-4 safe-top md:px-6 safe-bottom">
      <div className="page-wrap">
      <header className="mb-8 mt-2">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3 tracking-tight">
          <Utensils className="app-accent" size={32} />
          🍽️ Tu Dieta
        </h1>
        <p className="text-gray-400 font-mono text-sm">Objetivo diario: {diet.dailyCalories} kcal</p>
      </header>

      <motion.div {...listStagger(0)}>
      <AppCard accent interactive className="mb-8 p-6 glass-panel">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-gray-400 mb-2">📊 Resumen Nutricional</p>
            <h2 className="text-3xl font-black leading-none tracking-tight headline-gradient"><span className="emoji">🍏</span> Hoy comes para rendir</h2>
            <p className="text-sm text-gray-300 mt-2">
              {diet.meals.length} comidas planificadas con foco en energía estable y recuperación.
            </p>
          </div>
          <Sparkles className="app-accent shrink-0" />
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatPill label="kcal" value={`${diet.dailyCalories}`} />
          <StatPill label="comidas" value={`${diet.meals.length}`} />
          <StatPill label="completadas" value={`${eatenCount}/${diet.meals.length}`} />
        </div>

        <div className="mb-4 neuro-inset p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-gray-400">
            <span>Cumplimiento diario</span>
            <span>{dailyCompliance}%</span>
          </div>
          <div className="h-2.5 w-full neuro-progress-track">
            <div className="neuro-progress-fill" style={{ width: `${dailyCompliance}%` }} />
          </div>
        </div>

        <div className="neuro-inset p-3 text-xs text-gray-300">
          💡 Tip: si entrenas intenso hoy, prioriza proteína + carbohidrato en la comida post-entreno.
        </div>
      </AppCard>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <AppCard className="p-4 flex flex-col items-center justify-center text-center glass-panel">
          <Beef className="text-red-400 mb-2" size={24} />
          <span className="text-xl font-bold text-white">{diet.macros.protein}g</span>
          <span className="text-xs text-gray-500 font-mono">Proteína</span>
        </AppCard>
        <AppCard className="p-4 flex flex-col items-center justify-center text-center glass-panel">
          <Wheat className="text-amber-400 mb-2" size={24} />
          <span className="text-xl font-bold text-white">{diet.macros.carbs}g</span>
          <span className="text-xs text-gray-500 font-mono">Carbos</span>
        </AppCard>
        <AppCard className="p-4 flex flex-col items-center justify-center text-center glass-panel">
          <Droplet className="text-sky-400 mb-2" size={24} />
          <span className="text-xl font-bold text-white">{diet.macros.fat}g</span>
          <span className="text-xs text-gray-500 font-mono">Grasas</span>
        </AppCard>
      </div>

      <div className="space-y-4">
        {diet.meals.map((meal, index) => {
          const isEaten = eatenToday.includes(meal.id);
          return (
          <motion.div
            key={meal.id}
            {...listStagger(index)}
            whileTap={{ scale: 0.99 }}
            className={`panel-soft interactive-tile rounded-3xl p-5 relative overflow-hidden group transition-all ${
              isEaten
                ? 'border-[color:var(--app-accent)]/50 bg-[color:var(--app-accent)]/5'
                : 'hover:border-[color:var(--app-accent)]/50'
            }`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[color:var(--app-accent)]/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[color:var(--app-accent)]/10 transition-colors" />
            
            <div className="mb-4 relative z-10">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <motion.button
                    type="button"
                    onClick={() => toggleMealEaten(meal.id, todayDateKey)}
                    aria-label={isEaten ? 'Marcar como no comida' : 'Marcar como comida'}
                    whileTap={{ scale: 0.88 }}
                    transition={{ duration: 0.18, ease: [0.34, 1.2, 0.64, 1] }}
                    className="tap-target flex-shrink-0 mt-0.5 text-gray-500 hover:text-[var(--app-accent)] transition-colors"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {isEaten ? (
                        <motion.span key="checked" {...checkBounce}>
                          <CheckCircle2 size={20} className="text-[var(--app-accent)]" />
                        </motion.span>
                      ) : (
                        <motion.span key="unchecked" initial={{ scale: 1 }} animate={{ scale: 1 }}>
                          <Circle size={20} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                  <h3 className={`text-lg font-bold leading-tight ${isEaten ? 'line-through text-gray-400' : 'text-white'}`}>
                    {withMealEmoji(meal)}
                  </h3>
                </div>
                <button
                  onClick={() => handleSwap(meal)}
                  disabled={loadingMealId === meal.id}
                  className="tap-target pressable pulse-surface p-2 neuro-raised rounded-full text-gray-400 hover:text-[var(--app-accent)] transition-colors disabled:opacity-50 flex-shrink-0"
                  title="Cambiar comida"
                >
                  <RefreshCw size={16} className={loadingMealId === meal.id ? 'animate-spin' : ''} />
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs font-mono bg-[var(--app-border)] text-gray-300 px-2 py-1 rounded-full whitespace-nowrap">
                  {meal.time}
                </span>
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
          );
        })}
      </div>

      {profile?.foodPreferences && (
        <AppCard className="mt-8 glass-panel">
          <SectionHeader title="🥘 Preferencias para tu dieta" />
          <div className="space-y-2 text-sm text-gray-300">
            <p><span className="text-gray-500">Verduras:</span> {profile.foodPreferences.vegetables.join(', ') || 'No definidas'}</p>
            <p><span className="text-gray-500">Carbohidratos:</span> {profile.foodPreferences.carbs.join(', ') || 'No definidos'}</p>
            <p><span className="text-gray-500">Proteínas:</span> {profile.foodPreferences.proteins.join(', ') || 'No definidas'}</p>
          </div>
        </AppCard>
      )}

      <motion.div {...listStagger(1)}>
      <AppCard className="mt-6" accent>
        <SectionHeader title="🍲 Plato Especial Ajustable" />
        <p className="text-sm text-gray-400 mb-4">Base: arroz + lentejas + tomate + queso feta</p>

        <label className="block text-sm text-gray-400 mb-2">Calorías objetivo</label>
        <input
          type="number"
          min={200}
          max={900}
          value={specialDishTarget}
          onChange={(e) => setSpecialDishTarget(Number(e.target.value) || 390)}
          className="input-field mb-4"
        />

        <div className="space-y-2 text-sm text-gray-300">
          <p>Arroz: {(baseSpecialDish.arroz.grams * scale).toFixed(0)} g</p>
          <p>Lentejas: {(baseSpecialDish.lentejas.grams * scale).toFixed(0)} g</p>
          <p>Tomate: {(baseSpecialDish.tomate.grams * scale).toFixed(0)} g</p>
          <p>Queso feta: {(baseSpecialDish['queso feta'].grams * scale).toFixed(0)} g</p>
        </div>

        <div className="mt-5 neuro-inset p-3">
          <label className="mb-3 flex items-center justify-between text-sm text-gray-300">
            Equivalencias rapidas por macros
            <input
              type="checkbox"
              checked={macroQuickMode}
              onChange={(e) => setMacroQuickMode(e.target.checked)}
            />
          </label>

          {macroQuickMode ? (
            <div className="grid grid-cols-1 gap-2 text-xs text-gray-300 sm:grid-cols-2">
              <div className="neuro-inset p-2">+25g proteina: +120g pollo o +1 scoop whey</div>
              <div className="neuro-inset p-2">+30g carbos: +45g avena o +130g arroz cocido</div>
              <div className="neuro-inset p-2">+10g grasas: +15g frutos secos o +12g aceite de oliva</div>
              <div className="neuro-inset p-2">Balance actual: P {Math.round((diet.macros.protein / totalMacros) * 100)}% / C {Math.round((diet.macros.carbs / totalMacros) * 100)}% / G {Math.round((diet.macros.fat / totalMacros) * 100)}%</div>
            </div>
          ) : (
            <p className="text-xs text-gray-500">Activa el switch para ver reemplazos rapidos por macro.</p>
          )}
        </div>
      </AppCard>
      </motion.div>
      </div>
    </div>
  );
}
