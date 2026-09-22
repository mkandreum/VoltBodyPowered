import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore, Meal } from '../store/useAppStore';
import { Haptics } from '../lib/haptics';
import {
  Utensils,
  Flame,
  Droplet,
  Beef,
  Wheat,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Circle,
  GlassWater,
  Trophy,
  Clock,
  Plus,
  Minus,
  Check,
  Zap,
} from 'lucide-react';
import { generateAlternativeMeal } from '../services/geminiService';
import { authService } from '../services/authService';
import { AppCard, SectionHeader, StatPill } from '../components/ui';
import {
  checkBounce,
  slideFromLeft,
  mobileCardEntrance,
  waterFill,
  progressFill,
} from '../lib/motion';
import { format } from 'date-fns';

/* ═══════════════════════════════════════════════════════════
   Apple Rings — Concentric Macro & Calorie Circular Gauge
   ═══════════════════════════════════════════════════════════ */
type NutriRingsProps = {
  consumedKcal: number;
  targetKcal: number;
  consumedProtein: number;
  targetProtein: number;
  consumedCarbs: number;
  targetCarbs: number;
  consumedFat: number;
  targetFat: number;
};

function NutriRings({
  consumedKcal,
  targetKcal,
  consumedProtein,
  targetProtein,
  consumedCarbs,
  targetCarbs,
  consumedFat,
  targetFat,
}: NutriRingsProps) {
  const size = 160;
  const strokeWidth = 10;
  const center = size / 2;

  // Ring radii (4 concentric rings: Calories outer, Protein mid, Carbs inner, Fat innermost)
  const rings = [
    {
      id: 'kcal',
      radius: center - strokeWidth / 2 - 2,
      progress: Math.min(100, Math.round((consumedKcal / Math.max(1, targetKcal)) * 100)),
      color: 'url(#kcal-grad)',
      bgColor: 'rgba(57, 255, 20, 0.12)',
      label: 'Kcal',
    },
    {
      id: 'protein',
      radius: center - strokeWidth / 2 - 16,
      progress: Math.min(100, Math.round((consumedProtein / Math.max(1, targetProtein)) * 100)),
      color: 'url(#protein-grad)',
      bgColor: 'rgba(248, 113, 113, 0.12)',
      label: 'Proteína',
    },
    {
      id: 'carbs',
      radius: center - strokeWidth / 2 - 30,
      progress: Math.min(100, Math.round((consumedCarbs / Math.max(1, targetCarbs)) * 100)),
      color: 'url(#carbs-grad)',
      bgColor: 'rgba(251, 191, 36, 0.12)',
      label: 'Carbos',
    },
    {
      id: 'fat',
      radius: center - strokeWidth / 2 - 44,
      progress: Math.min(100, Math.round((consumedFat / Math.max(1, targetFat)) * 100)),
      color: 'url(#fat-grad)',
      bgColor: 'rgba(56, 189, 248, 0.12)',
      label: 'Grasas',
    },
  ];

  const remainingKcal = Math.max(0, targetKcal - consumedKcal);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-black/30 border border-white/5 backdrop-blur-md">
      {/* Concentric Rings Visual */}
      <div className="relative flex items-center justify-center shrink-0 w-[160px] h-[160px]">
        <svg width={size} height={size} className="transform -rotate-90">
          <defs>
            <linearGradient id="kcal-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#39ff14" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <linearGradient id="protein-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <linearGradient id="carbs-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <linearGradient id="fat-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
          </defs>

          {rings.map((ring) => {
            const circumference = 2 * Math.PI * ring.radius;
            const strokeDashoffset = circumference - (ring.progress / 100) * circumference;
            return (
              <g key={ring.id}>
                {/* Background track */}
                <circle
                  cx={center}
                  cy={center}
                  r={ring.radius}
                  stroke={ring.bgColor}
                  strokeWidth={strokeWidth - 2}
                  fill="none"
                />
                {/* Animated active track */}
                <motion.circle
                  cx={center}
                  cy={center}
                  r={ring.radius}
                  stroke={ring.color}
                  strokeWidth={strokeWidth - 2}
                  strokeDasharray={circumference}
                  strokeLinecap="round"
                  fill="none"
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                />
              </g>
            );
          })}
        </svg>

        {/* Center Calorie Value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
          <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400">Restan</span>
          <span className="text-xl font-black font-mono tracking-tight text-white">{remainingKcal}</span>
          <span className="text-[9px] font-mono text-gray-500">kcal</span>
        </div>
      </div>

      {/* Numerical Metrics Legend */}
      <div className="flex-1 w-full flex flex-col justify-center gap-2">
        <div className="flex items-center justify-between pb-1 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--app-accent)] shadow-[0_0_6px_var(--app-accent)]" />
            <span className="text-xs text-gray-300 font-medium">Calorías</span>
          </div>
          <span className="font-mono text-xs font-bold text-white tabular-nums">
            {consumedKcal} <span className="text-gray-500 font-normal">/ {targetKcal} kcal</span>
          </span>
        </div>

        <div className="flex items-center justify-between pb-1 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="text-xs text-gray-300 font-medium">Proteínas</span>
          </div>
          <span className="font-mono text-xs font-bold text-red-300 tabular-nums">
            {consumedProtein}g <span className="text-gray-500 font-normal">/ {targetProtein}g</span>
          </span>
        </div>

        <div className="flex items-center justify-between pb-1 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-xs text-gray-300 font-medium">Carbohidratos</span>
          </div>
          <span className="font-mono text-xs font-bold text-amber-300 tabular-nums">
            {consumedCarbs}g <span className="text-gray-500 font-normal">/ {targetCarbs}g</span>
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            <span className="text-xs text-gray-300 font-medium">Grasas</span>
          </div>
          <span className="font-mono text-xs font-bold text-sky-300 tabular-nums">
            {consumedFat}g <span className="text-gray-500 font-normal">/ {targetFat}g</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Water Tracker — Apple Health Style Hydration Widget
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
    setWaterMl((prev) => {
      const next = Math.max(0, prev + amount);
      try {
        localStorage.setItem(storageKey, String(next));
      } catch {
        /* silent */
      }
      return next;
    });
  };

  const targetMl = 2500;
  const percentage = Math.min(100, Math.round((waterMl / targetMl) * 100));
  const cupsCount = 10;
  const activeCups = Math.min(cupsCount, Math.floor(waterMl / 250));

  return (
    <motion.div {...mobileCardEntrance(3)}>
      <AppCard className="p-4 sm:p-5 glass-panel" interactive>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <GlassWater size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400 font-mono font-semibold">
                Hidratación
              </p>
              <h3 className="text-base sm:text-lg font-bold text-white leading-tight">Water Tracker</h3>
            </div>
          </div>
          <motion.div
            key={waterMl}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="text-sky-400 font-mono font-bold text-sm bg-sky-500/10 border border-sky-500/20 px-3 py-1.5 rounded-full flex items-center gap-1.5 tabular-nums"
          >
            <Droplet size={14} className="fill-sky-400 text-sky-400" />
            {waterMl} / {targetMl}ml
          </motion.div>
        </div>

        {/* Progress Bar with Liquid Glow */}
        <div className="neuro-inset p-3 mb-4 rounded-xl bg-black/20">
          <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1.5 font-mono">
            <span className="font-semibold text-sky-300">{percentage}% completado</span>
            <span>{Math.max(0, targetMl - waterMl)}ml restantes</span>
          </div>
          <div className="h-2.5 w-full bg-gray-900/60 rounded-full overflow-hidden border border-white/5">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-500 shadow-[0_0_12px_rgba(14,165,233,0.6)]"
              {...progressFill(percentage)}
            />
          </div>
        </div>

        {/* Interactive Glass Cups (2 rows of 5) with Ergonomic Touch Targets */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {Array.from({ length: cupsCount }).map((_, idx) => {
            const isFilled = idx < activeCups;
            return (
              <motion.button
                key={idx}
                type="button"
                aria-label={`Vaso de agua ${idx + 1}, 250 ml`}
                whileTap={{ scale: 0.88 }}
                onClick={() => (isFilled ? addWater(-250) : addWater(250))}
                className="tap-target relative aspect-[3/4] min-h-[48px] rounded-xl border flex flex-col items-center justify-end overflow-hidden transition-all duration-200"
                style={{
                  borderColor: isFilled ? 'rgba(14, 165, 233, 0.45)' : 'rgba(255, 255, 255, 0.08)',
                  background: isFilled ? 'rgba(14, 165, 233, 0.14)' : 'rgba(255, 255, 255, 0.02)',
                }}
              >
                {/* Fluid fill */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-sky-500/95 via-cyan-400/80 to-cyan-300/50"
                  initial={{ height: 0 }}
                  animate={{ height: isFilled ? '100%' : '0%' }}
                  transition={waterFill.transition}
                />
                {/* Wave effect on top of water */}
                {isFilled && (
                  <motion.div
                    className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-white/40 to-transparent"
                    animate={{ x: [-4, 4, -4] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
                <div className="relative z-10 font-mono text-[10px] font-bold select-none pb-1 tabular-nums">
                  {isFilled ? (
                    <span className="text-white drop-shadow-sm">💧</span>
                  ) : (
                    <span className="text-gray-500">250</span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Ergonomic Quick Action Buttons (Thumb Zone, 44px+ hit target) */}
        <div className="grid grid-cols-3 gap-2">
          <motion.button
            type="button"
            aria-label="Añadir 250 mililitros de agua"
            whileTap={{ scale: 0.94 }}
            onClick={() => addWater(250)}
            className="tap-target min-h-[44px] py-2.5 px-3 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 active:bg-sky-500/30 border border-sky-500/25 text-sky-300 font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus size={14} /> 250ml
          </motion.button>
          <motion.button
            type="button"
            aria-label="Añadir 500 mililitros de agua"
            whileTap={{ scale: 0.94 }}
            onClick={() => addWater(500)}
            className="tap-target min-h-[44px] py-2.5 px-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 active:bg-cyan-500/30 border border-cyan-500/25 text-cyan-300 font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus size={14} /> 500ml
          </motion.button>
          <motion.button
            type="button"
            aria-label="Restar 250 mililitros de agua"
            whileTap={{ scale: 0.94 }}
            onClick={() => addWater(-250)}
            disabled={waterMl <= 0}
            className="tap-target min-h-[44px] py-2.5 px-3 rounded-xl bg-gray-800/40 hover:bg-gray-800/60 active:bg-gray-800/80 border border-gray-700/40 text-gray-400 hover:text-white font-mono font-bold text-xs flex items-center justify-center gap-1 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <Minus size={14} /> 250ml
          </motion.button>
        </div>
      </AppCard>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Diet Page — Apple HIG Bento Layout & Ergonomic Mobile UI
   ═══════════════════════════════════════════════════════════ */
export default function Diet() {
  const {
    diet,
    profile,
    swapMeal,
    showToast,
    authToken,
    mealEatenRecord,
    toggleMealEaten,
  } = useAppStore(
    useShallow((s) => ({
      diet: s.diet,
      profile: s.profile,
      swapMeal: s.swapMeal,
      showToast: s.showToast,
      authToken: s.authToken,
      mealEatenRecord: s.mealEatenRecord,
      toggleMealEaten: s.toggleMealEaten,
    }))
  );
  const [loadingMealId, setLoadingMealId] = useState<string | null>(null);
  const [specialDishTarget, setSpecialDishTarget] = useState(390);
  const [macroQuickMode, setMacroQuickMode] = useState(false);

  const todayDateKey = format(new Date(), 'yyyy-MM-dd');
  const eatenToday = mealEatenRecord[todayDateKey] ?? [];

  // Compute live nutritional metrics
  const nutritionSummary = useMemo(() => {
    if (!diet) {
      return {
        consumedKcal: 0,
        consumedProtein: 0,
        consumedCarbs: 0,
        consumedFat: 0,
        eatenCount: 0,
        totalMeals: 0,
        dailyCompliance: 0,
        isCompleted: false,
      };
    }

    const eatenMeals = diet.meals.filter((m) => eatenToday.includes(m.id));
    const consumedKcal = eatenMeals.reduce((acc, m) => acc + (m.calories || 0), 0);
    const consumedProtein = eatenMeals.reduce((acc, m) => acc + (m.protein || 0), 0);
    const consumedCarbs = eatenMeals.reduce((acc, m) => acc + (m.carbs || 0), 0);
    const consumedFat = eatenMeals.reduce((acc, m) => acc + (m.fat || 0), 0);
    const eatenCount = eatenMeals.length;
    const totalMeals = diet.meals.length;

    const mealFraction = totalMeals > 0 ? (eatenCount / totalMeals) * 100 : 0;
    const isCompleted = totalMeals > 0 && eatenCount === totalMeals;

    return {
      consumedKcal,
      consumedProtein,
      consumedCarbs,
      consumedFat,
      eatenCount,
      totalMeals,
      dailyCompliance: Math.min(100, Math.round(mealFraction)),
      isCompleted,
    };
  }, [diet, eatenToday]);

  if (!diet) {
    return (
      <div className="min-h-screen app-shell flex items-center justify-center px-4 safe-top safe-bottom">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-sm p-6 rounded-3xl glass-panel border border-white/10"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[color:var(--app-accent)]/10 border border-[color:var(--app-accent)]/20 flex items-center justify-center text-3xl"
          >
            🥗
          </motion.div>
          <h2 className="text-xl font-bold text-white mb-2">Sin plan nutricional</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-4">
            Completa el onboarding o sincroniza tu perfil para que la IA genere tu dieta hiper-personalizada.
          </p>
        </motion.div>
      </div>
    );
  }

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
    <div className="min-h-screen app-shell px-4 py-4 safe-top md:px-6 md:py-6 safe-bottom">
      <div className="page-wrap max-w-6xl mx-auto">
        {/* Header with Apple HIG Typography & Status Pill */}
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 mt-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[color:var(--app-accent)] bg-[color:var(--app-accent)]/10 px-2.5 py-0.5 rounded-full border border-[color:var(--app-accent)]/20">
                Nutrición Diaria
              </span>
              <span className="text-xs text-gray-500 font-mono">
                {format(new Date(), 'EEEE, d MMMM')}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <Utensils className="text-[color:var(--app-accent)]" size={26} />
              <span>Tu Plan Nutricional</span>
            </h1>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="px-3.5 py-1.5 rounded-xl bg-black/40 border border-white/10 flex items-center gap-2">
              <Flame size={16} className="text-[color:var(--app-accent)]" />
              <span className="font-mono text-sm font-bold text-white tabular-nums">
                {diet.dailyCalories} <span className="text-xs text-gray-400 font-normal">kcal meta</span>
              </span>
            </div>
          </div>
        </motion.header>

        {/* Bento Grid Layout (8-Point Grid) */}
        <div className="flex flex-col lg:grid lg:grid-cols-[400px_1fr] lg:gap-6 lg:items-start pb-12">
          {/* ═══════════════════════════════════════════════
             COLUMNA IZQUIERDA: RESUMEN, ANILLOS & WATER
             ═══════════════════════════════════════════════ */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-20 w-full">
            {/* Apple Rings Hero Card */}
            <motion.div {...mobileCardEntrance(0)}>
              <AppCard accent className="p-4 sm:p-5 glass-panel">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400 font-mono font-semibold mb-1">
                      Balance Nutricional
                    </p>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                      Progreso de Hoy
                    </h2>
                  </div>
                  <motion.div
                    animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.05, 1] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-9 h-9 rounded-xl bg-[color:var(--app-accent)]/10 border border-[color:var(--app-accent)]/20 flex items-center justify-center shrink-0"
                  >
                    <Sparkles className="text-[color:var(--app-accent)]" size={18} />
                  </motion.div>
                </div>

                {/* Concentric Progress Rings */}
                <NutriRings
                  consumedKcal={nutritionSummary.consumedKcal}
                  targetKcal={diet.dailyCalories}
                  consumedProtein={nutritionSummary.consumedProtein}
                  targetProtein={diet.macros.protein}
                  consumedCarbs={nutritionSummary.consumedCarbs}
                  targetCarbs={diet.macros.carbs}
                  consumedFat={nutritionSummary.consumedFat}
                  targetFat={diet.macros.fat}
                />

                {/* Quick Stat Pills */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <StatPill label="Comidas" value={`${nutritionSummary.eatenCount}/${nutritionSummary.totalMeals}`} />
                  <StatPill label="Completado" value={`${nutritionSummary.dailyCompliance}%`} />
                  <StatPill label="Kcal Meta" value={`${diet.dailyCalories}`} />
                </div>

                {/* Motivational Tip */}
                <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-gray-400 leading-relaxed flex items-start gap-2">
                  <Zap size={14} className="text-[color:var(--app-accent)] shrink-0 mt-0.5" />
                  <span>
                    {nutritionSummary.isCompleted
                      ? '¡Excelente trabajo! Has completado todas las comidas planificadas para el día de hoy.'
                      : 'Si entrenas hoy, asegúrate de registrar tu comida post-entreno con suficiente proteína y carbohidratos.'}
                  </span>
                </div>
              </AppCard>
            </motion.div>

            {/* Macro Split Grid Cards (8-point grid) */}
            <motion.div {...mobileCardEntrance(1)} className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                {
                  icon: Beef,
                  color: 'text-red-400',
                  bgColor: 'bg-red-500/10 border-red-500/20',
                  barColor: 'bg-red-400',
                  label: 'Proteína',
                  consumed: nutritionSummary.consumedProtein,
                  target: diet.macros.protein,
                },
                {
                  icon: Wheat,
                  color: 'text-amber-400',
                  bgColor: 'bg-amber-500/10 border-amber-500/20',
                  barColor: 'bg-amber-400',
                  label: 'Carbos',
                  consumed: nutritionSummary.consumedCarbs,
                  target: diet.macros.carbs,
                },
                {
                  icon: Droplet,
                  color: 'text-sky-400',
                  bgColor: 'bg-sky-500/10 border-sky-500/20',
                  barColor: 'bg-sky-400',
                  label: 'Grasas',
                  consumed: nutritionSummary.consumedFat,
                  target: diet.macros.fat,
                },
              ].map((macro) => {
                const pct = Math.min(100, Math.round((macro.consumed / Math.max(1, macro.target)) * 100));
                return (
                  <div
                    key={macro.label}
                    className="p-3.5 rounded-2xl glass-panel border border-white/10 flex flex-col justify-between gap-2 transition-all hover:border-white/20"
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-7 h-7 rounded-lg ${macro.bgColor} border flex items-center justify-center`}>
                        <macro.icon className={macro.color} size={15} />
                      </div>
                      <span className="text-[10px] font-mono text-gray-400 uppercase font-semibold">
                        {macro.label}
                      </span>
                    </div>

                    <div>
                      <div className="text-base sm:text-lg font-bold text-white font-mono tabular-nums leading-none mb-1">
                        {macro.consumed}g
                        <span className="text-[11px] font-normal text-gray-500 ml-1">/ {macro.target}g</span>
                      </div>
                      <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${macro.barColor}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>

            {/* Water Tracker Widget */}
            <WaterTracker />

            {/* Preferencias Alimentarias */}
            {profile?.foodPreferences && (
              <motion.div {...mobileCardEntrance(4)}>
                <AppCard className="glass-panel p-4 sm:p-5">
                  <SectionHeader title="🥘 Preferencias Nutricionales" />
                  <div className="space-y-2.5 text-xs text-gray-300 mt-3">
                    <div className="flex items-start justify-between gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-gray-400 font-semibold shrink-0">🥦 Verduras:</span>
                      <span className="text-right text-white font-mono">
                        {profile.foodPreferences.vegetables.join(', ') || 'Variadas'}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-gray-400 font-semibold shrink-0">🍚 Carbos:</span>
                      <span className="text-right text-white font-mono">
                        {profile.foodPreferences.carbs.join(', ') || 'Complejos'}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-gray-400 font-semibold shrink-0">🥩 Proteínas:</span>
                      <span className="text-right text-white font-mono">
                        {profile.foodPreferences.proteins.join(', ') || 'Magras'}
                      </span>
                    </div>
                  </div>
                </AppCard>
              </motion.div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════
             COLUMNA DERECHA: CHECKLIST DE COMIDAS & RECETAS
             ═══════════════════════════════════════════════ */}
          <div className="flex flex-col gap-4 w-full mt-4 lg:mt-0">
            {/* Celebration State when all meals eaten */}
            <AnimatePresence>
              {nutritionSummary.isCompleted && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-[color:var(--app-accent)]/15 to-emerald-500/15 border border-emerald-500/40 backdrop-blur-xl flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
                    <Trophy size={24} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                      ¡Día 100% Completado! 🎉
                    </h3>
                    <p className="text-xs text-emerald-300/90 mt-0.5 leading-relaxed">
                      Has alcanzado tus {nutritionSummary.totalMeals} comidas planificadas hoy. ¡Excelente consistencia y disciplina nutricional!
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Meals Section Header */}
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Comidas del Día</span>
                  <span className="text-xs font-mono font-semibold bg-white/10 text-gray-300 px-2.5 py-0.5 rounded-full">
                    {nutritionSummary.eatenCount} de {nutritionSummary.totalMeals}
                  </span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Marca cada comida al consumirla o cámbiala con IA por una alternativa equivalente.
                </p>
              </div>
            </div>

            {/* Meals Checklist Cards (Apple HIG & Fluid List) */}
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {diet.meals.map((meal, index) => {
                  const isEaten = eatenToday.includes(meal.id);
                  const isSwapping = loadingMealId === meal.id;

                  return (
                    <motion.div
                      key={meal.id}
                      {...slideFromLeft(index)}
                      layout
                      className={`relative rounded-2xl p-4 sm:p-5 border transition-all duration-300 overflow-hidden ${
                        isEaten
                          ? 'border-emerald-500/35 bg-emerald-950/20 backdrop-blur-md shadow-[0_4px_20px_rgba(16,185,129,0.08)]'
                          : 'border-white/10 bg-[linear-gradient(170deg,color-mix(in_srgb,var(--app-surface)_90%,black_10%),color-mix(in_srgb,var(--app-surface-elevated)_90%,black_10%))] hover:border-white/20'
                      }`}
                    >
                      {/* Ambient Accent Light */}
                      <div
                        className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none transition-opacity duration-300 ${
                          isEaten ? 'bg-emerald-500/15 opacity-100' : 'bg-[color:var(--app-accent)]/5 opacity-60'
                        }`}
                      />

                      <div className="relative z-10 flex flex-col gap-3">
                        {/* Top Row: Checkmark (Thumb Zone) + Meal Name + Swap Button */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {/* Ergonomic 44x44 Touch Target Toggle */}
                            <motion.button
                              type="button"
                              onClick={() => toggleMealEaten(meal.id, todayDateKey)}
                              aria-label={isEaten ? `Desmarcar ${meal.name}` : `Marcar ${meal.name} como completada`}
                              whileTap={{ scale: 0.85 }}
                              className="tap-target w-11 h-11 -ml-1 -mt-1 rounded-xl flex items-center justify-center shrink-0 text-gray-400 hover:text-white transition-colors focus:outline-none"
                            >
                              <AnimatePresence mode="wait" initial={false}>
                                {isEaten ? (
                                  <motion.div
                                    key="checked"
                                    {...checkBounce}
                                    className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-black shadow-[0_0_12px_rgba(16,185,129,0.6)]"
                                  >
                                    <Check size={16} strokeWidth={3} />
                                  </motion.div>
                                ) : (
                                  <motion.div
                                    key="unchecked"
                                    initial={{ scale: 1 }}
                                    animate={{ scale: 1 }}
                                    className="w-7 h-7 rounded-full border-2 border-gray-600 hover:border-[color:var(--app-accent)] transition-colors flex items-center justify-center"
                                  >
                                    <Circle size={12} className="opacity-0" />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.button>

                            {/* Meal Information */}
                            <div className="min-w-0 flex-1 pt-0.5">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3
                                  className={`text-base sm:text-lg font-bold leading-tight transition-colors ${
                                    isEaten ? 'line-through text-gray-400' : 'text-white'
                                  }`}
                                >
                                  {withMealEmoji(meal)}
                                </h3>

                                {isEaten && (
                                  <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/30">
                                    ✓ Registrada
                                  </span>
                                )}
                              </div>

                              <p className={`text-xs leading-relaxed line-clamp-2 transition-colors ${isEaten ? 'text-gray-500' : 'text-gray-300'}`}>
                                {meal.description}
                              </p>
                            </div>
                          </div>

                          {/* AI Meal Swap Button (Ergonomic 44x44 Touch Target) */}
                          <motion.button
                            type="button"
                            onClick={() => handleSwap(meal)}
                            disabled={isSwapping}
                            aria-label={`Cambiar ${meal.name} por otra comida equivalente`}
                            whileTap={{ scale: 0.9 }}
                            className="tap-target w-11 h-11 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/10 hover:border-white/20 text-gray-300 hover:text-[color:var(--app-accent)] transition-all disabled:opacity-40 shrink-0 flex items-center justify-center"
                            title="Cambiar comida con IA"
                          >
                            <RefreshCw size={16} className={isSwapping ? 'animate-spin text-[color:var(--app-accent)]' : ''} />
                          </motion.button>
                        </div>

                        {/* Bottom Row: Time Badge + Macro Grams + Calorie Pill */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 flex-wrap">
                          {/* Time Badge */}
                          <div className="flex items-center gap-1.5 text-xs font-mono bg-black/40 text-gray-300 px-2.5 py-1 rounded-lg border border-white/5 shrink-0">
                            <Clock size={12} className="text-gray-400" />
                            <span>{meal.time}</span>
                          </div>

                          {/* Monospace Macro Grams */}
                          <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
                            <span className="text-red-300">
                              <strong className="text-red-400">P:</strong> {meal.protein}g
                            </span>
                            <span className="text-amber-300">
                              <strong className="text-amber-400">C:</strong> {meal.carbs}g
                            </span>
                            <span className="text-sky-300">
                              <strong className="text-sky-400">G:</strong> {meal.fat}g
                            </span>
                          </div>

                          {/* Calorie Indicator */}
                          <div className="flex items-center gap-1 font-mono font-bold text-sm text-[color:var(--app-accent)] bg-[color:var(--app-accent)]/10 px-2.5 py-1 rounded-lg border border-[color:var(--app-accent)]/20 shrink-0 tabular-nums">
                            <Flame size={14} className="fill-[color:var(--app-accent)]" />
                            <span>{meal.calories} kcal</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* ═══════════════════════════════════════════════
               Plato Especial Ajustable (8-Point Grid)
               ═══════════════════════════════════════════════ */}
            <motion.div {...mobileCardEntrance(2)}>
              <AppCard className="p-4 sm:p-5" accent>
                <SectionHeader title="🍲 Plato Especial Ajustable" />
                <p className="text-xs text-gray-400 mb-4 font-mono">
                  Base estándar: arroz + lentejas + tomate + queso feta
                </p>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-gray-300 font-bold font-mono">Calorías Objetivo</label>
                    <span className="text-xs font-mono font-bold text-[color:var(--app-accent)]">
                      {specialDishTarget} kcal
                    </span>
                  </div>
                  <input
                    type="number"
                    min={200}
                    max={900}
                    step={10}
                    value={specialDishTarget}
                    onChange={(e) => setSpecialDishTarget(Number(e.target.value) || 390)}
                    className="input-field font-mono font-bold text-white tracking-wide"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-gray-300 mb-4">
                  {Object.entries(baseSpecialDish).map(([name, data]) => (
                    <div key={name} className="neuro-inset p-2.5 rounded-xl bg-black/30 border border-white/5">
                      <p className="text-[10px] text-gray-400 capitalize font-mono">{name}</p>
                      <p className="text-white font-mono font-bold text-sm mt-0.5 tabular-nums">
                        {(data.grams * scale).toFixed(0)}g
                      </p>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                  <label className="flex items-center justify-between text-xs text-gray-300 cursor-pointer select-none">
                    <span className="font-bold">Equivalencias rápidas por macros</span>
                    <input
                      type="checkbox"
                      checked={macroQuickMode}
                      onChange={(e) => setMacroQuickMode(e.target.checked)}
                      className="rounded border-gray-600 bg-black text-[color:var(--app-accent)] focus:ring-0 w-4 h-4"
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
                        className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-gray-300 mt-3 pt-3 border-t border-white/5 overflow-hidden font-mono"
                      >
                        <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                          <strong className="text-red-400">+25g proteína:</strong> +120g pollo o +1 scoop whey
                        </div>
                        <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                          <strong className="text-amber-400">+30g carbos:</strong> +45g avena o +130g arroz
                        </div>
                        <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                          <strong className="text-sky-400">+10g grasas:</strong> +15g frutos secos o +12g aceite
                        </div>
                        <div className="p-2 rounded-lg bg-[color:var(--app-accent)]/10 border border-[color:var(--app-accent)]/20 font-bold text-white">
                          P {Math.round((diet.macros.protein / totalMacros) * 100)}% · C{' '}
                          {Math.round((diet.macros.carbs / totalMacros) * 100)}% · G{' '}
                          {Math.round((diet.macros.fat / totalMacros) * 100)}%
                        </div>
                      </motion.div>
                    ) : (
                      <motion.p
                        key="macros-off"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-[10px] text-gray-500 mt-1"
                      >
                        Activa el switch para ver reemplazos rápidos según macronutrientes.
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
