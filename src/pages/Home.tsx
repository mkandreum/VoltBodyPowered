import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store/useAppStore';
import { Dumbbell, Utensils, Flame, Moon, Activity, Sparkles, Quote, Clock3, Camera } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';
import { AppCard, SectionHeader, StatPill } from '../components/ui';
import { fadeSlideUp, listStagger } from '../lib/motion';

function FlipMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-black/35 px-3 py-2">
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

export default function Home() {
  const { profile, routine, diet, logs, insights, setTab, motivationPhrase, motivationPhoto, showToast } = useAppStore();

  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long' });
  const dayIndex = new Date().getDay();
  const routineIndex = dayIndex === 0 ? 6 : dayIndex - 1;
  const todayRoutine = routine?.length > 0 ? routine[routineIndex % routine.length] : null;
  const todayDateKey = format(new Date(), 'yyyy-MM-dd');

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(12);
    }
  };

  const completedDays = useMemo(() => {
    const uniqueDates = new Set(logs.map((log) => format(new Date(log.date), 'yyyy-MM-dd')));
    return uniqueDates.size;
  }, [logs]);

  const currentStreak = useMemo(() => {
    if (logs.length === 0) return 0;

    const dateSet = new Set(logs.map((log) => format(new Date(log.date), 'yyyy-MM-dd')));
    let streak = 0;
    let cursor = new Date();

    while (dateSet.has(format(cursor, 'yyyy-MM-dd'))) {
      streak += 1;
      cursor = subDays(cursor, 1);
    }

    return streak;
  }, [logs]);

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

  const weeklyConsistency = Math.min(Math.round((completedDays / 7) * 100), 100);
  const caloriesTarget = diet?.dailyCalories || 0;
  const mealCount = diet?.meals?.length || 0;
  const nutritionAdherence = mealCount > 0 ? Math.min(100, Math.round((mealCount / 5) * 100)) : 0;

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

  const timelineItems = [
    {
      time: profile?.mealTimes?.breakfast || '08:00',
      title: '🥣 Desayuno de arranque',
      done: false,
    },
    {
      time: profile?.mealTimes?.lunch || '14:00',
      title: '🍗 Comida principal',
      done: false,
    },
    {
      time: 'Entreno',
      title: `💪 ${todayRoutine?.focus || 'Sesión rápida'}`,
      done: routineCompletion >= 100,
    },
    {
      time: 'Progreso',
      title: '📸 Subir foto del día',
      done: false,
    },
  ];

  return (
    <div className="min-h-screen app-shell px-4 pt-5 md:px-6 safe-bottom">
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
        <AppCard accent interactive className="p-6 glass-panel">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-gray-400 mb-2">🏆 Hoy conquistas</p>
              <h2 className="text-3xl font-black leading-none tracking-tight headline-gradient">
                {todayRoutine?.focus || 'Recuperación activa'}
              </h2>
              <p className="text-sm text-gray-300 mt-3">
                {todayRoutine
                  ? `${todayRoutine.exercises.length} ejercicios cargados para cerrar en verde`
                  : 'Sin rutina cargada. Activa una sesión rápida en menos de 2 min'}
              </p>
            </div>
            <Sparkles className="app-accent shrink-0" />
          </div>

          <div className="grid grid-cols-3 gap-2 mb-5">
            <FlipMetric value={`${currentStreak}🔥`} label="Racha" />
            <FlipMetric value={`${routineCompletion}%`} label="Sesión" />
            <FlipMetric value={`${caloriesTarget}`} label="Kcal" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <motion.button
              onClick={() => setTab('workout')}
              whileTap={{ scale: 0.98 }}
              onTapStart={triggerHaptic}
              className="tap-target pulse-surface pressable primary-btn rounded-xl py-3 px-4 transition-base"
            >
              Empezar sesión ⚡
            </motion.button>
            <motion.button
              onClick={() => setTab('diet')}
              whileTap={{ scale: 0.98 }}
              onTapStart={triggerHaptic}
              className="tap-target pulse-surface pressable secondary-btn rounded-xl text-white font-semibold py-3 px-4 hover:border-[color:var(--app-accent)]/40 transition-base"
            >
              Optimizar comida 🍽️
            </motion.button>
          </div>
        </AppCard>
      </motion.div>

      <div className="bento-grid mb-8">
        <motion.div {...listStagger(0)} className="bento-primary">
          <AppCard interactive className="h-full p-5 glass-panel">
            <SectionHeader title={bentoCards[0].title} icon={bentoCards[0].icon} />
            <p className="text-4xl font-black tracking-tight headline-gradient mb-2">{bentoCards[0].value}</p>
            <p className="text-sm text-gray-400 mb-4">{bentoCards[0].subtitle}</p>
            <div className="h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'color-mix(in srgb, var(--app-surface) 85%, transparent)', border: '1px solid var(--app-border)', borderRadius: '10px' }}
                    itemStyle={{ color: 'var(--app-accent)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="peso"
                    stroke="var(--app-accent)"
                    strokeWidth={3}
                    dot={{ r: 0 }}
                    activeDot={{ r: 5, fill: 'var(--app-accent)' }}
                  />
                </LineChart>
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
        <p className="text-sm text-gray-200 mb-4">{aiCoachCopy.subtitle}</p>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onTapStart={triggerHaptic}
          onClick={() => {
            showToast({
              type: 'info',
              title: 'Sugerencia activada',
              message: aiCoachCopy.subtitle,
            });
          }}
          className="pressable pulse-surface rounded-xl border border-[var(--app-accent)]/40 px-4 py-3 text-sm font-bold text-white"
        >
          {aiCoachCopy.cta}
        </motion.button>
      </AppCard>

      <AppCard className="mb-8 p-5 glass-panel">
        <SectionHeader title="📅 Timeline del día" icon={Clock3} />
        <div className="space-y-3">
          {timelineItems.map((item, index) => (
            <motion.div
              key={`${item.time}-${item.title}`}
              {...listStagger(index)}
              className="flex items-center gap-3 rounded-xl border border-[var(--app-border)] bg-black/35 p-3"
            >
              <div className={`timeline-dot ${item.done ? 'done' : ''}`} />
              <div className="min-w-[54px] text-xs font-mono text-gray-400">{item.time}</div>
              <p className="text-sm text-white flex-1">{item.title}</p>
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${item.done ? 'text-emerald-400' : 'text-gray-500'}`}>
                {item.done ? 'Hecho' : 'Pendiente'}
              </span>
            </motion.div>
          ))}
        </div>
      </AppCard>

      <AppCard className="mb-8 p-5 glass-panel">
        <SectionHeader title="⚡ Acciones rápidas" subtitle="Un toque y listo" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onTapStart={triggerHaptic}
            onClick={() => setTab('workout')}
            className="interactive-tile tap-target pressable pulse-surface rounded-xl border border-[var(--app-border)] bg-black/35 px-3 py-4 text-xs font-semibold text-white"
          >
            <Dumbbell size={16} className="mx-auto mb-2 app-accent" />
            Registrar serie 📝
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onTapStart={triggerHaptic}
            onClick={() => setTab('diet')}
            className="interactive-tile tap-target pressable pulse-surface rounded-xl border border-[var(--app-border)] bg-black/35 px-3 py-4 text-xs font-semibold text-white"
          >
            <Utensils size={16} className="mx-auto mb-2 app-accent" />
            Swap meal 🔄
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onTapStart={triggerHaptic}
            onClick={() => setTab('profile')}
            className="interactive-tile tap-target pressable pulse-surface rounded-xl border border-[var(--app-border)] bg-black/35 px-3 py-4 text-xs font-semibold text-white"
          >
            <Camera size={16} className="mx-auto mb-2 app-accent" />
            Subir progreso 📸
          </motion.button>
        </div>
      </AppCard>

      <AppCard className="mb-4 p-0 overflow-hidden glass-panel" accent>
        <div className="relative min-h-[170px]">
          {motivationPhoto ? (
            <img src={motivationPhoto} alt="Motivación" className="w-full h-[170px] object-cover" />
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
