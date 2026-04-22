import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store/useAppStore';
import { authService } from '../services/authService';
import { workoutService } from '../services/workoutService';
import { User, LogOut, Activity, Target, Clock, Scale, Ruler, Camera, Plus, Edit2, Check, Palette, Quote, TrendingUp, Trophy } from 'lucide-react';
import { listStagger, checkBounce, tapPulse, numberRoll } from '../lib/motion';
import { format, subWeeks, startOfWeek } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Profile() {
  const {
    profile,
    profilePhoto,
    progressPhotos,
    setProfilePhoto,
    addProgressPhoto,
    updateProfile,
    logout,
    theme,
    setTheme,
    motivationPhrase,
    motivationPhoto,
    setMotivationPhrase,
    setMotivationPhoto,
    authToken,
    showToast,
    logs,
    routine,
    diet,
    weightLogs,
    addWeightLog,
    weeklyGoals,
    toggleWeeklyGoal,
  } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressInputRef = useRef<HTMLInputElement>(null);
  const motivationInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    weight: String(profile?.weight || ''),
    height: String(profile?.height || ''),
  });
  const [weightInput, setWeightInput] = useState<string>('');

  const todayDateKey = format(new Date(), 'yyyy-MM-dd');
  const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const nextWeekStart = format(startOfWeek(new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const alreadyLoggedThisWeek = weightLogs.some((l) => l.date >= currentWeekStart && l.date < nextWeekStart);
  const lastWeightLog = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1] : null;

  const weightChartData = useMemo(() => {
    const logByWeekStart = new Map(
      weightLogs.map((l) => [format(startOfWeek(new Date(l.date), { weekStartsOn: 1 }), 'yyyy-MM-dd'), l.weight])
    );
    return Array.from({ length: 8 }, (_, i) => {
      const weekDate = subWeeks(new Date(), 7 - i);
      const weekStart = format(startOfWeek(weekDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      return { week: `S${i + 1}`, peso: logByWeekStart.get(weekStart) ?? null };
    });
  }, [weightLogs]);

  const personalRecordsList = useMemo(() => {
    const exerciseNames = new Map<string, string>();
    for (const day of routine) {
      for (const ex of day.exercises ?? []) {
        exerciseNames.set(ex.id, ex.name);
      }
    }
    const prMap = new Map<string, { weight: number; reps: number; date: string; name: string }>();
    for (const log of logs) {
      const existing = prMap.get(log.exerciseId);
      if (!existing || log.weight > existing.weight) {
        prMap.set(log.exerciseId, {
          weight: log.weight,
          reps: log.reps,
          date: log.date.slice(0, 10),
          name: exerciseNames.get(log.exerciseId) || log.exerciseId,
        });
      }
    }
    return Array.from(prMap.values())
      .filter((p) => p.weight > 0)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10);
  }, [logs, routine]);

  if (!profile) return null;

  const handleLogWeight = async () => {
    const val = Number(weightInput);
    if (!val || val < 20 || val > 400) return;
    addWeightLog({ date: todayDateKey, weight: val });
    setWeightInput('');
    showToast({ type: 'success', title: `Peso registrado: ${val} kg ⚖️` });
    if (authToken) {
      try {
        await workoutService.saveWeightLog(authToken, { date: todayDateKey, weight: val });
      } catch (error) {
        console.error('Error syncing weight log:', error);
      }
    }
  };

  const persistProfilePatch = async (patch: Record<string, unknown>, silent = true) => {
    if (!authToken) return;

    try {
      await authService.updateProfile(authToken, patch);
      if (!silent) {
        showToast({
          type: 'success',
          title: 'Perfil actualizado',
        });
      }
    } catch (error) {
      console.error('Error persisting profile patch:', error);
      if (!silent) {
        showToast({
          type: 'error',
          title: 'No se pudo guardar',
          message: 'Reintenta en unos segundos.',
        });
      }
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'progress' | 'motivation') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (type === 'profile') {
          const photo = reader.result as string;
          setProfilePhoto(photo);
          await persistProfilePatch({ profilePhoto: photo });
        } else if (type === 'progress') {
          const newPhoto = { date: new Date().toISOString(), url: reader.result as string };
          addProgressPhoto(newPhoto);

          if (authToken) {
            try {
              await workoutService.addPhoto(authToken, newPhoto);
            } catch (error) {
              console.error('Error persisting progress photo:', error);
            }
          }
        } else {
          const photo = reader.result as string;
          setMotivationPhoto(photo);
          await persistProfilePatch({ motivationPhoto: photo });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    const parsedWeight = Number(editData.weight) || profile.weight;
    const parsedHeight = Number(editData.height) || profile.height;

    updateProfile({ weight: parsedWeight, height: parsedHeight });
    // Persist to backend
    await persistProfilePatch(
      {
        weight: parsedWeight,
        height: parsedHeight,
        theme,
        motivationPhrase,
        motivationPhoto,
      },
      true
    );

    showToast({
      type: 'success',
      title: authToken ? 'Cambios guardados ✅' : 'Guardado localmente 💾',
      message: authToken ? undefined : 'Inicia sesión para sincronizar con el servidor.',
    });

    setIsEditing(false);
  };

  const handleThemeChange = async (nextTheme: 'aguamarina-negro' | 'verde-negro' | 'ocaso-negro') => {
    setTheme(nextTheme);
    await persistProfilePatch({ theme: nextTheme });
  };

  const handleMotivationPhraseBlur = async () => {
    await persistProfilePatch({ motivationPhrase });
  };

  const completedGoals = weeklyGoals.filter((goal) => goal.done).length;
  const weeklyGoalProgress = Math.round((completedGoals / Math.max(1, weeklyGoals.length)) * 100);

  return (
    <div className="min-h-screen app-shell px-4 safe-top md:px-6 safe-bottom">
      <div className="page-wrap">
      <header className="mb-8 mt-2 flex justify-between items-center">
        <h1 className="brutal-title text-white flex items-center gap-3">
          <User className="app-accent" size={32} />
          👤 Perfil
        </h1>
        <button 
          onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
          className="tap-target pressable p-2 neuro-raised rounded-full hover:text-[var(--app-accent)] transition-colors"
        >
          {isEditing ? <Check className="app-accent" /> : <Edit2 className="text-gray-400 hover:text-white transition-colors" />}
        </button>
      </header>

      <motion.div {...listStagger(0)}>
      <div className="glass-panel border border-[var(--app-border)] rounded-3xl p-6 mb-8 flex items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[color:var(--app-accent)]/10 rounded-full blur-3xl -mr-16 -mt-16" />
        
        <div className="relative">
          <div className="w-24 h-24 rounded-full avatar-ring-animated p-[3px]">
            <div className="w-full h-full bg-black rounded-full flex items-center justify-center border-2 border-[#0a0a0a] overflow-hidden">
              {profilePhoto ? (
                <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="app-accent" size={40} />
              )}
            </div>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="tap-target pressable absolute bottom-0 right-0 bg-[var(--app-accent)] p-2 rounded-full text-black hover:brightness-95 transition-colors"
          >
            <Camera size={16} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => handlePhotoUpload(e, 'profile')} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold mb-1 headline-gradient">{profile.name || 'Usuario Volt'}</h2>
          <p className="app-accent font-mono text-sm glow-text">{profile.goal}</p>
        </div>
      </div>
      </motion.div>

      <motion.div {...listStagger(1)} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="neuro-raised rounded-3xl p-5 flex items-center gap-4">
          <Scale className="app-accent" size={24} />
          <div>
            <p className="text-xs text-gray-500 font-mono">Peso</p>
            {isEditing ? (
              <input 
                type="number" 
                value={editData.weight} 
                  onChange={(e) => setEditData({...editData, weight: e.target.value})}
                className="w-20 input-field rounded-lg px-2 py-1 text-sm font-bold"
              />
            ) : (
              <p className="text-lg font-bold text-white">{profile.weight} kg</p>
            )}
          </div>
        </div>
        <div className="neuro-raised rounded-3xl p-5 flex items-center gap-4">
          <Ruler className="app-accent" size={24} />
          <div>
            <p className="text-xs text-gray-500 font-mono">Altura</p>
            {isEditing ? (
              <input 
                type="number" 
                value={editData.height} 
                  onChange={(e) => setEditData({...editData, height: e.target.value})}
                className="w-20 input-field rounded-lg px-2 py-1 text-sm font-bold"
              />
            ) : (
              <p className="text-lg font-bold text-white">{profile.height} cm</p>
            )}
          </div>
        </div>
        <div className="neuro-raised rounded-3xl p-5 flex items-center gap-4">
          <Activity className="app-accent" size={24} />
          <div>
            <p className="text-xs text-gray-500 font-mono">Nivel</p>
            <p className="text-lg font-bold text-white capitalize">{profile.currentState.split(' ')[0]}</p>
          </div>
        </div>
        <div className="neuro-raised rounded-3xl p-5 flex items-center gap-4">
          <Clock className="app-accent" size={24} />
          <div>
            <p className="text-xs text-gray-500 font-mono">Edad</p>
            <p className="text-lg font-bold text-white">{profile.age} años</p>
          </div>
        </div>
      </motion.div>

      {/* ── Visual fitness stat bars ──────────────────────── */}
      {(() => {
        // Strength: each completed set contributes 4% up to 100% (25 sets = max strength score)
        const STRENGTH_XP_PER_LOG = 4;
        // Energy: each weekly weight log contributes 18% (5-6 logs ≈ full engagement); minimum 30%
        const ENERGY_XP_PER_WEIGHT_LOG = 18;
        const ENERGY_MIN = 30;

        const strengthScore = Math.min(100, logs.length * STRENGTH_XP_PER_LOG);
        const consistencyScore = weeklyGoalProgress;
        const energyScore = Math.min(100, Math.max(ENERGY_MIN, weightLogs.length * ENERGY_XP_PER_WEIGHT_LOG));
        const statBars = [
          { label: '💪 Fuerza', value: strengthScore },
          { label: '🔥 Consistencia', value: consistencyScore },
          { label: '⚡ Energía', value: energyScore },
        ];
        return (
          <motion.div {...listStagger(2)} className="glass-panel border border-[var(--app-border)] rounded-3xl p-6 mb-8">
            <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2">
              <Activity className="app-accent" size={18} />
              📊 Indicadores de forma
            </h3>
            <div className="space-y-4">
              {statBars.map((stat) => (
                <div key={stat.label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm text-gray-300">{stat.label}</span>
                    <span className="text-sm font-bold text-white">{stat.value}%</span>
                  </div>
                  <div className="stat-bar-track">
                    <motion.div
                      className="stat-bar-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.value}%` }}
                      transition={{ duration: 0.9, ease: [0.34, 1.1, 0.64, 1], delay: 0.3 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        );
      })()}

      <div className="glass-panel border border-[var(--app-border)] rounded-3xl p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Camera className="app-accent" size={20} />
            📸 Fotos de Progreso
          </h3>
          <button 
            onClick={() => progressInputRef.current?.click()}
            className="tap-target pressable p-2 neuro-raised rounded-full text-white hover:text-[var(--app-accent)] transition-colors"
          >
            <Plus size={16} />
          </button>
          <input 
            type="file" 
            ref={progressInputRef} 
            onChange={(e) => handlePhotoUpload(e, 'progress')} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
        
        {progressPhotos.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {progressPhotos.map((photo, i) => (
              <div key={i} className="min-w-[120px] h-[160px] rounded-xl overflow-hidden neuro-raised relative">
                <img src={photo.url} alt="Progreso" className="w-full h-full object-cover" />
                <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm p-1 text-center text-[10px] font-mono text-gray-300">
                  {new Date(photo.date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center py-4">Sube fotos para ver tu evolución.</p>
        )}
      </div>

      {/* ─── Weekly weight tracking ───────────────────── */}
      <div className="glass-panel border border-[var(--app-border)] rounded-3xl p-6 mb-8">
        <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
          <TrendingUp className="app-accent" size={20} />
          ⚖️ Registro de Peso Semanal
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          {alreadyLoggedThisWeek
            ? `✅ Esta semana ya registraste ${lastWeightLog?.weight} kg`
            : 'Registra tu peso una vez a la semana para ver tu evolución.'}
        </p>

        <div className="flex gap-3 mb-5">
          <input
            type="number"
            min={20}
            max={400}
            step={0.1}
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            placeholder={`Ej. ${profile.weight}`}
            className="input-field flex-1"
          />
          <button
            onClick={() => void handleLogWeight()}
            disabled={!weightInput || alreadyLoggedThisWeek}
            className="tap-target pressable primary-btn px-5 py-2 rounded-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            Guardar ⚖️
          </button>
        </div>

        {weightChartData.some((d) => d.peso !== null) ? (
          <div className="h-28 w-full neuro-inset p-2 rounded-xl">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightChartData}>
                <XAxis dataKey="week" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--neuro-surface)', border: '1px solid var(--app-border)', borderRadius: '10px' }}
                  itemStyle={{ color: 'var(--app-accent)' }}
                />
                <Line
                  type="monotone"
                  dataKey="peso"
                  stroke="var(--app-accent)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: 'var(--app-accent)', strokeWidth: 0 }}
                  connectNulls
                  activeDot={{ r: 5, fill: 'var(--app-accent)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs text-gray-600 text-center py-2">Sin datos aún. ¡Empieza a registrar!</p>
        )}

        {weightLogs.length > 0 && (
          <div className="mt-4 space-y-1 max-h-32 overflow-y-auto">
            <AnimatePresence initial={false}>
              {[...weightLogs].reverse().slice(0, 6).map((l, idx) => (
                <motion.div
                  key={l.date}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: idx * 0.04, duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center justify-between neuro-inset px-3 py-1.5 rounded-lg"
                >
                  <span className="text-xs text-gray-400 font-mono">{l.date}</span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={l.weight}
                      {...numberRoll}
                      className="text-sm font-bold text-[var(--app-accent)]"
                    >
                      {l.weight} kg
                    </motion.span>
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Personal Records ───────────────────────────────── */}
      {personalRecordsList.length > 0 && (
        <motion.div {...listStagger(3)} className="mb-6">
          <div className="neuro-raised rounded-3xl p-5">
            <h3 className="text-sm font-semibold text-white/90 mb-4 flex items-center gap-2">
              <Trophy size={16} className="app-accent" />
              🏆 Récords personales
            </h3>
            <div className="space-y-2">
              {personalRecordsList.map((pr, i) => (
                <div key={pr.name + i} className="flex items-center justify-between neuro-inset p-3 rounded-2xl">
                  <div>
                    <p className="text-sm text-white font-medium">{pr.name}</p>
                    <p className="text-xs text-gray-500">{pr.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold app-accent">{pr.weight}kg</p>
                    <p className="text-xs text-gray-500">× {pr.reps} reps</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      <motion.div {...listStagger(2)} className="panel-soft rounded-3xl p-6 mb-8">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Target className="app-accent" size={20} />
          Disponibilidad 📆
        </h3>
        <p className="text-gray-400 font-mono">{profile.schedule}</p>
      </motion.div>

      <div className="panel-soft rounded-3xl p-6 mb-8">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Palette className="app-accent" size={20} />
          Tema Visual 🎨
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {[
            { id: 'aguamarina-negro', label: '🌊 Aguamarina - Negro' },
            { id: 'verde-negro', label: '💚 Verde - Negro' },
            { id: 'ocaso-negro', label: '🌅 Ocaso - Negro' },
          ].map((option) => (
            <motion.button
              key={option.id}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.14, ease: [0.34, 1.2, 0.64, 1] }}
              onClick={() => handleThemeChange(option.id as 'aguamarina-negro' | 'verde-negro' | 'ocaso-negro')}
              className={`tap-target text-left px-4 py-3 rounded-xl border transition-all ${
                theme === option.id
                  ? 'border-[color:var(--app-accent)]/60 bg-[color:var(--app-accent)]/10 text-[var(--app-accent)] shadow-[inset_2px_2px_6px_var(--neuro-shadow-dark),inset_-1px_-1px_4px_var(--neuro-shadow-light)]'
                  : 'neuro-raised text-gray-300'
              }`}
            >
              {option.label}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="glass-panel border border-[var(--app-border)] rounded-3xl p-6 mb-8">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Quote className="app-accent" size={20} />
          Motivación 💪
        </h3>
        <input
          type="text"
          value={motivationPhrase}
          onChange={(e) => setMotivationPhrase(e.target.value)}
          onBlur={handleMotivationPhraseBlur}
          className="input-field mb-4"
          placeholder="Escribe tu frase motivacional"
        />

        <button
          onClick={() => motivationInputRef.current?.click()}
          className="tap-target pressable secondary-btn w-full mb-4 text-white py-3 rounded-xl hover:text-[var(--app-accent)] transition-colors"
        >
          Subir foto motivacional 📷
        </button>
        <input
          type="file"
          ref={motivationInputRef}
          onChange={(e) => handlePhotoUpload(e, 'motivation')}
          accept="image/*"
          className="hidden"
        />

        {motivationPhoto && (
          <div className="rounded-xl overflow-hidden border border-[var(--app-border)] relative">
            <img src={motivationPhoto} alt="Motivación" className="w-full h-48 object-cover" />
            <div className="absolute inset-0 bg-black/40 flex items-end p-3">
              <p className="text-sm text-white font-medium">{motivationPhrase}</p>
            </div>
          </div>
        )}
      </div>

      <div className="glass-panel border border-[var(--app-border)] rounded-3xl p-6 mb-8">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Target className="app-accent" size={20} />
          Metas semanales accionables
        </h3>
        <div className="mb-3 flex items-center justify-between text-xs text-gray-400">
          <span>Progreso semanal</span>
          <span>{completedGoals}/{weeklyGoals.length} metas</span>
        </div>
        <div className="mb-4 h-2.5 w-full neuro-progress-track">
          <div className="neuro-progress-fill" style={{ width: `${weeklyGoalProgress}%` }} />
        </div>
        <div className="space-y-2">
          {weeklyGoals.map((goal, idx) => {
            const staggerProps = listStagger(idx);
            return (
            <motion.button
              key={goal.id}
              type="button"
              onClick={() => toggleWeeklyGoal(goal.id)}
              initial={staggerProps.initial}
              animate={staggerProps.animate}
              whileTap={{ scale: 0.97 }}
              transition={{ ...staggerProps.transition, type: 'spring', bounce: 0.3 }}
              className={`tap-target w-full rounded-xl border px-3 py-3 text-left text-sm transition-all ${
                goal.done
                  ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-300 shadow-[inset_2px_2px_5px_var(--neuro-shadow-dark)]'
                  : 'neuro-raised text-gray-200'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <AnimatePresence mode="wait" initial={false}>
                  {goal.done ? (
                    <motion.span key="done" {...checkBounce}>✅</motion.span>
                  ) : (
                    <motion.span key="undone" {...checkBounce}>⬜</motion.span>
                  )}
                </AnimatePresence>
                {goal.label}
              </span>
            </motion.button>
            );
          })}
        </div>
      </div>

      <motion.button
        {...listStagger(3)}
        onClick={logout}
        className="tap-target w-full danger-btn font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors"
      >
        <LogOut size={20} />
        🚪 Cerrar Sesión
      </motion.button>
      </div>
    </div>
  );
}
