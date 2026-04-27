import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore, Exercise, WorkoutDay, ExerciseType } from '../store/useAppStore';
import { ChevronLeft, Play, CheckCircle2, Dumbbell, PlusCircle, Trash2, Star, CalendarClock, Flame, BookOpen, Share2, Trophy, TrendingUp, History, Loader2, X, Timer, Square } from 'lucide-react';
import { workoutService } from '../services/workoutService';
import { authService } from '../services/authService';
import { enrichRoutine, routineNeedsEnrichment } from '../services/exerciseImageService';
import { AppCard, SectionHeader, StatPill, LazyImage } from '../components/ui';
import { listStagger, slideUpSheet, checkBounce, successBurst, completionGlow, tapPulse, timelineStagger } from '../lib/motion';
import { WEEKDAY_LABELS, getMondayFirstIndex, mapRoutineByWeekday, computeSmartStreak, WEEK_STARTS_ON_MONDAY } from '../lib/routineWeek';
import { format, startOfWeek, addDays } from 'date-fns';
import WeightCalculator from '../components/WeightCalculator';
import { checkNewAchievements } from '../lib/achievements';
import { getProgressiveSuggestion, getExerciseHistory } from '../lib/progressiveOverload';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import WorkoutSummaryCard from '../components/WorkoutSummaryCard';

/** Format seconds as MM:SS */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Isometric / keyword-based exercise type detector (fallback when exerciseType is not set) */
function detectExerciseType(name: string): ExerciseType {
  const lower = name.toLowerCase();
  if (['plancha', 'frog stand', 'isométric', 'wall sit', 'estática', 'side plank'].some((k) => lower.includes(k))) return 'isometric';
  if (['dominadas', 'fondos', 'flexiones', 'burpees', 'pull-up', 'dip'].some((k) => lower.includes(k))) return 'bodyweight';
  if (['cardio', 'cuerda', 'correr', 'bicicleta', 'remo ergómetro', 'caminar', 'elíptica'].some((k) => lower.includes(k))) return 'cardio';
  return 'weighted';
}

