import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store/useAppStore';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Dumbbell, CheckCircle2, Flame } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';

export default function CalendarView() {
  const { routine, logs, diet } = useAppStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

  // Find routine for selected day (simplified: mapping day index 0-6 to routine items)
  const selectedDayIndex = selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1;
  const plannedRoutine = routine[selectedDayIndex % routine.length];

  // Find logs for selected day
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayLogs = logs.filter(log => format(new Date(log.date), 'yyyy-MM-dd') === selectedDateStr);

  return (
    <div className="min-h-screen app-shell px-4 pt-5 md:px-6 safe-bottom">
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
          <button onClick={() => setCurrentDate(addDays(currentDate, -7))} className="pressable p-2 text-gray-400 hover:text-white transition-colors">
            <ChevronLeft />
          </button>
          <span className="text-lg font-bold text-white capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </span>
          <button onClick={() => setCurrentDate(addDays(currentDate, 7))} className="pressable p-2 text-gray-400 hover:text-white transition-colors">
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
          {plannedRoutine && (
            <div className="glass-panel border border-[var(--app-border)] rounded-3xl p-5">
              <h3 className="text-sm text-gray-400 font-mono mb-4 flex items-center gap-2">
                <Dumbbell size={16} /> 🏋️ Rutina Planificada
              </h3>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-black border border-[color:var(--app-accent)]/30 flex items-center justify-center">
                  <Dumbbell className="app-accent" size={20} />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">{plannedRoutine.focus}</h4>
                  <p className="text-sm text-gray-400">{plannedRoutine.exercises.length} ejercicios</p>
                </div>
              </div>
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
