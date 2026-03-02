import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useAppStore } from '../store/useAppStore';
import Avatar3D from '../components/Avatar3D';
import { Dumbbell, Utensils, Flame, Activity, Moon, TrendingUp, Quote } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, isAfter } from 'date-fns';
import { AppCard, SectionHeader, StatPill } from '../components/ui';

export default function Home() {
  const { profile, routine, diet, logs, insights, setTab, motivationPhrase, motivationPhoto } = useAppStore();
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('all');

  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long' });
  // Map current day to routine index (Mon=0, Tue=1...Sun=6)
  const dayIndex = new Date().getDay();
  const routineIndex = dayIndex === 0 ? 6 : dayIndex - 1;
  const todayRoutine = routine?.length > 0 ? routine[routineIndex % routine.length] : null;
  const todayDiet = diet || null;

  // Get unique exercises from routine for the selector
  const allExercises = useMemo(() => {
    const exercises = new Map();
    routine.forEach(day => {
      day.exercises.forEach(ex => {
        exercises.set(ex.id, ex.name);
      });
    });
    return Array.from(exercises.entries()).map(([id, name]) => ({ id, name }));
  }, [routine]);

  // Generate chart data based on logs
  const chartData = useMemo(() => {
    const days = timeRange === 'week' ? 7 : 30;
    
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Filter logs for this day
      const dayLogs = logs.filter(log => {
        const logDate = new Date(log.date);
        return format(logDate, 'yyyy-MM-dd') === dateStr &&
               (selectedExerciseId === 'all' || log.exerciseId === selectedExerciseId);
      });

      // Calculate max weight for the day
      const maxWeight = dayLogs.length > 0 
        ? Math.max(...dayLogs.map(l => l.weight))
        : 0;

      data.push({
        name: format(date, timeRange === 'week' ? 'EEE' : 'dd/MM'),
        peso: maxWeight,
      });
    }
    return data;
  }, [logs, timeRange, selectedExerciseId]);

  return (
    <div className="min-h-screen app-shell p-6 pb-32">
      <header className="flex justify-between items-center mb-6 mt-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Hola, {profile?.name || (profile?.gender === 'Femenino' ? 'Guerrera' : 'Guerrero')} ⚡</h1>
          <p className="text-gray-400 capitalize">{today}</p>
        </div>
        <div className="w-12 h-12 app-surface rounded-full border border-[var(--app-border)] flex items-center justify-center glow-box">
          <Flame className="app-accent" />
        </div>
      </header>

      {insights?.dailyQuote && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <AppCard accent className="rounded-2xl p-4 flex gap-3 items-start">
            <Quote className="app-accent flex-shrink-0 mt-1" size={20} />
            <p className="text-sm app-accent italic font-medium">{insights.dailyQuote}</p>
          </AppCard>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <Avatar3D />
      </motion.div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => setTab('workout')}
          className="app-surface border border-[var(--app-border)] rounded-3xl p-5 flex flex-col items-start hover:border-[color:var(--app-accent)]/50 transition-colors group"
        >
          <div className="bg-[color:var(--app-accent)]/10 p-3 rounded-full mb-4 group-hover:bg-[color:var(--app-accent)]/20 transition-colors">
            <Dumbbell className="app-accent" size={24} />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Rutina</h3>
          <p className="text-sm text-gray-400 text-left line-clamp-1">{todayRoutine?.focus || 'Descanso'}</p>
        </button>

        <button
          onClick={() => setTab('diet')}
          className="app-surface border border-[var(--app-border)] rounded-3xl p-5 flex flex-col items-start hover:border-[color:var(--app-accent)]/50 transition-colors group"
        >
          <div className="bg-[color:var(--app-accent)]/10 p-3 rounded-full mb-4 group-hover:bg-[color:var(--app-accent)]/20 transition-colors">
            <Utensils className="app-accent" size={24} />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Dieta</h3>
          <p className="text-sm text-gray-400 text-left line-clamp-1">{todayDiet?.dailyCalories || 0} kcal</p>
        </button>
      </div>

      {profile && (
        <AppCard className="mb-8">
          <SectionHeader title="Meta de Transformación" />
          <p className="text-sm text-gray-300">
            {profile.goalDirection} {profile.goalTargetKg} kg en {profile.goalTimelineMonths} meses.
          </p>
          <p className="text-xs app-accent mt-2">
            Ritmo sugerido: {(profile.goalTargetKg / Math.max(profile.goalTimelineMonths * 4, 1)).toFixed(2)} kg por semana.
          </p>
          {profile.weeklySpecialSession?.enabled && (
            <p className="text-xs text-gray-400 mt-2">
              Día especial: {profile.weeklySpecialSession.activity} ({profile.weeklySpecialSession.day})
            </p>
          )}
        </AppCard>
      )}

      <AppCard className="mb-8" accent>
        <SectionHeader title="Motivación" />
        <p className="text-sm app-accent italic">“{motivationPhrase || insights?.dailyQuote || 'Disciplina hoy, resultados mañana.'}”</p>
        {motivationPhoto && (
          <div className="mt-4 rounded-2xl overflow-hidden border border-[var(--app-border)] relative">
            <img src={motivationPhoto} alt="Motivación" className="w-full h-40 object-cover" />
            <div className="absolute inset-0 bg-black/40 flex items-end p-3">
              <p className="text-xs text-white font-medium">{motivationPhrase}</p>
            </div>
          </div>
        )}
      </AppCard>

      {insights && (
        <div className="grid grid-cols-1 gap-4 mb-8">
          <div className="bg-[#121212] border border-[#262626] rounded-3xl p-5 flex items-start gap-4">
            <div className="bg-blue-500/10 p-2 rounded-full mt-1">
              <Moon className="text-blue-400" size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Descanso Recomendado</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{insights.sleepRecommendation}</p>
            </div>
          </div>
          <div className="bg-[#121212] border border-[#262626] rounded-3xl p-5 flex items-start gap-4">
            <div className="bg-purple-500/10 p-2 rounded-full mt-1">
              <TrendingUp className="text-purple-400" size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Proyección de Resultados</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{insights.estimatedResults}</p>
            </div>
          </div>
        </div>
      )}

      <AppCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <SectionHeader title="Progreso" icon={Activity} />
          <div className="flex bg-black rounded-lg p-1 border border-[var(--app-border)]">
            <button 
              onClick={() => setTimeRange('week')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${timeRange === 'week' ? 'bg-[var(--app-accent)] text-black font-bold' : 'text-gray-400'}`}
            >
              Semana
            </button>
            <button 
              onClick={() => setTimeRange('month')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${timeRange === 'month' ? 'bg-[var(--app-accent)] text-black font-bold' : 'text-gray-400'}`}
            >
              Mes
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <StatPill label="rango" value={timeRange === 'week' ? '7 días' : '30 días'} />
          <StatPill label="ejercicio" value={selectedExerciseId === 'all' ? 'todos' : '1'} />
        </div>

        <div className="mb-6">
          <select 
            value={selectedExerciseId}
            onChange={(e) => setSelectedExerciseId(e.target.value)}
            className="w-full bg-black border border-[var(--app-border)] rounded-xl p-3 text-sm text-white focus:border-[var(--app-accent)] outline-none appearance-none"
          >
            <option value="all">Todos los ejercicios (Peso Máx)</option>
            {allExercises.map(ex => (
              <option key={ex.id} value={ex.id}>{ex.name}</option>
            ))}
          </select>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="name" stroke="#525252" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#525252" fontSize={10} tickLine={false} axisLine={false} width={30} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#121212', border: '1px solid #262626', borderRadius: '8px' }}
                itemStyle={{ color: 'var(--app-accent)' }}
              />
              <Line 
                type="monotone" 
                dataKey="peso" 
                stroke="var(--app-accent)" 
                strokeWidth={3}
                dot={{ fill: '#050505', stroke: 'var(--app-accent)', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: 'var(--app-accent)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </AppCard>
    </div>
  );
}
