import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore, Exercise } from '../store/useAppStore';
import { ChevronLeft, Play, CheckCircle2, Dumbbell } from 'lucide-react';

export default function Workout() {
  const { routine, addLog } = useAppStore();
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [weightInput, setWeightInput] = useState<number>(0);
  const [repsInput, setRepsInput] = useState<number>(0);

  const todayRoutine = routine?.[0]; // Simplified for now

  const handleLog = () => {
    if (selectedExercise && weightInput > 0 && repsInput > 0) {
      addLog({
        date: new Date().toISOString(),
        exerciseId: selectedExercise.id,
        weight: weightInput,
        reps: repsInput,
      });
      setSelectedExercise(null);
      setWeightInput(0);
      setRepsInput(0);
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=400&auto=format&fit=crop';
  };

  return (
    <div className="min-h-screen bg-[#050505] p-6 pb-32">
      <header className="mb-8 mt-4">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Dumbbell className="text-[#39ff14]" size={32} />
          Rutina de Hoy
        </h1>
        <p className="text-[#39ff14] font-mono text-sm glow-text">{todayRoutine?.focus || 'Descanso'}</p>
      </header>

      <div className="space-y-4">
        {todayRoutine?.exercises.map((exercise, index) => (
          <motion.div
            key={exercise.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => setSelectedExercise(exercise)}
            className="bg-[#121212] border border-[#262626] rounded-3xl p-5 flex items-center gap-4 cursor-pointer hover:border-[#39ff14]/50 transition-colors group"
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
                <Play className="text-[#39ff14] opacity-80" size={20} />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-1">{exercise.name}</h3>
              <p className="text-sm text-gray-400 font-mono">
                {exercise.sets} sets x {exercise.reps} reps
              </p>
            </div>
            <ChevronLeft className="text-gray-600 rotate-180 group-hover:text-[#39ff14] transition-colors" />
          </motion.div>
        ))}
      </div>

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
                <span className="bg-[#121212] border border-[#262626] px-4 py-2 rounded-full text-sm text-[#39ff14] font-mono glow-box">
                  {selectedExercise.muscleGroup}
                </span>
                <span className="bg-[#121212] border border-[#262626] px-4 py-2 rounded-full text-sm text-gray-300 font-mono">
                  {selectedExercise.sets} x {selectedExercise.reps}
                </span>
              </div>

              <div className="bg-[#121212] border border-[#262626] rounded-3xl p-6 mb-8">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <CheckCircle2 className="text-[#39ff14]" />
                  Registrar Serie
                </h3>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2 font-mono">Peso (kg)</label>
                    <input
                      type="number"
                      value={weightInput || ''}
                      onChange={(e) => setWeightInput(Number(e.target.value))}
                      className="w-full bg-black border border-[#262626] rounded-2xl p-4 text-white text-2xl font-bold text-center focus:border-[#39ff14] focus:ring-1 focus:ring-[#39ff14] outline-none transition-all"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2 font-mono">Reps</label>
                    <input
                      type="number"
                      value={repsInput || ''}
                      onChange={(e) => setRepsInput(Number(e.target.value))}
                      className="w-full bg-black border border-[#262626] rounded-2xl p-4 text-white text-2xl font-bold text-center focus:border-[#39ff14] focus:ring-1 focus:ring-[#39ff14] outline-none transition-all"
                      placeholder="0"
                    />
                  </div>
                </div>

                <button
                  onClick={handleLog}
                  disabled={!weightInput || !repsInput}
                  className="w-full bg-[#39ff14] text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-[#32e612] transition-colors disabled:opacity-50 disabled:cursor-not-allowed glow-box"
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
