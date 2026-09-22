import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore, WorkoutDay, Exercise } from '../store/useAppStore';
import { Haptics } from '../lib/haptics';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  CheckCircle2,
  Flame,
  Plus,
  RotateCcw,
  Sparkles,
  Activity,
  CalendarDays,
  Target,
} from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, isValid, isToday as isDateToday } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';
import {
  getMondayFirstIndex,
  mapRoutineByWeekday,
  WEEKDAY_LABELS,
  computeSmartStreak,
} from '../lib/routineWeek';
import { authService } from '../services/authService';

export default function CalendarView() {
  const {
    routine,
    logs,
    diet,
    setRoutine,
    authToken,
    showToast,
    setTab,
  } = useAppStore(
    useShallow((s) => ({
      routine: s.routine,
      logs: s.logs,
      diet: s.diet,
      setRoutine: s.setRoutine,
      authToken: s.authToken,
      showToast: s.showToast,
      setTab: s.setTab,
    }))
  );
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isRescheduling, setIsRescheduling] = useState(false);

  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(startDate, i)), [startDate]);

  // Resolve routine by real weekday and keep non-training days empty.
  const selectedDayIndex = getMondayFirstIndex(selectedDate);
  const routinesByDay = useMemo(() => mapRoutineByWeekday(routine), [routine]);
  const plannedRoutine = routinesByDay[selectedDayIndex];

  // Smart streak metric
  const currentStreak = useMemo(() => computeSmartStreak(logs, routine), [logs, routine]);

  // Find logs for selected day
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayLogs = useMemo(() => {
    return logs.filter((log) => {
      const d = new Date(log.date);
      return isValid(d) && format(d, 'yyyy-MM-dd') === selectedDateStr;
    });
  }, [logs, selectedDateStr]);

  const setsByExercise = useMemo(() => {
    return dayLogs.reduce<Map<string, number>>((acc, log) => {
      acc.set(log.exerciseId, (acc.get(log.exerciseId) || 0) + 1);
      return acc;
    }, new Map());
  }, [dayLogs]);

  const totalSets = useMemo(() => {
    return plannedRoutine?.exercises?.reduce((acc, exercise) => acc + Math.max(1, Number(exercise.sets || 0)), 0) || 0;
  }, [plannedRoutine]);

  const completedSets = useMemo(() => {
    return plannedRoutine?.exercises?.reduce((acc, exercise) => {
      const doneSets = setsByExercise.get(exercise.id) || 0;
      return acc + Math.min(Math.max(1, Number(exercise.sets || 0)), doneSets);
    }, 0) || 0;
  }, [plannedRoutine, setsByExercise]);

  const sessionProgress = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
  const isSelectedToday = isSameDay(selectedDate, new Date());

  const moveSessionToDay = async (targetIndex: number) => {
    if (!plannedRoutine) return;
    if (targetIndex === selectedDayIndex) {
      showToast({ type: 'info', title: 'Mismo día seleccionado', message: 'Elige otro día para mover la sesión.' });
      return;
    }
    if (routinesByDay[targetIndex]) {
      showToast({ type: 'info', title: 'Conflicto detectado', message: 'Ese día ya tiene entreno asignado.' });
      return;
    }

    const draft = [...routinesByDay];
    draft[selectedDayIndex] = null;
    draft[targetIndex] = {
      ...plannedRoutine,
      day: WEEKDAY_LABELS[targetIndex].full,
    };
    const updatedRoutine = draft.filter((d): d is WorkoutDay => d !== null);
    setRoutine(updatedRoutine);
    setIsRescheduling(false);

    if (authToken) {
      try {
        await authService.updateProfile(authToken, { routine: updatedRoutine });
      } catch (error) {
        console.error('Error syncing moved routine:', error);
        showToast({ type: 'info', title: 'Cambio local guardado', message: 'No se pudo sincronizar ahora.' });
      }
    }

    showToast({
      type: 'success',
      title: 'Sesión reprogramada',
      message: `${WEEKDAY_LABELS[selectedDayIndex].full} → ${WEEKDAY_LABELS[targetIndex].full}`,
    });
  };

  const groupedExercises = useMemo(() => {
    return plannedRoutine?.exercises.reduce<Record<string, typeof plannedRoutine.exercises>>((acc, exercise) => {
      const key = exercise.muscleGroup || 'General';
      if (!acc[key]) acc[key] = [];
      acc[key].push(exercise);
      return acc;
    }, {});
  }, [plannedRoutine]);

  const jumpToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  return (
    <div className="min-h-screen app-shell px-4 safe-top md:px-6 safe-bottom">
      <div className="page-wrap space-y-6">
        {/* Header with Title and Quick Streak Badge */}
        <header className="pt-2 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center shadow-inner">
                <CalendarIcon className="app-accent" size={20} />
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                Calendario
              </h1>
            </div>
            <p className="text-xs text-gray-400 font-medium tracking-wide">
              Planificación semanal y registro de actividad
            </p>
          </div>

          {/* Streak pill badge (Apple Health style) */}
          <div className="inline-flex items-center gap-2 rounded-2xl bg-white/[0.04] border border-white/10 px-3.5 py-2 shadow-sm backdrop-blur-md">
            <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <Flame size={15} className="text-amber-400" />
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">Racha</span>
              <span className="text-sm font-bold font-mono text-white leading-tight">
                {currentStreak} <span className="text-[10px] text-gray-400 font-normal">días</span>
              </span>
            </div>
          </div>
        </header>

        {/* Calendar Weekly Navigation & Grid (Apple HIG Ergonomics) */}
        <div className="glass-panel border border-white/10 rounded-3xl p-5 md:p-6 shadow-2xl backdrop-blur-xl">
          {/* Month / Year header + controls */}
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentDate(addDays(currentDate, -7))}
                aria-label="Semana anterior"
                className="tap-target w-9 h-9 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentDate(addDays(currentDate, 7))}
                aria-label="Semana siguiente"
                className="tap-target w-9 h-9 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="text-base md:text-lg font-bold text-white capitalize tracking-tight">
                {format(currentDate, 'MMMM yyyy', { locale: es })}
              </span>

              {!weekDays.some((d) => isDateToday(d)) && (
                <button
                  type="button"
                  onClick={jumpToToday}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold font-mono bg-[var(--app-accent)]/15 border border-[var(--app-accent)]/30 text-[var(--app-accent)] hover:bg-[var(--app-accent)]/25 active:scale-95 transition-all"
                >
                  Hoy
                </button>
              )}
            </div>
          </div>

          {/* Weekday column initials */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
              <div
                key={day}
                className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-gray-400 font-mono"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar 7-day grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {weekDays.map((date) => {
              const isToday = isSameDay(date, new Date());
              const isSelected = isSameDay(date, selectedDate);
              const dateStr = format(date, 'yyyy-MM-dd');
              const dayIdx = getMondayFirstIndex(date);
              const hasRoutine = Boolean(routinesByDay[dayIdx]);
              const hasLogs = logs.some((log) => {
                const ld = new Date(log.date);
                return isValid(ld) && format(ld, 'yyyy-MM-dd') === dateStr;
              });

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  aria-label={format(date, "d 'de' MMMM", { locale: es })}
                  onClick={() => setSelectedDate(date)}
                  className={clsx(
                    'tap-target aspect-square rounded-2xl flex flex-col items-center justify-between p-1 sm:p-2 relative cursor-pointer transition-all duration-200 outline-none min-w-0',
                    isSelected
                      ? 'bg-[var(--app-accent)] text-black font-bold shadow-[0_0_20px_var(--app-accent-dim)] ring-2 ring-[var(--app-accent)] scale-[1.02]'
                      : isToday
                      ? 'bg-white/[0.08] border border-[var(--app-accent)]/60 text-white font-semibold shadow-inner'
                      : 'bg-white/[0.03] border border-white/[0.08] text-gray-300 hover:bg-white/[0.07] hover:border-white/20 active:scale-95'
                  )}
                >
                  {/* Top indicator or label */}
                  <span
                    className={clsx(
                      'text-[8px] sm:text-[9px] uppercase font-mono tracking-wider transition-colors',
                      isSelected ? 'text-black/70 font-bold' : isToday ? 'text-[var(--app-accent)] font-semibold' : 'text-gray-400'
                    )}
                  >
                    {format(date, 'EEEEE', { locale: es })}
                  </span>

                  {/* Day Number */}
                  <span
                    className={clsx(
                      'text-xs sm:text-sm md:text-base font-mono font-bold transition-transform',
                      isSelected ? 'text-black' : isToday ? 'text-white' : 'text-gray-200'
                    )}
                  >
                    {format(date, 'd')}
                  </span>

                  {/* Activity Indicator Dots */}
                  <div className="flex items-center justify-center gap-1 h-1.5 w-full">
                    {hasLogs ? (
                      <span
                        className={clsx(
                          'w-1.5 h-1.5 rounded-full transition-all',
                          isSelected ? 'bg-black shadow-sm' : 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                        )}
                      />
                    ) : hasRoutine ? (
                      <span
                        className={clsx(
                          'w-1.5 h-1.5 rounded-full transition-all',
                          isSelected ? 'bg-black/60' : 'bg-[var(--app-accent)]/60 shadow-[0_0_4px_var(--app-accent-dim)]'
                        )}
                      />
                    ) : (
                      <span className="w-1.5 h-1.5 opacity-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Content Container */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedDate.toISOString()}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            {/* Day Header & Status Pill */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2.5">
                <CalendarDays size={20} className="app-accent opacity-90" />
                <h2 className="text-lg md:text-xl font-bold text-white capitalize tracking-tight">
                  {format(selectedDate, 'EEEE, d MMMM', { locale: es })}
                </h2>
              </div>
              {isSelectedToday && (
                <span className="bg-[var(--app-accent)]/15 text-[var(--app-accent)] px-3 py-1 rounded-full text-xs font-mono font-bold border border-[var(--app-accent)]/30 tracking-wider">
                  HOY
                </span>
              )}
            </div>

            {/* Main Routine Card or Empty State */}
            {plannedRoutine ? (
              <div className="glass-panel border border-white/10 rounded-3xl p-5 md:p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                {/* Accent glow top backdrop */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--app-accent)]/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-[var(--app-accent)]/30 flex items-center justify-center shadow-inner">
                      <Dumbbell className="app-accent" size={22} />
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold font-mono uppercase tracking-wider text-gray-400">
                        Sesión Planificada
                      </span>
                      <h3 className="text-lg md:text-xl font-bold text-white leading-tight">
                        {plannedRoutine.focus}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        <span className="font-mono font-semibold text-gray-300">
                          {plannedRoutine.exercises.length}
                        </span>{' '}
                        ejercicios programados
                      </p>
                    </div>
                  </div>

                  {/* Completion badge */}
                  <div
                    className={clsx(
                      'px-3 py-1 rounded-full text-xs font-mono font-bold border',
                      sessionProgress === 100
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : sessionProgress > 0
                        ? 'bg-[var(--app-accent)]/15 border-[var(--app-accent)]/30 text-[var(--app-accent)]'
                        : 'bg-white/[0.04] border-white/10 text-gray-400'
                    )}
                  >
                    {sessionProgress}%
                  </div>
                </div>

                {/* Progress bar and metrics */}
                <div className="mb-5 rounded-2xl border border-white/10 bg-black/40 p-4">
                  <div className="mb-2 flex items-center justify-between text-xs font-medium text-gray-300">
                    <span className="flex items-center gap-1.5">
                      <Target size={14} className="text-gray-400" />
                      Progreso de series
                    </span>
                    <span className="font-mono text-white font-semibold">
                      {completedSets} <span className="text-gray-500 font-normal">/</span> {totalSets} series
                    </span>
                  </div>
                  <div className="h-2.5 w-full neuro-progress-track">
                    <div className="neuro-progress-fill" style={{ width: `${sessionProgress}%` }} />
                  </div>
                </div>

                {/* Actions: Reprogram & View in Routine */}
                <div className="mb-6 flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsRescheduling((prev) => !prev)}
                    className={clsx(
                      'tap-target rounded-xl border px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5 transition-all',
                      isRescheduling
                        ? 'border-[var(--app-accent)]/50 bg-[var(--app-accent)]/15 text-[var(--app-accent)]'
                        : 'border-white/10 bg-white/[0.04] text-gray-200 hover:bg-white/[0.08] hover:border-white/20'
                    )}
                  >
                    <RotateCcw size={14} />
                    {isRescheduling ? 'Cancelar Reprogramación' : 'Reprogramar Sesión'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('workout')}
                    className="tap-target rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-gray-200 hover:bg-white/[0.08] hover:border-white/20 transition-all inline-flex items-center gap-1.5"
                  >
                    <Activity size={14} />
                    Entrenar en Rutina
                  </button>
                </div>

                {/* Reschedule selector inline drawer */}
                {isRescheduling && (
                  <div className="mb-6 rounded-2xl border border-dashed border-[var(--app-accent)]/40 bg-black/50 p-4 animate-in fade-in zoom-in-95 duration-150">
                    <p className="mb-3 text-xs text-gray-300 font-medium">
                      Selecciona un día libre para mover esta sesión:
                    </p>
                    <div className="grid grid-cols-7 gap-1.5">
                      {WEEKDAY_LABELS.map((day, index) => {
                        const occupied = Boolean(routinesByDay[index]);
                        const isCurrent = index === selectedDayIndex;
                        return (
                          <button
                            key={day.key}
                            type="button"
                            disabled={isCurrent || occupied}
                            onClick={() => void moveSessionToDay(index)}
                            aria-label={`Mover a ${day.full}`}
                            className={clsx(
                              'tap-target h-11 rounded-xl border text-xs font-semibold font-mono flex flex-col items-center justify-center transition-all',
                              isCurrent &&
                                'cursor-not-allowed border-[var(--app-accent)]/40 bg-[var(--app-accent)]/10 text-[var(--app-accent)] opacity-60',
                              occupied && !isCurrent &&
                                'cursor-not-allowed border-white/10 bg-black/40 text-gray-500 opacity-35',
                              !occupied && !isCurrent &&
                                'border-dashed border-emerald-400/60 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/30 active:scale-95 shadow-sm'
                            )}
                          >
                            <span>{day.short}</span>
                            <span className="text-[9px] font-normal">
                              {occupied ? (isCurrent ? 'Actual' : 'Ocupado') : 'Libre'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Grouped Exercise List */}
                <div className="space-y-4">
                  {groupedExercises &&
                    (Object.entries(groupedExercises) as [string, Exercise[]][]).map(([muscleGroup, exercises]) => (
                      <div key={muscleGroup} className="space-y-2">
                        <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 backdrop-blur-sm">
                          <span className="text-[11px] uppercase tracking-wider text-gray-300 font-bold font-mono">
                            {muscleGroup}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {exercises.map((exercise) => {
                            const targetSets = Math.max(1, Number(exercise.sets || 0));
                            const doneSets = setsByExercise.get(exercise.id) || 0;
                            const progress = Math.min(100, Math.round((doneSets / targetSets) * 100));
                            const done = doneSets >= targetSets;

                            return (
                              <div
                                key={exercise.id}
                                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 hover:bg-white/[0.05] transition-colors"
                              >
                                <div className="space-y-0.5">
                                  <p className="text-sm font-semibold text-white tracking-tight">{exercise.name}</p>
                                  <p className="text-xs font-mono text-gray-400">
                                    <span className="text-white font-medium">{doneSets}</span>
                                    <span className="text-gray-500">/</span>
                                    {targetSets} series · <span className="text-gray-300">{exercise.reps}</span> reps
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={clsx(
                                      'px-2.5 py-1 rounded-full text-xs font-mono font-bold border',
                                      done
                                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                        : 'bg-white/[0.04] border-white/10 text-gray-400'
                                    )}
                                  >
                                    {done ? 'Hecho' : `${progress}%`}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              /* Apple HIG Empty State for Rest Day */
              <div className="glass-panel border border-white/10 rounded-3xl p-8 text-center shadow-2xl backdrop-blur-xl relative overflow-hidden">
                <div className="w-16 h-16 rounded-3xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <Sparkles size={28} className="app-accent opacity-80" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1.5 tracking-tight">
                  Día de Descanso
                </h3>
                <p className="text-xs md:text-sm text-gray-400 max-w-sm mx-auto mb-6 leading-relaxed">
                  No hay entrenamiento programado para esta fecha. Aprovecha para recuperar o añade un ejercicio libre.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setTab('workout')}
                    className="tap-target primary-btn px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-lg"
                  >
                    <Plus size={16} />
                    Añadir Ejercicio Libre
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('workout')}
                    className="tap-target secondary-btn px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-300 inline-flex items-center gap-1.5"
                  >
                    Ver Rutinas
                  </button>
                </div>
              </div>
            )}

            {/* Workout Logs for Selected Day */}
            <div className="glass-panel border border-white/10 rounded-3xl p-5 md:p-6 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs uppercase font-mono font-bold text-gray-400 flex items-center gap-2 tracking-wider">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  Registro de Entrenamiento
                </h3>
                {dayLogs.length > 0 && (
                  <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-gray-300">
                    {dayLogs.length} series
                  </span>
                )}
              </div>

              {dayLogs.length > 0 ? (
                <div className="space-y-2.5">
                  {dayLogs.map((log, i) => {
                    // Find exercise name from routine or fallback
                    let exName = 'Ejercicio';
                    routine.forEach((day) => {
                      const ex = day.exercises.find((e) => e.id === log.exerciseId);
                      if (ex) exName = ex.name;
                    });

                    return (
                      <div
                        key={i}
                        className="flex justify-between items-center bg-black/40 p-3.5 rounded-2xl border border-white/10 hover:border-white/20 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
                            <Dumbbell size={14} className="text-gray-400" />
                          </div>
                          <span className="text-sm font-semibold text-white tracking-tight">{exName}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs md:text-sm font-mono">
                          <span className="text-gray-300 font-medium px-2 py-0.5 rounded-md bg-white/[0.04]">
                            {log.weight} <span className="text-[10px] text-gray-500 font-normal">kg</span>
                          </span>
                          <span className="app-accent font-bold px-2 py-0.5 rounded-md bg-[var(--app-accent)]/10 border border-[var(--app-accent)]/20">
                            x{log.reps}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-xs text-gray-400">
                    No hay registros de series guardadas para este día.
                  </p>
                </div>
              )}
            </div>

            {/* Diet Nutritional Goal (if diet exists) */}
            {diet && (
              <div className="glass-panel border border-white/10 rounded-3xl p-5 md:p-6 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs uppercase font-mono font-bold text-gray-400 flex items-center gap-2 tracking-wider">
                    <Flame size={16} className="text-amber-400" />
                    Objetivo Nutricional
                  </h3>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    Plan Activo
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black/40 p-4 rounded-2xl border border-white/10">
                  <div>
                    <span className="text-2xl md:text-3xl font-extrabold font-mono text-white tracking-tight">
                      {diet.dailyCalories}{' '}
                      <span className="text-xs text-gray-400 font-normal font-sans">kcal / día</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-mono">
                    <div className="px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col items-center">
                      <span className="text-[10px] text-gray-400 font-sans">Proteína</span>
                      <span className="font-bold text-white">{diet.macros.protein}g</span>
                    </div>
                    <div className="px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col items-center">
                      <span className="text-[10px] text-gray-400 font-sans">Carbos</span>
                      <span className="font-bold text-white">{diet.macros.carbs}g</span>
                    </div>
                    <div className="px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col items-center">
                      <span className="text-[10px] text-gray-400 font-sans">Grasas</span>
                      <span className="font-bold text-white">{diet.macros.fat}g</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
