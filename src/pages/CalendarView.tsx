import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore, WorkoutDay, Exercise } from '../store/useAppStore';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Dumbbell, CheckCircle2, Flame } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';
import { getMondayFirstIndex, mapRoutineByWeekday, WEEKDAY_LABELS } from '../lib/routineWeek';
import { authService } from '../services/authService';

export default function CalendarView() {
  const { routine, logs, diet, setRoutine, authToken, showToast, setTab } = useAppStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isRescheduling, setIsRescheduling] = useState(false);

  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

  // Resolve routine by real weekday and keep non-training days empty.
  const selectedDayIndex = getMondayFirstIndex(selectedDate);
  const routinesByDay = useMemo(() => mapRoutineByWeekday(routine), [routine]);
  const plannedRoutine = routinesByDay[selectedDayIndex];

  // Find logs for selected day
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayLogs = logs.filter(log => {
    const d = new Date(log.date);
    return isValid(d) && format(d, 'yyyy-MM-dd') === selectedDateStr;
  });
  const setsByExercise = dayLogs.reduce<Map<string, number>>((acc, log) => {
    acc.set(log.exerciseId, (acc.get(log.exerciseId) || 0) + 1);
    return acc;
  }, new Map());

  const totalSets = plannedRoutine?.exercises?.reduce((acc, exercise) => acc + Math.max(1, Number(exercise.sets || 0)), 0) || 0;
  const completedSets = plannedRoutine?.exercises?.reduce((acc, exercise) => {
    const doneSets = setsByExercise.get(exercise.id) || 0;
    return acc + Math.min(Math.max(1, Number(exercise.sets || 0)), doneSets);
  }, 0) || 0;
  const sessionProgress = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  const moveSessionToDay = async (targetIndex: number) => {
    if (!plannedRoutine) return;
    if (targetIndex === selectedDayIndex) {
      showToast({ type: 'info', title: 'Mismo dia seleccionado', message: 'Elige otro dia para mover la sesion.' });
      return;
    }
    if (routinesByDay[targetIndex]) {
      showToast({ type: 'info', title: 'Conflicto detectado', message: 'Ese dia ya tiene entreno asignado.' });
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
      title: 'Sesion reprogramada',
      message: `${WEEKDAY_LABELS[selectedDayIndex].full} -> ${WEEKDAY_LABELS[targetIndex].full}`,
    });
  };

  const groupedExercises = plannedRoutine?.exercises.reduce<Record<string, typeof plannedRoutine.exercises>>((acc, exercise) => {
    const key = exercise.muscleGroup || 'General';
    if (!acc[key]) acc[key] = [];
    acc[key].push(exercise);
    return acc;
  }, {});

  return (
    <div className="min-h-screen app-shell px-4 safe-top md:px-6 safe-bottom">
      <div className="page-wrap">
      <header className="mb-8 mt-2">
        <h1 className="brutal-title text-white mb-2 flex items-center gap-3">
          <CalendarIcon className="app-accent" size={32} />
          📅 Calendario
        </h1>
        <p className="text-gray-400 font-mono text-sm">📋 Planificación y Registro</p>
      </header>

      <div className="glass-panel border border-[var(--app-border)] rounded-3xl p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setCurrentDate(addDays(currentDate, -7))} className="tap-target pressable p-2 text-gray-400 hover:text-white transition-colors">
            <ChevronLeft />
          </button>
          <span className="text-lg font-bold text-white capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </span>
          <button onClick={() => setCurrentDate(addDays(currentDate, 7))} className="tap-target pressable p-2 text-gray-400 hover:text-white transition-colors">
            <ChevronRight />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
            <div key={day} className="text-center text-xs font-mono text-gray-500 mb-2">
              {day}
            </div>
          ))}
          {weekDays.map((date) => {
            const isToday = isSameDay(date, new Date());
            const isSelected = isSameDay(date, selectedDate);
            const dateStr = format(date, 'yyyy-MM-dd');
            const hasLogs = logs.some(log => format(new Date(log.date), 'yyyy-MM-dd') === dateStr);

            return (
              <div
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={clsx(
                  'aspect-square rounded-xl flex flex-col items-center justify-center relative cursor-pointer transition-all',
                  isSelected ? 'bg-[color:var(--app-accent)]/20 border border-[var(--app-accent)] app-accent glow-box' : 
                  isToday ? 'bg-[var(--app-border)] border border-gray-500 text-white' : 
                  'bg-black/35 border border-[var(--app-border)] text-gray-400 hover:border-gray-500'
                )}
              >
                <span className="text-sm font-bold font-mono">{format(date, 'd')}</span>
                {hasLogs && (
                  <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[var(--app-accent)] glow-box" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={selectedDate.toISOString()}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white capitalize">
              {format(selectedDate, 'EEEE, d MMMM', { locale: es })}
            </h2>
            {isSameDay(selectedDate, new Date()) && (
              <span className="bg-[color:var(--app-accent)]/10 text-[var(--app-accent)] px-2 py-1 rounded text-xs font-mono border border-[color:var(--app-accent)]/30">HOY</span>
            )}
          </div>

          {/* Planned Routine */}
          {plannedRoutine ? (
            <div className="glass-panel border border-[var(--app-border)] rounded-3xl p-5">
              <h3 className="text-sm text-gray-400 font-mono mb-4 flex items-center gap-2">
                <Dumbbell size={16} /> 🏋️ Rutina Planificada
              </h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-black border border-[color:var(--app-accent)]/30 flex items-center justify-center">
                  <Dumbbell className="app-accent" size={20} />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">{plannedRoutine.focus}</h4>
                  <p className="text-sm text-gray-400">{plannedRoutine.exercises.length} ejercicios</p>
                </div>
              </div>

              <div className="mb-4 rounded-xl border border-[var(--app-border)] bg-black/30 p-3">
                <div className="mb-2 flex items-center justify-between text-xs text-gray-400">
                  <span>Progreso por series</span>
                  <span>{completedSets}/{totalSets} series</span>
                </div>
                <div className="h-2.5 w-full neuro-progress-track">
                  <div className="neuro-progress-fill" style={{ width: `${sessionProgress}%` }} />
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setIsRescheduling((prev) => !prev)}
                  className="tap-target rounded-xl border border-[var(--app-border)] bg-black/30 px-3 py-2 text-xs font-semibold text-gray-200 hover:border-[var(--app-accent)]/50"
                >
                  {isRescheduling ? 'Cancelar reprogramacion' : 'Reprogramar sesion'}
                </button>
                <button
                  type="button"
                  onClick={() => setTab('workout')}
                  className="tap-target rounded-xl border border-[var(--app-border)] bg-black/30 px-3 py-2 text-xs font-semibold text-gray-200 hover:border-[var(--app-accent)]/50"
                >
                  Ir a workout
                </button>
              </div>

              {isRescheduling && (
                <div className="mb-4 rounded-xl border border-dashed border-[var(--app-border)] bg-black/25 p-3">
                  <p className="mb-3 text-xs text-gray-400">Selecciona un dia libre para mover esta sesion.</p>
                  <div className="grid grid-cols-7 gap-2">
                    {WEEKDAY_LABELS.map((day, index) => {
                      const occupied = Boolean(routinesByDay[index]);
                      const isCurrent = index === selectedDayIndex;
                      return (
                        <button
                          key={day.key}
                          type="button"
                          disabled={isCurrent || occupied}
                          onClick={() => void moveSessionToDay(index)}
                          className={clsx(
                            'rounded-lg border px-1 py-2 text-[10px] font-semibold transition-all',
                            isCurrent && 'cursor-not-allowed border-[var(--app-accent)]/40 bg-[var(--app-accent)]/10 text-[var(--app-accent)]',
                            occupied && !isCurrent && 'cursor-not-allowed border-[var(--app-border)] bg-black/40 text-gray-500',
                            !occupied && !isCurrent && 'border-dashed border-emerald-400/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                          )}
                        >
                          {day.short}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {groupedExercises && (Object.entries(groupedExercises) as [string, Exercise[]][]).map(([muscleGroup, exercises]) => (
                  <div key={muscleGroup} className="space-y-2">
                    <div className="inline-flex items-center rounded-full border border-[var(--app-border)] bg-black/30 px-3 py-1">
                      <span className="text-[11px] uppercase tracking-wider text-gray-300">{muscleGroup}</span>
                    </div>

                    {exercises.map((exercise) => {
                      const targetSets = Math.max(1, Number(exercise.sets || 0));
                      const doneSets = setsByExercise.get(exercise.id) || 0;
                      const progress = Math.min(100, Math.round((doneSets / targetSets) * 100));
                      const done = doneSets >= targetSets;

                      return (
                        <div
                          key={exercise.id}
                          className="cv-auto flex items-center justify-between rounded-xl border border-[var(--app-border)] bg-black/35 px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-semibold text-white">{exercise.name}</p>
                            <p className="text-[11px] text-gray-400">{doneSets}/{targetSets} series · {exercise.reps} reps</p>
                          </div>
                          <span className={done ? 'text-emerald-400 text-xs font-semibold' : 'text-gray-500 text-xs font-semibold'}>
                            {done ? 'Hecho' : `${progress}%`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="glass-panel border border-[var(--app-border)] rounded-3xl p-5">
              <h3 className="text-sm text-gray-400 font-mono mb-2 flex items-center gap-2">
                <Dumbbell size={16} /> 🏋️ Rutina Planificada
              </h3>
              <p className="text-sm text-gray-500">Este dia no tienes entrenamiento programado.</p>
            </div>
          )}

          {/* Logs */}
          <div className="panel-soft rounded-3xl p-5">
            <h3 className="text-sm text-gray-400 font-mono mb-4 flex items-center gap-2">
              <CheckCircle2 size={16} /> ✅ Registro de Entrenamiento
            </h3>
            {dayLogs.length > 0 ? (
              <div className="space-y-3">
                {dayLogs.map((log, i) => {
                  // Find exercise name
                  let exName = 'Ejercicio';
                  routine.forEach(day => {
                    const ex = day.exercises.find(e => e.id === log.exerciseId);
                    if (ex) exName = ex.name;
                  });

                  return (
                    <div key={i} className="flex justify-between items-center bg-black/45 p-3 rounded-xl border border-[var(--app-border)]">
                      <span className="text-white font-medium">{exName}</span>
                      <div className="flex gap-3 text-sm font-mono">
                        <span className="text-gray-400">{log.weight}kg</span>
                        <span className="app-accent">x{log.reps}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">No hay registros para este día.</p>
            )}
          </div>

          {/* Diet Summary */}
          {diet && (
            <div className="glass-panel border border-[var(--app-border)] rounded-3xl p-5">
              <h3 className="text-sm text-gray-400 font-mono mb-4 flex items-center gap-2">
                <Flame size={16} /> 🔥 Objetivo Nutricional
              </h3>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-white">{diet.dailyCalories} <span className="text-sm text-gray-500 font-normal">kcal</span></span>
                <div className="flex gap-3 text-xs font-mono text-gray-400">
                  <span>P: {diet.macros.protein}g</span>
                  <span>C: {diet.macros.carbs}g</span>
                  <span>G: {diet.macros.fat}g</span>
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
