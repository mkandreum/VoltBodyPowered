import { useMemo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore, Exercise, WorkoutDay } from '../store/useAppStore';
import { ChevronLeft, Play, CheckCircle2, Dumbbell, PlusCircle, Trash2, Star, CalendarClock, Flame } from 'lucide-react';
import { workoutService } from '../services/workoutService';
import { authService } from '../services/authService';
import { enrichRoutine, routineNeedsEnrichment } from '../services/exerciseImageService';
import { AppCard, SectionHeader, StatPill } from '../components/ui';
import { listStagger, slideUpSheet, checkBounce, successBurst, completionGlow, tapPulse, timelineStagger } from '../lib/motion';
import { WEEKDAY_LABELS, getMondayFirstIndex, mapRoutineByWeekday } from '../lib/routineWeek';
import { format } from 'date-fns';
import WeightCalculator from '../components/WeightCalculator';



export default function Workout() {
  const {
    routine,
    addLog,
    customWorkout,
    exerciseLibrary,
    addToCustomWorkout,
    removeFromCustomWorkout,
    setRoutine,
    profile,
    authToken,
    showToast,
    logs,
  } = useAppStore();
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [weightInput, setWeightInput] = useState<number>(0);
  const [repsInput, setRepsInput] = useState<number>(0);
  const [setsInput, setSetsInput] = useState<number>(1);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('Todos');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() => getMondayFirstIndex(new Date()));
  const [isEditingDays, setIsEditingDays] = useState(false);
  const [moveSourceDayIndex, setMoveSourceDayIndex] = useState<number | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'local' | 'syncing' | 'synced' | 'error'>('idle');

  // Stable callback passed to WeightCalculator — avoids stale-closure issue with onWeightChange
  const handleCalculatorWeightChange = useCallback((w: number) => setWeightInput(w), []);

  const routinesByDay = useMemo(() => mapRoutineByWeekday(routine), [routine]);
  const activeDayIndexes = useMemo(
    () => routinesByDay.map((entry, index) => (entry ? index : -1)).filter((index) => index >= 0),
    [routinesByDay]
  );

  const selectedRoutine = routinesByDay[selectedDayIndex] || undefined;
  const todayRoutine = selectedRoutine;
  const muscleGroups = ['Todos', ...Array.from(new Set(exerciseLibrary.map((item) => item.muscleGroup)))];
  const filteredLibrary = selectedMuscleGroup === 'Todos'
    ? exerciseLibrary
    : exerciseLibrary.filter((item) => item.muscleGroup === selectedMuscleGroup);
  const totalTodayExercises = todayRoutine?.exercises?.length || 0;
  const todayDateKey = format(new Date(), 'yyyy-MM-dd');
  const todayLogs = useMemo(() => logs.filter((log) => log.date.slice(0, 10) === todayDateKey), [logs, todayDateKey]);
  const setsByExercise = useMemo(() => {
    return todayLogs.reduce<Map<string, number>>((acc, log) => {
      acc.set(log.exerciseId, (acc.get(log.exerciseId) || 0) + 1);
      return acc;
    }, new Map());
  }, [todayLogs]);
  const plannedSets = useMemo(
    () => (todayRoutine?.exercises || []).reduce((sum, exercise) => sum + Math.max(1, Number(exercise.sets || 0)), 0),
    [todayRoutine]
  );
  const completedSets = useMemo(
    () => (todayRoutine?.exercises || []).reduce((sum, exercise) => {
      const done = setsByExercise.get(exercise.id) || 0;
      const target = Math.max(1, Number(exercise.sets || 0));
      return sum + Math.min(done, target);
    }, 0),
    [todayRoutine, setsByExercise]
  );
  const sessionProgress = plannedSets > 0 ? Math.round((completedSets / plannedSets) * 100) : 0;
  const etaMinutes = Math.max(0, (plannedSets - completedSets) * 2);
  const todayLabel = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(new Date());
  const isSpecialClassToday =
    Boolean(profile?.weeklySpecialSession?.enabled) &&
    profile?.weeklySpecialSession?.day?.toLowerCase() === todayLabel.toLowerCase();

  useEffect(() => {
    if (routinesByDay[selectedDayIndex]) return;
    const todayIndex = getMondayFirstIndex(new Date());
    if (routinesByDay[todayIndex]) {
      setSelectedDayIndex(todayIndex);
      return;
    }
    if (activeDayIndexes.length > 0) {
      setSelectedDayIndex(activeDayIndexes[0]);
    }
  }, [selectedDayIndex, routinesByDay, activeDayIndexes]);

  // Silently enrich GIFs for existing users whose routines have empty gifUrls
  useEffect(() => {
    if (!authToken || !routine.length || !routineNeedsEnrichment(routine)) return;
    let cancelled = false;
    (async () => {
      const enriched = await enrichRoutine(routine, authToken);
      if (cancelled || !routineNeedsEnrichment(enriched)) return;
      // Only update if something actually changed
      const hasChanges = enriched.some((day, di) =>
        day.exercises.some((ex, ei) => ex.gifUrl !== routine[di]?.exercises[ei]?.gifUrl)
      );
      if (!hasChanges) return;
      setRoutine(enriched);
      try {
        await authService.updateProfile(authToken, { routine: enriched });
      } catch { /* non-fatal: store is already updated locally */ }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]); // Run once on mount

  const moveTrainingDay = async (sourceIndex: number, targetIndex: number) => {
    const sourceRoutine = routinesByDay[sourceIndex];
    if (!sourceRoutine) return;

    const draft: Array<WorkoutDay | null> = [...routinesByDay];
    draft[sourceIndex] = null;
    draft[targetIndex] = {
      ...sourceRoutine,
      day: WEEKDAY_LABELS[targetIndex].full,
    };

    const updatedRoutine = draft.filter(Boolean) as WorkoutDay[];
    setRoutine(updatedRoutine);
    setSelectedDayIndex(targetIndex);
    setMoveSourceDayIndex(null);
    setIsEditingDays(false);

    if (authToken) {
      try {
        await authService.updateProfile(authToken, { routine: updatedRoutine });
      } catch (error) {
        console.error('Error saving updated training days:', error);
        showToast({
          type: 'info',
          title: 'Cambio guardado localmente',
          message: 'No se pudo sincronizar ahora mismo.',
        });
      }
    }

    showToast({
      type: 'success',
      title: 'Dias de entreno actualizados',
      message: `${WEEKDAY_LABELS[sourceIndex].full} movido a ${WEEKDAY_LABELS[targetIndex].full}.`,
    });
  };

  const handleWeekdayTap = async (index: number) => {
    const hasRoutine = Boolean(routinesByDay[index]);

    if (!isEditingDays) {
      if (hasRoutine) {
        setSelectedDayIndex(index);
      }
      return;
    }

    if (moveSourceDayIndex === null) {
      if (!hasRoutine) {
        showToast({
          type: 'info',
          title: 'Elige un dia con entreno',
          message: 'Primero selecciona el dia que quieres mover.',
        });
        return;
      }
      setMoveSourceDayIndex(index);
      return;
    }

    if (index === moveSourceDayIndex) {
      setMoveSourceDayIndex(null);
      return;
    }

    if (hasRoutine) {
      showToast({
        type: 'info',
        title: 'Dia ocupado',
        message: 'Selecciona un dia bloqueado para mover el entreno.',
      });
      return;
    }

    await moveTrainingDay(moveSourceDayIndex, index);
  };

  const handleLog = async () => {
    if (selectedExercise && weightInput > 0 && repsInput > 0) {
      const count = Math.max(1, setsInput);
      const newLogs = Array.from({ length: count }, () => ({
        date: new Date().toISOString(),
        exerciseId: selectedExercise.id,
        weight: weightInput,
        reps: repsInput,
      }));

      newLogs.forEach((log) => addLog(log));
      setSyncStatus('local');

      if (authToken) {
        try {
          setSyncStatus('syncing');
          await Promise.all(newLogs.map((log) => workoutService.addLog(authToken, log)));
          setSyncStatus('synced');
        } catch (error) {
          console.error('Error persisting workout log:', error);
          setSyncStatus('error');
        }
      }

      showToast({
        type: 'success',
        title: count > 1 ? `${count} series guardadas 💪` : 'Serie guardada 💪',
        message: `${weightInput}kg x ${repsInput} reps`,
      });
      setWeightInput(0);
      setRepsInput(0);
      setSetsInput(1);
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=400&auto=format&fit=crop';
  };

  return (
    <div className="min-h-screen app-shell px-4 safe-top md:px-6 safe-bottom">
      <div className="page-wrap">
      <header className="mb-8 mt-2">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3 tracking-tight">
          <Dumbbell className="app-accent" size={32} />
          💪 Rutina de Hoy
        </h1>
        <p className="app-accent font-mono text-sm glow-text">{todayRoutine?.focus || 'Hoy toca activar el cuerpo'}</p>
      </header>

      <motion.div {...listStagger(0)}>
      <AppCard className="mb-5 p-4 glass-panel">
        <SectionHeader
          title="Semana de entrenamiento"
          subtitle={
            isEditingDays
              ? 'Paso 1: toca un dia activo. Paso 2: toca un dia bloqueado para moverlo.'
              : 'Selecciona un dia. Los dias sin plan quedan bloqueados.'
          }
          right={
            <button
              type="button"
              onClick={() => {
                setIsEditingDays((prev) => !prev);
                setMoveSourceDayIndex(null);
              }}
              aria-label={isEditingDays ? 'Cancelar edición de días' : 'Editar días de entrenamiento'}
              className="tap-target neuro-raised px-3 py-2 text-[11px] font-semibold text-gray-300 transition-all hover:text-white"
            >
              {isEditingDays ? 'Cancelar' : 'Editar dias de entreno'}
            </button>
          }
        />
        <div className="grid grid-cols-7 gap-2">
          {WEEKDAY_LABELS.map((day, index) => {
            const hasRoutine = Boolean(routinesByDay[index]);
            const isSelected = selectedDayIndex === index;
            const isMoveSource = moveSourceDayIndex === index;

            return (
              <button
                key={day.key}
                type="button"
                onClick={() => void handleWeekdayTap(index)}
                disabled={!isEditingDays && !hasRoutine}
                className={[
                  'tap-target rounded-xl border px-1 py-2 text-center text-[11px] font-semibold transition-all',
                  !isEditingDays && hasRoutine ? 'pressable cursor-pointer' : '',
                  !isEditingDays && !hasRoutine ? 'cursor-not-allowed opacity-45' : '',
                  isEditingDays && !hasRoutine ? 'cursor-pointer opacity-75' : '',
                  isEditingDays && isMoveSource ? 'border-amber-400 bg-amber-500/20 text-amber-200' : '',
                  isSelected
                    ? 'border-[color:var(--app-accent)]/60 text-[var(--app-accent)] shadow-[inset_2px_2px_6px_var(--neuro-shadow-dark),0_0_10px_color-mix(in_srgb,var(--app-accent)_18%,transparent)]'
                    : 'border-[color:var(--neuro-shadow-light)]/50 text-gray-300 shadow-[3px_3px_8px_var(--neuro-shadow-dark),-2px_-2px_6px_var(--neuro-shadow-light)]',
                  isEditingDays && !hasRoutine ? 'border-dashed' : '',
                ].join(' ')}
              >
                {day.short}
              </button>
            );
          })}
        </div>
      </AppCard>
      </motion.div>

      <motion.div {...listStagger(1)}>
      <AppCard accent interactive className="mb-8 p-6 glass-panel">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-gray-400 mb-2">🎯 Sesión Prioritaria</p>
            <h2 className="text-3xl font-black leading-none tracking-tight headline-gradient">
              {todayRoutine?.focus || 'Crea tu sesión personalizada'}
            </h2>
            <p className="text-sm text-gray-300 mt-2">
              {todayRoutine
                ? `${totalTodayExercises} ejercicios listos para ejecutar. Hoy toca. Sin excusas.`
                : 'No hay rutina asignada hoy. Arma una sesión en 1 minuto.'}
            </p>
          </div>
          <Flame className="app-accent shrink-0" />
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatPill label="estado" value={todayRoutine ? 'activo ✅' : 'custom'} />
          <StatPill label="ejercicios" value={`${totalTodayExercises}`} />
          <StatPill label="tu lista" value={`${customWorkout.length}`} />
        </div>

        <button
          onClick={() => {
            if (!todayRoutine?.exercises?.length) {
              showToast({
                type: 'info',
                title: 'Sin rutina automática',
                message: 'Añade ejercicios en “Arma tu Entrenamiento”.',
              });
              return;
            }
            showToast({
              type: 'success',
              title: 'Sesión iniciada ⚡',
              message: `Enfócate en ${todayRoutine.focus}.`,
            });
          }}
          className="tap-target pressable pulse-surface primary-btn w-full rounded-xl font-bold py-3 px-4 transition-base"
        >
          Empezar sesión 🚀
        </button>
      </AppCard>
      </motion.div>

      <AppCard className="mb-6 p-4 glass-panel">
        <div className="mb-2 flex items-center justify-between text-xs text-gray-400">
          <span>Checklist de sesion</span>
          <span>{completedSets}/{plannedSets} series</span>
        </div>
        <div className="h-2.5 w-full neuro-progress-track">
          <div className="neuro-progress-fill" style={{ width: `${sessionProgress}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="text-gray-400">Progreso: {sessionProgress}%</span>
          <span className="text-gray-400">ETA: {etaMinutes} min</span>
        </div>
        <div className="mt-2 text-[11px] text-gray-400">
          Sync:{' '}
          <span className={syncStatus === 'synced' ? 'text-emerald-400' : syncStatus === 'error' ? 'text-amber-300' : 'text-gray-300'}>
            {syncStatus === 'idle' && 'sin actividad'}
            {syncStatus === 'local' && 'guardado local'}
            {syncStatus === 'syncing' && 'sincronizando...'}
            {syncStatus === 'synced' && 'sincronizado'}
            {syncStatus === 'error' && 'error de sincronizacion'}
          </span>
        </div>
      </AppCard>

      {isSpecialClassToday && (
        <AppCard className="mb-8 border-[color:var(--app-accent)]/30 bg-[color:var(--app-accent)]/5">
          <div className="flex items-center gap-3">
            <CalendarClock className="app-accent" />
            <div>
              <p className="text-sm font-bold text-white">Hoy toca clase especial 🎯</p>
              <p className="text-xs text-gray-300">Prioriza técnica y ritmo para sumar calidad al progreso.</p>
            </div>
          </div>
        </AppCard>
      )}

      <div className="space-y-4">
        {todayRoutine?.exercises.map((exercise, index) => {
          const completedCount = setsByExercise.get(exercise.id) ?? 0;
          const targetSets = Math.max(1, Number(exercise.sets || 0));
          const isCompleted = completedCount >= targetSets;

          return (
          <motion.div
            key={exercise.id}
            {...listStagger(index)}
            whileTap={{ scale: 0.985 }}
            onClick={() => setSelectedExercise(exercise)}
            className={`panel-soft interactive-tile rounded-3xl p-5 flex items-center gap-4 cursor-pointer transition-all group ripple-host ${
              isCompleted
                ? 'border-[color:var(--app-accent)]/60 bg-[color:var(--app-accent)]/5 anim-glow-pulse'
                : 'hover:border-[color:var(--app-accent)]/50'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-black flex-shrink-0 relative">
              <img 
                src={exercise.gifUrl || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=400&auto=format&fit=crop'} 
                alt={exercise.name} 
                onError={handleImageError}
                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" 
                referrerPolicy="no-referrer" 
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-transparent transition-colors">
                <AnimatePresence mode="wait" initial={false}>
                  {isCompleted ? (
                    <motion.span key="done" {...checkBounce}>
                      <CheckCircle2 className="text-[var(--app-accent)]" size={22} />
                    </motion.span>
                  ) : (
                    <motion.span key="play" initial={{ opacity: 0.8 }} animate={{ opacity: 0.8 }}>
                      <Play className="app-accent opacity-80" size={20} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-1">{exercise.name}</h3>
              <p className="text-sm text-gray-400 font-mono">
                {exercise.sets} sets x {exercise.reps} reps
              </p>
              {completedCount > 0 && (
                <AnimatePresence>
                  <motion.p
                    key={`${exercise.id}-count`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="text-xs font-mono mt-0.5 text-[var(--app-accent)]"
                  >
                    {isCompleted ? '✅ Completado' : `${completedCount}/${targetSets} series`}
                  </motion.p>
                </AnimatePresence>
              )}
            </div>
            <AnimatePresence mode="wait" initial={false}>
              {isCompleted ? (
                <motion.span key="done-icon" {...completionGlow}>
                  <CheckCircle2 className="text-[var(--app-accent)]" size={20} />
                </motion.span>
              ) : (
                <motion.span key="chevron" initial={{ opacity: 1 }} animate={{ opacity: 1 }}>
                  <ChevronLeft className="text-gray-600 rotate-180 group-hover:text-[var(--app-accent)] transition-colors" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
          );
        })}
      </div>

      {profile?.weeklySpecialSession?.enabled && (
        <AppCard className="mt-8" accent>
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
            <Star size={18} className="app-accent" />
            ⭐ Clase Especial Semanal
          </h3>
          <p className="text-sm text-gray-300">
            {profile.weeklySpecialSession.activity} • {profile.weeklySpecialSession.day} • {profile.weeklySpecialSession.durationMinutes} min
          </p>
        </AppCard>
      )}

      <AppCard className="mt-8 glass-panel">
        <SectionHeader title="🏋️ Arma tu Entrenamiento" />

        <div className="flex flex-wrap gap-2 mb-4">
          {muscleGroups.map((group) => (
            <button
              key={group}
              onClick={() => setSelectedMuscleGroup(group)}
              className={`tap-target px-3 py-1.5 text-xs rounded-full border transition-colors ${
                selectedMuscleGroup === group
                  ? 'border-[color:var(--app-accent)] bg-[color:var(--app-accent)]/10 text-[var(--app-accent)]'
                  : 'border-[color:var(--neuro-shadow-light)]/50 text-gray-400 shadow-[3px_3px_8px_var(--neuro-shadow-dark),-1px_-1px_5px_var(--neuro-shadow-light)]'
              }`}
            >
              {group}
            </button>
          ))}
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {filteredLibrary.map((exercise) => {
            const alreadyAdded = customWorkout.some((item) => item.id === exercise.id);

            return (
              <div key={exercise.id} className="flex items-center justify-between neuro-inset p-3">
                <div>
                  <p className="text-sm text-white font-medium">{exercise.name}</p>
                  <p className="text-xs text-gray-500">{exercise.muscleGroup} • {exercise.defaultSets}x{exercise.defaultReps}</p>
                </div>
                <button
                  onClick={() => addToCustomWorkout(exercise)}
                  disabled={alreadyAdded}
                  className="p-2 rounded-full neuro-raised text-gray-300 hover:text-[var(--app-accent)] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <PlusCircle size={16} />
                </button>
              </div>
            );
          })}
        </div>
      </AppCard>

      {customWorkout.length > 0 && (
        <AppCard className="mt-6 glass-panel">
          <SectionHeader title={`📋 Tu Rutina Personal (${customWorkout.length})`} />
          <div className="space-y-2">
            {customWorkout.map((exercise) => (
              <div key={exercise.id} className="flex items-center justify-between neuro-inset p-3">
                <div>
                  <p className="text-sm text-white">{exercise.name}</p>
                  <p className="text-xs text-gray-500">{exercise.muscleGroup}</p>
                </div>
                <button
                  onClick={() => removeFromCustomWorkout(exercise.id)}
                  className="p-2 rounded-full neuro-raised text-gray-300 hover:text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </AppCard>
      )}

      <AnimatePresence>
        {selectedExercise && (
          <motion.div
            {...slideUpSheet}
            className="fixed inset-0 z-[60] bg-[#050505] flex flex-col"
          >
            <div className="relative h-1/3 bg-black">
              <img 
                src={selectedExercise.gifUrl || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=400&auto=format&fit=crop'} 
                alt={selectedExercise.name} 
                onError={handleImageError}
                className="w-full h-full object-contain" 
                referrerPolicy="no-referrer" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-black/20" />
              <button
                onClick={() => setSelectedExercise(null)}
                className="absolute top-6 left-6 p-3 bg-black/50 backdrop-blur-md rounded-full border border-white/10 text-white"
              >
                <ChevronLeft size={24} />
              </button>
            </div>

            <div className="flex-1 p-6 flex flex-col overflow-y-auto safe-bottom">
              <h2 className="text-3xl font-bold text-white mb-2">{selectedExercise.name}</h2>
              <div className="flex gap-4 mb-6">
                <span className="neuro-inset px-4 py-2 rounded-full text-sm app-accent font-mono glow-box">
                  {selectedExercise.muscleGroup}
                </span>
                <span className="neuro-inset px-4 py-2 rounded-full text-sm text-gray-300 font-mono">
                  {selectedExercise.sets} x {selectedExercise.reps}
                </span>
                {selectedExercise.weight > 0 && (
                  <span className="neuro-inset px-4 py-2 rounded-full text-sm text-gray-300 font-mono">
                    Meta: <span className="app-accent font-bold">{selectedExercise.weight} kg</span>
                  </span>
                )}
              </div>

              <div className="neuro-raised rounded-3xl p-6 mb-8">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <CheckCircle2 className="app-accent" />
                  Registrar Series ✏️
                </h3>

                {/* Smart Weight Calculator */}
                <WeightCalculator
                  exerciseId={selectedExercise.id}
                  exerciseName={selectedExercise.name}
                  targetWeight={selectedExercise.weight}
                  userBodyweight={profile?.weight}
                  onWeightChange={handleCalculatorWeightChange}
                />
                
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2 font-mono">Peso (kg)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={weightInput || ''}
                      onChange={(e) => setWeightInput(Number(e.target.value))}
                      className="w-full input-field rounded-2xl p-4 text-2xl font-bold text-center"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2 font-mono">Reps</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={repsInput || ''}
                      onChange={(e) => setRepsInput(Number(e.target.value))}
                      className="w-full input-field rounded-2xl p-4 text-2xl font-bold text-center"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2 font-mono">Series</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={10}
                      value={setsInput || ''}
                      onChange={(e) => setSetsInput(Math.max(1, Number(e.target.value)))}
                      className="w-full input-field rounded-2xl p-4 text-2xl font-bold text-center"
                      placeholder="1"
                    />
                  </div>
                </div>

                <motion.button
                  onClick={handleLog}
                  disabled={!weightInput || !repsInput}
                  whileTap={!weightInput || !repsInput ? {} : { scale: [1, 1.06, 0.97, 1.02, 1] }}
                  transition={{ duration: 0.45, ease: [0.2, 0.9, 0.4, 1.1] }}
                  className="w-full tap-target primary-btn ripple-host font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {setsInput > 1 ? `Guardar ${setsInput} series 💾` : 'Guardar Serie 💾'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
