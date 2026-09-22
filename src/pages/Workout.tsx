import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore, Exercise, WorkoutDay, ExerciseType } from '../store/useAppStore';
import { Haptics } from '../lib/haptics';
import {
  ChevronLeft,
  Play,
  CheckCircle2,
  Dumbbell,
  PlusCircle,
  Trash2,
  Star,
  CalendarClock,
  Flame,
  BookOpen,
  Share2,
  Trophy,
  TrendingUp,
  History,
  Loader2,
  X,
  Timer,
  Square,
  Camera,
  Plus,
  Minus,
  Sparkles,
} from 'lucide-react';
import { workoutService } from '../services/workoutService';
import { authService } from '../services/authService';
import { enrichRoutine, routineNeedsEnrichment } from '../services/exerciseImageService';
import { AppCard, SectionHeader, StatPill, LazyImage } from '../components/ui';
import {
  listStagger,
  slideUpSheet,
  checkBounce,
  completionGlow,
  iosSheetSpring,
  iosBouncySpring,
  numberRoll,
} from '../lib/motion';
import { WEEKDAY_LABELS, getMondayFirstIndex, mapRoutineByWeekday, computeSmartStreak, WEEK_STARTS_ON_MONDAY } from '../lib/routineWeek';
import { format, startOfWeek, addDays } from 'date-fns';
import WeightCalculator from '../components/WeightCalculator';
import { checkNewAchievements } from '../lib/achievements';
import { getProgressiveSuggestion, getExerciseHistory } from '../lib/progressiveOverload';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import WorkoutSummaryCard from '../components/WorkoutSummaryCard';
import PoseCoach, { type PoseCoachExercise } from '../components/PoseCoach';

/** Format seconds as MM:SS with monospace digits */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Keyword sets for exercise type detection ──────────────────────────────────
const ISOMETRIC_KEYWORDS = ['plancha', 'frog stand', 'isométrica', 'wall sit', 'estática', 'side plank'];
const BODYWEIGHT_KEYWORDS = ['dominadas', 'fondos', 'flexiones', 'burpees', 'pull-up', 'dip'];
const CARDIO_KEYWORDS = ['cardio', 'cuerda', 'correr', 'bicicleta', 'remo ergómetro', 'caminar', 'elíptica'];

/** Isometric / keyword-based exercise type detector (fallback when exerciseType is not set) */
function detectExerciseType(name: string): ExerciseType {
  const lower = name.toLowerCase();
  if (ISOMETRIC_KEYWORDS.some((k) => lower.includes(k))) return 'isometric';
  if (BODYWEIGHT_KEYWORDS.some((k) => lower.includes(k))) return 'bodyweight';
  if (CARDIO_KEYWORDS.some((k) => lower.includes(k))) return 'cardio';
  return 'weighted';
}

