import { useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store/useAppStore';
import { Dumbbell, Utensils, Flame, Moon, Activity, Sparkles, Quote, Clock3, Camera, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, isValid, startOfWeek, endOfWeek } from 'date-fns';
import { AppCard, SectionHeader, StatPill } from '../components/ui';
import { fadeSlideUp, listStagger, timelineStagger, checkBounce } from '../lib/motion';
import { getMondayFirstIndex, mapRoutineByWeekday, computeSmartStreak } from '../lib/routineWeek';
import { workoutService } from '../services/workoutService';
import { generateProgressReport, ProgressReport } from '../services/geminiService';
import { ACHIEVEMENTS_CATALOG } from '../lib/achievements';

/** Circular SVG progress ring */
function CircularProgress({ value, size = 64 }: { value: number; size?: number }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const filled = Math.max(0, Math.min(100, value));
  const dashArray = `${(filled / 100) * circumference} ${circumference}`;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={radius} className="circular-ring-track" />
        <circle
          cx="28"
          cy="28"
          r={radius}
          className="circular-ring-fill"
          strokeDasharray={dashArray}
          strokeDashoffset="0"
          style={{ transformOrigin: '28px 28px' }}
        />
      </svg>
      <span className="absolute text-[10px] font-black text-white">{filled}%</span>
    </div>
  );
}

function FlipMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="neuro-inset px-3 py-2">
      <AnimatePresence mode="wait">
        <motion.p
          key={value}
          initial={{ opacity: 0, y: 8, rotateX: -45 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          exit={{ opacity: 0, y: -8, rotateX: 45 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="text-xl font-black text-white tracking-tight"
        >
          {value}
        </motion.p>
      </AnimatePresence>
      <p className="text-[10px] uppercase tracking-wider text-gray-400">{label}</p>
    </div>
  );
}

/** Parse HH:MM time string to integer hour. Defined outside component to avoid recreation on every render. */
function parseMealHour(time: string): number {
  const match = String(time || '').match(/^(\d{1,2}):/);
  return match ? parseInt(match[1], 10) : -1;
}

export default function Home() {
  const { profile, routine, diet, logs, insights, setTab, motivationPhrase, motivationPhoto, showToast, addLog, authToken, mealEatenRecord, progressPhotos, achievements } = useAppStore();
  const [syncState, setSyncState] = useState<'idle' | 'local' | 'syncing' | 'synced' | 'error'>('idle');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportProgress, setReportProgress] = useState(0);
  const reportProgressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [report, setReport] = useState<ProgressReport | null>(null);
  // Track whether the chart has animated once — avoid re-animating on every state update
  const chartAnimatedRef = useRef(false);

  // Simulate progress bar while report is loading
  useEffect(() => {
    if (reportLoading) {
      setReportProgress(0);
      let current = 0;
      reportProgressRef.current = setInterval(() => {
        current += Math.random() * 6 + 2; // random step 2–8%
        if (current >= 85) {
          current = 85;
          if (reportProgressRef.current) {
            clearInterval(reportProgressRef.current);
            reportProgressRef.current = null;
          }
        }
        setReportProgress(Math.round(current));
      }, 400);
    } else {
      if (reportProgressRef.current) {
        clearInterval(reportProgressRef.current);
        reportProgressRef.current = null;
      }
      // Jump to 100 briefly, then reset
      setReportProgress((prev) => (prev > 0 ? 100 : 0));
      const timeout = setTimeout(() => setReportProgress(0), 600);
      return () => clearTimeout(timeout);
    }
    return () => {
      if (reportProgressRef.current) {
        clearInterval(reportProgressRef.current);
        reportProgressRef.current = null;
      }
    };
  }, [reportLoading]);

  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long' });
  const routineByDay = useMemo(() => mapRoutineByWeekday(routine), [routine]);
  const todayRoutine = routineByDay[getMondayFirstIndex(new Date())];
  const todayDateKey = format(new Date(), 'yyyy-MM-dd');

  const parseTargetReps = (value: string) => {
    const match = String(value).match(/\d+/);
    return match ? Number(match[0]) : 10;
  };

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(12);
    }
  };

  const completedDays = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const uniqueDates = new Set(
      logs
        .filter((log) => {
          const d = new Date(log.date);
          return isValid(d) && d >= weekStart && d <= weekEnd;
        })
        .map((log) => format(new Date(log.date), 'yyyy-MM-dd'))
    );
    return uniqueDates.size;
  }, [logs]);

  const currentStreak = useMemo(() => {
    return computeSmartStreak(logs, routine);
  }, [logs, routine]);

  const chartData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayLogs = logs.filter((log) => format(new Date(log.date), 'yyyy-MM-dd') === dateStr);
      const maxWeight = dayLogs.length > 0 ? Math.max(...dayLogs.map((log) => log.weight)) : 0;

      data.push({
        name: format(date, 'EEE'),
        peso: maxWeight,
      });
    }

    return data;
  }, [logs]);

  const todayExerciseIds = useMemo(
    () => new Set(logs.filter((log) => format(new Date(log.date), 'yyyy-MM-dd') === todayDateKey).map((log) => log.exerciseId)),
    [logs, todayDateKey]
  );

  const routineCompletion = useMemo(() => {
    if (!todayRoutine?.exercises?.length) return 0;
    const total = todayRoutine.exercises.length;
    const done = todayRoutine.exercises.filter((exercise) => todayExerciseIds.has(exercise.id)).length;
    return Math.round((done / total) * 100);
  }, [todayRoutine, todayExerciseIds]);

  const quickLogSet = async () => {
    if (!todayRoutine?.exercises?.length) {
      setTab('workout');
      return;
    }

    const pending = todayRoutine.exercises.find((exercise) => !todayExerciseIds.has(exercise.id)) || todayRoutine.exercises[0];
    const newLog = {
      date: new Date().toISOString(),
      exerciseId: pending.id,
      weight: Number.isFinite(pending.weight) ? Math.max(0, pending.weight) : 0,
      reps: parseTargetReps(pending.reps),
    };

    addLog(newLog);
    setSyncState('local');

    if (!authToken) {
      showToast({
        type: 'success',
        title: 'Serie guardada localmente',
        message: `${pending.name}: ${newLog.weight}kg x ${newLog.reps}`,
      });
      return;
    }

    setSyncState('syncing');
    try {
      await workoutService.addLog(authToken, newLog);
      setSyncState('synced');
      showToast({
        type: 'success',
        title: 'Quick log sincronizado',
        message: `${pending.name}: ${newLog.weight}kg x ${newLog.reps}`,
      });
    } catch (error) {
      console.error('Error syncing quick log:', error);
      setSyncState('error');
      showToast({
        type: 'info',
        title: 'Guardado local, sync pendiente',
        message: 'No se pudo sincronizar ahora. Tu serie no se pierde.',
      });
    }
  };

  const weeklyConsistency = Math.min(Math.round((completedDays / 7) * 100), 100);
  const caloriesTarget = diet?.dailyCalories || 0;
  const mealCount = diet?.meals?.length || 0;
  const nutritionAdherence = mealCount > 0 ? Math.min(100, Math.round((mealCount / 5) * 100)) : 0;

  // ── Gamification XP / Level ──────────────────────────────
  // XP gains: 12 per completed set (more impactful), 8 per streak day (consistency bonus)
  const XP_PER_LOG = 12;
  const XP_PER_STREAK_DAY = 8;
  const XP_PER_LEVEL = 250;
  const MINUTES_PER_EXERCISE = 5; // average time estimate per exercise including rest

  const totalXP = useMemo(() => logs.length * XP_PER_LOG + currentStreak * XP_PER_STREAK_DAY, [logs.length, currentStreak]);
  const xpPerLevel = XP_PER_LEVEL;
  const level = Math.floor(totalXP / XP_PER_LEVEL) + 1;
  const xpInLevel = totalXP % XP_PER_LEVEL;
  const xpProgress = Math.round((xpInLevel / XP_PER_LEVEL) * 100);

  // Estimated workout duration based on number of exercises
  const estimatedMinutes = (todayRoutine?.exercises?.length || 0) * MINUTES_PER_EXERCISE;

  const sleepScore = useMemo(() => {
    if (!insights?.sleepRecommendation) return 72;
    const match = insights.sleepRecommendation.match(/(\d+(?:[.,]\d+)?)\s*hor/i);
    const hours = match ? Number(match[1].replace(',', '.')) : 7;
    const score = Math.round(Math.min(Math.max((hours / 8) * 100, 40), 100));
    return score;
  }, [insights?.sleepRecommendation]);

  const aiCoachCopy = useMemo(() => {
    if (sleepScore < 70) {
      return {
        title: '😴 Recuperación primero',
        subtitle: 'Dormiste poco. Baja volumen y prioriza técnica limpia hoy.',
        cta: '🛌 Modo recovery',
      };
    }

    if (routineCompletion < 45 && todayRoutine) {
      return {
        title: '🔥 Hoy toca. Sin excusas.',
        subtitle: `Completa al menos ${Math.max(1, Math.ceil(todayRoutine.exercises.length * 0.6))} ejercicios para cerrar el día en verde.`,
        cta: '🚀 Empezar ahora',
      };
    }

    return {
      title: '🎯 Ritmo perfecto',
      subtitle: 'Mantén intensidad y cuida la ejecución. +1% mejor hoy.',
      cta: '📋 Seguir plan',
    };
  }, [sleepScore, routineCompletion, todayRoutine]);

  const bentoCards = useMemo(() => {
    const cards = [
      {
        id: 'consistency',
        title: '📊 Consistencia semanal',
        value: `${weeklyConsistency}%`,
        subtitle: currentStreak > 0 ? `🔥 ${currentStreak} días en racha` : '🚀 Inicia tu racha hoy',
        icon: Activity,
      },
      {
        id: 'calories',
        title: '🔥 Objetivo calórico',
        value: `${caloriesTarget}`,
        subtitle: mealCount > 0 ? `🍽️ ${mealCount} comidas planificadas` : '⚠️ Sin plan nutricional',
        icon: Flame,
      },
      {
        id: 'recovery',
        title: '😴 Recuperación',
        value: `${sleepScore}%`,
        subtitle: '🌙 Estado de descanso',
        icon: Moon,
      },
      {
        id: 'nutrition',
        title: '🥗 Adherencia nutricional',
        value: `${nutritionAdherence}%`,
        subtitle: '✅ Cumplimiento del día',
        icon: Utensils,
      },
    ];

    if (sleepScore < 70) {
      return [cards[2], cards[0], cards[1], cards[3]];
    }

    if (routineCompletion < 45) {
      return [cards[0], cards[2], cards[1], cards[3]];
    }

    return cards;
  }, [weeklyConsistency, currentStreak, caloriesTarget, mealCount, sleepScore, nutritionAdherence, routineCompletion]);

  const eatenTodayMeals = mealEatenRecord[todayDateKey] ?? [];

  const isBreakfastEaten = useMemo(() => {
    if (!diet?.meals) return false;
    return diet.meals.some((m) => {
      const hour = parseMealHour(m.time);
      const n = String(m.name || '').toLowerCase();
      const isBreakfast = (hour >= 6 && hour <= 10) || n.includes('desay');
      return isBreakfast && eatenTodayMeals.includes(m.id);
    });
  }, [diet?.meals, eatenTodayMeals]);

  const isLunchEaten = useMemo(() => {
    if (!diet?.meals) return false;
    return diet.meals.some((m) => {
      const hour = parseMealHour(m.time);
      const n = String(m.name || '').toLowerCase();
      const isLunch = (hour >= 12 && hour <= 16) || n.includes('comida');
      return isLunch && eatenTodayMeals.includes(m.id);
    });
  }, [diet?.meals, eatenTodayMeals]);

  const hasProgressPhotoToday = useMemo(() => {
    return progressPhotos.some((p) => p.date.slice(0, 10) === todayDateKey);
  }, [progressPhotos, todayDateKey]);

  const timelineItems = [
    {
      time: profile?.mealTimes?.breakfast || '08:00',
      title: '🥣 Desayuno de arranque',
      done: isBreakfastEaten,
    },
    {
      time: profile?.mealTimes?.lunch || '14:00',
      title: '🍗 Comida principal',
      done: isLunchEaten,
    },
    {
      time: 'Entreno',
      title: `💪 ${todayRoutine?.focus || 'Sesión rápida'}`,
      done: routineCompletion >= 100,
    },
    {
      time: 'Progreso',
      title: '📸 Subir foto del día',
      done: hasProgressPhotoToday,
    },
  ];

  const handleGenerateReport = async () => {
    setReportLoading(true);
    try {
      const response = await generateProgressReport({
        profile,
        logs,
        routine,
        diet,
        progressPhotos: progressPhotos.map((p) => ({ date: p.date })),
      }, authToken);
      setReport(response);
      showToast({
        type: 'success',
        title: 'Informe generado',
        message: 'Revisa tu estado actual y los siguientes pasos recomendados.',
      });
    } catch (error) {
      console.error('Error generating progress report:', error);
      showToast({
        type: 'error',
        title: 'No se pudo generar el informe',
        message: error instanceof Error ? error.message : 'Intentalo de nuevo en unos segundos.',
      });
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="min-h-screen app-shell px-4 safe-top md:px-6 safe-bottom">
      <div className="page-wrap">
      <header className="flex justify-between items-center mb-7 mt-2">
        <div>
          <p className="text-xs uppercase tracking-[0.23em] text-gray-500">⚡ VoltBody OS</p>
          <h1 className="brutal-title text-white leading-none mt-1.5">
            {profile?.name ? `👋 Hola, ${profile.name}` : '🦁 Modo Bestia'}
          </h1>
          <p className="text-gray-400 capitalize text-sm mt-2">{today} · {routineCompletion}% sesión</p>
        </div>
        <div className="w-12 h-12 panel-soft rounded-2xl flex items-center justify-center">
          <Flame className="app-accent" />
        </div>
      </header>

      {insights?.dailyQuote && (
        <motion.div
          initial={fadeSlideUp.initial}
          animate={fadeSlideUp.animate}
          transition={fadeSlideUp.transition}
          className="mb-8"
        >
          <AppCard accent className="rounded-2xl p-4 flex gap-3 items-start glass-panel">
            <Quote className="app-accent flex-shrink-0 mt-1" size={20} />
            <p className="text-sm app-accent italic font-medium">{insights.dailyQuote}</p>
          </AppCard>
        </motion.div>
      )}

      <motion.div
        initial={fadeSlideUp.initial}
        animate={fadeSlideUp.animate}
        transition={fadeSlideUp.transition}
        className="mb-8"
      >
        <AppCard accent interactive className="p-6 glass-panel dynamic-glow-card">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-400 mb-2">🏆 Hoy conquistas</p>
              <h2 className="text-3xl font-black leading-none tracking-tight">
                <span className="headline-gradient">
                  {todayRoutine?.focus || 'Recuperación activa'}
                </span>
                {todayRoutine?.focus && <span> 💀🔥</span>}
              </h2>
              <p className="text-sm text-gray-300 mt-3">
                {todayRoutine
                  ? `⚡ ${estimatedMinutes} min · 🔥 ${caloriesTarget} kcal · ${todayRoutine.exercises.length} ejercicios`
                  : 'Sin rutina cargada. Activa una sesión rápida en menos de 2 min'}
              </p>
            </div>
            <CircularProgress value={routineCompletion} size={68} />
          </div>

          <div className="grid grid-cols-2 gap-2 mb-5">
            <FlipMetric value={`${currentStreak}🔥`} label="Racha días" />
            <FlipMetric value={`Nv. ${level} ⚡`} label={`${xpInLevel}/${xpPerLevel} XP`} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <motion.button
              onClick={() => setTab('workout')}
              whileTap={{ scale: 0.96 }}
              onTapStart={triggerHaptic}
              className="tap-target pulse-surface pressable primary-btn rounded-xl py-3.5 px-4 font-bold text-sm transition-base flex items-center justify-center gap-2"
            >
              <Zap size={15} className="shrink-0" />
              Empezar sesión
            </motion.button>
            <motion.button
              onClick={() => setTab('diet')}
              whileTap={{ scale: 0.97 }}
              onTapStart={triggerHaptic}
              className="tap-target pulse-surface pressable secondary-btn rounded-xl text-white font-semibold py-3.5 px-4 hover:border-[color:var(--app-accent)]/40 transition-base"
            >
              Optimizar comida 🍽️
            </motion.button>
          </div>
        </AppCard>
      </motion.div>

      {/* ── Gamification XP bar ──────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.26, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8"
      >
        <AppCard className="p-4 glass-panel">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Zap size={14} className="app-accent" />
              <span className="text-sm font-black text-white">Nivel {level}</span>
              <span className="text-[10px] text-gray-500 font-mono">· {totalXP} XP total</span>
            </div>
            <span className="text-[10px] font-mono text-gray-400">{xpInLevel}/{xpPerLevel} XP</span>
          </div>
          <div className="h-2 w-full neuro-progress-track mb-3">
            <motion.div
              className="xp-bar-fill"
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress}%` }}
              transition={{ duration: 0.9, ease: [0.34, 1.1, 0.64, 1], delay: 0.4 }}
            />
          </div>
          <div className="flex gap-5 flex-wrap text-xs text-gray-400">
            <span>🔥 {currentStreak} días racha</span>
            <span>💪 {logs.length} series totales</span>
            <span>📊 {weeklyConsistency}% semana</span>
          </div>
        </AppCard>
      </motion.div>

      {achievements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <AppCard className="p-4 glass-panel">
            <SectionHeader title="🏅 Logros desbloqueados" subtitle={`${achievements.length} de ${ACHIEVEMENTS_CATALOG.length}`} />
            <div className="flex flex-wrap gap-2 mt-3">
              {achievements.map((a) => (
                <div
                  key={a.id}
                  title={a.description}
                  className="flex items-center gap-1.5 px-3 py-1.5 neuro-inset rounded-full text-xs font-semibold text-white"
                >
                  <span>{a.icon}</span>
                  <span>{a.label}</span>
                </div>
              ))}
            </div>
          </AppCard>
        </motion.div>
      )}

      <div className="bento-grid mb-8">
        <motion.div {...listStagger(0)} className="bento-primary">
          <AppCard interactive className="h-full p-5 glass-panel">
            <SectionHeader title={bentoCards[0].title} icon={bentoCards[0].icon} />
            <p className="text-4xl font-black tracking-tight headline-gradient mb-2">{bentoCards[0].value}</p>
            <p className="text-sm text-gray-400 mb-4">{bentoCards[0].subtitle}</p>
            <div className="h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="voltGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--app-accent)" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="var(--app-accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'color-mix(in srgb, var(--app-surface) 85%, transparent)', border: '1px solid var(--app-border)', borderRadius: '10px' }}
                    itemStyle={{ color: 'var(--app-accent)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="peso"
                    stroke="var(--app-accent)"
                    strokeWidth={2.5}
                    fill="url(#voltGradient)"
                    dot={false}
                    activeDot={{ r: 5, fill: 'var(--app-accent)', strokeWidth: 0 }}
                    isAnimationActive={!chartAnimatedRef.current}
                    animationDuration={900}
                    animationEasing="ease-out"
                    onAnimationEnd={() => { chartAnimatedRef.current = true; }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </AppCard>
        </motion.div>

        {bentoCards.slice(1).map((card, index) => (
          <motion.div key={card.id} {...listStagger(index + 1)}>
            <AppCard interactive className="h-full p-4 glass-panel">
              <div className="flex items-center justify-between mb-3">
                <card.icon className="app-accent" size={18} />
                <StatPill label="status" value="live" />
              </div>
              <p className="text-2xl font-black text-white tracking-tight">{card.value}</p>
              <p className="text-xs uppercase tracking-wider text-gray-500 mt-1">{card.title}</p>
              <p className="text-xs text-gray-400 mt-2">{card.subtitle}</p>
            </AppCard>
          </motion.div>
        ))}
      </div>

      <AppCard className="mb-8 p-5 glass-panel" accent>
        <SectionHeader title={aiCoachCopy.title} icon={Sparkles} subtitle="AI Coach en tiempo real" />
        <p className="text-sm text-gray-200">{aiCoachCopy.subtitle}</p>
      </AppCard>

      <AppCard className="mb-8 p-5 glass-panel">
        <SectionHeader title="🤖 Informe IA de progreso" icon={Activity} />
        <p className="text-sm text-gray-400 mb-4">
          Analiza tus historiales (entrenos, rutina, dieta y fotos) y te dice cómo vas, porcentaje de avance y cuánto te falta para verte mejor.
        </p>
        <button
          type="button"
          onClick={() => void handleGenerateReport()}
          disabled={reportLoading}
          className="tap-target pressable primary-btn w-full rounded-xl py-3 px-4 font-bold disabled:opacity-60"
        >
          {reportLoading ? 'Generando informe...' : 'Generar informe con IA'}
        </button>
        <AnimatePresence>
          {reportLoading && (
            <motion.div
              key="report-progress"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 space-y-1"
            >
              <div className="flex justify-between text-[10px] font-mono text-gray-500">
                <span>Analizando datos con IA…</span>
                <span>{reportProgress}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'var(--app-accent)' }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${reportProgress}%` }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {report && (
          <div className="mt-5 space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="neuro-inset p-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-500">Score total</p>
                <p className="text-xl font-black text-white">{report.overallScore}%</p>
              </div>
              <div className="neuro-inset p-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-500">Progreso</p>
                <p className="text-xl font-black text-white">{report.progressPercent}%</p>
              </div>
              <div className="neuro-inset p-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-500">Consistencia</p>
                <p className="text-xl font-black text-white">{report.consistencyPercent}%</p>
              </div>
              <div className="neuro-inset p-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-500">Te falta</p>
                <p className="text-xl font-black text-white">{report.weeksToVisibleChange} sem</p>
              </div>
            </div>
            <div className="neuro-inset p-3">
              <p className="text-sm text-gray-200">{report.summary}</p>
            </div>
            <div className="neuro-inset p-3">
              <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">Que puedes mejorar</p>
              <ul className="space-y-1 text-sm text-gray-300">
                {report.improvements?.map((item, index) => (
                  <li key={`imp-${index}`}>• {item}</li>
                ))}
              </ul>
            </div>
            <div className="neuro-inset p-3">
              <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">Siguientes pasos</p>
              <ul className="space-y-1 text-sm text-gray-300">
                {report.nextActions?.map((item, index) => (
                  <li key={`next-${index}`}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </AppCard>

      <motion.div {...listStagger(2)}>
      <AppCard className="mb-8 p-5 glass-panel">
        <SectionHeader title="📅 Timeline del día" icon={Clock3} />
        <div className="space-y-3">
          {timelineItems.map((item, index) => (
            <motion.div
              key={`${item.time}-${item.title}`}
              {...timelineStagger(index)}
              className={`flex items-center gap-3 neuro-inset p-3 rounded-xl transition-all ${
                item.done ? 'border border-[color:var(--app-accent)]/20' : ''
              }`}
            >
              <AnimatePresence mode="wait" initial={false}>
                {item.done ? (
                  <motion.div key="done-dot" {...checkBounce} className="timeline-dot done" />
                ) : (
                  <motion.div key="pending-dot" initial={{ opacity: 1 }} animate={{ opacity: 1 }} className="timeline-dot" />
                )}
              </AnimatePresence>
              <div className="min-w-[54px] text-xs font-mono text-gray-400">{item.time}</div>
              <p className="text-sm text-white flex-1">{item.title}</p>
              <AnimatePresence mode="wait" initial={false}>
                {item.done ? (
                  <motion.span
                    key="done-label"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2, ease: [0.34, 1.2, 0.64, 1] }}
                    className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400"
                  >
                    Hecho ✓
                  </motion.span>
                ) : (
                  <motion.span
                    key="pending-label"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 1 }}
                    className="text-[10px] font-semibold uppercase tracking-wider text-gray-500"
                  >
                    Pendiente
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </AppCard>
      </motion.div>

      <motion.div {...listStagger(3)}>
      <AppCard className="mb-8 p-5 glass-panel">
        <SectionHeader title="⚡ Acciones rápidas" subtitle="Un toque y listo" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onTapStart={triggerHaptic}
            onClick={() => void quickLogSet()}
            className="interactive-tile tap-target pressable pulse-surface neuro-raised ripple-host px-3 py-4 text-xs font-semibold text-white"
          >
            <Dumbbell size={16} className="mx-auto mb-2 app-accent" />
            Registrar serie 📝
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onTapStart={triggerHaptic}
            onClick={() => setTab('diet')}
            className="interactive-tile tap-target pressable pulse-surface neuro-raised ripple-host px-3 py-4 text-xs font-semibold text-white"
          >
            <Utensils size={16} className="mx-auto mb-2 app-accent" />
            Swap meal 🔄
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onTapStart={triggerHaptic}
            onClick={() => setTab('profile')}
            className="interactive-tile tap-target pressable pulse-surface neuro-raised ripple-host px-3 py-4 text-xs font-semibold text-white"
          >
            <Camera size={16} className="mx-auto mb-2 app-accent" />
            Subir progreso 📸
          </motion.button>
        </div>
        <div className="mt-3 text-xs text-gray-400 flex items-center gap-1.5">
          <span>Sync:</span>
          {syncState === 'idle' && <span className="text-gray-500">⏸ sin actividad</span>}
          {syncState === 'local' && <span className="text-gray-300">💾 guardado local</span>}
          {syncState === 'syncing' && <span className="text-gray-300">⟳ sincronizando...</span>}
          {syncState === 'synced' && <span className="text-emerald-400">✓ sincronizado</span>}
          {syncState === 'error' && <span className="text-amber-300">⚠ error de sincronización</span>}
        </div>
      </AppCard>
      </motion.div>

      <AppCard className="mb-4 p-0 overflow-hidden glass-panel" accent>
        <div className="relative min-h-[170px]">
          {motivationPhoto ? (
            <img
              src={motivationPhoto}
              alt="Motivación"
              width={600}
              height={170}
              className="w-full h-[170px] object-cover"
              style={{ aspectRatio: '60/17' }}
            />
          ) : (
            <div className="w-full h-[170px] bg-gradient-to-br from-[color:var(--app-accent)]/20 to-black" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent p-4 flex items-end">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-300 mb-1">🧠 Modo mental</p>
              <p className="text-base font-bold text-white max-w-[90%]">
                {motivationPhrase || 'Hoy toca. Sin excusas.'}
              </p>
            </div>
          </div>
        </div>
      </AppCard>
      </div>
    </div>
  );
}