export default function Workout() {
  const {
    routine,
    addLog,
    updateLog,
    customWorkout,
    exerciseLibrary,
    addToCustomWorkout,
    removeFromCustomWorkout,
    setRoutine,
    profile,
    authToken,
    showToast,
    logs,
    achievements,
    addAchievement,
  } = useAppStore();
  // SVG circle circumference for rest timer ring: 2π × r=10
  const TIMER_CIRCUMFERENCE = 2 * Math.PI * 10;
  const REST_TIMER_SECONDS = 90;

  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [showTechnique, setShowTechnique] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [weightInput, setWeightInput] = useState<number>(0);
  const [repsInput, setRepsInput] = useState<number>(0);
  const [setsInput, setSetsInput] = useState<number>(1);
  // Isometric / cardio duration input (seconds)
  const [durationInput, setDurationInput] = useState<number>(0);
  // RPE 1-10 (isometric), -1 = not set
  const [rpeInput, setRpeInput] = useState<number>(-1);
  // RIR 0-4 (weighted/bodyweight), -1 = not set
  const [rirInput, setRirInput] = useState<number>(-1);
  // Active isometric timer
  const [isometricRunning, setIsometricRunning] = useState(false);
  const [isometricElapsed, setIsometricElapsed] = useState(0);
  const activeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const historyPushedRef = useRef(false);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('Todos');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() => getMondayFirstIndex(new Date()));
  const [isEditingDays, setIsEditingDays] = useState(false);
  const [moveSourceDayIndex, setMoveSourceDayIndex] = useState<number | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'local' | 'syncing' | 'synced' | 'error'>('idle');
  // Rest timer state
  const [restSeconds, setRestSeconds] = useState<number>(0);
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Completion celebration
  const [showCompletion, setShowCompletion] = useState(false);
  const completionShownRef = useRef(false);
  // Share card state
  const [isSharing, setIsSharing] = useState(false);
  const summaryCardRef = useRef<HTMLDivElement>(null);
  // State for editing a previously logged set
  const [editingSet, setEditingSet] = useState<{ logIndex: number; weight: number; reps: number; duration?: number; rpe?: number } | null>(null);

  // Stable callback passed to WeightCalculator — avoids stale-closure issue with onWeightChange
  const handleCalculatorWeightChange = useCallback((w: number) => setWeightInput(w), []);

  // Close exercise detail and clean up history state
  const closeExercise = useCallback(() => {
    setSelectedExercise(null);
    setShowTechnique(false);
    setShowHistory(false);
    setEditingSet(null);
    setDurationInput(0);
    setRpeInput(-1);
    setRirInput(-1);
    setIsometricRunning(false);
    setIsometricElapsed(0);
    if (activeTimerRef.current) {
      clearInterval(activeTimerRef.current);
      activeTimerRef.current = null;
    }
    if (historyPushedRef.current) {
      historyPushedRef.current = false;
      window.history.back();
    }
  }, []);

  // Push a history entry when exercise detail opens so the hardware back button closes it
  useEffect(() => {
    if (!selectedExercise) return;

    window.history.pushState({ exerciseOpen: true }, '');
    historyPushedRef.current = true;

    const handlePopState = () => {
      if (!historyPushedRef.current) return; // guard: already closed via UI button
      historyPushedRef.current = false;
      setSelectedExercise(null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  // Re-run only when the selected exercise changes identity.
  // `closeExercise` is intentionally excluded: `handlePopState` calls `setSelectedExercise`
  // directly (stable useState setter) instead of going through `closeExercise`, so there is
  // no stale-closure risk here.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExercise?.id]);

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
  // Date key for the selected weekday in the current week (used for per-day log display)
  const selectedDateKey = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: WEEK_STARTS_ON_MONDAY });
    return format(addDays(weekStart, selectedDayIndex), 'yyyy-MM-dd');
  }, [selectedDayIndex]);
  const todayLogs = useMemo(() => logs.filter((log) => log.date.slice(0, 10) === selectedDateKey), [logs, selectedDateKey]);
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

  // Whether every exercise in today's routine is fully completed
  const allExercisesDone = useMemo(() => {
    if (!todayRoutine?.exercises?.length) return false;
    return todayRoutine.exercises.every((ex) => {
      const done = setsByExercise.get(ex.id) ?? 0;
      return done >= Math.max(1, Number(ex.sets || 0));
    });
  }, [todayRoutine, setsByExercise]);

  // Current streak for share card
  const currentStreak = useMemo(() => {
    return computeSmartStreak(logs, routine);
  }, [logs, routine]);

  // XP & level for share card
  const XP_PER_LOG = 12;
  const XP_PER_STREAK_DAY = 8;
  const XP_PER_LEVEL = 250;
  const totalXP = useMemo(() => logs.length * XP_PER_LOG + currentStreak * XP_PER_STREAK_DAY, [logs.length, currentStreak]);
  const level = Math.floor(totalXP / XP_PER_LEVEL) + 1;
  // XP gained today
  const todayXP = useMemo(() => todayLogs.length * XP_PER_LOG, [todayLogs.length]);

  // Last session log for the selected exercise (most recent entry before today)
  const lastSessionLog = useMemo(() => {
    if (!selectedExercise) return null;
    const past = logs
      .filter((l) => l.exerciseId === selectedExercise.id && l.date.slice(0, 10) !== todayDateKey)
      .sort((a, b) => b.date.localeCompare(a.date));
    return past[0] ?? null;
  }, [selectedExercise, logs, todayDateKey]);

  // Progressive overload suggestion for the selected exercise
  const progressiveSuggestion = useMemo(
    () => (selectedExercise ? getProgressiveSuggestion(selectedExercise.id, logs) : null),
    [selectedExercise, logs],
  );

  // Historical sessions for the selected exercise (for the chart)
  const exerciseHistory = useMemo(
    () => (selectedExercise ? getExerciseHistory(selectedExercise.id, logs) : []),
    [selectedExercise, logs],
  );

  // Best weight ever logged per exerciseId
  const personalRecords = useMemo(() => {
    return logs.reduce<Map<string, number>>((acc, log) => {
      const prev = acc.get(log.exerciseId) ?? 0;
      if (log.weight > prev) acc.set(log.exerciseId, log.weight);
      return acc;
    }, new Map());
  }, [logs]);

  // Best duration ever logged per exerciseId (for isometric exercises)
  const personalBestTimes = useMemo(() => {
    return logs.reduce<Map<string, number>>((acc, log) => {
      if (log.duration === undefined) return acc;
      const prev = acc.get(log.exerciseId) ?? 0;
      if (log.duration > prev) acc.set(log.exerciseId, log.duration);
      return acc;
    }, new Map());
  }, [logs]);

  // Derived exercise type for the currently selected exercise
  const currentExerciseType = useMemo((): ExerciseType => {
    if (!selectedExercise) return 'weighted';
    if (selectedExercise.exerciseType) return selectedExercise.exerciseType;
    const libEntry = exerciseLibrary.find((e) => e.id === selectedExercise.id);
    if (libEntry?.exerciseType) return libEntry.exerciseType;
    return detectExerciseType(selectedExercise.name);
  }, [selectedExercise, exerciseLibrary]);

  // Most recently logged weight per exerciseId
  const lastWeights = useMemo(() => {
    return logs.reduce<Map<string, { weight: number; date: string }>>((acc, log) => {
      const prev = acc.get(log.exerciseId);
      if (!prev || log.date > prev.date) acc.set(log.exerciseId, { weight: log.weight, date: log.date });
      return acc;
    }, new Map());
  }, [logs]);

  // Global indices (in `logs` array) of the selected day's logs for the currently selected exercise, in order
  const todayExerciseLogIndices = useMemo(() => {
    if (!selectedExercise) return [];
    return logs
      .map((l, idx) => ({ l, idx }))
      .filter(({ l }) => l.exerciseId === selectedExercise.id && l.date.slice(0, 10) === selectedDateKey)
      .map(({ idx }) => idx);
  }, [selectedExercise, logs, selectedDateKey]);

  // Rest timer helpers
  const startRestTimer = useCallback((seconds = REST_TIMER_SECONDS) => {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    setRestSeconds(seconds);
    restIntervalRef.current = setInterval(() => {
      setRestSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(restIntervalRef.current!);
          restIntervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    if (activeTimerRef.current) clearInterval(activeTimerRef.current);
  }, []);

  // Fire completion celebration once when all exercises are done; reset when session changes.
  // Only trigger for today's session (not when viewing a past completed day).
  useEffect(() => {
    const isToday = selectedDateKey === todayDateKey;
    if (allExercisesDone && !completionShownRef.current && isToday) {
      completionShownRef.current = true;
      setShowCompletion(true);
    }
    if (!allExercisesDone) {
      completionShownRef.current = false;
    }
  }, [allExercisesDone, selectedDateKey, todayDateKey]);

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
    if (!selectedExercise) return;

    const count = Math.max(1, setsInput);

    // ── Isometric / Cardio (duration-based) ─────────────────────────
    if (currentExerciseType === 'isometric' || currentExerciseType === 'cardio') {
      if (durationInput <= 0) return;
      const newLogs = Array.from({ length: count }, () => ({
        date: new Date().toISOString(),
        exerciseId: selectedExercise.id,
        weight: 0,
        reps: 0,
        duration: durationInput,
        ...(rpeInput >= 1 ? { rpe: rpeInput } : {}),
      }));
      newLogs.forEach((log) => addLog(log));
      setSyncStatus('local');
      startRestTimer(60);

      if (authToken) {
        try {
          setSyncStatus('syncing');
          await Promise.all(newLogs.map((log) => workoutService.addLog(authToken, log)));
          setSyncStatus('synced');
        } catch {
          setSyncStatus('error');
        }
      }

      const durationLabel = currentExerciseType === 'cardio'
        ? `${Math.round(durationInput / 60)} min`
        : formatDuration(durationInput);
      showToast({
        type: 'success',
        title: count > 1 ? `${count} series guardadas 💪` : 'Serie guardada 💪',
        message: rpeInput >= 1 ? `${durationLabel} · RPE ${rpeInput}` : durationLabel,
      });

      // Progressive suggestion for isometric: beat target 3 times → suggest harder variant
      if (currentExerciseType === 'isometric' && selectedExercise.durationTarget) {
        const target = selectedExercise.durationTarget;
        if (durationInput >= target) {
          const pastBeats = logs
            .filter((l) => l.exerciseId === selectedExercise.id && (l.duration ?? 0) >= target)
            .length;
          if (pastBeats >= 2) {
            showToast({
              type: 'info',
              title: '🔥 ¡Objetivo isométrico superado!',
              message: 'Considera una variante más exigente en la próxima sesión.',
            });
          }
        }
      }

      setDurationInput(0);
      setRpeInput(-1);
      setSetsInput(1);
      setIsometricElapsed(0);
      return;
    }

    // ── Bodyweight (reps, no weight required) ────────────────────────
    if (currentExerciseType === 'bodyweight') {
      if (repsInput <= 0) return;
      const bodyWeight = profile?.weight ?? 0;
      const newLogs = Array.from({ length: count }, () => ({
        date: new Date().toISOString(),
        exerciseId: selectedExercise.id,
        weight: bodyWeight,
        reps: repsInput,
        ...(rirInput >= 0 ? { rir: rirInput } : {}),
      }));
      newLogs.forEach((log) => addLog(log));
      setSyncStatus('local');
      startRestTimer(90);

      if (authToken) {
        try {
          setSyncStatus('syncing');
          await Promise.all(newLogs.map((log) => workoutService.addLog(authToken, log)));
          setSyncStatus('synced');
        } catch {
          setSyncStatus('error');
        }
      }

      showToast({
        type: 'success',
        title: count > 1 ? `${count} series guardadas 💪` : 'Serie guardada 💪',
        message: rirInput >= 0 ? `${repsInput} reps · RIR ${rirInput}` : `${repsInput} reps`,
      });

      const newAchievements = checkNewAchievements([...logs, ...newLogs], achievements.map((a) => a.id), selectedExercise.id, bodyWeight);
      newAchievements.forEach((a) => {
        addAchievement(a);
        showToast({ type: 'success', title: `🏅 Logro desbloqueado: ${a.label}`, message: a.description });
      });

      setRepsInput(0);
      setRirInput(-1);
      setSetsInput(1);
      return;
    }

    // ── Weighted (default) ───────────────────────────────────────────
    if (weightInput > 0 && repsInput > 0) {
      const newLogs = Array.from({ length: count }, () => ({
        date: new Date().toISOString(),
        exerciseId: selectedExercise.id,
        weight: weightInput,
        reps: repsInput,
        ...(rirInput >= 0 ? { rir: rirInput } : {}),
      }));

      newLogs.forEach((log) => addLog(log));
      setSyncStatus('local');
      // Start the rest timer immediately after saving
      startRestTimer(90);

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
        message: rirInput >= 0 ? `${weightInput}kg x ${repsInput} reps · RIR ${rirInput}` : `${weightInput}kg x ${repsInput} reps`,
      });

      // Check achievements
      const newAchievements = checkNewAchievements(
        [...logs, ...newLogs],
        achievements.map((a) => a.id),
        selectedExercise.id,
        weightInput,
      );
      newAchievements.forEach((a) => {
        addAchievement(a);
        showToast({ type: 'success', title: `🏅 Logro desbloqueado: ${a.label}`, message: a.description });
      });

      // Progressive overload suggestion
      const totalDone = (setsByExercise.get(selectedExercise.id) ?? 0) + count;
      const targetSets = Math.max(1, Number(selectedExercise.sets || 0));
      if (totalDone >= targetSets && weightInput >= selectedExercise.weight && selectedExercise.weight > 0) {
        const nextWeight = Math.round((weightInput + 2.5) * 2) / 2;
        showToast({
          type: 'info',
          title: '📈 ¡Objetivo cumplido!',
          message: `Considera subir a ${nextWeight}kg la próxima sesión.`,
        });
      }

      setWeightInput(0);
      setRepsInput(0);
      setRirInput(-1);
      setSetsInput(1);
    }
  };

  // End of handleLog

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=400&auto=format&fit=crop';
  };

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      // Dynamically import html2canvas to avoid bundle bloat
      const { default: html2canvas } = await import('html2canvas');
      if (!summaryCardRef.current) throw new Error('No card ref');
      const canvas = await html2canvas(summaryCardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas toBlob failed'))), 'image/png')
      );
      const file = new File([blob], 'voltbody-sesion.png', { type: 'image/png' });
      const shareText = `Acabo de completar "${todayRoutine?.focus || 'Entrenamiento'}" (${totalTodayExercises} ejercicios) en VoltBody 🔥`;
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: '💪 VoltBody – Sesión completada', text: shareText });
      } else if (navigator.share) {
        await navigator.share({ title: '💪 VoltBody – Sesión completada', text: shareText });
      } else {
        // Fallback: trigger download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'voltbody-sesion.png';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        showToast({ type: 'error', title: 'Error al compartir', message: 'No se pudo generar la imagen.' });
      }
    } finally {
      setIsSharing(false);
    }
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
        {todayRoutine?.exercises.length ? todayRoutine.exercises.map((exercise, index) => {
          const completedCount = setsByExercise.get(exercise.id) ?? 0;
          const targetSets = Math.max(1, Number(exercise.sets || 0));
          const isCompleted = completedCount >= targetSets;
          const progressPct = Math.min(100, Math.round((completedCount / targetSets) * 100));

          return (
          <motion.div
            key={exercise.id}
            {...listStagger(index)}
            whileTap={{ scale: 0.985 }}
            onClick={() => setSelectedExercise(exercise)}
            className={`panel-soft interactive-tile rounded-3xl overflow-hidden cursor-pointer transition-all group ripple-host ${
              isCompleted
                ? 'border-[color:var(--app-accent)]/60 bg-[color:var(--app-accent)]/5 anim-glow-pulse'
                : 'hover:border-[color:var(--app-accent)]/50'
            }`}
          >
            <div className="p-5 flex items-center gap-4">
              <motion.div
                layoutId={`ex-img-${exercise.id}`}
                className="w-16 h-16 rounded-2xl overflow-hidden bg-[var(--app-surface)] flex-shrink-0 relative"
              >
                <LazyImage 
                  src={exercise.gifUrl || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=400&auto=format&fit=crop'} 
                  alt={exercise.name} 
                  onError={handleImageError}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
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
              </motion.div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-white mb-0.5 truncate">{exercise.name}</h3>
                <p className="text-sm text-gray-500 font-medium tabular-nums">
                  {exercise.sets} sets × {exercise.reps} reps
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
            </div>
            {/* Ultra-thin series progress bar */}
            <div className="h-[3px] w-full bg-white/5">
              <motion.div
                className="h-full rounded-full"
                style={{ background: isCompleted ? 'var(--app-accent)' : 'var(--app-accent)' }}
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </motion.div>
          );
        }) : (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center justify-center py-16 px-6 text-center"
          >
            <div className="relative mb-6">
              <svg width="96" height="96" viewBox="0 0 96 96" fill="none" className="opacity-20">
                <rect x="12" y="36" width="72" height="42" rx="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
                <circle cx="48" cy="24" r="12" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
                <line x1="32" y1="57" x2="64" y2="57" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="38" y1="65" x2="58" y2="65" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Dumbbell className="app-accent opacity-60" size={32} />
              </div>
            </div>
            <p className="text-white/70 font-semibold text-base mb-1">Sin rutina para hoy</p>
            <p className="text-gray-500 text-sm max-w-[220px]">Genera tu plan con IA o añade ejercicios en "Arma tu Entrenamiento"</p>
          </motion.div>
        )}
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

      {createPortal(
      <AnimatePresence>
        {selectedExercise && (
          <motion.div
            {...slideUpSheet}
            className="fixed inset-0 z-[60] bg-[var(--app-bg)] flex flex-col"
          >
            {/* Header with shared-element image transition */}
            <div className="relative h-[30%] shrink-0 bg-[var(--app-surface)] overflow-hidden flex items-center justify-center">
              <motion.div
                layoutId={`ex-img-${selectedExercise.id}`}
                className="w-full h-full"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                <LazyImage 
                  src={selectedExercise.gifUrl || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=400&auto=format&fit=crop'} 
                  alt={selectedExercise.name} 
                  onError={handleImageError}
                  className="w-full h-full object-cover z-10" 
                  referrerPolicy="no-referrer"
                  loading="eager"
                />
              </motion.div>
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--app-bg)] via-transparent to-transparent z-20 pointer-events-none" />
              <button
                onClick={closeExercise}
                className="absolute top-6 left-6 p-3 bg-black/50 backdrop-blur-md rounded-full border border-white/10 text-white z-30"
              >
                <ChevronLeft size={24} />
              </button>
            </div>

            <div className="flex-1 min-h-0 px-4 py-3 sm:p-6 flex flex-col overflow-y-auto">
              <h2 className="text-xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">{selectedExercise.name}</h2>
              {(() => {
                // Isometric: show best hold time
                if (currentExerciseType === 'isometric') {
                  const bestTime = personalBestTimes.get(selectedExercise.id);
                  const lastLog = logs
                    .filter((l) => l.exerciseId === selectedExercise.id && l.duration !== undefined)
                    .sort((a, b) => b.date.localeCompare(a.date))[0];
                  if (!bestTime && !lastLog) return null;
                  return (
                    <div className="flex flex-col gap-1 mb-2">
                      {bestTime !== undefined && (
                        <span className="text-xs font-mono text-yellow-400 flex items-center gap-1">
                          <Trophy size={12} />
                          Mejor tiempo: {formatDuration(bestTime)}
                        </span>
                      )}
                      {lastLog?.duration !== undefined && (
                        <span className="text-xs font-mono text-gray-400 flex items-center gap-1">
                          Último: {formatDuration(lastLog.duration)}{lastLog.rpe ? ` · RPE ${lastLog.rpe}` : ''}
                        </span>
                      )}
                    </div>
                  );
                }
                // Weighted / bodyweight: show best weight
                const prWeight = personalRecords.get(selectedExercise.id);
                const lastEntry = lastWeights.get(selectedExercise.id);
                if (!prWeight && !lastEntry) return null;
                return (
                  <div className="flex flex-col gap-1 mb-2">
                    {prWeight && prWeight > 0 && (
                      <span className="text-xs font-mono text-yellow-400 flex items-center gap-1">
                        <Trophy size={12} />
                        Mejor marca: {prWeight}kg
                      </span>
                    )}
                    {lastEntry && lastEntry.weight > 0 && (
                      <span className="text-xs font-mono text-gray-400 flex items-center gap-1">
                        Último peso registrado: {lastEntry.weight}kg
                      </span>
                    )}
                  </div>
                );
              })()}
              <div className="flex flex-wrap gap-2 mb-3 sm:mb-6">
                <span className="neuro-inset px-4 py-2 rounded-full text-sm app-accent font-mono glow-box">
                  {selectedExercise.muscleGroup}
                </span>
                <span className="neuro-inset px-4 py-2 rounded-full text-sm text-gray-300 font-mono">
                  {currentExerciseType === 'isometric' ? '⏱ Isométrico' :
                   currentExerciseType === 'bodyweight' ? '🤸 Peso corporal' :
                   currentExerciseType === 'cardio' ? '🏃 Cardio' : '🏋️ Con peso'}
                </span>
                <span className="neuro-inset px-4 py-2 rounded-full text-sm text-gray-300 font-mono">
                  {selectedExercise.sets} x {selectedExercise.reps}
                </span>
                {currentExerciseType === 'weighted' && selectedExercise.weight > 0 && (
                  <span className="neuro-inset px-4 py-2 rounded-full text-sm text-gray-300 font-mono">
                    Meta: <span className="app-accent font-bold">{selectedExercise.weight} kg</span>
                  </span>
                )}
              </div>

              {/* Progressive overload suggestion (weighted only) */}
              {progressiveSuggestion && currentExerciseType === 'weighted' && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3 sm:mb-5 flex items-center gap-3 neuro-inset rounded-2xl p-3 sm:p-4 border border-[color:var(--app-accent)]/30"
                >
                  <TrendingUp className="app-accent shrink-0" size={18} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--app-accent)]">📈 Sobrecarga progresiva</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Completaste {progressiveSuggestion.currentWeight} kg las últimas {progressiveSuggestion.sessionsAnalyzed} sesiones → prueba <strong className="text-white">{progressiveSuggestion.suggestedWeight} kg</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWeightInput(progressiveSuggestion.suggestedWeight)}
                    className="tap-target shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold primary-btn"
                  >
                    Usar
                  </button>
                </motion.div>
              )}

              {/* Técnica */}
              {(() => {
                const libEntry = exerciseLibrary.find((e) => e.id === selectedExercise.id);
                const technique = libEntry?.technique ?? selectedExercise.technique;
                if (!technique) return null;
                return (
                  <div className="mb-3 sm:mb-6">
                    <button
                      type="button"
                      onClick={() => setShowTechnique((v) => !v)}
                      className="tap-target flex items-center gap-2 text-sm font-semibold app-accent mb-2"
                    >
                      <BookOpen size={15} />
                      {showTechnique ? 'Ocultar técnica' : 'Ver técnica'}
                    </button>
                    <AnimatePresence>
                      {showTechnique && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="neuro-inset rounded-2xl p-4 space-y-2">
                            {technique.split('\n').map((step, i) => (
                              <p key={i} className="text-sm text-gray-300 leading-relaxed">{step}</p>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })()}

              <div className="neuro-raised rounded-3xl p-4 sm:p-6">
                <h3 className="text-base font-semibold text-white/90 mb-2 sm:mb-4 flex items-center gap-2">
                  <CheckCircle2 className="app-accent" size={16} />
                  Registrar Series
                </h3>

                {/* Set dots */}
                {(() => {
                  const targetSets = Math.max(1, Number(selectedExercise.sets || 0));
                  const doneSets = setsByExercise.get(selectedExercise.id) ?? 0;
                  return (
                    <div className="flex gap-2 mb-2 sm:mb-4 flex-wrap">
                      {Array.from({ length: targetSets }, (_, i) => {
                        if (i < doneSets) {
                          const logIndex = todayExerciseLogIndices[i];
                          return (
                            <button
                              key={i}
                              type="button"
                              title="Editar serie"
                              onClick={() => {
                                if (logIndex === undefined) return;
                                const log = logs[logIndex];
                                setEditingSet({ logIndex, weight: log.weight, reps: log.reps, duration: log.duration, rpe: log.rpe });
                              }}
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all bg-[color:var(--app-accent)] text-black hover:opacity-80 active:scale-95 cursor-pointer"
                            >
                              ✓
                            </button>
                          );
                        }
                        return (
                          <div
                            key={i}
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all neuro-inset text-gray-500"
                          >
                            {i + 1}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Inline edit form for a logged set */}
                <AnimatePresence>
                  {editingSet && (
                    <motion.div
                      key="edit-set"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.2 }}
                      className="mb-3 sm:mb-4 neuro-inset rounded-2xl p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-white flex items-center gap-1">
                          ✏️ Editar serie
                        </h4>
                        <button
                          type="button"
                          onClick={() => setEditingSet(null)}
                          className="tap-target text-gray-400 hover:text-white text-base leading-none px-1"
                          aria-label="Cerrar edición"
                        >
                          ✕
                        </button>
                      </div>
                      {currentExerciseType === 'isometric' || currentExerciseType === 'cardio' ? (
                        <div className="mb-3">
                          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">
                            {currentExerciseType === 'cardio' ? 'Duración (min)' : 'Duración (seg)'}
                          </label>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={editingSet.duration ?? ''}
                            onChange={(e) => setEditingSet((prev) => prev ? { ...prev, duration: Number(e.target.value) } : null)}
                            className="w-full input-field rounded-2xl p-2.5 text-lg font-semibold text-center"
                            placeholder="0"
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">
                              {currentExerciseType === 'bodyweight' ? 'Peso corporal (kg)' : 'Peso (kg)'}
                            </label>
                            <input
                              type="number"
                              inputMode="decimal"
                              value={editingSet.weight || ''}
                              onChange={(e) => setEditingSet((prev) => prev ? { ...prev, weight: Number(e.target.value) } : null)}
                              className="w-full input-field rounded-2xl p-2.5 text-lg font-semibold text-center"
                              placeholder="0"
                              readOnly={currentExerciseType === 'bodyweight'}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Reps</label>
                            <input
                              type="number"
                              inputMode="numeric"
                              value={editingSet.reps || ''}
                              onChange={(e) => setEditingSet((prev) => prev ? { ...prev, reps: Number(e.target.value) } : null)}
                              className="w-full input-field rounded-2xl p-2.5 text-lg font-semibold text-center"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      )}
                      <button
                        type="button"
                        disabled={
                          (currentExerciseType === 'isometric' || currentExerciseType === 'cardio')
                            ? !editingSet.duration
                            : !editingSet.reps
                        }
                        onClick={() => {
                          if (!editingSet) return;
                          if (currentExerciseType === 'isometric' || currentExerciseType === 'cardio') {
                            updateLog(editingSet.logIndex, { duration: editingSet.duration });
                            showToast({ type: 'success', title: 'Serie actualizada ✏️', message: `${editingSet.duration}s` });
                          } else {
                            updateLog(editingSet.logIndex, { weight: editingSet.weight, reps: editingSet.reps });
                            showToast({ type: 'success', title: 'Serie actualizada ✏️', message: `${editingSet.weight}kg × ${editingSet.reps} reps` });
                          }
                          setEditingSet(null);
                        }}
                        className="w-full primary-btn font-bold py-2.5 rounded-xl tap-target disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Guardar cambios
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Isometric form ── */}
                {(currentExerciseType === 'isometric' || currentExerciseType === 'cardio') && (
                  <div className="space-y-3 mb-3">
                    {/* Active hold timer (isometric only) */}
                    {currentExerciseType === 'isometric' && (
                      <div className="neuro-inset rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs uppercase tracking-wider text-gray-500 font-medium">Timer en vivo</span>
                          <span className="text-2xl font-black text-white tabular-nums">
                            {formatDuration(isometricElapsed)}
                          </span>
                        </div>
                        {isometricRunning ? (
                          <button
                            type="button"
                            onClick={() => {
                              setIsometricRunning(false);
                              if (activeTimerRef.current) {
                                clearInterval(activeTimerRef.current);
                                activeTimerRef.current = null;
                              }
                              setDurationInput(isometricElapsed);
                              setIsometricElapsed(0);
                            }}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 font-bold text-sm tap-target"
                          >
                            <Square size={14} fill="currentColor" />
                            DETENER — {formatDuration(isometricElapsed)}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setIsometricElapsed(0);
                              setIsometricRunning(true);
                              if (activeTimerRef.current) clearInterval(activeTimerRef.current);
                              activeTimerRef.current = setInterval(() => {
                                setIsometricElapsed((prev) => prev + 1);
                              }, 1000);
                            }}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[color:var(--app-accent)]/10 border border-[color:var(--app-accent)]/30 text-[var(--app-accent)] font-bold text-sm tap-target"
                          >
                            <Timer size={14} />
                            Iniciar serie en vivo
                          </button>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 sm:mb-2 uppercase tracking-wider">
                          {currentExerciseType === 'cardio' ? 'Duración (min)' : 'Duración (seg)'}
                        </label>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={durationInput || ''}
                          onChange={(e) => setDurationInput(Math.max(0, Number(e.target.value)))}
                          className="w-full input-field rounded-2xl p-2.5 sm:p-4 text-lg sm:text-2xl font-semibold text-center"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 sm:mb-2 uppercase tracking-wider">Series</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={10}
                          value={setsInput || ''}
                          onChange={(e) => setSetsInput(Math.max(1, Number(e.target.value)))}
                          className="w-full input-field rounded-2xl p-2.5 sm:p-4 text-lg sm:text-2xl font-semibold text-center"
                          placeholder="1"
                        />
                      </div>
                    </div>

                    {/* RPE (isometric only) */}
                    {currentExerciseType === 'isometric' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                          RPE <span className="normal-case text-gray-600">(esfuerzo 1-10, opcional)</span>
                        </label>
                        <div className="flex gap-1.5 flex-wrap">
                          {[1,2,3,4,5,6,7,8,9,10].map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setRpeInput((prev) => prev === r ? -1 : r)}
                              className={`w-9 h-9 rounded-xl text-sm font-bold transition-all tap-target ${
                                rpeInput === r
                                  ? 'bg-[color:var(--app-accent)] text-black'
                                  : 'neuro-inset text-gray-500 hover:text-white'
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Last session context for isometric */}
                    {lastSessionLog?.duration !== undefined && (
                      <p className="text-xs text-gray-500 text-center tabular-nums">
                        Última vez: <span className="text-white/70 font-medium">{formatDuration(lastSessionLog.duration)}</span>
                        {lastSessionLog.rpe ? <span className="text-gray-500"> · RPE {lastSessionLog.rpe}</span> : null}
                      </p>
                    )}
                  </div>
                )}

                {/* ── Bodyweight form ── */}
                {currentExerciseType === 'bodyweight' && (
                  <div className="space-y-3 mb-3">
                    {profile?.weight && (
                      <div className="neuro-inset rounded-xl p-3 flex items-center gap-3">
                        <span className="text-2xl">🤸</span>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Peso corporal (referencia)</p>
                          <p className="text-lg font-black text-white">{profile.weight} kg</p>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 sm:mb-2 uppercase tracking-wider">Reps</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={repsInput || ''}
                          onChange={(e) => setRepsInput(Number(e.target.value))}
                          className="w-full input-field rounded-2xl p-2.5 sm:p-4 text-lg sm:text-2xl font-semibold text-center"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 sm:mb-2 uppercase tracking-wider">Series</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={10}
                          value={setsInput || ''}
                          onChange={(e) => setSetsInput(Math.max(1, Number(e.target.value)))}
                          className="w-full input-field rounded-2xl p-2.5 sm:p-4 text-lg sm:text-2xl font-semibold text-center"
                          placeholder="1"
                        />
                      </div>
                    </div>
                    {/* RIR */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                        RIR <span className="normal-case text-gray-600">(reps al fallo, opcional)</span>
                      </label>
                      <div className="flex gap-2">
                        {[0,1,2,3,4].map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setRirInput((prev) => prev === r ? -1 : r)}
                            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all tap-target ${
                              rirInput === r ? 'bg-[color:var(--app-accent)] text-black' : 'neuro-inset text-gray-500'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                    {lastSessionLog && lastSessionLog.reps > 0 && (
                      <p className="text-xs text-gray-500 text-center tabular-nums">
                        Última vez: <span className="text-white/70 font-medium">{lastSessionLog.reps} reps</span>
                        {lastSessionLog.rir !== undefined ? <span className="text-gray-500"> · RIR {lastSessionLog.rir}</span> : null}
                      </p>
                    )}
                  </div>
                )}

                {/* ── Weighted form (default) ── */}
                {currentExerciseType === 'weighted' && (
                  <div className="space-y-3 mb-3">
                    {/* Smart Weight Calculator */}
                    <WeightCalculator
                      exerciseId={selectedExercise.id}
                      exerciseName={selectedExercise.name}
                      targetWeight={selectedExercise.weight}
                      userBodyweight={profile?.weight}
                      onWeightChange={handleCalculatorWeightChange}
                    />

                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 sm:mb-2 uppercase tracking-wider">Peso (kg)</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={weightInput || ''}
                          onChange={(e) => setWeightInput(Number(e.target.value))}
                          className="w-full input-field rounded-2xl p-2.5 sm:p-4 text-lg sm:text-2xl font-semibold text-center"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 sm:mb-2 uppercase tracking-wider">Reps</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={repsInput || ''}
                          onChange={(e) => setRepsInput(Number(e.target.value))}
                          className="w-full input-field rounded-2xl p-2.5 sm:p-4 text-lg sm:text-2xl font-semibold text-center"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 sm:mb-2 uppercase tracking-wider">Series</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={10}
                          value={setsInput || ''}
                          onChange={(e) => setSetsInput(Math.max(1, Number(e.target.value)))}
                          className="w-full input-field rounded-2xl p-2.5 sm:p-4 text-lg sm:text-2xl font-semibold text-center"
                          placeholder="1"
                        />
                      </div>
                    </div>

                    {/* 1RM estimate (Epley formula) */}
                    {weightInput > 0 && repsInput > 1 && (
                      <p className="text-xs text-center text-gray-500 tabular-nums">
                        1RM estimado (Epley):{' '}
                        <span className="text-[var(--app-accent)] font-bold">
                          {Math.round(weightInput * (1 + repsInput / 30))} kg
                        </span>
                      </p>
                    )}

                    {/* RIR */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                        RIR <span className="normal-case text-gray-600">(reps al fallo, opcional)</span>
                      </label>
                      <div className="flex gap-2">
                        {[0,1,2,3,4].map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setRirInput((prev) => prev === r ? -1 : r)}
                            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all tap-target ${
                              rirInput === r ? 'bg-[color:var(--app-accent)] text-black' : 'neuro-inset text-gray-500'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Last session context */}
                    {lastSessionLog && lastSessionLog.weight > 0 && (
                      <p className="text-xs text-gray-500 text-center tabular-nums">
                        Última vez:{' '}
                        <span className="text-white/70 font-medium">
                          {lastSessionLog.weight}kg × {lastSessionLog.reps} reps
                        </span>
                        {lastSessionLog.rir !== undefined ? <span className="text-gray-500"> · RIR {lastSessionLog.rir}</span> : null}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Exercise history */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowHistory((v) => !v)}
                  className="tap-target flex items-center gap-2 text-sm font-semibold app-accent mb-3"
                >
                  <History size={15} />
                  {showHistory ? 'Ocultar historial' : 'Ver historial'}
                  {exerciseHistory.length > 0 && (
                    <span className="text-gray-500 font-normal">({exerciseHistory.length} sesiones)</span>
                  )}
                </button>
                <AnimatePresence>
                  {showHistory && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      {exerciseHistory.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-4">Sin registros anteriores.</p>
                      ) : (
                        <div className="neuro-inset rounded-2xl p-4">
                          {/* PR summary */}
                          {currentExerciseType === 'isometric' ? (
                            <div className="flex gap-3 mb-4">
                              <div className="flex-1 neuro-raised rounded-xl p-3 text-center">
                                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">⏱ PR Tiempo</p>
                                <p className="text-lg font-black text-yellow-400">
                                  {formatDuration(personalBestTimes.get(selectedExercise.id) ?? 0)}
                                </p>
                              </div>
                              <div className="flex-1 neuro-raised rounded-xl p-3 text-center">
                                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">📊 Sesiones</p>
                                <p className="text-lg font-black text-yellow-400">{exerciseHistory.length}</p>
                              </div>
                            </div>
                          ) : (
                            (() => {
                              const prWeight = Math.max(...exerciseHistory.map((s) => s.maxWeight));
                              const prReps = Math.max(...exerciseHistory.map((s) => s.maxReps));
                              return (
                                <div className="flex gap-3 mb-4">
                                  <div className="flex-1 neuro-raised rounded-xl p-3 text-center">
                                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">🥇 PR Peso</p>
                                    <p className="text-lg font-black text-yellow-400">{prWeight} kg</p>
                                  </div>
                                  <div className="flex-1 neuro-raised rounded-xl p-3 text-center">
                                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">🔁 PR Reps</p>
                                    <p className="text-lg font-black text-yellow-400">{prReps}</p>
                                  </div>
                                </div>
                              );
                            })()
                          )}

                          {/* Progression chart */}
                          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">
                            {currentExerciseType === 'isometric' ? 'Progresión de tiempo' : 'Progresión de peso'}
                          </p>
                          <ResponsiveContainer width="100%" height={120}>
                            <LineChart data={exerciseHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                              <XAxis
                                dataKey="date"
                                tick={{ fill: '#6b7280', fontSize: 9 }}
                                tickFormatter={(d: string) => d.slice(5)}
                                interval="preserveStartEnd"
                              />
                              <YAxis tick={{ fill: '#6b7280', fontSize: 9 }} domain={['auto', 'auto']} />
                              <Tooltip
                                contentStyle={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', borderRadius: 8, fontSize: 11 }}
                                labelFormatter={(d: string) => d}
                                formatter={(v: number) => [currentExerciseType === 'isometric' ? `${v}s` : `${v} kg`, currentExerciseType === 'isometric' ? 'Duración' : 'Peso']}
                              />
                              <Line
                                type="monotone"
                                dataKey="maxWeight"
                                stroke="var(--app-accent)"
                                strokeWidth={2}
                                dot={{ fill: 'var(--app-accent)', r: 3 }}
                                activeDot={{ r: 5 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>

                          {/* Recent sessions list */}
                          <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-4 mb-2">Últimas sesiones</p>
                          <div className="space-y-1.5 max-h-40 overflow-y-auto">
                            {[...exerciseHistory].reverse().map((s) => (
                              <div key={s.date} className="flex items-center justify-between text-xs">
                                <span className="text-gray-400 font-mono">{s.date}</span>
                                {currentExerciseType === 'isometric' ? (
                                  <span className="text-white font-medium">{formatDuration(s.maxWeight)}</span>
                                ) : (
                                  <span className="text-white font-medium">{s.maxWeight} kg</span>
                                )}
                                <span className="text-gray-500">{s.sets} sets</span>
                                {currentExerciseType !== 'isometric' && (
                                  <span className="text-gray-500">Vol: {Math.round(s.totalVolume)}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Sticky save button – always visible at the bottom of the sheet */}
            <div className="px-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] border-t border-[var(--app-border)] bg-[var(--app-bg)]">
              {(() => {
                const isDisabled =
                  currentExerciseType === 'isometric' || currentExerciseType === 'cardio'
                    ? durationInput <= 0
                    : currentExerciseType === 'bodyweight'
                    ? repsInput <= 0
                    : !weightInput || !repsInput;
                return (
                  <motion.button
                    onClick={handleLog}
                    disabled={isDisabled}
                    whileTap={isDisabled ? {} : { scale: [1, 1.06, 0.97, 1.02, 1] }}
                    transition={{ duration: 0.45, ease: [0.2, 0.9, 0.4, 1.1] }}
                    className="w-full tap-target primary-btn ripple-host font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {setsInput > 1 ? `Guardar ${setsInput} series 💾` : 'Guardar Serie 💾'}
                  </motion.button>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}

      {/* Floating rest timer pill */}
      <AnimatePresence>
        {restSeconds > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[55] flex items-center gap-3 px-5 py-2.5 rounded-full glass-panel border border-[var(--app-border)]"
          >
            <div className="w-6 h-6 relative flex items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                <circle
                  cx="12" cy="12" r="10"
                  stroke="var(--app-accent)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={`${TIMER_CIRCUMFERENCE * (restSeconds / REST_TIMER_SECONDS)} ${TIMER_CIRCUMFERENCE}`}
                  style={{ transition: 'stroke-dasharray 1s linear' }}
                />
              </svg>
            </div>
            <span className="text-white font-semibold text-sm tabular-nums">
              Descanso: {Math.floor(restSeconds / 60)}:{String(restSeconds % 60).padStart(2, '0')}
            </span>
            <button
              onClick={() => { setRestSeconds(0); if (restIntervalRef.current) clearInterval(restIntervalRef.current); }}
              className="text-gray-500 hover:text-white text-xs ml-1 transition-colors"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion celebration – top banner */}
      <AnimatePresence>
        {showCompletion && (
          <motion.div
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="fixed top-0 left-0 right-0 z-[80] border-b border-[color:var(--app-accent)]/30 bg-[var(--app-surface)]/95 backdrop-blur-xl shadow-[0_4px_32px_color-mix(in_srgb,var(--app-accent)_20%,transparent)]"
          >
            {/* Accent line at very top */}
            <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-[color:var(--app-accent)] to-transparent" />

            <div className="px-4 py-3">
              {/* Row 1: icon + title + close */}
              <div className="flex items-center gap-3">
                <motion.span
                  animate={{ rotate: [0, -12, 12, -7, 7, 0], scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.7, ease: 'easeInOut' }}
                  className="text-3xl shrink-0"
                >
                  🏆
                </motion.span>

                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--app-accent)] font-bold leading-none mb-0.5">
                    ¡Sesión completada!
                  </p>
                  <p className="text-base font-black text-white truncate leading-tight">
                    {todayRoutine?.focus || 'Entrenamiento'}
                  </p>
                </div>

                {/* Close X */}
                <button
                  type="button"
                  onClick={() => setShowCompletion(false)}
                  className="shrink-0 tap-target w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white transition-colors"
                  aria-label="Cerrar"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Row 2: quick stats + share */}
              <div className="flex items-center gap-2 mt-2.5">
                {/* Stats pills */}
                <div className="flex gap-1.5 flex-1 min-w-0">
                  {[
                    { icon: '💪', value: String(totalTodayExercises) },
                    { icon: '✅', value: `${completedSets}/${plannedSets}` },
                    { icon: '⚡', value: `+${todayXP} XP` },
                    { icon: '🔥', value: `${currentStreak}d` },
                  ].map(({ icon, value }) => (
                    <span key={icon} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-[11px] font-semibold whitespace-nowrap">
                      <span>{icon}</span>
                      <span>{value}</span>
                    </span>
                  ))}
                </div>

                {/* Share button */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => void handleShare()}
                  disabled={isSharing}
                  className="shrink-0 tap-target primary-btn rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-70"
                >
                  {isSharing ? (
                    <><Loader2 size={13} className="animate-spin" /> Generando...</>
                  ) : (
                    <><Share2 size={13} /> Compartir</>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Off-screen workout summary card rendered for html2canvas capture */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, transform: 'translateX(-9999px)', opacity: 0, pointerEvents: 'none', zIndex: -1 }} aria-hidden="true">
        <WorkoutSummaryCard
          ref={summaryCardRef}
          data={{
            focus: todayRoutine?.focus || 'Entrenamiento',
            exerciseCount: totalTodayExercises,
            completedSets,
            plannedSets,
            streak: currentStreak,
            level,
            totalXP,
            xpGained: todayXP,
            userName: profile?.name,
            exercises: (todayRoutine?.exercises || []).map((ex) => ({ name: ex.name, sets: Number(ex.sets), reps: ex.reps })),
          }}
        />
      </div>
      </div>
    </div>
  );
}