/** Map exercise name / type to a PoseCoach exercise key */
function detectPoseExercise(name: string, type: ExerciseType): PoseCoachExercise {
  const lower = name.toLowerCase();
  if (lower.includes('sentadilla') || lower.includes('squat') || lower.includes('goblet')) return 'squat';
  if (lower.includes('plancha') || lower.includes('plank')) return 'plank';
  if (lower.includes('peso muerto') || lower.includes('deadlift') || lower.includes('rdl')) return 'deadlift';
  if (lower.includes('zancada') || lower.includes('lunge')) return 'lunge';
  if (lower.includes('flexiones') || lower.includes('push') || lower.includes('fondos')) return 'pushup';
  if (type === 'isometric') return 'plank';
  if (type === 'bodyweight') return 'pushup';
  return 'squat';
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
  } = useAppStore(
    useShallow((s) => ({
      routine: s.routine,
      addLog: s.addLog,
      updateLog: s.updateLog,
      customWorkout: s.customWorkout,
      exerciseLibrary: s.exerciseLibrary,
      addToCustomWorkout: s.addToCustomWorkout,
      removeFromCustomWorkout: s.removeFromCustomWorkout,
      setRoutine: s.setRoutine,
      profile: s.profile,
      authToken: s.authToken,
      showToast: s.showToast,
      logs: s.logs,
      achievements: s.achievements,
      addAchievement: s.addAchievement,
    }))
  );

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
  // Set completion micro-glow state
  const [lastLoggedExerciseId, setLastLoggedExerciseId] = useState<string | null>(null);
  // Share card state
  const [isSharing, setIsSharing] = useState(false);
  const summaryCardRef = useRef<HTMLDivElement>(null);
  // State for editing a previously logged set
  const [editingSet, setEditingSet] = useState<{ logIndex: number; weight: number; reps: number; duration?: number; rpe?: number } | null>(null);
  // PoseCoach state
  const [showPoseCoach, setShowPoseCoach] = useState(false);

  // Stable callback passed to WeightCalculator — avoids stale-closure issue
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
      if (!historyPushedRef.current) return;
      historyPushedRef.current = false;
      setSelectedExercise(null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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

  // Date key for selected weekday in current week
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
  const todayXP = useMemo(() => todayLogs.length * XP_PER_LOG, [todayLogs.length]);

  // Last session log for selected exercise
  const lastSessionLog = useMemo(() => {
    if (!selectedExercise) return null;
    const past = logs
      .filter((l) => l.exerciseId === selectedExercise.id && l.date.slice(0, 10) !== todayDateKey)
      .sort((a, b) => b.date.localeCompare(a.date));
    return past[0] ?? null;
  }, [selectedExercise, logs, todayDateKey]);

  // Progressive overload suggestion
  const progressiveSuggestion = useMemo(
    () => (selectedExercise ? getProgressiveSuggestion(selectedExercise.id, logs) : null),
    [selectedExercise, logs],
  );

  // Historical sessions
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

  // Best duration ever logged per exerciseId
  const personalBestTimes = useMemo(() => {
    return logs.reduce<Map<string, number>>((acc, log) => {
      if (log.duration === undefined) return acc;
      const prev = acc.get(log.exerciseId) ?? 0;
      if (log.duration > prev) acc.set(log.exerciseId, log.duration);
      return acc;
    }, new Map());
  }, [logs]);

  // Derived exercise type
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

  // Global indices of selected day's logs for the selected exercise
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

  // Completion celebration trigger
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

  // Silently enrich GIFs
  useEffect(() => {
    if (!authToken || !routine.length || !routineNeedsEnrichment(routine)) return;
    let cancelled = false;
    (async () => {
      const enriched = await enrichRoutine(routine, authToken);
      if (cancelled || !routineNeedsEnrichment(enriched)) return;
      const hasChanges = enriched.some((day, di) =>
        day.exercises.some((ex, ei) => ex.gifUrl !== routine[di]?.exercises[ei]?.gifUrl)
      );
      if (!hasChanges) return;
      setRoutine(enriched);
      try {
        await authService.updateProfile(authToken, { routine: enriched });
      } catch { /* store already updated locally */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

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
      title: 'Días de entreno actualizados',
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
          title: 'Elige un día con entreno',
          message: 'Primero selecciona el día que quieres mover.',
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
        title: 'Día ocupado',
        message: 'Selecciona un día bloqueado para mover el entreno.',
      });
      return;
    }

    await moveTrainingDay(moveSourceDayIndex, index);
  };

  const handleLog = async () => {
    if (!selectedExercise) return;

    const count = Math.max(1, setsInput);
    setLastLoggedExerciseId(selectedExercise.id);
    setTimeout(() => setLastLoggedExerciseId(null), 1200);

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
        title: count > 1 ? `${count} series registradas 💪` : 'Serie registrada 💪',
        message: rpeInput >= 1 ? `${durationLabel} · RPE ${rpeInput}` : durationLabel,
      });

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

    // ── Bodyweight (reps, no external weight required) ──────────────
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
        title: count > 1 ? `${count} series registradas 💪` : 'Serie registrada 💪',
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
        title: count > 1 ? `${count} series registradas 💪` : 'Serie registrada 💪',
        message: rirInput >= 0 ? `${weightInput}kg × ${repsInput} reps · RIR ${rirInput}` : `${weightInput}kg × ${repsInput} reps`,
      });

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

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=400&auto=format&fit=crop';
  };

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
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
        <header className="mb-6 mt-2">
          <h1 className="text-3xl font-bold text-white mb-1.5 flex items-center gap-3 tracking-tight">
            <Dumbbell className="app-accent" size={32} />
            💪 Rutina de Hoy
          </h1>
          <p className="app-accent font-mono text-sm glow-text">{todayRoutine?.focus || 'Hoy toca activar el cuerpo'}</p>
        </header>

        <div className="flex flex-col lg:grid lg:grid-cols-[380px_1fr] lg:gap-8 lg:items-start pb-8">
          {/* Left Column (Sticky Sidebar on Desktop) */}
          <div className="space-y-4 lg:sticky lg:top-6">
            <motion.div {...listStagger(0)}>
              <AppCard className="p-4 glass-panel">
                <SectionHeader
                  title="Semana de entrenamiento"
                  subtitle={
                    isEditingDays
                      ? 'Paso 1: toca un día activo. Paso 2: toca un día bloqueado para moverlo.'
                      : 'Selecciona un día. Los días sin plan quedan bloqueados.'
                  }
                  right={
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingDays((prev) => !prev);
                        setMoveSourceDayIndex(null);
                      }}
                      aria-label={isEditingDays ? 'Cancelar edición de días' : 'Editar días de entrenamiento'}
                      className="min-h-[36px] px-3 py-1.5 rounded-xl text-[11px] font-semibold text-gray-300 bg-white/5 border border-white/10 hover:border-white/20 transition-all active:scale-95 touch-manipulation"
                    >
                      {isEditingDays ? 'Cancelar' : 'Editar días'}
                    </button>
                  }
                />
                <div className="grid grid-cols-7 gap-1.5 mt-2">
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
                        aria-label={`Día ${day.full}`}
                        className={[
                          'min-h-[44px] min-w-[38px] rounded-xl border flex flex-col items-center justify-center text-center text-xs font-semibold transition-all touch-manipulation',
                          !isEditingDays && hasRoutine ? 'cursor-pointer active:scale-95' : '',
                          !isEditingDays && !hasRoutine ? 'cursor-not-allowed opacity-35' : '',
                          isEditingDays && !hasRoutine ? 'cursor-pointer opacity-75' : '',
                          isEditingDays && isMoveSource ? 'border-amber-400 bg-amber-500/20 text-amber-200' : '',
                          isSelected
                            ? 'border-[color:var(--app-accent)]/80 text-[var(--app-accent)] bg-[color:var(--app-accent)]/15 font-bold shadow-[0_0_12px_rgba(57,255,20,0.2)]'
                            : 'border-white/10 text-gray-300 bg-white/[0.03] hover:border-white/20',
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
              <AppCard accent interactive className="p-6 glass-panel">
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
                  <Flame className="app-accent shrink-0" size={28} />
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <StatPill label="estado" value={todayRoutine ? 'activo' : 'custom'} />
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
                  className="w-full min-h-[48px] primary-btn rounded-2xl font-bold py-3 px-4 transition-all text-sm active:scale-[0.98] touch-manipulation shadow-lg"
                >
                  Iniciar Sesión
                </button>
              </AppCard>
            </motion.div>

            <AppCard className="p-4 glass-panel space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
                <span>Checklist de sesión</span>
                <span className="text-white font-bold tabular-nums">{completedSets}/{plannedSets} series</span>
              </div>
              <div className="h-2.5 w-full neuro-progress-track rounded-full overflow-hidden">
                <motion.div
                  className="neuro-progress-fill h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${sessionProgress}%` }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-gray-400">
                <span>Progreso: <strong className="text-[var(--app-accent)]">{sessionProgress}%</strong></span>
                <span>ETA: <strong className="text-gray-300">{etaMinutes} min</strong></span>
              </div>
              <div className="text-[11px] font-mono text-gray-400 pt-1 border-t border-white/5">
                Sync:{' '}
                <span className={syncStatus === 'synced' ? 'text-emerald-400 font-semibold' : syncStatus === 'error' ? 'text-amber-300' : 'text-gray-300'}>
                  {syncStatus === 'idle' && 'sin actividad'}
                  {syncStatus === 'local' && 'guardado local'}
                  {syncStatus === 'syncing' && 'sincronizando...'}
                  {syncStatus === 'synced' && 'sincronizado ✅'}
                  {syncStatus === 'error' && 'error de sincronización'}
                </span>
              </div>
            </AppCard>
          </div>

          {/* Right Column (Scrollable Main Content on Desktop) */}
          <div className="space-y-4 lg:mt-0 flex-1 min-w-0">
            {isSpecialClassToday && (
              <AppCard className="border-[color:var(--app-accent)]/30 bg-[color:var(--app-accent)]/5">
                <div className="flex items-center gap-3">
                  <CalendarClock className="app-accent shrink-0" size={24} />
                  <div>
                    <p className="text-sm font-bold text-white">Hoy toca clase especial 🎯</p>
                    <p className="text-xs text-gray-300">Prioriza técnica y ritmo para sumar calidad al progreso.</p>
                  </div>
                </div>
              </AppCard>
            )}

            <div className="space-y-3">
              {todayRoutine?.exercises.length ? todayRoutine.exercises.map((exercise, index) => {
                const completedCount = setsByExercise.get(exercise.id) ?? 0;
                const targetSets = Math.max(1, Number(exercise.sets || 0));
                const isCompleted = completedCount >= targetSets;
                const progressPct = Math.min(100, Math.round((completedCount / targetSets) * 100));
                const isJustLogged = lastLoggedExerciseId === exercise.id;

                return (
                  <motion.div
                    key={exercise.id}
                    {...listStagger(index)}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => setSelectedExercise(exercise)}
                    className={`panel-soft interactive-tile rounded-3xl overflow-hidden cursor-pointer transition-all group touch-manipulation border ${
                      isCompleted
                        ? 'border-[color:var(--app-accent)]/60 bg-[color:var(--app-accent)]/5 shadow-[0_0_20px_rgba(57,255,20,0.12)]'
                        : isJustLogged
                        ? 'border-[color:var(--app-accent)] bg-[color:var(--app-accent)]/10 shadow-[0_0_24px_rgba(57,255,20,0.25)]'
                        : 'border-white/10 hover:border-[color:var(--app-accent)]/50'
                    }`}
                  >
                    <div className="p-4 flex items-center gap-3.5">
                      <motion.div
                        layoutId={`ex-img-${exercise.id}`}
                        className="w-16 h-16 rounded-2xl overflow-hidden bg-[var(--app-surface)] flex-shrink-0 relative border border-white/10"
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
                                <CheckCircle2 className="text-[var(--app-accent)]" size={24} />
                              </motion.span>
                            ) : (
                              <motion.span key="play" initial={{ opacity: 0.8 }} animate={{ opacity: 0.8 }}>
                                <Play className="app-accent opacity-90" size={20} />
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-white mb-0.5 truncate tracking-tight">{exercise.name}</h3>
                        <p className="text-xs text-gray-400 font-mono tabular-nums">
                          {exercise.sets} sets × {exercise.reps} reps
                        </p>
                        {completedCount > 0 && (
                          <AnimatePresence>
                            <motion.p
                              key={`${exercise.id}-count`}
                              initial={{ opacity: 0, y: 3 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-xs font-mono tabular-nums mt-0.5 text-[var(--app-accent)] font-semibold flex items-center gap-1"
                            >
                              {isCompleted ? '✅ Completado' : `${completedCount}/${targetSets} series completadas`}
                            </motion.p>
                          </AnimatePresence>
                        )}
                      </div>

                      <div className="min-w-[44px] min-h-[44px] flex items-center justify-center">
                        <AnimatePresence mode="wait" initial={false}>
                          {isCompleted ? (
                            <motion.span key="done-icon" {...completionGlow}>
                              <CheckCircle2 className="text-[var(--app-accent)]" size={22} />
                            </motion.span>
                          ) : (
                            <motion.span key="chevron" initial={{ opacity: 1 }} animate={{ opacity: 1 }}>
                              <ChevronLeft className="text-gray-500 rotate-180 group-hover:text-[var(--app-accent)] transition-colors" size={20} />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Series progress bar */}
                    <div className="h-[3px] w-full bg-white/5">
                      <motion.div
                        className="h-full rounded-full bg-[var(--app-accent)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  </motion.div>
                );
              }) : (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col items-center justify-center py-16 px-6 text-center glass-panel rounded-3xl"
                >
                  <div className="relative mb-4">
                    <Dumbbell className="app-accent opacity-50" size={40} />
                  </div>
                  <p className="text-white/80 font-bold text-base mb-1">Sin rutina para hoy</p>
                  <p className="text-gray-400 text-xs max-w-[240px]">Genera tu plan con IA o añade ejercicios desde “Arma tu Entrenamiento”</p>
                </motion.div>
              )}
            </div>

            {profile?.weeklySpecialSession?.enabled && (
              <AppCard accent className="p-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1.5">
                  <Star size={16} className="app-accent" />
                  ⭐ Clase Especial Semanal
                </h3>
                <p className="text-xs text-gray-300 font-mono">
                  {profile.weeklySpecialSession.activity} • {profile.weeklySpecialSession.day} • {profile.weeklySpecialSession.durationMinutes} min
                </p>
              </AppCard>
            )}

            <AppCard className="glass-panel p-4">
              <SectionHeader title="🏋️ Arma tu Entrenamiento" />

              <div className="flex flex-wrap gap-2 mb-4 mt-2">
                {muscleGroups.map((group) => (
                  <button
                    key={group}
                    onClick={() => setSelectedMuscleGroup(group)}
                    className={`min-h-[36px] px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all active:scale-95 touch-manipulation ${
                      selectedMuscleGroup === group
                        ? 'border-[color:var(--app-accent)] bg-[color:var(--app-accent)]/15 text-[var(--app-accent)] shadow-[0_0_10px_rgba(57,255,20,0.15)] font-bold'
                        : 'border-white/10 text-gray-400 bg-white/[0.03] hover:text-white'
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
                    <div key={exercise.id} className="flex items-center justify-between neuro-inset p-3 rounded-2xl">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-sm text-white font-medium truncate">{exercise.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{exercise.muscleGroup} • {exercise.defaultSets}x{exercise.defaultReps}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addToCustomWorkout(exercise)}
                        disabled={alreadyAdded}
                        aria-label={`Añadir ${exercise.name}`}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center bg-white/[0.05] hover:bg-white/[0.1] text-gray-300 hover:text-[var(--app-accent)] disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all touch-manipulation"
                      >
                        <PlusCircle size={20} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </AppCard>

            {customWorkout.length > 0 && (
              <AppCard className="glass-panel p-4">
                <SectionHeader title={`📋 Tu Rutina Personal (${customWorkout.length})`} />
                <div className="space-y-2 mt-2">
                  {customWorkout.map((exercise) => (
                    <div key={exercise.id} className="flex items-center justify-between neuro-inset p-3 rounded-2xl">
                      <div>
                        <p className="text-sm text-white font-medium">{exercise.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{exercise.muscleGroup}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCustomWorkout(exercise.id)}
                        aria-label={`Eliminar ${exercise.name}`}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center bg-white/[0.05] hover:bg-red-500/20 text-gray-400 hover:text-red-400 active:scale-95 transition-all touch-manipulation"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </AppCard>
            )}
          </div>
        </div>

        {/* Exercise detail bottom sheet */}
        {createPortal(
          <AnimatePresence>
            {selectedExercise && (
              <motion.div
                {...slideUpSheet}
                className="fixed inset-0 z-[60] bg-[var(--app-bg)] flex flex-col"
              >
                {/* Header with image & grabber */}
                <div className="relative h-[28%] min-h-[160px] shrink-0 bg-[var(--app-surface)] overflow-hidden flex items-center justify-center">
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-full bg-white/40 z-40" />
                  <motion.div
                    layoutId={`ex-img-${selectedExercise.id}`}
                    className="w-full h-full"
                    transition={{ type: 'spring', stiffness: 320, damping: 30 }}
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
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--app-bg)] via-black/30 to-transparent z-20 pointer-events-none" />
                  <button
                    type="button"
                    onClick={closeExercise}
                    aria-label="Cerrar detalle de ejercicio"
                    className="min-w-[44px] min-h-[44px] w-11 h-11 absolute top-4 left-4 bg-black/60 backdrop-blur-xl rounded-full border border-white/20 text-white z-30 flex items-center justify-center transition-transform active:scale-95 touch-manipulation"
                  >
                    <ChevronLeft size={22} />
                  </button>
                </div>

                <div className="flex-1 min-h-0 px-4 py-3 sm:p-6 flex flex-col overflow-y-auto space-y-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">{selectedExercise.name}</h2>
                    {(() => {
                      if (currentExerciseType === 'isometric') {
                        const bestTime = personalBestTimes.get(selectedExercise.id);
                        const lastLog = logs
                          .filter((l) => l.exerciseId === selectedExercise.id && l.duration !== undefined)
                          .sort((a, b) => b.date.localeCompare(a.date))[0];
                        if (!bestTime && !lastLog) return null;
                        return (
                          <div className="flex flex-wrap gap-2 mt-1 font-mono text-xs tabular-nums">
                            {bestTime !== undefined && (
                              <span className="text-amber-400 flex items-center gap-1">
                                <Trophy size={13} />
                                PR: {formatDuration(bestTime)}
                              </span>
                            )}
                            {lastLog?.duration !== undefined && (
                              <span className="text-gray-400 flex items-center gap-1">
                                Último: {formatDuration(lastLog.duration)}{lastLog.rpe ? ` · RPE ${lastLog.rpe}` : ''}
                              </span>
                            )}
                          </div>
                        );
                      }
                      const prWeight = personalRecords.get(selectedExercise.id);
                      const lastEntry = lastWeights.get(selectedExercise.id);
                      if (!prWeight && !lastEntry) return null;
                      return (
                        <div className="flex flex-wrap gap-3 mt-1 font-mono text-xs tabular-nums">
                          {prWeight && prWeight > 0 && (
                            <span className="text-amber-400 font-semibold flex items-center gap-1">
                              <Trophy size={13} />
                              PR: {prWeight} kg
                            </span>
                          )}
                          {lastEntry && lastEntry.weight > 0 && (
                            <span className="text-gray-400 flex items-center gap-1">
                              Último: {lastEntry.weight} kg
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="neuro-inset px-3.5 py-1.5 rounded-full text-xs app-accent font-mono font-semibold">
                      {selectedExercise.muscleGroup}
                    </span>
                    <span className="neuro-inset px-3.5 py-1.5 rounded-full text-xs text-gray-300 font-mono">
                      {currentExerciseType === 'isometric' ? '⏱ Isométrico' :
                       currentExerciseType === 'bodyweight' ? '🤸 Peso corporal' :
                       currentExerciseType === 'cardio' ? '🏃 Cardio' : '🏋️ Con peso'}
                    </span>
                    <span className="neuro-inset px-3.5 py-1.5 rounded-full text-xs text-gray-300 font-mono tabular-nums">
                      {selectedExercise.sets} × {selectedExercise.reps}
                    </span>
                    {currentExerciseType === 'weighted' && selectedExercise.weight > 0 && (
                      <span className="neuro-inset px-3.5 py-1.5 rounded-full text-xs text-gray-300 font-mono tabular-nums">
                        Meta: <span className="app-accent font-bold">{selectedExercise.weight} kg</span>
                      </span>
                    )}
                  </div>

                  {/* Progressive overload suggestion */}
                  {progressiveSuggestion && currentExerciseType === 'weighted' && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 neuro-inset rounded-2xl p-3 border border-[color:var(--app-accent)]/30"
                    >
                      <TrendingUp className="app-accent shrink-0" size={18} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[var(--app-accent)]">📈 Sobrecarga Progresiva Sugerida</p>
                        <p className="text-xs text-gray-300 mt-0.5 font-mono tabular-nums">
                          {progressiveSuggestion.currentWeight} kg en {progressiveSuggestion.sessionsAnalyzed} sesiones → prueba <strong className="text-white">{progressiveSuggestion.suggestedWeight} kg</strong>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWeightInput(progressiveSuggestion.suggestedWeight)}
                        className="min-h-[44px] min-w-[54px] px-3 py-1.5 rounded-xl text-xs font-bold primary-btn flex items-center justify-center active:scale-95 touch-manipulation"
                      >
                        Usar
                      </button>
                    </motion.div>
                  )}

                  {/* PoseCoach Trigger */}
                  {(currentExerciseType === 'weighted' || currentExerciseType === 'bodyweight' || currentExerciseType === 'isometric') && (
                    <button
                      type="button"
                      onClick={() => setShowPoseCoach(true)}
                      className="w-full min-h-[48px] flex items-center justify-between neuro-inset rounded-2xl p-3.5 border border-[color:var(--app-accent)]/30 hover:border-[color:var(--app-accent)]/60 transition-all active:scale-[0.98] touch-manipulation"
                    >
                      <div className="flex items-center gap-2.5">
                        <Camera size={18} className="app-accent shrink-0" />
                        <div className="text-left">
                          <p className="text-sm font-bold text-white">🎥 PoseCoach — Análisis de postura</p>
                          <p className="text-[11px] text-gray-400">Corrección angular en tiempo real con IA</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-[var(--app-accent)] font-semibold">Abrir →</span>
                    </button>
                  )}

                  {/* Technique Accordion */}
                  {(() => {
                    const libEntry = exerciseLibrary.find((e) => e.id === selectedExercise.id);
                    const technique = libEntry?.technique ?? selectedExercise.technique;
                    if (!technique) return null;
                    return (
                      <div>
                        <button
                          type="button"
                          onClick={() => setShowTechnique((v) => !v)}
                          className="min-h-[40px] flex items-center gap-2 text-xs font-bold app-accent active:scale-95 transition-all touch-manipulation"
                        >
                          <BookOpen size={14} />
                          {showTechnique ? 'Ocultar guía técnica' : 'Ver guía técnica'}
                        </button>
                        <AnimatePresence>
                          {showTechnique && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden mt-1.5"
                            >
                              <div className="neuro-inset rounded-2xl p-4 space-y-2 border border-white/5">
                                {technique.split('\n').map((step, i) => (
                                  <p key={i} className="text-xs text-gray-300 leading-relaxed">{step}</p>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })()}

                  {/* Series Logging Card */}
                  <div className="neuro-raised rounded-3xl p-4 sm:p-6 border border-white/10">
                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <CheckCircle2 className="app-accent" size={16} />
                      Registrar Series
                    </h3>

                    {/* Set Progress Dots with 44x44px touch targets */}
                    {(() => {
                      const targetSets = Math.max(1, Number(selectedExercise.sets || 0));
                      const doneSets = setsByExercise.get(selectedExercise.id) ?? 0;
                      return (
                        <div className="flex gap-2 mb-4 flex-wrap">
                          {Array.from({ length: targetSets }, (_, i) => {
                            if (i < doneSets) {
                              const logIndex = todayExerciseLogIndices[i];
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  title="Editar serie"
                                  aria-label={`Editar serie ${i + 1}`}
                                  onClick={() => {
                                    if (logIndex === undefined) return;
                                    const log = logs[logIndex];
                                    setEditingSet({ logIndex, weight: log.weight, reps: log.reps, duration: log.duration, rpe: log.rpe });
                                  }}
                                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-sm font-bold font-mono transition-all bg-[color:var(--app-accent)] text-black hover:opacity-90 active:scale-90 touch-manipulation shadow-[0_0_10px_rgba(57,255,20,0.3)]"
                                >
                                  ✓
                                </button>
                              );
                            }
                            return (
                              <div
                                key={i}
                                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-sm font-semibold font-mono transition-all neuro-inset text-gray-400"
                              >
                                {i + 1}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* Inline edit form */}
                    <AnimatePresence>
                      {editingSet && (
                        <motion.div
                          key="edit-set"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.2 }}
                          className="mb-4 neuro-inset rounded-2xl p-4 border border-white/10"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                              ✏️ Editar serie realizada
                            </h4>
                            <button
                              type="button"
                              onClick={() => setEditingSet(null)}
                              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-white"
                              aria-label="Cerrar edición"
                            >
                              ✕
                            </button>
                          </div>
                          {currentExerciseType === 'isometric' || currentExerciseType === 'cardio' ? (
                            <div className="mb-3">
                              <label className="block text-[10px] font-mono text-gray-400 mb-1 uppercase tracking-wider">
                                {currentExerciseType === 'cardio' ? 'Duración (min)' : 'Duración (seg)'}
                              </label>
                              <input
                                type="number"
                                inputMode="numeric"
                                value={editingSet.duration ?? ''}
                                onChange={(e) => setEditingSet((prev) => prev ? { ...prev, duration: Number(e.target.value) } : null)}
                                className="w-full input-field rounded-xl p-3 text-lg font-bold font-mono tabular-nums text-center"
                                placeholder="0"
                              />
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              <div>
                                <label className="block text-[10px] font-mono text-gray-400 mb-1 uppercase tracking-wider">
                                  {currentExerciseType === 'bodyweight' ? 'Peso ref. (kg)' : 'Peso (kg)'}
                                </label>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  value={editingSet.weight || ''}
                                  onChange={(e) => setEditingSet((prev) => prev ? { ...prev, weight: Number(e.target.value) } : null)}
                                  className="w-full input-field rounded-xl p-3 text-lg font-bold font-mono tabular-nums text-center"
                                  placeholder="0"
                                  readOnly={currentExerciseType === 'bodyweight'}
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-mono text-gray-400 mb-1 uppercase tracking-wider">Reps</label>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  value={editingSet.reps || ''}
                                  onChange={(e) => setEditingSet((prev) => prev ? { ...prev, reps: Number(e.target.value) } : null)}
                                  className="w-full input-field rounded-xl p-3 text-lg font-bold font-mono tabular-nums text-center"
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
                            className="w-full min-h-[44px] primary-btn font-bold py-2.5 rounded-xl active:scale-95 transition-all touch-manipulation disabled:opacity-50"
                          >
                            Guardar cambios
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* ── Isometric / Cardio Form ── */}
                    {(currentExerciseType === 'isometric' || currentExerciseType === 'cardio') && (
                      <div className="space-y-4">
                        {currentExerciseType === 'isometric' && (
                          <div className="neuro-inset rounded-2xl p-4 border border-white/10">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs uppercase tracking-wider text-gray-400 font-mono">Timer en vivo</span>
                              <span className="text-2xl font-black text-white font-mono tabular-nums">
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
                                className="w-full min-h-[44px] flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 font-bold text-sm active:scale-95 touch-manipulation"
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
                                className="w-full min-h-[44px] flex items-center justify-center gap-2 py-3 rounded-xl bg-[color:var(--app-accent)]/10 border border-[color:var(--app-accent)]/30 text-[var(--app-accent)] font-bold text-sm active:scale-95 touch-manipulation"
                              >
                                <Timer size={16} />
                                Iniciar serie en vivo
                              </button>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase tracking-wider">
                              {currentExerciseType === 'cardio' ? 'Duración (min)' : 'Duración (seg)'}
                            </label>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                aria-label="Restar 5 segundos"
                                onClick={() => setDurationInput((prev) => Math.max(0, prev - 5))}
                                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 flex items-center justify-center text-white active:scale-95"
                              >
                                <Minus size={16} />
                              </button>
                              <input
                                type="number"
                                inputMode="numeric"
                                value={durationInput || ''}
                                onChange={(e) => setDurationInput(Math.max(0, Number(e.target.value)))}
                                className="w-full h-11 input-field rounded-xl font-mono tabular-nums text-lg font-bold text-center"
                                placeholder="0"
                              />
                              <button
                                type="button"
                                aria-label="Añadir 5 segundos"
                                onClick={() => setDurationInput((prev) => prev + 5)}
                                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 flex items-center justify-center text-white active:scale-95"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase tracking-wider">Series</label>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                aria-label="Restar serie"
                                onClick={() => setSetsInput((prev) => Math.max(1, prev - 1))}
                                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 flex items-center justify-center text-white active:scale-95"
                              >
                                <Minus size={16} />
                              </button>
                              <input
                                type="number"
                                inputMode="numeric"
                                min={1}
                                max={10}
                                value={setsInput || ''}
                                onChange={(e) => setSetsInput(Math.max(1, Number(e.target.value)))}
                                className="w-full h-11 input-field rounded-xl font-mono tabular-nums text-lg font-bold text-center"
                                placeholder="1"
                              />
                              <button
                                type="button"
                                aria-label="Añadir serie"
                                onClick={() => setSetsInput((prev) => Math.min(10, prev + 1))}
                                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 flex items-center justify-center text-white active:scale-95"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* RPE */}
                        {currentExerciseType === 'isometric' && (
                          <div>
                            <label className="block text-[11px] font-mono text-gray-400 mb-2 uppercase tracking-wider">
                              RPE <span className="normal-case text-gray-500">(esfuerzo 1-10)</span>
                            </label>
                            <div className="flex gap-1.5 flex-wrap">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => setRpeInput((prev) => (prev === r ? -1 : r))}
                                  className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl text-sm font-bold font-mono transition-all active:scale-95 touch-manipulation ${
                                    rpeInput === r
                                      ? 'bg-[color:var(--app-accent)] text-black shadow-[0_0_10px_rgba(57,255,20,0.4)]'
                                      : 'neuro-inset text-gray-400 hover:text-white'
                                  }`}
                                >
                                  {r}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Bodyweight Form ── */}
                    {currentExerciseType === 'bodyweight' && (
                      <div className="space-y-4">
                        {profile?.weight && (
                          <div className="neuro-inset rounded-2xl p-3 flex items-center gap-3 border border-white/5">
                            <span className="text-2xl">🤸</span>
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase font-mono tracking-wider">Peso corporal de referencia</p>
                              <p className="text-base font-black font-mono text-white">{profile.weight} kg</p>
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase tracking-wider">Reps</label>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                aria-label="Restar repetición"
                                onClick={() => setRepsInput((prev) => Math.max(0, prev - 1))}
                                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 flex items-center justify-center text-white active:scale-95"
                              >
                                <Minus size={16} />
                              </button>
                              <input
                                type="number"
                                inputMode="numeric"
                                value={repsInput || ''}
                                onChange={(e) => setRepsInput(Number(e.target.value))}
                                className="w-full h-11 input-field rounded-xl font-mono tabular-nums text-lg font-bold text-center"
                                placeholder="0"
                              />
                              <button
                                type="button"
                                aria-label="Añadir repetición"
                                onClick={() => setRepsInput((prev) => prev + 1)}
                                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 flex items-center justify-center text-white active:scale-95"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase tracking-wider">Series</label>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                aria-label="Restar serie"
                                onClick={() => setSetsInput((prev) => Math.max(1, prev - 1))}
                                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 flex items-center justify-center text-white active:scale-95"
                              >
                                <Minus size={16} />
                              </button>
                              <input
                                type="number"
                                inputMode="numeric"
                                min={1}
                                max={10}
                                value={setsInput || ''}
                                onChange={(e) => setSetsInput(Math.max(1, Number(e.target.value)))}
                                className="w-full h-11 input-field rounded-xl font-mono tabular-nums text-lg font-bold text-center"
                                placeholder="1"
                              />
                              <button
                                type="button"
                                aria-label="Añadir serie"
                                onClick={() => setSetsInput((prev) => Math.min(10, prev + 1))}
                                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 flex items-center justify-center text-white active:scale-95"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* RIR */}
                        <div>
                          <label className="block text-[11px] font-mono text-gray-400 mb-2 uppercase tracking-wider">
                            RIR <span className="normal-case text-gray-500">(reps en reserva)</span>
                          </label>
                          <div className="grid grid-cols-5 gap-2">
                            {[0, 1, 2, 3, 4].map((r) => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => setRirInput((prev) => (prev === r ? -1 : r))}
                                className={`min-h-[44px] rounded-xl text-sm font-bold font-mono transition-all active:scale-95 touch-manipulation ${
                                  rirInput === r
                                    ? 'bg-[color:var(--app-accent)] text-black shadow-[0_0_10px_rgba(57,255,20,0.4)]'
                                    : 'neuro-inset text-gray-400 hover:text-white'
                                }`}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── Weighted Form (Default) ── */}
                    {currentExerciseType === 'weighted' && (
                      <div className="space-y-4">
                        {/* Weight Calculator component */}
                        <WeightCalculator
                          exerciseId={selectedExercise.id}
                          exerciseName={selectedExercise.name}
                          targetWeight={selectedExercise.weight}
                          userBodyweight={profile?.weight}
                          onWeightChange={handleCalculatorWeightChange}
                        />

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] font-mono text-gray-400 mb-1.5 uppercase tracking-wider text-center">
                              Peso (kg)
                            </label>
                            <input
                              type="number"
                              inputMode="decimal"
                              value={weightInput || ''}
                              onChange={(e) => setWeightInput(Number(e.target.value))}
                              className="w-full h-11 input-field rounded-xl font-mono tabular-nums text-lg font-bold text-center"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono text-gray-400 mb-1.5 uppercase tracking-wider text-center">
                              Reps
                            </label>
                            <input
                              type="number"
                              inputMode="numeric"
                              value={repsInput || ''}
                              onChange={(e) => setRepsInput(Number(e.target.value))}
                              className="w-full h-11 input-field rounded-xl font-mono tabular-nums text-lg font-bold text-center"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono text-gray-400 mb-1.5 uppercase tracking-wider text-center">
                              Series
                            </label>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              max={10}
                              value={setsInput || ''}
                              onChange={(e) => setSetsInput(Math.max(1, Number(e.target.value)))}
                              className="w-full h-11 input-field rounded-xl font-mono tabular-nums text-lg font-bold text-center"
                              placeholder="1"
                            />
                          </div>
                        </div>

                        {/* Quick +/- Increment Steppers */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              aria-label="Restar 2.5 kg"
                              onClick={() => setWeightInput((prev) => Math.max(0, Math.round((prev - 2.5) * 10) / 10))}
                              className="flex-1 h-9 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 flex items-center justify-center text-xs font-mono font-bold text-gray-300 active:scale-95"
                            >
                              -2.5
                            </button>
                            <button
                              type="button"
                              aria-label="Sumar 2.5 kg"
                              onClick={() => setWeightInput((prev) => Math.round((prev + 2.5) * 10) / 10)}
                              className="flex-1 h-9 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 flex items-center justify-center text-xs font-mono font-bold text-gray-300 active:scale-95"
                            >
                              +2.5
                            </button>
                          </div>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              aria-label="Restar rep"
                              onClick={() => setRepsInput((prev) => Math.max(0, prev - 1))}
                              className="flex-1 h-9 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 flex items-center justify-center text-xs font-mono font-bold text-gray-300 active:scale-95"
                            >
                              -1
                            </button>
                            <button
                              type="button"
                              aria-label="Sumar rep"
                              onClick={() => setRepsInput((prev) => prev + 1)}
                              className="flex-1 h-9 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 flex items-center justify-center text-xs font-mono font-bold text-gray-300 active:scale-95"
                            >
                              +1
                            </button>
                          </div>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              aria-label="Restar serie"
                              onClick={() => setSetsInput((prev) => Math.max(1, prev - 1))}
                              className="flex-1 h-9 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 flex items-center justify-center text-xs font-mono font-bold text-gray-300 active:scale-95"
                            >
                              -1
                            </button>
                            <button
                              type="button"
                              aria-label="Sumar serie"
                              onClick={() => setSetsInput((prev) => Math.min(10, prev + 1))}
                              className="flex-1 h-9 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 flex items-center justify-center text-xs font-mono font-bold text-gray-300 active:scale-95"
                            >
                              +1
                            </button>
                          </div>
                        </div>

                        {/* 1RM Estimate */}
                        {weightInput > 0 && repsInput > 1 && (
                          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                            <p className="text-xs text-gray-400 font-mono tabular-nums">
                              1RM estimado (Epley):{' '}
                              <strong className="text-[var(--app-accent)] font-bold">
                                {Math.round(weightInput * (1 + repsInput / 30))} kg
                              </strong>
                            </p>
                          </div>
                        )}

                        {/* RIR Selection */}
                        <div>
                          <label className="block text-[11px] font-mono text-gray-400 mb-2 uppercase tracking-wider">
                            RIR <span className="normal-case text-gray-500">(reps en reserva)</span>
                          </label>
                          <div className="grid grid-cols-5 gap-2">
                            {[0, 1, 2, 3, 4].map((r) => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => setRirInput((prev) => (prev === r ? -1 : r))}
                                className={`min-h-[44px] rounded-xl text-sm font-bold font-mono transition-all active:scale-95 touch-manipulation ${
                                  rirInput === r
                                    ? 'bg-[color:var(--app-accent)] text-black shadow-[0_0_10px_rgba(57,255,20,0.4)]'
                                    : 'neuro-inset text-gray-400 hover:text-white'
                                }`}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* History Toggle */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowHistory((v) => !v)}
                      className="min-h-[44px] flex items-center gap-2 text-xs font-bold app-accent active:scale-95 transition-all touch-manipulation"
                    >
                      <History size={16} />
                      {showHistory ? 'Ocultar historial' : 'Ver historial de progresiones'}
                      {exerciseHistory.length > 0 && (
                        <span className="text-gray-400 font-mono font-normal">({exerciseHistory.length} sesiones)</span>
                      )}
                    </button>

                    <AnimatePresence>
                      {showHistory && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden mt-2"
                        >
                          {exerciseHistory.length === 0 ? (
                            <p className="text-gray-400 text-xs text-center py-4 font-mono">Sin registros anteriores en este ejercicio.</p>
                          ) : (
                            <div className="neuro-inset rounded-2xl p-4 space-y-4 border border-white/10">
                              {/* PR Summary */}
                              {currentExerciseType === 'isometric' ? (
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="neuro-raised rounded-xl p-3 text-center">
                                    <p className="text-[10px] uppercase font-mono text-gray-400 mb-1">⏱ PR TIEMPO</p>
                                    <p className="text-base font-black font-mono text-amber-400">
                                      {formatDuration(personalBestTimes.get(selectedExercise.id) ?? 0)}
                                    </p>
                                  </div>
                                  <div className="neuro-raised rounded-xl p-3 text-center">
                                    <p className="text-[10px] uppercase font-mono text-gray-400 mb-1">📊 SESIONES</p>
                                    <p className="text-base font-black font-mono text-amber-400">{exerciseHistory.length}</p>
                                  </div>
                                </div>
                              ) : (
                                (() => {
                                  const prWeight = Math.max(...exerciseHistory.map((s) => s.maxWeight));
                                  const prReps = Math.max(...exerciseHistory.map((s) => s.maxReps));
                                  return (
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="neuro-raised rounded-xl p-3 text-center">
                                        <p className="text-[10px] uppercase font-mono text-gray-400 mb-1">🥇 PR PESO</p>
                                        <p className="text-base font-black font-mono text-amber-400">{prWeight} kg</p>
                                      </div>
                                      <div className="neuro-raised rounded-xl p-3 text-center">
                                        <p className="text-[10px] uppercase font-mono text-gray-400 mb-1">🔁 PR REPS</p>
                                        <p className="text-base font-black font-mono text-amber-400">{prReps}</p>
                                      </div>
                                    </div>
                                  );
                                })()
                              )}

                              {/* Progression Chart */}
                              <div>
                                <p className="text-[10px] uppercase font-mono text-gray-400 mb-2">
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
                                      contentStyle={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', borderRadius: 12, fontSize: 11, fontFamily: 'monospace' }}
                                      labelFormatter={(d: string) => d}
                                      formatter={(v: number) => [currentExerciseType === 'isometric' ? `${v}s` : `${v} kg`, currentExerciseType === 'isometric' ? 'Duración' : 'Peso']}
                                    />
                                    <Line
                                      type="monotone"
                                      dataKey="maxWeight"
                                      stroke="var(--app-accent)"
                                      strokeWidth={2.5}
                                      dot={{ fill: 'var(--app-accent)', r: 3 }}
                                      activeDot={{ r: 5 }}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>

                              {/* Recent Sessions List */}
                              <div>
                                <p className="text-[10px] uppercase font-mono text-gray-400 mb-2">Últimas sesiones</p>
                                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                  {[...exerciseHistory].reverse().map((s) => (
                                    <div key={s.date} className="flex items-center justify-between text-xs font-mono tabular-nums p-2 rounded-lg bg-white/[0.02]">
                                      <span className="text-gray-400">{s.date}</span>
                                      {currentExerciseType === 'isometric' ? (
                                        <span className="text-white font-bold">{formatDuration(s.maxWeight)}</span>
                                      ) : (
                                        <span className="text-white font-bold">{s.maxWeight} kg</span>
                                      )}
                                      <span className="text-gray-400">{s.sets} sets</span>
                                      {currentExerciseType !== 'isometric' && (
                                        <span className="text-gray-400">Vol: {Math.round(s.totalVolume)}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Sticky Action Button */}
                <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-white/10 bg-[var(--app-bg)]/90 backdrop-blur-xl pb-[max(1rem,env(safe-area-inset-bottom))]">
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
                        whileTap={isDisabled ? {} : { scale: 0.97 }}
                        className="w-full min-h-[52px] primary-btn font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation shadow-lg"
                      >
                        <Sparkles size={18} />
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

        {/* PoseCoach Overlay via Portal */}
        {showPoseCoach && selectedExercise && createPortal(
          <PoseCoach
            exercise={detectPoseExercise(selectedExercise.name, currentExerciseType)}
            exerciseName={selectedExercise.name}
            onClose={() => setShowPoseCoach(false)}
          />,
          document.body
        )}

        {/* Floating Rest Timer Pill */}
        <AnimatePresence>
          {restSeconds > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.9 }}
              transition={iosBouncySpring}
              className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[55] flex items-center gap-3 px-5 py-2.5 rounded-full bg-black/80 backdrop-blur-2xl border border-white/15 shadow-[0_12px_32px_rgba(0,0,0,0.8),0_0_20px_rgba(57,255,20,0.2)]"
            >
              <div className="w-6 h-6 relative flex items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" />
                  <circle
                    cx="12" cy="12" r="10"
                    stroke="var(--app-accent)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={`${TIMER_CIRCUMFERENCE * (restSeconds / REST_TIMER_SECONDS)} ${TIMER_CIRCUMFERENCE}`}
                    style={{ transition: 'stroke-dasharray 1s linear' }}
                  />
                </svg>
              </div>
              <span className="text-white font-mono font-bold text-sm tabular-nums tracking-tight">
                Descanso: {Math.floor(restSeconds / 60)}:{String(restSeconds % 60).padStart(2, '0')}
              </span>
              <button
                type="button"
                aria-label="Cerrar temporizador de descanso"
                onClick={() => {
                  setRestSeconds(0);
                  if (restIntervalRef.current) clearInterval(restIntervalRef.current);
                }}
                className="w-7 h-7 min-w-[28px] min-h-[28px] rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center text-xs ml-1 transition-all active:scale-90"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Completion Celebration — Peak-End Liquid Glass Banner */}
        <AnimatePresence>
          {showCompletion && (
            <motion.div
              initial={{ opacity: 0, y: -120, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -120, scale: 0.95 }}
              transition={iosSheetSpring}
              className="fixed top-3 left-4 right-4 md:left-auto md:right-6 md:w-[420px] z-[80] rounded-3xl border border-[color:var(--app-accent)]/50 bg-[var(--app-surface-elevated)]/90 backdrop-blur-2xl shadow-[0_16px_48px_rgba(0,0,0,0.8),0_0_32px_rgba(57,255,20,0.2)] overflow-hidden"
            >
              {/* Top Neon Highlight Line */}
              <div className="h-1 w-full bg-gradient-to-r from-[color:var(--app-accent)] via-emerald-300 to-[color:var(--app-accent)]" />

              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <motion.span
                      animate={{ rotate: [0, -14, 14, -8, 8, 0], scale: [1, 1.25, 1] }}
                      transition={{ duration: 0.8, ease: 'easeInOut' }}
                      className="text-3xl shrink-0"
                    >
                      🏆
                    </motion.span>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--app-accent)] font-bold leading-none mb-1">
                        ¡SESIÓN COMPLETADA!
                      </p>
                      <p className="text-base font-black text-white truncate leading-tight">
                        {todayRoutine?.focus || 'Entrenamiento'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCompletion(false)}
                    className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white transition-colors active:scale-95"
                    aria-label="Cerrar celebración"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Stats Pills Grid */}
                <div className="grid grid-cols-4 gap-1.5 font-mono tabular-nums text-xs">
                  {[
                    { icon: '💪', value: String(totalTodayExercises) },
                    { icon: '✅', value: `${completedSets}/${plannedSets}` },
                    { icon: '⚡', value: `+${todayXP}` },
                    { icon: '🔥', value: `${currentStreak}d` },
                  ].map(({ icon, value }) => (
                    <div key={icon} className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl bg-white/[0.04] border border-white/5 text-white font-bold">
                      <span className="text-xs">{icon}</span>
                      <span className="text-[11px] mt-0.5">{value}</span>
                    </div>
                  ))}
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => void handleShare()}
                  disabled={isSharing}
                  className="w-full min-h-[44px] primary-btn rounded-xl px-4 py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-md"
                >
                  {isSharing ? (
                    <><Loader2 size={15} className="animate-spin" /> Generando tarjeta...</>
                  ) : (
                    <><Share2 size={15} /> Compartir Logro</>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Off-screen WorkoutSummaryCard for sharing */}
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
