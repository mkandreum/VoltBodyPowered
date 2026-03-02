import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore, Exercise } from '../store/useAppStore';
import { ChevronLeft, Play, CheckCircle2, Dumbbell, PlusCircle, Trash2, Star } from 'lucide-react';
import { workoutService } from '../services/workoutService';
import { AppCard, SectionHeader } from '../components/ui';

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
  } = useAppStore();
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [weightInput, setWeightInput] = useState<number>(0);
  const [repsInput, setRepsInput] = useState<number>(0);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('Todos');

  // Map current day to routine index (Mon=0...Sun=6)
  const dayIndex = new Date().getDay();
  const routineIndex = dayIndex === 0 ? 6 : dayIndex - 1;
  const todayRoutine = routine?.length > 0 ? routine[routineIndex % routine.length] : undefined;
  const muscleGroups = ['Todos', ...Array.from(new Set(exerciseLibrary.map((item) => item.muscleGroup)))];
  const filteredLibrary = selectedMuscleGroup === 'Todos'
    ? exerciseLibrary
    : exerciseLibrary.filter((item) => item.muscleGroup === selectedMuscleGroup);

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

      alert(`Serie guardada: ${weightInput}kg x ${repsInput} reps`);
      setWeightInput(0);
      setRepsInput(0);
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=400&auto=format&fit=crop';
  };

  return (
    <div className="min-h-screen app-shell p-6 pb-32">
      <header className="mb-8 mt-4">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Dumbbell className="app-accent" size={32} />
          Rutina de Hoy
        </h1>
        <p className="app-accent font-mono text-sm glow-text">{todayRoutine?.focus || 'Descanso'}</p>
      </header>

      <div className="space-y-4">
        {todayRoutine?.exercises.map((exercise, index) => (
          <motion.div
            key={exercise.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => setSelectedExercise(exercise)}
            className="app-surface border border-[var(--app-border)] rounded-3xl p-5 flex items-center gap-4 cursor-pointer hover:border-[color:var(--app-accent)]/50 transition-colors group"
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
            Clase Especial Semanal
          </h3>
          <p className="text-sm text-gray-300">
            {profile.weeklySpecialSession.activity} • {profile.weeklySpecialSession.day} • {profile.weeklySpecialSession.durationMinutes} min
          </p>
        </AppCard>
      )}

      <AppCard className="mt-8">
        <SectionHeader title="Arma tu Entrenamiento" />

        <div className="flex flex-wrap gap-2 mb-4">
          {muscleGroups.map((group) => (
            <button
              key={group}
              onClick={() => setSelectedMuscleGroup(group)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
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
              <div key={exercise.id} className="flex items-center justify-between bg-black border border-[var(--app-border)] rounded-xl p-3">
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
        <AppCard className="mt-6">
          <SectionHeader title={`Tu Rutina Personal (${customWorkout.length})`} />
          <div className="space-y-2">
            {customWorkout.map((exercise) => (
              <div key={exercise.id} className="flex items-center justify-between bg-black border border-[var(--app-border)] rounded-xl p-3">
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
                  Registrar Serie
                </h3>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2 font-mono">Peso (kg)</label>
                    <input
                      type="number"
                      value={weightInput || ''}
                      onChange={(e) => setWeightInput(Number(e.target.value))}
                      className="w-full bg-black border border-[var(--app-border)] rounded-2xl p-4 text-white text-2xl font-bold text-center focus:border-[var(--app-accent)] focus:ring-1 focus:ring-[var(--app-accent)] outline-none transition-all"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2 font-mono">Reps</label>
                    <input
                      type="number"
                      value={repsInput || ''}
                      onChange={(e) => setRepsInput(Number(e.target.value))}
                      className="w-full bg-black border border-[var(--app-border)] rounded-2xl p-4 text-white text-2xl font-bold text-center focus:border-[var(--app-accent)] focus:ring-1 focus:ring-[var(--app-accent)] outline-none transition-all"
                      placeholder="0"
                    />
                  </div>
                </div>

                <button
                  onClick={handleLog}
                  disabled={!weightInput || !repsInput}
                  className="w-full bg-[var(--app-accent)] text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:brightness-95 transition-colors disabled:opacity-50 disabled:cursor-not-allowed glow-box"
                >
                  Guardar Serie
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
