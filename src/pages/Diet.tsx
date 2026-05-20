import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore, Meal } from '../store/useAppStore';
import { Utensils, Flame, Droplet, Beef, Wheat, RefreshCw, Sparkles, CheckCircle2, Circle, GlassWater } from 'lucide-react';
import { generateAlternativeMeal } from '../services/geminiService';
import { authService } from '../services/authService';
import { AppCard, SectionHeader, StatPill } from '../components/ui';
import { listStagger, checkBounce, slideFromLeft, mobileCardEntrance, waterFill, mobileTap, progressFill } from '../lib/motion';
import { format } from 'date-fns';

/* ═══════════════════════════════════════════════════════════
   Water Tracker — Premium glassmorphic hydration widget
   ═══════════════════════════════════════════════════════════ */
function WaterTracker() {
  const todayDateKey = format(new Date(), 'yyyy-MM-dd');
  const storageKey = `water_tracker_${todayDateKey}`;
  const [waterMl, setWaterMl] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const addWater = (amount: number) => {
    setWaterMl(prev => {
      const next = Math.max(0, prev + amount);
      try { localStorage.setItem(storageKey, String(next)); } catch { /* silent */ }
      return next;
    });
  };

  const targetMl = 2500;
  const percentage = Math.min(100, Math.round((waterMl / targetMl) * 100));
  const cupsCount = 10;
  const activeCups = Math.min(cupsCount, Math.floor(waterMl / 250));

  return (
    <motion.div {...mobileCardEntrance(3)}>
      <AppCard className="p-5 glass-panel" interactive>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-1 font-mono">💧 Hidratación</p>
            <h3 className="text-lg font-extrabold text-white leading-tight">Water Tracker</h3>
          </div>
          <motion.div
            key={waterMl}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="text-sky-400 font-mono font-bold text-sm glow-text flex items-center gap-1"
          >
            <GlassWater size={16} className="text-sky-400" />
            {waterMl}ml
          </motion.div>
        </div>

        {/* Progress bar with animated fill */}
        <div className="neuro-inset p-3 mb-4">
          <div className="flex justify-between text-[10px] text-gray-500 mb-1.5 font-mono">
            <span>{percentage}% alcanzado</span>
            <span>{waterMl} / {targetMl}ml</span>
          </div>
          <div className="h-2.5 w-full neuro-progress-track rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]"
              {...progressFill(percentage)}
            />
          </div>
        </div>

        {/* Interactive glass cups — 2 rows of 5 */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {Array.from({ length: cupsCount }).map((_, idx) => {
            const isFilled = idx < activeCups;
            return (
              <motion.button
                key={idx}
                type="button"
                whileTap={{ scale: 0.88 }}
                onClick={() => isFilled ? addWater(-250) : addWater(250)}
                className="relative aspect-[3/4] rounded-xl border flex flex-col items-center justify-end overflow-hidden transition-colors"
                style={{
                  borderColor: isFilled ? 'rgba(14, 165, 233, 0.4)' : 'rgba(14, 165, 233, 0.12)',
                  background: isFilled ? 'rgba(14, 165, 233, 0.08)' : 'rgba(14, 165, 233, 0.02)',
                }}
              >
                {/* Fluid fill */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-sky-500/90 via-cyan-400/70 to-cyan-300/40"
                  initial={{ height: 0 }}
                  animate={{ height: isFilled ? '100%' : '0%' }}
                  transition={waterFill.transition}
                />
                {/* Wave effect on top of water */}
                {isFilled && (
                  <motion.div
                    className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    animate={{ x: [-4, 4, -4] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
                <div className="relative z-10 text-white font-mono text-[9px] font-bold select-none pb-1">
                  {isFilled ? '💧' : <span className="text-gray-600">250</span>}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Quick actions */}
        <div className="flex gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => addWater(250)}
            className="flex-1 text-xs py-2.5 px-3 rounded-2xl bg-sky-500/10 border border-sky-500/25 text-sky-300 font-bold transition-all"
          >
            + 250ml 💧
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => addWater(500)}
            className="flex-1 text-xs py-2.5 px-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 font-bold transition-all"
          >
            + 500ml 🚰
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => addWater(-250)}
            disabled={waterMl <= 0}
            className="text-xs py-2.5 px-3 rounded-2xl bg-gray-500/8 border border-gray-700/40 text-gray-500 font-bold transition-all disabled:opacity-30"
          >
            −
          </motion.button>
        </div>
      </AppCard>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Diet Page — Premium Bento layout with fluid mobile animations
   ═══════════════════════════════════════════════════════════ */
export default function Diet() {
  const { diet, profile, swapMeal, showToast, authToken, mealEatenRecord, toggleMealEaten } = useAppStore();
  const [loadingMealId, setLoadingMealId] = useState<string | null>(null);
  const [specialDishTarget, setSpecialDishTarget] = useState(390);
  const [macroQuickMode, setMacroQuickMode] = useState(false);

  const todayDateKey = format(new Date(), 'yyyy-MM-dd');
  const eatenToday = mealEatenRecord[todayDateKey] ?? [];

  if (!diet) return (
    <div className="min-h-screen app-shell flex items-center justify-center px-6 safe-top safe-bottom">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="text-center max-w-xs"
      >
        <motion.p
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="text-5xl mb-4"
        >🥗</motion.p>
        <h2 className="text-xl font-bold text-white mb-2">Sin plan nutricional</h2>
        <p className="text-gray-400 text-sm">Completa el onboarding para que la IA genere tu dieta personalizada.</p>
      </motion.div>
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
        {/* Header with entrance animation */}
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 mt-2"
        >
          <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3 tracking-tight">
            <Utensils className="app-accent" size={28} />
            <span className="headline-gradient">Tu Dieta</span>
          </h1>
          <p className="text-gray-500 font-mono text-xs ml-[calc(28px+0.75rem)]">Objetivo: {diet.dailyCalories} kcal · {diet.meals.length} comidas</p>
        </motion.header>

        {/* Bento Grid Layout */}
        <div className="flex flex-col lg:grid lg:grid-cols-[380px_1fr] lg:gap-8 lg:items-start pb-8">

          {/* ═══ COLUMNA IZQUIERDA ═══ */}
          <div className="flex flex-col gap-5 lg:sticky lg:top-24 w-full lg:max-w-[380px]">

            {/* Resumen Nutricional */}
            <motion.div {...mobileCardEntrance(0)}>
              <AppCard accent interactive className="p-5 glass-panel">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-1.5 font-mono">📊 Resumen Nutricional</p>
                    <h2 className="text-2xl font-black leading-none tracking-tight headline-gradient">Hoy comes para rendir</h2>
                    <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                      {diet.meals.length} comidas planificadas · energía estable y recuperación.
                    </p>
                  </div>
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Sparkles className="app-accent shrink-0" size={22} />
                  </motion.div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <StatPill label="kcal" value={`${diet.dailyCalories}`} />
                  <StatPill label="comidas" value={`${diet.meals.length}`} />
                  <StatPill label="hechas" value={`${eatenCount}/${diet.meals.length}`} />
                </div>

                <div className="neuro-inset p-3 mb-3">
                  <div className="mb-1.5 flex items-center justify-between text-[10px] text-gray-500 font-mono">
                    <span>Cumplimiento diario</span>
                    <motion.span
                      key={dailyCompliance}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="font-bold text-white"
                    >
                      {dailyCompliance}%
                    </motion.span>
                  </div>
                  <div className="h-2.5 w-full neuro-progress-track">
                    <motion.div
                      className="neuro-progress-fill"
                      {...progressFill(dailyCompliance)}
                    />
                  </div>
                </div>

                <div className="neuro-inset p-2.5 text-[11px] text-gray-400 leading-relaxed">
                  💡 Si entrenas intenso hoy, prioriza proteína + carbohidrato post-entreno.
                </div>
              </AppCard>
            </motion.div>

            {/* Panel de Macros */}
            <motion.div {...mobileCardEntrance(1)} className="grid grid-cols-3 lg:grid-cols-1 gap-2.5">
              {[
                { icon: Beef, color: 'text-red-400', label: 'Proteína', value: diet.macros.protein, unit: 'g' },
                { icon: Wheat, color: 'text-amber-400', label: 'Carbos', value: diet.macros.carbs, unit: 'g' },
                { icon: Droplet, color: 'text-sky-400', label: 'Grasas', value: diet.macros.fat, unit: 'g' },
              ].map((macro) => (
                <motion.div
                  key={macro.label}
                  whileTap={{ scale: 0.96 }}
                  className="p-3.5 flex flex-col lg:flex-row items-center justify-center lg:justify-between text-center lg:text-left gap-1.5 glass-panel rounded-2xl border border-[var(--app-border)] transition-all"
                >
                  <div className="flex flex-col lg:flex-row items-center gap-1.5">
                    <macro.icon className={macro.color} size={20} />
                    <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider lg:text-xs">{macro.label}</span>
                  </div>
                  <span className="text-lg font-bold text-white font-mono">{macro.value}{macro.unit}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Water Tracker */}
            <WaterTracker />

            {/* Preferencias Alimentarias */}
            {profile?.foodPreferences && (
              <motion.div {...mobileCardEntrance(4)}>
                <AppCard className="glass-panel p-5">
                  <SectionHeader title="🥘 Preferencias" />
                  <div className="space-y-2 text-sm text-gray-300">
                    <p><span className="text-gray-500 font-bold text-xs">Verduras:</span> {profile.foodPreferences.vegetables.join(', ') || 'No definidas'}</p>
                    <p><span className="text-gray-500 font-bold text-xs">Carbos:</span> {profile.foodPreferences.carbs.join(', ') || 'No definidos'}</p>
                    <p><span className="text-gray-500 font-bold text-xs">Proteínas:</span> {profile.foodPreferences.proteins.join(', ') || 'No definidas'}</p>
                  </div>
                </AppCard>
              </motion.div>
            )}
          </div>

          {/* ═══ COLUMNA DERECHA ═══ */}
          <div className="flex flex-col gap-5 w-full mt-5 lg:mt-0">

            {/* Meals checklist */}
            <div className="space-y-3">
              <AnimatePresence>
                {diet.meals.map((meal, index) => {
                  const isEaten = eatenToday.includes(meal.id);
                  const isSwapping = loadingMealId === meal.id;
                  return (
                    <motion.div
                      key={meal.id}
                      {...slideFromLeft(index)}
                      layout
                      whileTap={{ scale: 0.985 }}
                      className={`panel-soft interactive-tile rounded-2xl p-4 relative overflow-hidden group transition-all ${
                        isEaten
                          ? 'border-[color:var(--app-accent)]/40 bg-[color:var(--app-accent)]/5'
                          : ''
                      }`}
                    >
                      {/* Ambient glow */}
                      <div className="absolute top-0 right-0 w-28 h-28 bg-[color:var(--app-accent)]/5 rounded-full blur-3xl -mr-14 -mt-14 group-hover:bg-[color:var(--app-accent)]/10 transition-colors" />

                      <div className="relative z-10">
                        {/* Title row */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <motion.button
                              type="button"
                              onClick={() => toggleMealEaten(meal.id, todayDateKey)}
                              aria-label={isEaten ? 'Desmarcar comida' : 'Marcar como comida'}
                              whileTap={{ scale: 0.85 }}
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
                            <div className="min-w-0 flex-1">
                              <h3 className={`text-base font-bold leading-tight transition-colors ${isEaten ? 'line-through text-gray-500' : 'text-white'}`}>
                                {withMealEmoji(meal)}
                              </h3>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{meal.description}</p>
                            </div>
                          </div>
                          <motion.button
                            type="button"
                            onClick={() => handleSwap(meal)}
                            disabled={isSwapping}
                            whileTap={{ scale: 0.9, rotate: 180 }}
                            transition={{ duration: 0.3 }}
                            className="tap-target pressable pulse-surface p-2 neuro-raised rounded-full text-gray-500 hover:text-[var(--app-accent)] transition-colors disabled:opacity-40 flex-shrink-0"
                            title="Cambiar comida"
                          >
                            <RefreshCw size={14} className={isSwapping ? 'animate-spin' : ''} />
                          </motion.button>
                        </div>

                        {/* Meta row */}
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[10px] font-mono bg-black/30 text-gray-400 px-2 py-0.5 rounded-full whitespace-nowrap border border-gray-800/30">
                            ⏰ {meal.time}
                          </span>
                          <div className="flex items-center gap-3 text-[10px] font-mono text-gray-500">
                            <span>P:{meal.protein}g</span>
                            <span>C:{meal.carbs}g</span>
                            <span>G:{meal.fat}g</span>
                          </div>
                          <div className="flex items-center gap-1 app-accent font-mono font-bold text-sm glow-text">
                            <Flame size={14} />
                            {meal.calories}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Plato Especial Ajustable */}
            <motion.div {...mobileCardEntrance(2)}>
              <AppCard className="p-5" accent>
                <SectionHeader title="🍲 Plato Especial Ajustable" />
                <p className="text-xs text-gray-500 mb-4 font-mono">Base: arroz + lentejas + tomate + queso feta</p>

                <label className="block text-xs text-gray-400 mb-1.5 font-bold">Calorías objetivo</label>
                <input
                  type="number"
                  min={200}
                  max={900}
                  value={specialDishTarget}
                  onChange={(e) => setSpecialDishTarget(Number(e.target.value) || 390)}
                  className="input-field mb-4"
                />

                <div className="grid grid-cols-2 gap-2 text-sm text-gray-300 mb-4">
                  {Object.entries(baseSpecialDish).map(([name, data]) => (
                    <div key={name} className="neuro-inset p-2.5 rounded-xl">
                      <p className="text-[10px] text-gray-500 capitalize font-mono">{name}</p>
                      <p className="text-white font-mono font-bold text-sm">{(data.grams * scale).toFixed(0)}g</p>
                    </div>
                  ))}
                </div>

                <div className="neuro-inset p-3">
                  <label className="mb-3 flex items-center justify-between text-xs text-gray-300 cursor-pointer">
                    <span className="font-bold">Equivalencias rápidas por macros</span>
                    <input
                      type="checkbox"
                      checked={macroQuickMode}
                      onChange={(e) => setMacroQuickMode(e.target.checked)}
                      className="rounded border-gray-600 bg-black text-[color:var(--app-accent)] focus:ring-0"
                    />
                  </label>

                  <AnimatePresence mode="wait">
                    {macroQuickMode ? (
                      <motion.div
                        key="macros-on"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        className="grid grid-cols-1 gap-2 text-[11px] text-gray-300 sm:grid-cols-2 overflow-hidden"
                      >
                        <div className="neuro-inset p-2">+25g proteína: +120g pollo o +1 scoop whey</div>
                        <div className="neuro-inset p-2">+30g carbos: +45g avena o +130g arroz cocido</div>
                        <div className="neuro-inset p-2">+10g grasas: +15g frutos secos o +12g aceite de oliva</div>
                        <div className="neuro-inset p-2 font-bold text-white">P {Math.round((diet.macros.protein / totalMacros) * 100)}% · C {Math.round((diet.macros.carbs / totalMacros) * 100)}% · G {Math.round((diet.macros.fat / totalMacros) * 100)}%</div>
                      </motion.div>
                    ) : (
                      <motion.p
                        key="macros-off"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-[10px] text-gray-600"
                      >
                        Activa el switch para ver reemplazos rápidos por macro.
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </AppCard>
            </motion.div>
          </div>

        </div>
      </div>
    </div>
  );
}
