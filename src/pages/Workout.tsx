import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore, Exercise } from '../store/useAppStore';
import { ChevronLeft, Play, CheckCircle2, Dumbbell, PlusCircle, Trash2, Star, CalendarClock, Flame } from 'lucide-react';
import { workoutService } from '../services/workoutService';
import { AppCard, SectionHeader, StatPill } from '../components/ui';
import { listStagger } from '../lib/motion';
import { WEEKDAY_LABELS, getMondayFirstIndex, mapRoutineByWeekday } from '../lib/routineWeek';

export default function Workout() {
  const {
    routine,
    addLog,
    customWorkout,
    exerciseLibrary,
    addToCustomWorkout,
    removeFromCustomWorkout,
    profile,
    authToken,
    showToast,
  } = useAppStore();
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [weightInput, setWeightInput] = useState<number>(0);
  const [repsInput, setRepsInput] = useState<number>(0);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('Todos');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() => getMondayFirstIndex(new Date()));

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

  const handleLog = async () => {
    if (selectedExercise && weightInput > 0 && repsInput > 0) {
      const newLog = {
        date: new Date().toISOString(),
        exerciseId: selectedExercise.id,
        weight: weightInput,
        reps: repsInput,
      };

      addLog(newLog);

      if (authToken) {
        try {
          await workoutService.addLog(authToken, newLog);
        } catch (error) {
          console.error('Error persisting workout log:', error);
        }
      }

      showToast({
        type: 'success',
        title: 'Serie guardada 💪',
        message: `${weightInput}kg x ${repsInput} reps`,
      });
      setWeightInput(0);
      setRepsInput(0);
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=400&auto=format&fit=crop';
  };

  return (
    <div className="min-h-screen app-shell px-4 pt-5 md:px-6 safe-bottom">
      <div className="page-wrap">
      <header className="mb-8 mt-2">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3 tracking-tight">
          <Dumbbell className="app-accent" size={32} />
          💪 Rutina de Hoy
        </h1>
        <p className="app-accent font-mono text-sm glow-text">{todayRoutine?.focus || 'Hoy toca activar el cuerpo'}</p>
      </header>

      <AppCard className="mb-5 p-4 glass-panel">
        <SectionHeader
          title="Semana de entrenamiento"
          subtitle="Selecciona un dia. Los dias sin plan quedan bloqueados."
        />
        <div className="grid grid-cols-7 gap-2">
          {WEEKDAY_LABELS.map((day, index) => {
            const hasRoutine = Boolean(routinesByDay[index]);
            const isSelected = selectedDayIndex === index;

            return (
              <button
                key={day.key}
                type="button"
                onClick={() => hasRoutine && setSelectedDayIndex(index)}
                disabled={!hasRoutine}
                className={[
                  'tap-target rounded-xl border px-1 py-2 text-center text-[11px] font-semibold transition-all',
                  hasRoutine ? 'pressable cursor-pointer' : 'cursor-not-allowed opacity-45',
                  isSelected
                    ? 'border-[var(--app-accent)] bg-[color:var(--app-accent)]/18 text-[var(--app-accent)]'
                    : 'border-[var(--app-border)] bg-black/30 text-gray-300',
                ].join(' ')}
              >
                {day.short}
              </button>
            );
          })}
        </div>
      </AppCard>

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
        {todayRoutine?.exercises.map((exercise, index) => (
          <motion.div
            key={exercise.id}
            {...listStagger(index)}
            onClick={() => setSelectedExercise(exercise)}
            className="panel-soft interactive-tile rounded-3xl p-5 flex items-center gap-4 cursor-pointer hover:border-[color:var(--app-accent)]/50 transition-colors group"
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
                <Play className="app-accent opacity-80" size={20} />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-1">{exercise.name}</h3>
              <p className="text-sm text-gray-400 font-mono">
                {exercise.sets} sets x {exercise.reps} reps
              </p>
            </div>
            <ChevronLeft className="text-gray-600 rotate-180 group-hover:text-[var(--app-accent)] transition-colors" />
          </motion.div>
        ))}
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
                  : 'border-[var(--app-border)] text-gray-400'
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
              <div key={exercise.id} className="flex items-center justify-between bg-black/45 border border-[var(--app-border)] rounded-xl p-3">
                <div>
                  <p className="text-sm text-white font-medium">{exercise.name}</p>
                  <p className="text-xs text-gray-500">{exercise.muscleGroup} • {exercise.defaultSets}x{exercise.defaultReps}</p>
                </div>
                <button
                  onClick={() => addToCustomWorkout(exercise)}
                  disabled={alreadyAdded}
                  className="p-2 rounded-full bg-[var(--app-border)] text-gray-300 hover:text-[var(--app-accent)] disabled:opacity-40 disabled:cursor-not-allowed"
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
              <div key={exercise.id} className="flex items-center justify-between bg-black/45 border border-[var(--app-border)] rounded-xl p-3">
                <div>
                  <p className="text-sm text-white">{exercise.name}</p>
                  <p className="text-xs text-gray-500">{exercise.muscleGroup}</p>
                </div>
                <button
                  onClick={() => removeFromCustomWorkout(exercise.id)}
                  className="p-2 rounded-full bg-[var(--app-border)] text-gray-300 hover:text-red-400"
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
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            className="fixed inset-0 z-50 bg-[#050505] flex flex-col"
          >
            <div className="relative h-1/3 bg-black">
              <img 
                src={selectedExercise.gifUrl || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=400&auto=format&fit=crop'} 
                alt={selectedExercise.name} 
                onError={handleImageError}
                className="w-full h-full object-cover opacity-80" 
                referrerPolicy="no-referrer" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent" />
              <button
                onClick={() => setSelectedExercise(null)}
                className="absolute top-6 left-6 p-3 bg-black/50 backdrop-blur-md rounded-full border border-white/10 text-white"
              >
                <ChevronLeft size={24} />
              </button>
            </div>

            <div className="flex-1 p-6 flex flex-col">
              <h2 className="text-3xl font-bold text-white mb-2">{selectedExercise.name}</h2>
              <div className="flex gap-4 mb-8">
                <span className="app-surface border border-[var(--app-border)] px-4 py-2 rounded-full text-sm app-accent font-mono glow-box">
                  {selectedExercise.muscleGroup}
                </span>
                <span className="app-surface border border-[var(--app-border)] px-4 py-2 rounded-full text-sm text-gray-300 font-mono">
                  {selectedExercise.sets} x {selectedExercise.reps}
                </span>
              </div>

              <div className="app-surface border border-[var(--app-border)] rounded-3xl p-6 mb-8">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <CheckCircle2 className="app-accent" />
                  Registrar Serie ✏️
                </h3>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2 font-mono">Peso (kg)</label>
                    <input
                      type="number"
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
                      value={repsInput || ''}
                      onChange={(e) => setRepsInput(Number(e.target.value))}
                      className="w-full input-field rounded-2xl p-4 text-2xl font-bold text-center"
                      placeholder="0"
                    />
                  </div>
                </div>

                <button
                  onClick={handleLog}
                  disabled={!weightInput || !repsInput}
                  className="w-full tap-target primary-btn font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Guardar Serie 💾
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
